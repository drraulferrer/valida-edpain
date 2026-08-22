"""Números aleatorios permanentes (PRN) — la misma función que src/lib/prn.js.

    prn(semilla, id) -> float en [0, 1)

SHA-256 de "semilla|id", los 13 primeros hex (52 bits) divididos por 16**13. Trece y no
más porque es lo que un double de JavaScript representa exacto: así el número que calcula
el pipeline y el que pueda calcular el navegador son idénticos bit a bit.
"""
from __future__ import annotations

import hashlib

HEX = 13


def prn(semilla: str, id_: str) -> float:
    h = hashlib.sha256(f"{semilla}|{id_}".encode("utf-8")).hexdigest()
    return int(h[:HEX], 16) / 16 ** HEX


def muestrear(conceptos: list[dict], fraccion: float, suelo: int) -> set[str]:
    """Estratificado proporcional por dominio, con suelo. conceptos: [{id, dominio, prn}]."""
    por_dominio: dict[str, list[dict]] = {}
    for c in conceptos:
        por_dominio.setdefault(c["dominio"], []).append(c)
    incluidos: set[str] = set()
    for lista in por_dominio.values():
        ordenada = sorted(lista, key=lambda c: (c["prn"], c["id"]))
        por_fraccion = [c for c in ordenada if c["prn"] < fraccion]
        elegidos = por_fraccion if len(por_fraccion) >= suelo else ordenada[: min(suelo, len(ordenada))]
        incluidos.update(c["id"] for c in elegidos)
    return incluidos


if __name__ == "__main__":  # vectores de prueba para tests/prn.test.js
    import json
    import sys

    semilla = sys.argv[1] if len(sys.argv) > 1 else "prueba"
    ids = sys.argv[2:] or ["CPT-00001", "CPT-00002", "CPT-04030"]
    print(json.dumps({i: prn(semilla, i) for i in ids}, indent=2))
