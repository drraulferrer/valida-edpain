#!/usr/bin/env python3
"""Manda los avisos de plazo que toquen hoy y los marca como enviados.

    python3 pipeline/avisos.py --simular     # enseña a quién avisaría y con qué texto
    python3 pipeline/avisos.py               # los envía y los marca
    python3 pipeline/avisos.py --tipo un_dia # solo un tipo

QUÉ HACE. Pregunta a la base qué avisos tocan (`valida_dir_avisos`: mitad del plazo, 3 días,
1 día y vencido), los manda por SMTP y los registra (`valida_dir_marcar_avisos`) para que no
se repitan. Un panelista solo aparece si le quedan conceptos pendientes: **quien termina su
bloque deja de recibir avisos sin que nadie los cancele**.

CÓMO SE CONFIGURA EL ENVÍO. Hace falta un servidor SMTP; sin él, `--simular` sigue valiendo
para copiar los textos a mano desde el panel de dirección. La configuración se lee del
Llavero de macOS, no de ningún fichero del repositorio:

    security add-generic-password -a $USER -s valida-edpain-smtp -w \\
      'smtp.resend.com|465|resend|TU_API_KEY|Estudio EdPain <estudio@edpain.com>'

es decir: servidor|puerto|usuario|contraseña|remitente. Con Resend hay que verificar antes
edpain.com (registros DKIM/SPF en Cloudflare). Cualquier otro SMTP vale igual.

PARA QUE SEA AUTOMÁTICO DE VERDAD, una línea de cron en este Mac:

    0 9 * * * cd ~/valida-edpain && /usr/bin/python3 pipeline/avisos.py >> dist/avisos.log 2>&1
"""
from __future__ import annotations

import argparse
import smtplib
import subprocess
import sys
from email.message import EmailMessage
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importar import Api, clave_direccion, leer_env  # noqa: E402

TIPOS = ("mitad", "tres_dias", "un_dia", "vencido")
NOMBRE = {"mitad": "mitad del plazo", "tres_dias": "quedan 3 días", "un_dia": "último día", "vencido": "plazo vencido"}


def smtp_config() -> dict | None:
    """servidor|puerto|usuario|contraseña|remitente, del Llavero. None si no está."""
    try:
        crudo = subprocess.run(["security", "find-generic-password", "-s", "valida-edpain-smtp", "-w"],
                               capture_output=True, text=True, check=True).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    partes = crudo.split("|")
    if len(partes) != 5:
        sys.exit("✗ El secreto `valida-edpain-smtp` no tiene el formato servidor|puerto|usuario|contraseña|remitente")
    return {"host": partes[0], "puerto": int(partes[1]), "usuario": partes[2], "clave": partes[3], "de": partes[4]}


def enviar(cfg: dict, para: str, asunto: str, cuerpo: str) -> None:
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


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--simular", action="store_true", help="no envía ni marca nada")
    ap.add_argument("--tipo", choices=TIPOS, help="solo este tipo de aviso")
    ap.add_argument("--incluir-pruebas", action="store_true", help="también a los panelistas de prueba")
    args = ap.parse_args()

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

    cfg = smtp_config()
    if not cfg:
        sys.exit("✗ No hay SMTP configurado (`valida-edpain-smtp` en el Llavero). Con `--simular` puedes ver los\n"
                 "  textos, y el panel de dirección (Plazos y avisos) los prepara uno a uno para enviarlos a mano.")

    enviados: dict[str, list[str]] = {}
    for a in avisos:
        try:
            enviar(cfg, a["email"], a["asunto"], a["cuerpo"])
            enviados.setdefault(a["tipo"], []).append(a["codigo"])
            print(f"  ✓ {a['codigo']}")
        except Exception as e:  # noqa: BLE001 — un fallo no debe tumbar el resto
            print(f"  ✗ {a['codigo']}: {e}")
    for tipo, codigos in enviados.items():
        api.rpc("valida_dir_marcar_avisos", {"codigos": codigos, "tipo": tipo})
    print(f"\n✓ {sum(len(v) for v in enviados.values())} enviados y marcados")
    return 0


if __name__ == "__main__":
    sys.exit(main())
