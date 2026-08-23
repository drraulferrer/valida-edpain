#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Copia de seguridad cifrada de la base, disparada por el cierre de cada ronda.

    python3 pipeline/respaldo.py --estado    # ¿toca respaldo? no toca nada
    python3 pipeline/respaldo.py             # respalda SOLO si se ha cerrado una ronda
    python3 pipeline/respaldo.py --ahora     # respalda pase lo que pase

POR QUÉ ASÍ. El respaldo tiene que correr en este Mac —necesita el CLI de Supabase y la
contraseña del Llavero— y el panel de dirección corre en un navegador, así que **el panel no
puede lanzarlo**. Lo que sí puede la base es dejar constancia: `valida_dir_ronda` y
`valida_dir_cerrar` escriben un evento (`ronda_nueva`, `estudio_cerrado`), y este script mira si
hay alguno posterior al último evento `respaldo`. Con una línea de cron cada hora, cerrar una
ronda dispara la copia sola, sin que nadie se acuerde.

El resultado se registra como evento `respaldo`, así que el panel de dirección puede enseñar
cuándo se hizo el último y avisar si hay respuestas sin copia.

QUÉ GUARDA. Todas las tablas del esquema `valida` —las que haya, se preguntan al catálogo, no
hay lista escrita a mano— más `public.respuestas_consenso` si existe. Un `.tar.gz` cifrado con
**AES-256**, porque el volcado lleva nombres, correos y los hash de las claves del panel: dejarlo
en claro contradiría la hoja de información que firma cada participante.

    security add-generic-password -a $USER -s valida-edpain-respaldo -w '<contraseña larga>'

PARA QUE SE DISPARE SOLO, una línea de cron en este Mac:

    17 * * * * cd ~/valida-edpain && /usr/bin/python3 pipeline/respaldo.py \\
      >> ~/valida-edpain-respaldos/respaldo.log 2>&1

El log NO va en `dist/`: cada `vite build` vacía esa carpeta y se llevaría por delante el
historial de los respaldos justo cuando hiciera falta mirarlo.

ABRIR UNA COPIA:

    openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \\
      -pass pass:"$(security find-generic-password -s valida-edpain-respaldo -w)" \\
      -in respaldo-AAAA-MM-DD-hhmm.tar.gz.enc | tar -xzf -

Restaurarla en un proyecto vacío: ver `~/valida-edpain-migracion/LEEME.md`.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importar import Api, ErrorApi, clave_direccion, leer_env  # noqa: E402

# Línea a línea: con la salida a un fichero de log, Python la almacena y el log se queda vacío
# durante los minutos que tarda el volcado. Desde cron eso es indistinguible de un cuelgue.
sys.stdout.reconfigure(line_buffering=True)

RAIZ = Path(__file__).resolve().parent.parent
# Fuera del repositorio: lleva datos personales y no puede acabar en Git ni en el bundle.
DESTINO = Path.home() / "valida-edpain-respaldos"
SERVICIO_LLAVERO = "valida-edpain-respaldo"
ITERACIONES = 200_000


def binario(nombre: str) -> str:
    """Ruta absoluta de una herramienta. **cron arranca con un PATH pelado**
    (`/usr/bin:/bin:/usr/sbin:/sbin`) y `supabase` vive en `~/.local/bin`, así que buscarlo por
    PATH funciona en el terminal y falla en el cron, que es donde nadie lo mira. Se resuelve aquí
    y se aborta con un mensaje claro si de verdad no está."""
    hallado = shutil.which(nombre)
    if hallado:
        return hallado
    for carpeta in (Path.home() / ".local/bin", Path("/opt/homebrew/bin"), Path("/usr/local/bin")):
        candidato = carpeta / nombre
        if candidato.exists():
            return str(candidato)
    sys.exit(f"✗ No se encuentra `{nombre}`. Si esto sale del cron, es que su PATH no lo alcanza.")


def proyecto() -> str:
    """El project-ref enlazado. No se escribe a mano: se lee de donde ya está."""
    enlace = RAIZ / "supabase" / ".temp" / "linked-project.json"
    if not enlace.exists():
        sys.exit("✗ No hay proyecto enlazado. Ejecuta `supabase link --project-ref <ref>` primero.")
    return json.loads(enlace.read_text())["ref"]


def contrasena() -> str:
    try:
        clave = subprocess.run([binario("security"), "find-generic-password", "-s", SERVICIO_LLAVERO, "-w"],
                               capture_output=True, text=True, check=True).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        sys.exit(f"✗ Falta la contraseña de respaldo en el Llavero. Créala con:\n"
                 f"  security add-generic-password -a $USER -s {SERVICIO_LLAVERO} -w '<contraseña larga>'")
    if not clave:
        sys.exit(f"✗ El secreto `{SERVICIO_LLAVERO}` está vacío.")
    return clave


def consulta(ref: str, sql: str) -> list[dict]:
    """Una consulta por el CLI. Reintenta: el «login role» de Supabase falla a la primera a menudo."""
    for intento in range(1, 5):
        r = subprocess.run([binario("supabase"), "db", "query", sql, "--linked", "--project-ref", ref, "-o", "json"],
                           capture_output=True, text=True, cwd=str(RAIZ))
        if r.returncode == 0:
            try:
                # El CLI devuelve dos formas según si cree que le habla un agente: un objeto
                # `{"rows": [...]}` envuelto, o la lista pelada. Desde cron es lo segundo, y
                # dar por hecha la primera reventaba justo donde nadie mira.
                salida = json.loads(r.stdout)
                return salida["rows"] if isinstance(salida, dict) else salida
            except (ValueError, KeyError):
                pass
        if intento == 4:
            sys.exit(f"✗ La consulta falló: {(r.stderr or r.stdout).strip()[-300:]}")
    return []


def tablas(ref: str) -> list[str]:
    """Las tablas de `valida` que existan AHORA. Sin lista escrita a mano: si mañana hay una
    tabla nueva, entra sola en el respaldo en vez de quedarse fuera en silencio."""
    filas = consulta(ref, "select tablename from pg_tables where schemaname = 'valida' order by tablename;")
    return [f["tablename"] for f in filas]


def volcar(ref: str, carpeta: Path) -> dict[str, int]:
    """Cada tabla a un JSON. `to_jsonb` conserva tipos, fechas y arrays sin escribir un SELECT
    por columna, y `restaurar.py` los reconstruye con `jsonb_populate_recordset`."""
    recuento: dict[str, int] = {}
    objetivos = [("valida", t) for t in tablas(ref)]
    # El buzón de `consenso.py` vive en `public` y lo crea otro repositorio: se incluye si está.
    if consulta(ref, "select to_regclass('public.respuestas_consenso') is not null as hay;")[0]["hay"]:
        objetivos.append(("public", "respuestas_consenso"))

    for esquema, tabla in objetivos:
        filas = consulta(ref, f"select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) as datos "
                              f"from {esquema}.{tabla} x;")[0]["datos"]
        nombre = tabla if esquema == "valida" else f"{esquema}.{tabla}"
        (carpeta / f"{nombre}.json").write_text(json.dumps(filas, ensure_ascii=False), encoding="utf-8")
        recuento[nombre] = len(filas)
    return recuento


def cifrar(carpeta: Path, salida: Path, clave: str) -> None:
    """tar.gz → AES-256-CBC con PBKDF2. La contraseña va por variable de entorno, no por
    argumento: los argumentos de un proceso los ve cualquiera con `ps`."""
    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        comprimido = Path(tmp.name)
    try:
        with tarfile.open(comprimido, "w:gz") as tar:
            tar.add(carpeta, arcname="datos")
        entorno = {**os.environ, "RESPALDO_PASS": clave}
        r = subprocess.run([binario("openssl"), "enc", "-aes-256-cbc", "-pbkdf2", "-iter", str(ITERACIONES),
                            "-salt", "-pass", "env:RESPALDO_PASS", "-in", str(comprimido), "-out", str(salida)],
                           capture_output=True, text=True, env=entorno)
        if r.returncode != 0:
            sys.exit(f"✗ No se pudo cifrar: {r.stderr.strip()[:200]}")
    finally:
        comprimido.unlink(missing_ok=True)


def comprobar(salida: Path, clave: str, recuento: dict[str, int]) -> None:
    """Abrir lo que se acaba de escribir. Un respaldo que no se ha probado no es un respaldo."""
    entorno = {**os.environ, "RESPALDO_PASS": clave}
    r = subprocess.run([binario("openssl"), "enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", str(ITERACIONES),
                        "-pass", "env:RESPALDO_PASS", "-in", str(salida)],
                       capture_output=True, env=entorno)
    if r.returncode != 0:
        sys.exit("✗ El fichero cifrado no se puede volver a abrir. NO se da por bueno.")
    with tempfile.TemporaryDirectory() as tmp, tempfile.NamedTemporaryFile(suffix=".tar.gz") as f:
        Path(f.name).write_bytes(r.stdout)
        with tarfile.open(f.name, "r:gz") as tar:
            tar.extractall(tmp)
        dentro = {p.stem: len(json.loads(p.read_text())) for p in (Path(tmp) / "datos").glob("*.json")}
    faltan = {k: v for k, v in recuento.items() if dentro.get(k) != v}
    if faltan:
        sys.exit(f"✗ El respaldo no cuadra con la base: {faltan}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ahora", action="store_true", help="respalda aunque no se haya cerrado ninguna ronda")
    ap.add_argument("--estado", action="store_true", help="dice si toca respaldo y no hace nada más")
    args = ap.parse_args()

    env = leer_env()
    api = Api(env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"], clave_direccion())
    try:
        estado = api.intentar("valida_dir_datos", {})["respaldo"]
    except ErrorApi as e:
        sys.exit(f"✗ No se puede consultar el estado: {e}")

    ultimo = estado.get("ultimo")
    pendiente = estado.get("pendiente_desde")
    if ultimo:
        print(f"· Último respaldo: {ultimo['en']} · {(ultimo.get('detalle') or {}).get('fichero', '—')}")
    else:
        print("· No hay ningún respaldo registrado todavía.")
    if pendiente:
        print(f"· Se cerró una ronda el {pendiente} y no hay copia posterior: TOCA respaldo.")
    else:
        print("· No se ha cerrado ninguna ronda desde el último respaldo.")

    if args.estado:
        return 0
    if not pendiente and not args.ahora:
        print("\n(nada que hacer; con --ahora se respalda igualmente)")
        return 0

    ref = proyecto()
    clave = contrasena()
    DESTINO.mkdir(parents=True, exist_ok=True)
    # Segundos en el sello y negativa a sobrescribir: con resolución de minuto, dos respaldos
    # seguidos se pisaban en silencio, que es la peor forma de perder una copia.
    sello = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d-%H%M%S")
    salida = DESTINO / f"respaldo-{sello}.tar.gz.enc"
    if salida.exists():
        sys.exit(f"✗ Ya existe {salida.name}. No se sobrescribe un respaldo.")

    print(f"\n· Volcando {ref}…")
    with tempfile.TemporaryDirectory() as tmp:
        carpeta = Path(tmp) / "datos"
        carpeta.mkdir()
        recuento = volcar(ref, carpeta)
        for nombre, n in sorted(recuento.items()):
            print(f"    {nombre:28} {n:>6}")
        cifrar(carpeta, salida, clave)
    comprobar(salida, clave, recuento)

    tam = salida.stat().st_size
    print(f"\n✓ {salida} ({tam / 1024 / 1024:.1f} MB, comprobado)")

    # Dejar constancia en la base: es lo que hace que el panel lo sepa y que la próxima pasada
    # no vuelva a respaldar lo mismo.
    try:
        api.intentar("valida_evento", {"tipo": "respaldo", "detalle": {
            "fichero": salida.name, "bytes": tam, "filas": sum(recuento.values()),
            "tablas": len(recuento)}})
        print("✓ registrado en la base (el panel de dirección ya lo ve)")
    except ErrorApi as e:
        print(f"⚠ El respaldo está hecho, pero NO se pudo registrar: {e}")
        print("  La próxima pasada volverá a respaldar. No se pierde nada, solo se repite.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
