#!/usr/bin/env python3
"""Manda los avisos de plazo que toquen hoy y los marca como enviados.

    python3 pipeline/avisos.py --simular     # enseña a quién avisaría y con qué texto
    python3 pipeline/avisos.py               # los envía y los marca
    python3 pipeline/avisos.py --tipo un_dia # solo un tipo

QUÉ HACE. Pregunta a la base qué avisos tocan (`valida_dir_avisos`: mitad del plazo, 3 días,
1 día y vencido), los manda por Resend (o SMTP) y los registra (`valida_dir_marcar_avisos`) para que no
se repitan. Un panelista solo aparece si le quedan conceptos pendientes: **quien termina su
bloque deja de recibir avisos sin que nadie los cancele**.

CÓMO SE CONFIGURA EL ENVÍO. Por Resend (lo normal aquí) o por cualquier SMTP. Nada de esto
vive en el repositorio: se lee del Llavero de macOS.

  1) Resend — es lo que está montado. `edpain.com` está verificado en Resend (región
     eu-west-1, por el RGPD) con los registros DKIM/SPF/DMARC en Cloudflare; los MX de la
     raíz siguen siendo los de Cloudflare Email Routing, así que las respuestas a
     estudio@edpain.com se reciben igual que antes. La API key (permiso «Sending access»,
     limitada a edpain.com) está en:

         security add-generic-password -a $USER -s valida-edpain-resend -w 're_...'

     El remitente se puede cambiar sin tocar el código:

         security add-generic-password -a $USER -s valida-edpain-remitente -w \\
           'Estudio EdPain <estudio@edpain.com>'

  2) SMTP — alternativa si algún día se cambia de proveedor:

         security add-generic-password -a $USER -s valida-edpain-smtp -w \\
           'smtp.servidor.com|465|usuario|contraseña|Estudio EdPain <estudio@edpain.com>'

Sin ninguna de las dos, `--simular` sigue valiendo para copiar los textos a mano desde el
panel de dirección.

PARA QUE SEA AUTOMÁTICO DE VERDAD, una línea de cron en este Mac:

    0 9 * * * cd ~/valida-edpain && /usr/bin/python3 pipeline/avisos.py >> dist/avisos.log 2>&1
"""
from __future__ import annotations

import argparse
import json
import smtplib
import subprocess
import sys
import urllib.error
import urllib.request
from email.message import EmailMessage
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importar import Api, clave_direccion, leer_env  # noqa: E402

TIPOS = ("mitad", "tres_dias", "un_dia", "vencido")
NOMBRE = {"mitad": "mitad del plazo", "tres_dias": "quedan 3 días", "un_dia": "último día", "vencido": "plazo vencido"}


REMITENTE_POR_DEFECTO = "Estudio EdPain <estudio@edpain.com>"


def llavero(servicio: str) -> str | None:
    """Un secreto del Llavero de macOS, o None si no está guardado."""
    try:
        return subprocess.run(["security", "find-generic-password", "-s", servicio, "-w"],
                              capture_output=True, text=True, check=True).stdout.strip() or None
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def transporte() -> dict | None:
    """Cómo se manda el correo: Resend si hay API key, si no SMTP, si no nada."""
    api_key = llavero("valida-edpain-resend")
    if api_key:
        return {"via": "resend", "clave": api_key,
                "de": llavero("valida-edpain-remitente") or REMITENTE_POR_DEFECTO}

    crudo = llavero("valida-edpain-smtp")
    if not crudo:
        return None
    partes = crudo.split("|")
    if len(partes) != 5:
        sys.exit("✗ El secreto `valida-edpain-smtp` no tiene el formato servidor|puerto|usuario|contraseña|remitente")
    return {"via": "smtp", "host": partes[0], "puerto": int(partes[1]),
            "usuario": partes[2], "clave": partes[3], "de": partes[4]}


def enviar_resend(cfg: dict, para: str, asunto: str, cuerpo: str) -> str:
    """POST /emails. Devuelve el id del envío, que es lo que se busca luego en los Logs."""
    cuerpo_json = json.dumps({
        "from": cfg["de"],
        "to": [para],
        "subject": asunto,
        "text": cuerpo,
        # Las respuestas van al buzón del estudio, que Cloudflare Email Routing reenvía.
        "reply_to": cfg["de"],
    }).encode()
    pet = urllib.request.Request(
        "https://api.resend.com/emails", data=cuerpo_json, method="POST",
        headers={"Authorization": f"Bearer {cfg['clave']}", "Content-Type": "application/json",
                 # Sin User-Agent propio, el Cloudflare que hay delante de la API de Resend
                 # rechaza a `Python-urllib` con un 403 «error code: 1010».
                 "User-Agent": "valida-edpain-avisos/1.0"})
    try:
        with urllib.request.urlopen(pet, timeout=30) as r:
            return json.loads(r.read()).get("id", "")
    except urllib.error.HTTPError as e:
        detalle = e.read().decode(errors="replace")[:300]
        raise RuntimeError(f"Resend respondió {e.code}: {detalle}") from None


def enviar_smtp(cfg: dict, para: str, asunto: str, cuerpo: str) -> str:
    msg = EmailMessage()
    msg["From"] = cfg["de"]
    msg["To"] = para
    msg["Subject"] = asunto
    msg.set_content(cuerpo)
    if cfg["puerto"] == 465:
        with smtplib.SMTP_SSL(cfg["host"], cfg["puerto"], timeout=30) as s:
            s.login(cfg["usuario"], cfg["clave"])
            s.send_message(msg)
    else:
        with smtplib.SMTP(cfg["host"], cfg["puerto"], timeout=30) as s:
            s.starttls()
            s.login(cfg["usuario"], cfg["clave"])
            s.send_message(msg)
    return ""


def enviar(cfg: dict, para: str, asunto: str, cuerpo: str) -> str:
    return enviar_resend(cfg, para, asunto, cuerpo) if cfg["via"] == "resend" \
        else enviar_smtp(cfg, para, asunto, cuerpo)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--simular", action="store_true", help="no envía ni marca nada")
    ap.add_argument("--tipo", choices=TIPOS, help="solo este tipo de aviso")
    ap.add_argument("--incluir-pruebas", action="store_true", help="también a los panelistas de prueba")
    ap.add_argument("--probar-envio", metavar="CORREO",
                    help="manda UN correo de prueba a esa dirección y sale; no toca la base ni marca nada")
    args = ap.parse_args()

    if args.probar_envio:
        cfg = transporte()
        if not cfg:
            sys.exit("✗ No hay forma de enviar configurada (`valida-edpain-resend` o `valida-edpain-smtp` en el Llavero).")
        print(f"· Enviando por {cfg['via']} como {cfg['de']} a {args.probar_envio}")
        ident = enviar(cfg, args.probar_envio,
                       "Prueba de los avisos del Estudio EdPain",
                       "Esto es una prueba del envío automático de avisos de plazo de valida.edpain.com.\n"
                       "Si te ha llegado, el circuito funciona y no hay nada que hacer.\n")
        print(f"✓ Enviado{' · ' + ident if ident else ''}")
        return 0

    env = leer_env()
    api = Api(env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"], clave_direccion())
    avisos = api.rpc("valida_dir_avisos", {}) or []
    if args.tipo:
        avisos = [a for a in avisos if a["tipo"] == args.tipo]
    if not args.incluir_pruebas:
        avisos = [a for a in avisos if not a.get("es_prueba")]

    sin_correo = [a for a in avisos if not a.get("email")]
    avisos = [a for a in avisos if a.get("email")]
    if not avisos and not sin_correo:
        print("· No hay ningún aviso pendiente.")
        return 0

    print(f"· {len(avisos)} avisos por mandar" + (f" · {len(sin_correo)} panelistas sin correo" if sin_correo else ""))
    for a in avisos:
        print(f"  [{NOMBRE[a['tipo']]}] {a['codigo']} · {a.get('nombre') or '—'} <{a['email']}> · "
              f"le faltan {a['pendientes']} de {a['total']}")
    for a in sin_correo:
        print(f"  ⚠ {a['codigo']} no tiene correo en su perfil: avísale a mano.")

    if args.simular:
        if avisos:
            print("\n--- ejemplo del mensaje ---")
            print(f"Asunto: {avisos[0]['asunto']}\n\n{avisos[0]['cuerpo']}")
        print("\n(simulación: no se ha enviado ni marcado nada)")
        return 0

    cfg = transporte()
    if not cfg:
        sys.exit("✗ No hay forma de enviar configurada. Guarda la API key de Resend en el Llavero\n"
                 "  (`valida-edpain-resend`) o un SMTP (`valida-edpain-smtp`). Con `--simular` puedes ver los\n"
                 "  textos, y el panel de dirección (Plazos y avisos) los prepara uno a uno para enviarlos a mano.")

    print(f"· Enviando por {cfg['via']} como {cfg['de']}")
    enviados: dict[str, list[str]] = {}
    for a in avisos:
        try:
            ident = enviar(cfg, a["email"], a["asunto"], a["cuerpo"])
            enviados.setdefault(a["tipo"], []).append(a["codigo"])
            print(f"  ✓ {a['codigo']}" + (f" · {ident}" if ident else ""))
        except Exception as e:  # noqa: BLE001 — un fallo no debe tumbar el resto
            print(f"  ✗ {a['codigo']}: {e}")
    for tipo, codigos in enviados.items():
        api.rpc("valida_dir_marcar_avisos", {"codigos": codigos, "tipo": tipo})
    print(f"\n✓ {sum(len(v) for v in enviados.values())} enviados y marcados")
    return 0


if __name__ == "__main__":
    sys.exit(main())
