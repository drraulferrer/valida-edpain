# ARRANQUE DE SESIÓN — valida.edpain.com

> Léelo entero antes de tocar nada. Última actualización: **22-ago-2026** (sesión de construcción).

## 1 · Qué es

Plataforma del **estudio de validez de contenido** del corpus Educación en Dolor. La evaluación
metodológica y la spec completa están en `~/specs/valida-edpain.md` (§0 tiene el veredicto en una
página y §3.8 las decisiones que siguen abiertas). El corpus vive en `~/educacion-en-dolor/`; esta
plataforma es una **proyección** suya más un almacén de respuestas del panel.

Tres estratos, analizados por separado: `aleatorio` (**12 %** por dominio con suelo 8, por números
aleatorios permanentes; decisión del 22-ago justificada en la spec §3.8), `controversia` (todos los
`controversia: true`) y `cribado` (≥ 2 señales automáticas: G11 + A6 + `certeza: muy_baja`). Hoy:
**316 + 70 + 40 = 414 conceptos** en plataforma (corpus al 80 %, commit `abfecd9`). Al 100 % serán
~500, y **la muestra crece sin re-sortear**.

## 2 · Decisiones cerradas

- **Instrumento** (decisión del 22-ago): el panel experto puntúa **3 dimensiones** en Likert 1-4 sin
  punto medio —relevancia · claridad · representatividad— y la **comprensibilidad la juzga solo el
  panel de paciente** con su instrumento. Todo en `valida.dimensiones` (datos, no código; la fila
  `comprensibilidad` tiene `quien = 'paciente'`). Representatividad absorbe corrección + evidencia
  del instrumento antiguo.
- **Exhaustividad** se pregunta por módulo (`valida.cobertura`), no por concepto.
- **Métrica de decisión**: I-CVI (Lynn; 1,00 con n ≤ 5, 0,78 con n ≥ 6) + kappa*. **Comparabilidad**:
  V de Aiken con IC 95 % ≥ 0,70 (como `consenso_metricas.py` y Di-Bonaventura 2026). Las dos en
  `src/lib/metricas.js`; cuando discrepan, se informa la discrepancia.
- **Acceso por clave**, sin Supabase Auth ni correo. Códigos, no nombres. La clave se guarda hasheada.
- **Base de datos**: el proyecto Supabase ya existente «Delphi Educación en Dolor»
  (`mmwytewpfnckymjxldye`, org `drraulferrer`, eu-west-2), esquema nuevo `valida`. Su tabla antigua
  `public.respuestas_consenso` (buzón de `consenso.py`) sigue ahí, intacta.
- **Hosting**: GitHub Pages (repo público `drraulferrer/valida-edpain`, rama `gh-pages`) con
  `valida.edpain.com`; DNS en **Cloudflare** (los NS de edpain.com están ahí; Hostinger es solo el
  registrador). Vercel queda como opción: tu cuenta está logueada en Chrome pero la app de GitHub de
  Vercel solo ve `el-gremio`; ampliar ese permiso es un OAuth que tienes que hacer tú.
- **Semilla** del estudio: `edpain-validez-2026` (en `valida.estudios`). No se cambia.

## 3 · Claves (ninguna está en el repositorio)

| Qué | Dónde |
|---|---|
| Clave de la **dirección editorial** (código `DIR-00`) | Llavero de macOS: `security find-generic-password -s valida-edpain-direccion -w` |
| Clave del **panelista de prueba** `PRU-01` (experto, D01+D02, capacidad 40) | Llavero: `security find-generic-password -s valida-edpain-prueba -w` |
| Clave anon de Supabase (pública por diseño) | `.env` (gitignored) → `VITE_SUPABASE_ANON_KEY`; también `supabase projects api-keys --project-ref mmwytewpfnckymjxldye` |
| SQL contra la base | `supabase db query --linked --project-ref mmwytewpfnckymjxldye "select …"` (o `-f fichero.sql`) |

Si una clave de panelista se pierde: panel de dirección → Panelistas → «Nueva clave» (la anterior deja
de valer). La clave de dirección se regenera con SQL: `update valida.panelistas set clave_hash =
valida.hash_clave('<nueva>') where codigo = 'DIR-00'` y se guarda en el Llavero.

## 4 · Comandos

```bash
npm run dev:demo                         # interfaz con backend en memoria (claves demo en la pantalla de entrada)
npm run dev                              # contra Supabase real
npm test · npm run verify                # tests · tests + build + secretos
python3 pipeline/importar.py --simular   # qué haría la importación (≈ 30 s: carga y valida el corpus entero)
python3 pipeline/importar.py             # importa/reimporta (idempotente, nunca borra)
python3 pipeline/exportar.py --csv       # baja todo a panel/respuestas/ (fuera de Git)
supabase db query -f supabase/schema.sql --linked --project-ref mmwytewpfnckymjxldye   # reaplicar esquema (idempotente)
npm run deploy                           # publica en GitHub Pages (exige árbol limpio y verify en verde)
```

## 5 · Flujo del estudio (lo que decides tú, y en qué orden)

1. **Calibración** (hecha el 22-ago): `CPT-00116` (definicional, referencia 4·4·4) y `CPT-00739`
   (eficacia, referencia 4·4·3 por el título sin acotar). Están importados con `incluido = false` y
   estrato `calibracion` (`importar.py --extra`), así que **no cuentan en ningún estrato ni se asignan**.
   Para cambiarlos: `valida_dir_calibracion` por RPC (sin pantalla aún).
2. **Alta del panel**: Dirección → Panelistas → Alta (código, perfil, disciplina, dominios,
   capacidad). Guarda la clave que devuelve: no se vuelve a ver.
3. **Asignar**: Dirección → Cobertura → «Asignar expertos» (k = 7, máx. 3 generalistas por concepto) y
   «Asignar pacientes» (k = 3). Es idempotente: rellena solo lo que falta. Repetir tras cada alta.
4. **Ronda 1** abierta: los panelistas entran con su clave. El panel de dirección muestra progreso,
   tiempos, cobertura y consenso en vivo.
5. **Cerrar ronda**: exportar (`pipeline/exportar.py`), revisar Consenso, reescribir lo «revisar» con
   las propuestas, abrir ronda 2 solo con esos conceptos (Dirección → Consenso → Segunda ronda).
6. **Cerrar el estudio** (Dirección → Estudio). Exportar de nuevo.

**Antes de abrir el panel real**: retirar al panelista de prueba y sus datos —

```sql
delete from valida.cobertura    where panelista_id = (select id from valida.panelistas where codigo = 'PRU-01');
delete from valida.valoraciones where panelista_id = (select id from valida.panelistas where codigo = 'PRU-01');
delete from valida.asignaciones where panelista_id = (select id from valida.panelistas where codigo = 'PRU-01');
update valida.panelistas set activo = false where codigo = 'PRU-01';
```

(Es el único borrado previsto, y es de datos de prueba. Las funciones de la plataforma no borran.)

## 6 · Gotchas encontrados construyéndolo (22-ago)

- **`supabase db query --linked --project-ref …` falla a la primera** con «Failed to create login role:
  connection timeout» y funciona al reintentar un par de veces. No es que la base esté caída
  (Auth y PostgREST responden): es el mecanismo de «login role» del CLI.
- **pgcrypto vive en el esquema `extensions`**: con `search_path = valida, public` hay que escribir
  `extensions.digest(...)` y `extensions.gen_random_bytes(...)`.
- **plpgsql y parámetros homónimos**: un parámetro `concepto_id` hace ambiguo `on conflict
  (panelista_id, concepto_id, ronda)`. Solución: `#variable_conflict use_column` en esa función y
  referencias cualificadas (`funcion.parametro`) en el resto.
- **pg_safeupdate está activo para los roles de la API** incluso dentro de SECURITY DEFINER: `delete
  from tabla_temporal` sin WHERE falla. Crear/destruir la temporal en cada llamada.
- **La cuenta de Supabase de Chrome no es la del CLI**: en «Chrome portatil» la sesión es la org
  `doctorraulferrer` (Free, 0 proyectos); los proyectos Delphi y el-gremio están en la org
  `drraulferrer`, a la que llega el CLI. Para ver Delphi en el navegador, cambiar de cuenta.
- **El número de `controversia: true` es 70, no 120**: contar con `grep` sobre todo el repo incluye
  las copias de `propuestas/`. Contar solo `conceptos/`.
- El corpus tarda ~26 s en cargar y validar (`kb.cargar_todo`); `importar.py` lo paga cada vez.

## 7 · Pendientes (ordenados)

1. **HTTPS en valida.edpain.com**: GitHub emite el certificado solo cuando ve el CNAME; el registro
   se creó el 22-ago a las ~15:15. Cuando `gh api repos/drraulferrer/valida-edpain/pages` devuelva
   `https_enforced` posible, activar con `gh api -X PUT repos/drraulferrer/valida-edpain/pages -F https_enforced=true`.
   Mientras tanto la web se sirve por http (y por https con el certificado de github.io).
2. **Decisiones tomadas el 22-ago** (spec §3.8): 3 dimensiones expertas + comprensibilidad solo paciente;
   fracción 12 %; suelo 8; nivel de calidad 0,85/IC 0,75; cribado ≥ 2 señales. Pendiente solo confirmar
   el nivel de calidad al cerrar la ronda 1.
4. **Panelista de prueba PRU-01**: retirarlo con el SQL de §5 antes de abrir el panel real.
5. **Piloto**: entra tú con la clave de PRU-01 (Llavero `valida-edpain-prueba`; tiene 40 conceptos
   asignados, 1 ya valorado de prueba) y con la de dirección (`valida-edpain-direccion`).
6. **Vercel** (opcional): ampliar el permiso de la app de GitHub de Vercel al repo `valida-edpain` e
   importarlo; `vercel.json` no existe aún (copiar el de `~/vulpex/app/` con las cabeceras de seguridad).
7. **Informe del estudio**: `pipeline/informe.py` (CREDES + tabla de flujo + I-CVI/V por estrato) no está
   escrito; `exportar.py --csv` ya deja los datos listos para R/pandas.
8. **Corpus al 100 %**: `python3 pipeline/importar.py --simular` y luego sin `--simular`. La muestra crece
   sola; ejecutar después `Asignar expertos` en Cobertura para rellenar jueces de los conceptos nuevos.

## 8 · Dónde lo dejamos

### Sesión 2 (22-ago-2026, tarde) · decisiones y calibración

- Dirección editorial decide: **3 dimensiones** para el experto (comprensibilidad → solo panel de
  paciente), **fracción 12 %** (justificación por margen de error tras pérdidas, spec §3.8) y
  **calibración** con `CPT-00116` y `CPT-00739`. Todo aplicado en la base y desplegado.
- Reimportación con 0,12: **+41 aleatorios** (316 + 70 + 40 = **414**), sin mover nada de lo anterior
  (monotonía PRN comprobada: 373 iguales, 0 cambiados).
- `importar.py --extra` importa conceptos concretos fuera de los estratos (para calibración).
- Clave de PRU-01 probada en la web real (ver al final de la sesión en el chat).
- **Textos de la dirección editorial** para la pantalla de instrucciones, las afirmaciones/ayudas de las
  cuatro dimensiones (en `valida.dimensiones` y en `demo.js`) y las cuatro banderas (`Banderas.jsx`).
  La spec §2.5 conserva las definiciones operativas originales; la interfaz usa la redacción editorial.
- **Presentación del concepto** (petición de la dirección): citas en el texto en APA 7 (autor, año)
  enlazadas a la lista de referencias, DOI y PMID como hipervínculos en esa lista, conceptos citados
  por su título entre comillas, y en la cabecera el grado de **certeza** y el nivel de **madurez** con
  su significado (`src/lib/escalas.js`, copiado de `vocabularios.yaml`/`certeza.yaml`/PMD §7.3; la
  previa los explica en una tarjeta). La base guarda ahora `madurez` y `conceptos_citados`, y cada
  referencia lleva `parentetica`/`narrativa`/`doi`/`pmid` (las calcula `apa.py` del corpus).
- **Ajustes posteriores de la dirección (misma tarde):** las citas en el texto van **sin paréntesis**,
  como marcador enlazado **al DOI** del artículo (o a su URL; si no hay, a la entrada de la lista);
  la marca «[autoría truncada en la fuente]» se sustituye por «et al.»; la lista de referencias no
  muestra la nota de uso (sigue en la base, por si la dirección la necesita); y la sustitución por
  nombre cubre **todas** las entidades citadas por código (conceptos, errores frecuentes,
  metáforas, objetivos, competencias, instrumentos, módulos y dominios) — columna
  `entidades_citadas` y `RE_ENTIDAD` en `pipeline/importar.py` y `src/lib/texto.js`.

### Sesión 1 (22-ago-2026) · construcción y despliegue

- **Hecho**: evaluación metodológica + spec (`~/specs/valida-edpain.md`, publicada también como
  artefacto); esquema SQL aplicado en Supabase y probado de extremo a extremo con datos reales;
  **373 conceptos importados** (corpus `0746d88`); app del panelista (wizard experto y paciente),
  panel de dirección (6 pestañas), pipeline importar/exportar, 46 tests en verde, verificación en
  navegador (modo demo) de entrada → perfil → instrucciones → calibración → bloque → wizard
  (incluido el ajuste obligatorio con un 2) → banderas, y del panel de dirección (Resumen, Consenso).
- **Desplegado**: repo público `github.com/drraulferrer/valida-edpain` (rama `main` + `gh-pages`),
  GitHub Pages con `cname = valida.edpain.com`, CNAME en Cloudflare (solo DNS). Commit publicado: `598026b`.
- **Bugs reales encontrados y corregidos en el camino**: `digest()` fuera de `search_path`
  (pgcrypto en `extensions`); `on conflict` ambiguo con parámetros homónimos en tres funciones;
  `delete` sin WHERE bloqueado por pg_safeupdate en `valida_dir_asignar`; clics rápidos en las
  escalas que se pisaban (estado vivo en `vRef`); `#/instrucciones` sin `primeraVez`; el panel de
  paciente no veía sus instrucciones.
- **Gotcha de verificación**: `form_input` del navegador integrado no dispara el `onChange` de
  React; para probar hay que usar clics reales o eventos nativos con `dispatchEvent`.
