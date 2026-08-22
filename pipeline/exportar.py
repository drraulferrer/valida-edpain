#!/usr/bin/env python3
"""Baja TODO lo que hay en la plataforma a `panel/respuestas/valida-<fecha>.json`.

    python3 pipeline/exportar.py
    python3 pipeline/exportar.py --csv      # además, valoraciones.csv aplanado

`panel/` está fuera de Git: las respuestas del panel son el único dato del estudio que no
se regenera desde el corpus. Conviene exportar al cerrar cada ronda y guardar el fichero
en el mismo sitio que `~/educacion-en-dolor/panel/respuestas/`.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importar import RAIZ, Api, clave_direccion, leer_env  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", action="store_true")
    ap.add_argument("--destino", default=str(RAIZ / "panel" / "respuestas"))
    args = ap.parse_args()
    env = leer_env()
    api = Api(env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"], clave_direccion())
    datos = api.rpc("valida_dir_datos", {})
    destino = Path(args.destino)
    destino.mkdir(parents=True, exist_ok=True)
    hoy = date.today().isoformat()
    ruta = destino / f"valida-{hoy}.json"
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=1))
    print(f"✓ {ruta} · {len(datos['valoraciones'])} valoraciones · {len(datos['conceptos'])} conceptos · {len(datos['panelistas'])} panelistas")
    if args.csv:
        dims = [d["clave"] for d in datos["estudio"]["dimensiones"]]
        ruta_csv = destino / f"valoraciones-{hoy}.csv"
        with ruta_csv.open("w", newline="") as f:
            w = csv.writer(f)
            # Las dimensiones de paciente (comprensibilidad, palabras, orden) salen en `dims`
            # como cualquier otra: son Likert 1-4. Del bloque `paciente` solo quedan el efecto
            # afectivo y los vetos, que no son escalas de acuerdo.
            w.writerow(["valoracion_id", "panelista", "perfil", "concepto_id", "ronda", "hash_concepto", *dims,
                        "abstencion", "motivo_abstencion", "banderas", "comentario", "n_ajustes",
                        "paciente_efecto", "paciente_vetos", "completa", "tiempo_ms", "actualizada_en"])
            for v in datos["valoraciones"]:
                p = v.get("paciente") or {}
                w.writerow([v["id"], v["panelista"], v["perfil"], v["concepto_id"], v["ronda"], v["hash_concepto"],
                            *[(v.get("puntuaciones") or {}).get(d) for d in dims],
                            v["abstencion"], v.get("motivo_abstencion"), json.dumps(v.get("banderas") or {}, ensure_ascii=False),
                            v.get("comentario"), len(v.get("ajustes") or []), p.get("efecto"),
                            "|".join(p.get("vetos") or []), v["completa"], v.get("tiempo_ms"), v.get("actualizada_en")])
        print(f"✓ {ruta_csv}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
