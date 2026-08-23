#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Devuelve un respaldo cifrado a una base de datos vacía.

    python3 pipeline/restaurar.py --ultimo --a <project-ref>
    python3 pipeline/restaurar.py ~/valida-edpain-respaldos/respaldo-….tar.gz.enc --a <ref>
    python3 pipeline/restaurar.py --ultimo --a <ref> --simular   # enseña qué haría

Es la otra mitad de `pipeline/respaldo.py`. Un respaldo que no se sabe restaurar no es un
respaldo, así que esto vive en el repositorio y no en una carpeta suelta: nació para la
migración de Londres a París del 22-ago-2026 y estuvo a punto de quedarse allí.

ANTES DE RESTAURAR hay que crear la estructura en el destino, que el respaldo NO lleva:

    supabase link --project-ref <ref>
    supabase db query -f supabase/schema.sql --linked --project-ref <ref>
    supabase db query -f ~/educacion-en-dolor/build/consenso_buzon.sql --linked --project-ref <ref>

CÓMO. Sin Docker ni `pg_dump` (no hay ninguno en este Mac): reconstruye cada tabla con
`jsonb_populate_recordset`, que respeta tipos, fechas y arrays sin escribir un INSERT por
columna. Vacía cada tabla antes de insertar, así que **se puede reejecutar entero sin miedo**:
si algo falla a medias, se vuelve a lanzar y ya está.

QUÉ COMPRUEBA AL TERMINAR. Que las filas cuadren tabla a tabla, que la **semilla** del estudio
sea la misma —si cambia, cambia la muestra del estudio— y que la huella del conjunto de
conceptos coincida con la del respaldo.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from respaldo import DESTINO, ITERACIONES, SERVICIO_LLAVERO, binario, consulta, contrasena  # noqa: E402

sys.stdout.reconfigure(line_buffering=True)

RAIZ = Path(__file__).resolve().parent.parent
# El endpoint de `db query` devuelve 413 por encima de ~1 MB: hay que trocear.
LIMITE = 400_000

# En orden de dependencia: las claves ajenas mandan.
ORDEN = ["estudios", "catalogo", "conceptos", "dimensiones", "panelistas", "identidades",
         "asignaciones", "valoraciones", "cobertura", "plazos", "calibracion", "rondas",
         "propuestas_estado", "eventos", "solicitudes", "avisos"]


def ultimo_respaldo() -> Path:
    copias = sorted(DESTINO.glob("respaldo-*.tar.gz.enc"))
    if not copias:
        sys.exit(f"✗ No hay ningún respaldo en {DESTINO}.")
    return copias[-1]


def abrir(fichero: Path, carpeta: Path) -> None:
    """Descifra y extrae. La contraseña va por variable de entorno: los argumentos de un
    proceso los ve cualquiera con `ps`."""
    entorno = {**os.environ, "RESPALDO_PASS": contrasena()}
    r = subprocess.run([binario("openssl"), "enc", "-d", "-aes-256-cbc", "-pbkdf2",
                        "-iter", str(ITERACIONES), "-pass", "env:RESPALDO_PASS", "-in", str(fichero)],
                       capture_output=True, env=entorno)
    if r.returncode != 0:
        sys.exit(f"✗ No se puede descifrar {fichero.name}. ¿Es la contraseña de `{SERVICIO_LLAVERO}`?")
    with tempfile.NamedTemporaryFile(suffix=".tar.gz") as tmp:
        Path(tmp.name).write_bytes(r.stdout)
        with tarfile.open(tmp.name, "r:gz") as tar:
            tar.extractall(carpeta)


def literal(texto: str) -> str:
    return "'" + texto.replace("'", "''") + "'"


def inserta(esquema: str, tabla: str, filas: list) -> str:
    crudo = json.dumps(filas, ensure_ascii=False)
    return (f"insert into {esquema}.{tabla} select * from "
            f"jsonb_populate_recordset(null::{esquema}.{tabla}, {literal(crudo)}::jsonb);")


def trozos(datos: Path) -> list[str]:
    """Los trozos de SQL, en orden y cada uno por debajo del tope de la petición."""
    presentes = {p.stem: p for p in datos.glob("*.json")}
    tablas = [t for t in ORDEN if t in presentes]
    # Cualquier tabla del respaldo que no esté en ORDEN va al final: mejor restaurarla y que
    # falle una clave ajena, que perderla en silencio por no estar en una lista.
    tablas += [t for t in sorted(presentes) if t not in ORDEN and not t.startswith("public.")]

    fuera = [t for t in presentes if t not in tablas and not t.startswith("public.")]
    if fuera:
        print(f"  ⚠ sin restaurar (no reconocidas): {fuera}")

    partes = ["\n".join(f"delete from valida.{t} where true;" for t in reversed(tablas))]
    if "public.respuestas_consenso" in presentes:
        partes[0] += ("\ndo $$ begin if to_regclass('public.respuestas_consenso') is not null then "
                      "delete from public.respuestas_consenso where true; end if; end $$;")

    for tabla in tablas:
        filas = json.loads(presentes[tabla].read_text())
        if not filas:
            continue
        lote: list = []
        for fila in filas:
            lote.append(fila)
            if len(json.dumps(lote, ensure_ascii=False)) > LIMITE:
                partes.append(inserta("valida", tabla, lote[:-1] or lote))
                lote = [fila] if len(lote) > 1 else []
        if lote:
            partes.append(inserta("valida", tabla, lote))

    legado = presentes.get("public.respuestas_consenso")
    if legado and json.loads(legado.read_text()):
        partes.append(inserta("public", "respuestas_consenso", json.loads(legado.read_text())))

    # Las secuencias se sacan del catálogo, no de una lista escrita a mano: hay tablas con clave
    # compuesta y sin `id`, y una lista fija revienta contra ellas.
    partes.append("""do $$
declare s record;
begin
  for s in
    select seq.relname as secuencia, tab.relname as tabla, att.attname as columna
      from pg_class seq
      join pg_depend d on d.objid = seq.oid and d.classid = 'pg_class'::regclass and d.deptype = 'a'
      join pg_class tab on tab.oid = d.refobjid
      join pg_attribute att on att.attrelid = tab.oid and att.attnum = d.refobjsubid
      join pg_namespace n on n.oid = seq.relnamespace
     where seq.relkind = 'S' and n.nspname = 'valida'
  loop
    execute format('select setval(%L, coalesce((select max(%I) from valida.%I), 0) + 1, false)',
                   'valida.' || s.secuencia, s.columna, s.tabla);
  end loop;
end $$;""")
    return partes


def comprobar(ref: str, datos: Path) -> int:
    """Que lo restaurado sea lo del respaldo. Sin esto no se sabe si ha ido bien."""
    fallos = 0
    for p in sorted(datos.glob("*.json")):
        esquema, tabla = ("public", "respuestas_consenso") if p.stem.startswith("public.") else ("valida", p.stem)
        esperadas = len(json.loads(p.read_text()))
        try:
            hay = consulta(ref, f"select count(*) as n from {esquema}.{tabla};")[0]["n"]
        except SystemExit:
            print(f"  ✗ {p.stem}: no se puede contar"); fallos += 1; continue
        marca = "✓" if hay == esperadas else "✗"
        if hay != esperadas:
            fallos += 1
        print(f"  {marca} {p.stem:28} {hay:>6} / {esperadas}")

    # La semilla y la huella de los conceptos: lo que decide que la muestra sea la misma.
    semilla_r = json.loads((datos / "estudios.json").read_text())[0]["semilla"]
    semilla_d = consulta(ref, "select semilla from valida.estudios order by id limit 1;")[0]["semilla"]
    print(f"  {'✓' if semilla_r == semilla_d else '✗'} semilla {semilla_d!r}")
    fallos += semilla_r != semilla_d

    ids_r = sorted(c["id"] for c in json.loads((datos / "conceptos.json").read_text()))
    huella_r = hashlib.sha256("".join(ids_r).encode()).hexdigest()
    huella_d = consulta(ref, "select encode(sha256(string_agg(id, '' order by id)::bytea), 'hex') "
                             "as h from valida.conceptos;")[0]["h"]
    print(f"  {'✓' if huella_r == huella_d else '✗'} huella de los conceptos {huella_d[:16]}")
    fallos += huella_r != huella_d
    return fallos


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("fichero", nargs="?", help="respaldo cifrado; con --ultimo no hace falta")
    ap.add_argument("--ultimo", action="store_true", help="el respaldo más reciente")
    ap.add_argument("--a", metavar="REF", required=True, help="project-ref de destino")
    ap.add_argument("--simular", action="store_true", help="no escribe nada; dice qué haría")
    args = ap.parse_args()

    fichero = ultimo_respaldo() if args.ultimo else (Path(args.fichero) if args.fichero else None)
    if not fichero or not fichero.exists():
        sys.exit("✗ Indica un respaldo, o usa --ultimo.")
    print(f"· Respaldo: {fichero.name}")
    print(f"· Destino:  {args.a}")

    with tempfile.TemporaryDirectory() as tmp:
        abrir(fichero, Path(tmp))
        datos = Path(tmp) / "datos"
        if not datos.exists():
            sys.exit("✗ El respaldo no tiene la carpeta `datos/` esperada.")
        partes = trozos(datos)
        total = sum(len(json.loads(p.read_text())) for p in datos.glob("*.json"))
        print(f"· {len(partes)} trozos de SQL · {total} filas")

        if args.simular:
            print("\n(simulación: no se ha escrito nada)")
            return 0

        aviso = ("\n⚠ Esto VACÍA las tablas del destino y las reescribe con el respaldo.\n"
                 f"  Destino: {args.a}\n")
        print(aviso)
        temporal = Path(tmp) / "trozo.sql"
        for i, parte in enumerate(partes, 1):
            temporal.write_text(parte, encoding="utf-8")
            for intento in range(1, 5):
                r = subprocess.run([binario("supabase"), "db", "query", "-f", str(temporal),
                                    "--linked", "--project-ref", args.a],
                                   capture_output=True, text=True, cwd=str(RAIZ))
                if r.returncode == 0:
                    break
                if intento == 4:
                    print(f"  ✗ trozo {i}/{len(partes)}: {(r.stderr or r.stdout).strip()[-250:]}")
                    print("  Vuelve a lanzarlo entero: empieza vaciando, así que reintentar es seguro.")
                    return 1
            print(f"  ✓ {i}/{len(partes)}")

        print("\n· Comprobando…")
        fallos = comprobar(args.a, datos)

    if fallos:
        print(f"\n✗ {fallos} comprobación(es) sin cuadrar. NO des la restauración por buena.")
        return 1
    print("\n✓ Restaurado y comprobado")
    return 0


if __name__ == "__main__":
    sys.exit(main())
