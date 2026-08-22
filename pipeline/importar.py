#!/usr/bin/env python3
"""Importa el corpus a la plataforma de validación (valida.edpain.com).

    python3 pipeline/importar.py --simular          # enseña qué haría y no escribe nada
    python3 pipeline/importar.py                    # importa (o reimporta: es idempotente)
    python3 pipeline/importar.py --todos            # además, el marco entero con incluido=false
    python3 pipeline/importar.py --senales-minimas 1

QUÉ HACE. Carga el corpus con la misma biblioteca que `compilar.py` (`kb.cargar_todo`),
calcula para cada concepto su número aleatorio permanente (`prn.py`, con la semilla del
estudio que vive en la base de datos), decide sus estratos y manda a Supabase solo lo que
entra en el estudio, por lotes, a través de la función `valida_importar` con la clave de
la dirección editorial. No hace falta ninguna clave de servicio.

ESTRATOS (spec §2.3):
  aleatorio     prn < fracción dentro de su dominio, con suelo (los `suelo` prn más bajos)
  controversia  `controversia: true` en la cabecera — censo, no muestra
  cribado       ≥ N señales automáticas: hallazgos de G11 (dist/certeza.md), veredicto del
                agente A6 distinto de `aceptar` (orquestacion/informes/critico-*.md) y
                `certeza: muy_baja`

REGLAS HEREDADAS DEL CORPUS. No importa si el corpus no valida (salvo `--forzar`), declara
uno a uno los conceptos que deja fuera del marco y con qué motivo, y NUNCA borra: lo que
desaparece del corpus se marca inactivo en la base. La muestra es monótona por construcción
(PRN): reimportar con el corpus al 100 % añade conceptos, no mueve los ya valorados.

CLAVES. La anon de Supabase se lee de `.env` (es pública por diseño); la clave de la
dirección editorial, del Llavero de macOS (`valida-edpain-direccion`). Ninguna de las dos
vive en el repositorio.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
CORPUS = Path(os.environ.get("CORPUS_EDUCACION_EN_DOLOR", Path.home() / "educacion-en-dolor"))
sys.path.insert(0, str(AQUI))
sys.path.insert(0, str(CORPUS / "build"))

from prn import muestrear, prn  # noqa: E402

ESTADOS_FUERA = {"idea", "esbozo"}
LOTE = 80


# --------------------------------------------------------------------------- #
# Acceso a Supabase
# --------------------------------------------------------------------------- #
def leer_env() -> dict:
    env = {}
    ruta = RAIZ / ".env"
    if ruta.exists():
        for linea in ruta.read_text().splitlines():
            if "=" in linea and not linea.strip().startswith("#"):
                k, v = linea.split("=", 1)
                env[k.strip()] = v.strip()
    return {**env, **{k: v for k, v in os.environ.items() if k.startswith("VITE_")}}


def clave_direccion() -> str:
    if os.environ.get("VALIDA_CLAVE_DIRECCION"):
        return os.environ["VALIDA_CLAVE_DIRECCION"]
    try:
        return subprocess.run(["security", "find-generic-password", "-s", "valida-edpain-direccion", "-w"],
                              capture_output=True, text=True, check=True).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        sys.exit("✗ No encuentro la clave de dirección. Guárdala con:\n"
                 "    security add-generic-password -a $USER -s valida-edpain-direccion -w\n"
                 "  o pásala en VALIDA_CLAVE_DIRECCION.")


class Api:
    def __init__(self, url: str, anon: str, clave: str):
        self.url, self.anon, self.clave = url.rstrip("/"), anon, clave

    def rpc(self, nombre: str, params: dict) -> dict | list | None:
        datos = json.dumps({**params, "clave": self.clave}).encode("utf-8")
        req = urllib.request.Request(f"{self.url}/rest/v1/rpc/{nombre}", data=datos, method="POST", headers={
            "apikey": self.anon, "Authorization": f"Bearer {self.anon}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                cuerpo = r.read().decode("utf-8")
                return json.loads(cuerpo) if cuerpo else None
        except urllib.error.HTTPError as e:
            detalle = e.read().decode("utf-8", "replace")
            sys.exit(f"✗ {nombre}: HTTP {e.code} · {detalle[:400]}")
        except urllib.error.URLError as e:
            sys.exit(f"✗ {nombre}: sin conexión ({e.reason})")


# --------------------------------------------------------------------------- #
# Señales de cribado
# --------------------------------------------------------------------------- #
RE_G11 = re.compile(r"^- \*\*`([A-Z0-9]+)`\*\* `(CPT-\d{5})`", re.M)
RE_A6_SECCION = re.compile(r"^## (CPT-\d{5})", re.M)
RE_A6_VEREDICTO = re.compile(r"\*\*Veredicto: ([a-z_]+)\*\*")


def senales_g11() -> dict[str, list[dict]]:
    ruta = CORPUS / "dist" / "certeza.md"
    salida: dict[str, list[dict]] = defaultdict(list)
    if not ruta.exists():
        print("⚠ No hay dist/certeza.md: sin señales G11 (ejecuta `python3 build/validar.py` en el corpus).")
        return salida
    for codigo, cid in RE_G11.findall(ruta.read_text()):
        salida[cid].append({"tipo": "G11", "codigo": codigo})
    return salida


def senales_a6() -> dict[str, list[dict]]:
    salida: dict[str, list[dict]] = defaultdict(list)
    for ruta in sorted((CORPUS / "orquestacion" / "informes").glob("critico-*.md")):
        texto = ruta.read_text()
        posiciones = [(m.start(), m.group(1)) for m in RE_A6_SECCION.finditer(texto)]
        for i, (ini, cid) in enumerate(posiciones):
            fin = posiciones[i + 1][0] if i + 1 < len(posiciones) else len(texto)
            m = RE_A6_VEREDICTO.search(texto[ini:fin])
            if m and m.group(1) != "aceptar":
                salida[cid].append({"tipo": "A6", "codigo": m.group(1), "informe": ruta.name})
    return salida


# --------------------------------------------------------------------------- #
# Del corpus a filas
# --------------------------------------------------------------------------- #
def en_marco(c) -> str | None:
    """Devuelve el motivo de exclusión, o None si el concepto entra en el marco muestral."""
    m = c.meta
    if m.get("estado") in ESTADOS_FUERA:
        return f"estado {m.get('estado')}"
    if c.madurez() in ("M0", "M1"):
        return f"madurez {c.madurez()} (faltan explicaciones)"
    if not m.get("dominio") or not m.get("modulo"):
        return "sin dominio o módulo"
    return None


def fila(c, prn_valor: float, estratos: list[str], senales: list[dict], incluido: bool, refs: dict, exigencias: dict) -> dict:
    m, b = c.meta, c.cuerpo
    return {
        "id": c.id, "dominio": m["dominio"], "modulo": m["modulo"], "titulo": m.get("titulo", c.id),
        "definicion": b.get("definicion"), "resumen": b.get("resumen"),
        "explicacion_profesional": b.get("explicacion_profesional"),
        "explicacion_paciente": b.get("explicacion_paciente"),
        "puntos_clave": b.get("puntos_clave"), "advertencias": b.get("advertencias"),
        "certeza": m.get("certeza"), "tipo_afirmacion": m.get("tipo_afirmacion"),
        "exigencia_evidencia": exigencias.get(m.get("tipo_afirmacion") or ""),
        "controversia": bool(m.get("controversia")), "nota_controversia": m.get("nota_controversia"),
        "referencias": [refs[r] for r in (m.get("referencias") or []) if r in refs],
        "hash": c.hash, "version": m.get("version"), "prn": prn_valor,
        "estratos": estratos, "senales": senales, "incluido": incluido,
    }


def referencias(corpus, ids: set[str]) -> dict[str, dict]:
    import consenso  # noqa: E402  (del corpus; formatea APA 7.ª y trae la nota de uso)
    fichas = consenso._fichas_entidad(corpus)
    salida = {}
    for rid in sorted(ids):
        f = consenso._ficha_ref(rid, fichas)
        salida[rid] = {"id": rid, "apa": f.get("cita", ""), "nota_uso": f.get("nota", ""),
                       "doi": f.get("doi", ""), "pmid": f.get("pmid", ""), "verificada": f.get("verificada")}
    return salida


def catalogo(corpus) -> list[dict]:
    filas = [{"id": k, "nombre": v.get("nombre", k), "tipo": "dominio", "orden": v.get("orden")} for k, v in corpus.dominios.items()]
    filas += [{"id": k, "nombre": v.get("nombre", k), "tipo": "modulo", "orden": v.get("orden")} for k, v in corpus.modulos.items()]
    return filas


def commit_corpus() -> str:
    try:
        return subprocess.run(["git", "-C", str(CORPUS), "rev-parse", "--short", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    except Exception:  # noqa: BLE001
        return "desconocido"


# --------------------------------------------------------------------------- #
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--simular", action="store_true", help="no escribe nada; enseña el resultado")
    ap.add_argument("--todos", action="store_true", help="importa también el marco entero con incluido=false")
    ap.add_argument("--forzar", action="store_true", help="importa aunque el corpus tenga errores de validación")
    ap.add_argument("--senales-minimas", type=int, default=2, help="señales automáticas para entrar en `cribado` (2)")
    ap.add_argument("--estudio", type=int, default=1)
    ap.add_argument("--extra", default="", help="ids (coma) a importar con incluido=false, p. ej. conceptos de calibración")
    args = ap.parse_args()

    import kb  # noqa: E402
    import consenso  # noqa: E402

    print(f"· Cargando el corpus desde {CORPUS} …")
    corpus = kb.cargar_todo()
    if corpus.errores and not args.forzar:
        for inc in corpus.errores[:10]:
            print(inc)
        sys.exit(f"✗ El corpus tiene {len(corpus.errores)} errores de validación: no se importa (--forzar para saltarlo).")

    env = leer_env()
    url, anon = env.get("VITE_SUPABASE_URL"), env.get("VITE_SUPABASE_ANON_KEY")
    if not url or not anon:
        sys.exit("✗ Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env")
    api = Api(url, anon, clave_direccion())

    print("· Leyendo la configuración del estudio …")
    datos = api.rpc("valida_dir_datos", {})
    estudio = datos["estudio"]
    if estudio["id"] != args.estudio:
        sys.exit(f"✗ La clave de dirección pertenece al estudio {estudio['id']}, no al {args.estudio}")
    semilla, fraccion, suelo = estudio["semilla"], float(estudio["fraccion"]), int(estudio["suelo"])
    existentes = {c["id"]: c for c in datos["conceptos"]}
    print(f"  semilla={semilla!r} fracción={fraccion} suelo={suelo} · en la base: {len(existentes)} conceptos incluidos")

    # Marco muestral y exclusiones declaradas.
    marco, fuera = [], Counter()
    for c in corpus.conceptos.values():
        motivo = en_marco(c)
        if motivo:
            fuera[motivo] += 1
        else:
            marco.append(c)
    print(f"· Marco muestral: {len(marco)} conceptos" + (f" · fuera: {dict(fuera)}" if fuera else ""))

    g11, a6 = senales_g11(), senales_a6()
    base = [{"id": c.id, "dominio": c.meta["dominio"], "prn": prn(semilla, c.id)} for c in marco]
    aleatorio = muestrear(base, fraccion, suelo)

    filas_incluidas, filas_todas = [], []
    por_dominio = defaultdict(Counter)
    exigencias = consenso.EXIGENCIAS
    extra = {x.strip() for x in args.extra.split(",") if x.strip()}
    ids_refs: set[str] = set()
    decisiones = {}
    for c, b in zip(marco, base):
        senales = list(g11.get(c.id, [])) + list(a6.get(c.id, []))
        if c.meta.get("certeza") == "muy_baja":
            senales.append({"tipo": "certeza", "codigo": "muy_baja"})
        estratos = []
        if c.id in aleatorio:
            estratos.append("aleatorio")
        if c.meta.get("controversia"):
            estratos.append("controversia")
        if len(senales) >= args.senales_minimas:
            estratos.append("cribado")
        incluido = bool(estratos)
        if c.id in extra and not incluido:
            estratos = ["calibracion"]          # entra en la base sin contar en ningún estrato del estudio
        decisiones[c.id] = (b["prn"], estratos, senales, incluido)
        for e in estratos:
            por_dominio[c.meta["dominio"]][e] += 1
        por_dominio[c.meta["dominio"]]["marco"] += 1
        if incluido or c.id in extra:
            ids_refs.update(c.meta.get("referencias") or [])

    refs = referencias(corpus, ids_refs)
    for c in marco:
        p, estratos, senales, incluido = decisiones[c.id]
        f = fila(c, p, estratos, senales, incluido, refs, exigencias)
        if incluido or c.id in extra:
            filas_incluidas.append(f)
        else:
            filas_todas.append(f)

    # Diff contra lo que hay.
    if extra:
        print(f"· Extra (incluido=false, estrato calibracion): {', '.join(sorted(extra))}")
    nuevos = [f for f in filas_incluidas if f["id"] not in existentes]
    cambiados = [f for f in filas_incluidas if f["id"] in existentes and existentes[f["id"]]["hash"] != f["hash"]]
    iguales = len(filas_incluidas) - len(nuevos) - len(cambiados)
    ids_marco = {c.id for c in marco}
    retirar = sorted(i for i, c in existentes.items() if c.get("activo", True) and i not in ids_marco)
    ya_no_incluidos = sorted(i for i in existentes if i in ids_marco and i not in {f["id"] for f in filas_incluidas})

    print("\n· Muestra por dominio (marco · aleatorio · controversia · cribado):")
    for d in sorted(por_dominio):
        x = por_dominio[d]
        print(f"  {d}: {x['marco']:4d} · {x['aleatorio']:3d} · {x['controversia']:3d} · {x['cribado']:3d}")
    tot = Counter()
    for x in por_dominio.values():
        tot.update(x)
    print(f"  TOTAL: {tot['marco']} · {tot['aleatorio']} · {tot['controversia']} · {tot['cribado']} → incluidos {len(filas_incluidas)}")
    print(f"\n· Contra la base: {len(nuevos)} nuevos · {len(cambiados)} cambiados (hash) · {iguales} iguales · {len(retirar)} a retirar")
    if ya_no_incluidos:
        print(f"  ⚠ {len(ya_no_incluidos)} conceptos siguen en la base pero ya no cumplen ningún estrato (se conservan: `incluido` solo sube): {', '.join(ya_no_incluidos[:8])}{'…' if len(ya_no_incluidos) > 8 else ''}")
    if args.todos:
        print(f"  + {len(filas_todas)} conceptos del marco con incluido=false (--todos)")

    if args.simular:
        print("\n(simulación: no se ha escrito nada)")
        return 0

    lotes = filas_incluidas + (filas_todas if args.todos else [])
    cat = catalogo(corpus)
    resumen = Counter()
    for i in range(0, len(lotes), LOTE):
        lote = lotes[i:i + LOTE]
        r = api.rpc("valida_importar", {"estudio": args.estudio, "conceptos": lote, "catalogo": cat if i == 0 else [],
                                        "retirar": retirar if i == 0 else None})
        resumen.update(r or {})
        print(f"  lote {i // LOTE + 1}/{(len(lotes) + LOTE - 1) // LOTE}: {r}")
    if not lotes and retirar:
        resumen.update(api.rpc("valida_importar", {"estudio": args.estudio, "conceptos": [], "catalogo": cat, "retirar": retirar}) or {})
    api.rpc("valida_dir_estudio", {"datos": {"id": args.estudio, "corpus_commit": commit_corpus()}})
    print(f"\n✓ Importado: {dict(resumen)} · corpus {commit_corpus()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
