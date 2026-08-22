# Valida · plataforma de validez de contenido del corpus Educación en Dolor

Plataforma web con la que un panel de personas expertas y de personas con dolor valida una
muestra del corpus de `~/educacion-en-dolor/` (estudio de validez de contenido: I-CVI,
kappa*, V de Aiken con IC 95 %). Wizard progresivo para el panel, panel de dirección para
seguir el estudio, pipeline de importación/exportación contra el corpus.

- **Spec y evaluación metodológica:** `~/specs/valida-edpain.md`
- **Continuidad entre sesiones:** `ARRANQUE-SESION.md` (leer antes de tocar nada)
- **Web:** https://valida.edpain.com · **Base de datos:** Supabase «Delphi Educación en Dolor» (`mmwytewpfnckymjxldye`, eu-west-2)

## Arrancar

```bash
npm install
npm run dev:demo        # backend en memoria, sin red: demo-expe-rto1 · demo-paci-ent1 · demo-dire-cci1
npm run dev             # contra Supabase (.env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY)
npm test                # vitest
npm run verify          # tests + build + comprobación de secretos
npm run deploy          # GitHub Pages (rama gh-pages) con CNAME valida.edpain.com
```

## Cómo está hecho

```
src/
  App.jsx                    rutas por hash y sesión (#/ · #/bloque · #/c/<id> · #/modulo/<id> · #/fin · #/direccion)
  lib/api.js                 la única puerta a los datos: RPC valida_* (o demo.js con VITE_DEMO=1)
  lib/metricas.js            I-CVI · kappa* · V de Aiken + IC · clasificación · S-CVI · tasa de validez (Wilson)
  lib/prn.js                 números aleatorios permanentes (igual que pipeline/prn.py)
  lib/texto.js               Markdown del corpus → HTML seguro
  pantallas/                 Entrada · Perfil · Instrucciones · Calibracion · Bloque · Concepto (wizard) · FinModulo · Cierre
  pantallas/direccion/       Resumen · Panelistas · Cobertura · Consenso · Propuestas · Estudio
supabase/schema.sql          esquema `valida` (no expuesto) + funciones public.valida_* SECURITY DEFINER
pipeline/importar.py         corpus → Supabase (PRN, estratos aleatorio/controversia/cribado, lotes, --simular)
pipeline/exportar.py         Supabase → panel/respuestas/valida-<fecha>.json (+ --csv)
tests/                       métricas, PRN, texto, flujo del panelista, panel de dirección
```

**Acceso sin cuentas.** Cada panelista tiene una clave (`xxxx-xxxx-xxxx`, ~58 bits) y un código
público (`PAN-17`). La base guarda solo el hash de la clave; todas las lecturas y escrituras pasan
por funciones RPC que la comprueban. Ni `anon` ni `authenticated` pueden tocar el esquema `valida`.

**Nadie publica.** La plataforma recoge juicios y propuestas; el corpus lo cambia una persona.
Ninguna función borra valoraciones; lo que sale del corpus se marca inactivo.

## Licencia

Código: MIT. El contenido del corpus no está en este repositorio ni en el bundle: vive en la base
de datos y solo lo ven los panelistas a los que se les asigna.
