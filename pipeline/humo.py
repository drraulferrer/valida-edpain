#!/usr/bin/env python3
"""Chequeo de humo: llama a todas las RPC y dice cuáles revientan.

    python3 pipeline/humo.py

POR QUÉ EXISTE. plpgsql **no valida el cuerpo de una función al crearla**: una columna que no
existe o un `on conflict` ambiguo se crean sin protestar y solo fallan el día que alguien pulsa
el botón. En una sola sesión aparecieron tres así, y ninguno lo podían coger los tests de JS
porque el backend de demostración no reproduce el SQL:

  · `valida_dir_estudio` escribía `plazo_dias_propio`, que es columna de `panelistas`
    → «Guardar configuración» fallaba siempre.
  · `valida_dir_estudio` no escribía `codigo_pruebas` → se guardaba sin guardarse.
  · `valida_dir_marcar_avisos` tenía `tipo` ambiguo en el `on conflict` → los avisos se
    mandaban y NO se marcaban, así que se habrían repetido cada día.

Este script recorre las RPC con argumentos inocuos y comprueba que responden. No es un test de
lógica: es un detector de funciones rotas. Se pasa después de cada `supabase db query -f
supabase/schema.sql` y antes de abrir una ronda.

QUÉ TOCA Y QUÉ NO. Solo lectura e idempotencias. La única escritura es reescribir el estudio
con sus propios valores (`valida_dir_estudio` con lo que ya tiene), que es como pulsar «Guardar»
sin cambiar nada. No da de alta a nadie, no asigna, no borra y no manda correos.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importar import Api, ErrorApi, clave_direccion, leer_env  # noqa: E402

VERDE, ROJO, GRIS, FIN = "\033[32m", "\033[31m", "\033[90m", "\033[0m"


def main() -> int:
    env = leer_env()
    api = Api(env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"], clave_direccion())

    print("· Cargando el estado del estudio…")
    try:
        datos = api.intentar("valida_dir_datos", {})
    except ErrorApi as e:
        print(f"{ROJO}✗ no responde · {e}{FIN}")
        print("  Sin esto no se puede comprobar nada más. Revisa la clave de dirección y el esquema.")
        return 1

    estudio = datos["estudio"]
    panelistas = datos["panelistas"]
    conceptos = datos["conceptos"]
    un_codigo = next((p["codigo"] for p in panelistas if p["perfil"] != "direccion"), None)
    un_concepto = conceptos[0]["id"] if conceptos else None

    # Cada prueba: (nombre, argumentos, comentario si no se puede probar).
    pruebas: list[tuple[str, dict | None, str]] = [
        ("valida_dir_datos", {}, ""),
        # Reescribir el estudio con SUS PROPIOS valores: idéntico a pulsar «Guardar» sin tocar nada.
        ("valida_dir_estudio", {"datos": {k: estudio[k] for k in (
            "id", "nombre", "corpus_commit", "k_jueces", "k_paciente", "capacidad",
            "capacidad_paciente", "plazo_dias", "fehring_minimo", "tope_solicitudes_dia",
            "investigador_principal", "contacto_email", "grupo_autoria",
            "codigo_invitacion", "codigo_pruebas", "comite_etica", "inscripcion_abierta",
        ) if k in estudio}}, ""),
        ("valida_dir_avisos", {}, ""),
        ("valida_dir_identidades", {}, ""),
        ("valida_dir_concepto", {"concepto_id": un_concepto} if un_concepto else None,
         "no hay conceptos importados"),
        # Marcar con una lista vacía: ejercita el INSERT ... ON CONFLICT sin escribir ninguna fila.
        ("valida_dir_marcar_avisos", {"codigos": [], "tipo": "mitad"}, ""),
        # Reponer el plazo del panelista al que ya tiene: no cambia nada pero ejercita la función.
        ("valida_dir_plazo", {"codigo": un_codigo, "dias": estudio.get("plazo_dias", 10),
                              "motivo": "chequeo de humo"} if un_codigo else None,
         "no hay ningún panelista dado de alta"),
    ]

    fallos = 0
    saltadas = 0
    for nombre, args, motivo in pruebas:
        if args is None:
            print(f"  {GRIS}· {nombre}: sin probar ({motivo}){FIN}")
            saltadas += 1
            continue
        try:
            api.intentar(nombre, args)
            print(f"  {VERDE}✓{FIN} {nombre}")
        except ErrorApi as e:
            print(f"  {ROJO}✗ {e}{FIN}")
            fallos += 1

    # Las dimensiones son datos, no código, pero si faltan el wizard se queda en blanco.
    dims = estudio.get("dimensiones") or []
    por_quien = {q: [d["clave"] for d in dims if d["quien"] == q] for q in ("experto", "paciente")}
    print(f"\n· Dimensiones: experto {por_quien['experto']} · paciente {por_quien['paciente']}")
    for quien, claves in por_quien.items():
        if not claves:
            print(f"  {ROJO}✗ no hay ninguna dimensión para el perfil «{quien}»: su wizard saldría vacío{FIN}")
            fallos += 1

    print()
    if fallos:
        print(f"{ROJO}✗ {fallos} problema(s). Reaplica supabase/schema.sql y vuelve a pasarlo.{FIN}")
        return 1
    print(f"{VERDE}✓ Todas las RPC responden{FIN}" + (f" ({saltadas} sin probar)" if saltadas else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
