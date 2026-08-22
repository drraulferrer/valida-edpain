# ARRANQUE DE SESIÓN — valida.edpain.com

> Léelo entero antes de tocar nada. Última actualización: **22-ago-2026** (sesión 3: Resend, panel de paciente).

## 1 · Qué es

Plataforma del **estudio de validez de contenido** del corpus Educación en Dolor. La evaluación
metodológica y el protocolo completo están en `~/specs/valida-edpain.md` (**v0.3**: §0 el veredicto en una
página, §3.8 las decisiones tomadas y §4 reclutamiento, consentimiento y plazos). Publicado también como
artefacto: https://claude.ai/code/artifact/48d28491-3ca2-4d43-a155-6bedb7e1d422 — **al cambiar una decisión
metodológica hay que actualizar los dos**, con `python3 spec_a_html.py` en el scratchpad de la sesión. El corpus vive en `~/educacion-en-dolor/`; esta
plataforma es una **proyección** suya más un almacén de respuestas del panel.

Tres estratos, analizados por separado: `aleatorio` (**12 %** por dominio con suelo 8, por números
aleatorios permanentes; decisión del 22-ago justificada en la spec §3.8), `controversia` (todos los
`controversia: true`) y `cribado` (≥ 2 señales automáticas: G11 + A6 + `certeza: muy_baja`). Hoy:
**316 + 70 + 40 = 414 conceptos** en plataforma (corpus al 80 %, commit `abfecd9`). Al 100 % serán
~500, y **la muestra crece sin re-sortear**.

## 2 · Decisiones cerradas

- **Instrumento** (decisión del 22-ago, revisada esa misma noche): el panel experto puntúa
  **3 dimensiones** en Likert 1-4 sin punto medio —relevancia · claridad · representatividad— y la
  **comprensibilidad la juzga solo el panel de paciente**, ahora también en **Likert 1-4 de acuerdo**
  y con **tres ítems**: `comprensibilidad` («se entiende»), `palabras` (vocabulario) y `orden`
  (organización). Todo en `valida.dimensiones` (datos, no código; las tres filas tienen
  `quien = 'paciente'`). Representatividad absorbe corrección + evidencia del instrumento antiguo.
  Base de los tres ítems y de la escala, en el comentario largo del `insert` al final de
  `supabase/schema.sql`: dominios de *understandability* del **PEMAT-P** (Shoemaker, Wolf & Brach
  2014) y validación con panel de pacientes en Likert de 4 puntos + CVI (Cho et al. 2023; ETHIC,
  Cocchi et al. 2023), sobre la escala de 4 puntos sin punto medio de Lynn / Polit & Beck que ya
  usaba el panel experto. **El efecto afectivo («cómo te deja») y las banderas de veto NO son
  dimensiones**: no entran en el CVI, son la red de seguridad (un solo veto obliga a reescribir).
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
| **API key de Resend** (envío de avisos) | Llavero: `security find-generic-password -s valida-edpain-resend -w` · permiso «Sending access», limitada a edpain.com |
| Remitente de los avisos (opcional) | Llavero: `valida-edpain-remitente`; por defecto `Estudio EdPain <estudio@edpain.com>` |
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

## 5b · Perfil del panelista y convocatoria pública (22-ago, tarde)

- **Perfil obligatorio antes de validar** (`src/lib/perfil.js`, `Perfil.jsx`), con consentimiento. Base:
  criterios de **Fehring (1987)** para paneles de validez de contenido (titulación, formación específica en el
  área, práctica, publicaciones, investigación; 0–14, experto ≥ 5), recomendaciones **CREDES** (describir el
  panel) y las variables del Delphi de educación en dolor (Di-Bonaventura 2026). Se guarda en
  `valida.panelistas.perfil_datos` (jsonb; `perfil` es el rol). El panel de paciente tiene un perfil breve.
- **Convocatoria pública** (`#/participar`): con `estudios.inscripcion_abierta = true`, cualquiera rellena el
  perfil; `valida_solicitar` calcula la puntuación de Fehring **en el servidor** (`valida.fehring`, misma
  regla que `perfil.js`), y solo si ≥ `fehring_minimo` crea el panelista (código PAN-nn correlativo), devuelve
  la clave una vez y le asigna bloque (`valida.asignar_a`). Salvaguardas: `codigo_invitacion` (va en el mensaje
  de la convocatoria) y `tope_solicitudes_dia`. Todo se configura en Dirección → Estudio; las solicitudes
  (aceptadas y rechazadas, sin datos identificativos) quedan en `valida.solicitudes`.
- Dirección → Panelistas muestra la puntuación de Fehring de cada experto y el resumen de su perfil.

## 5c · Identidad, hoja de información y estética (22-ago, noche)

- **Estética «Clinical Serenity»** (del export de Stitch, `~/Downloads/stitch_educaci_n_en_dolor_builder.zip`):
  teal #2F7F8F (hover #1D5866), oro editorial #C9A227, coral #C25E4A solo para lo crítico, verde #4A8A63,
  neutros cool-slate sobre lienzo #F5F8FA con tarjetas blancas; **Chivo** para titulares e **Inter** para
  leer (Google Fonts en `index.html`); radios 12 px (controles) y 16 px (contenedores); sombras casi
  imperceptibles; foco con halo del 15 %. Todo por variables en `src/estilo.css`, con tema oscuro derivado.
- **Identidad separada de las valoraciones** (`valida.identidades`): nombre, apellidos, correo, filiación,
  ORCID y DOI. **No** viaja en `valida_dir_datos` ni en las exportaciones —el conjunto de análisis queda
  seudonimizado— y se consulta con `valida_dir_identidades` desde Dirección → Panelistas → «Ver identidades».
  Los DOI son obligatorios si se declaran publicaciones sobre educación en dolor (verificación a posteriori).
- **Hoja de información al participante** (`src/componentes/HojaInformacion.jsx`): 8 apartados estándar
  (objetivo, participación, voluntariedad, riesgos, autoría de grupo, RGPD con base jurídica/derechos/AEPD,
  difusión y verificación) + consentimiento explícito. Los datos concretos —IP, contacto, comité, nombre del
  grupo— viven en `valida.estudios` y se editan en Dirección → Estudio → «Ficha del estudio».
- **Autoría**: quien complete todas las rondas entra en el **Grupo del Estudio EdPain** (criterio ICMJE de
  autoría de grupo); se dice en el formulario y en la hoja.
- **Correo del estudio**: `estudio@edpain.com` → drraulferrer@gmail.com por **Cloudflare Email Routing**
  (regla activa, MX y SPF propagados el 22-ago; el gmail no aparece en ninguna parte de la web).
- **Envío de la clave**: la pantalla de alta ofrece copiarla y «Preparar el correo» (mailto con la clave, el
  enlace y el contacto ya escritos). **No hay envío automático desde el servidor**: haría falta un proveedor
  (Resend/SES) con dominio verificado y una clave API; Cloudflare Email Routing solo recibe.
- **Código de pruebas** (`estudios.codigo_pruebas`): funciona aunque la inscripción esté cerrada, marca al
  panelista `es_prueba` y la dirección lo borra con todo su rastro (`valida_dir_borrar_prueba`).

## 5d · Plazos, avisos y cuenta atrás (22-ago, noche)

- **Calendario de rondas** (`valida.rondas`): cada ronda tiene apertura y cierre. El cierre es un **tope
  duro**: pasado, `valida_guardar` rechaza cualquier valoración. Se edita en Dirección → «Plazos y avisos».
- **Plazo personal** (`valida.plazos`, por panelista y ronda): arranca cuando se le asigna el bloque —o
  cuando se registra— y dura `estudios.plazo_dias` (10 por defecto). Se amplía uno a uno desde el panel
  (`valida_dir_plazo`, botón «+7 días» o número exacto) sin tocar a los demás. Vencido, tampoco deja guardar,
  con un mensaje que remite a la dirección.
- **Cuenta atrás visible arriba**: marcador en la cabecera («10 días» / «último día» / «plazo terminado», en
  teal → oro → coral) y frase completa con barra de progreso en la pantalla del bloque
  (`src/componentes/CuentaAtras.jsx`). Los días los calcula **el servidor** (`valida.plazo_de`), no el
  navegador: el reloj del panelista no decide plazos.
- **Avisos automáticos** a la mitad del plazo, a 3 días, el último día y al vencer, con cuántos conceptos le
  faltan. Se calculan al vuelo (`valida_dir_avisos`) y **solo salen si quedan pendientes**: quien termina su
  bloque deja de recibirlos sin que nadie los cancele. `valida_dir_marcar_avisos` evita repetirlos; ampliar
  el plazo los reinicia.
- **Envío**: `pipeline/avisos.py` (`--simular` para ver a quién y con qué texto; `--probar-envio CORREO`
  para mandar uno de prueba sin tocar la base). **Ya está montado sobre Resend** (ver §5f): coge la API key
  del Llavero, manda por la API HTTP y marca los avisos para que no se repitan. Si algún día se cambia de
  proveedor, sigue aceptando un SMTP en `valida-edpain-smtp` = `servidor|puerto|usuario|clave|remitente`.

## 5e · Control de reintentos en la convocatoria (22-ago, noche)

Quien no alcanza el criterio de Fehring y **vuelve a enviar la solicitud con los datos retocados**
hasta que le sale, no se da de alta: `valida_solicitar` compara el **hash del correo** con los
intentos anteriores y, si ya hubo un rechazo, registra el reenvío como `bloqueada` y devuelve
`{aceptado: false, bloqueado: true}`. La web dice solo «No es posible tramitar esta solicitud» y
remite al correo del estudio; **no se explica en ningún sitio que exista este control**, ni antes ni
después. Por eso la pantalla de rechazo ya no ofrece «Corregir mis datos»: invitaba justo a eso.
El mismo mecanismo evita duplicados: si el correo ya está dado de alta, responde `ya_registrado`.
La dirección lo ve **destacado en el Resumen**: contador en oro y una tarjeta con cada caso —fecha, nombre,
correo, disciplina y el salto de puntuación entre los dos envíos («pasó de 0 a 14 puntos»)— y un botón
«Escribirle» con el mensaje ya redactado para pedirle que confirme sus datos. Está pensado justo para el
caso honrado: quien se equivocó al marcar una casilla aparece ahí y se le puede dar de alta a mano desde
Panelistas. También queda el recuento en Estudio.
El código de pruebas queda exento (si no, no se podría ensayar el circuito).

## 5f · Correo saliente con Resend (22-ago, sesión 3)

Los avisos ya se pueden mandar solos. Montaje:

- **Dominio `edpain.com` verificado en Resend**, región **Ireland (eu-west-1)** —el estudio es RGPD, así
  que el envío no sale de la UE—. Cuenta `doctorraulferrer@gmail.com`.
- **DNS en Cloudflare** (importados de una vez con «Importar» y un fichero de zona BIND, que es mucho más
  fiable que el formulario de «Agregar registro»):

  | Tipo | Nombre | Contenido |
  |---|---|---|
  | TXT | `resend._domainkey` | clave pública DKIM (RSA 1024) |
  | MX 10 | `send` | `feedback-smtp.eu-west-1.amazonses.com` |
  | TXT | `send` | `v=spf1 include:amazonses.com ~all` |
  | TXT | `_dmarc` | `v=DMARC1; p=none;` |

- **Los MX de la raíz NO se tocan.** Resend pone sus registros bajo `send.edpain.com`, así que Cloudflare
  Email Routing sigue recibiendo en `estudio@edpain.com` y las respuestas de los panelistas llegan igual.
  Comprobado con `dig +short MX edpain.com` (siguen los `route*.mx.cloudflare.net`).
- **API key** `valida-edpain-avisos`, permiso **«Sending access»** y limitada a **edpain.com** (no puede
  gestionar dominios ni crear otras claves). Vive en el Llavero como `valida-edpain-resend`, nunca en el repo.
- **Sin seguimiento de aperturas ni de clics**: no hay subdominio de tracking (`links.edpain.com` no existe)
  y los avisos se mandan en **texto plano**, así que no hay reescritura de enlaces ni píxel de apertura.
  Es deliberado: rastrear quién abre sería tratamiento de datos personales no declarado en la hoja de
  información.
- **Comprobar que la clave sigue viva sin mandar nada**: un `POST /emails` con un remitente ajeno responde
  `422` (validación) si la clave es buena y `401` si no lo es.

```bash
python3 pipeline/avisos.py --simular                      # a quién y con qué texto
python3 pipeline/avisos.py --probar-envio tu@correo.com   # un correo de prueba, sin tocar la base
python3 pipeline/avisos.py                                # envía de verdad y marca
```

## 6 · Gotchas encontrados construyéndolo (22-ago)

- **`supabase db query --linked --project-ref …` falla a la primera** con «Failed to create login role:
  connection timeout» y funciona al reintentar un par de veces. No es que la base esté caída
  (Auth y PostgREST responden): es el mecanismo de «login role» del CLI.
- **Cloudflare Email Routing: «Registros DNS · Bloqueado» NO es un error**: significa que los MX/TXT los
  gestiona Cloudflare y están puestos. Comprobar con `dig +short MX edpain.com`.
- **La columna `perfil` de `panelistas` es el ROL** (experto/paciente/dirección); los datos del perfil van en
  `perfil_datos`. Un `add column if not exists perfil jsonb` no falla: simplemente no hace nada, y el
  siguiente `update` mete JSON en el rol y viola el check.
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
- **`valida_dir_estudio` tenía una línea copiada de `valida_dir_panelista`** (`plazo_dias_propio`, que es
  columna de `panelistas`, no de `estudios`): «Guardar configuración» fallaba SIEMPRE con
  `column "plazo_dias_propio" does not exist`. plpgsql no valida el cuerpo al crear la función, así que
  el error solo aparece al ejecutarla. Arreglado. En el mismo repaso: `codigo_pruebas` estaba en el
  formulario pero la función nunca lo escribía (se guardaba en silencio sin guardarse).
- **«Asignar pacientes» no estaba roto: no había a quién asignar.** Con 0 panelistas de perfil paciente
  devolvía `asignadas: 0` y un mensaje neutro, que se lee como «el botón no hace nada». Ahora la RPC
  devuelve también `panelistas_activos` y `capacidad_libre`, y la pantalla distingue los tres casos
  (nadie de alta · todos a tope de capacidad · asignado bien).
- **Los formularios del panel de Cloudflare y de Resend se resisten a la automatización**: los `<select>`
  son listboxes de Radix que ignoran los clics sintéticos y el `Esc` cierra el diálogo entero. Para DNS,
  usar «Importar» con un fichero de zona BIND; para los desplegables, clic real por coordenadas y
  comprobar el estado leyendo `[role=combobox]` antes de enviar.

## 7 · Pendientes (ordenados)

1. ~~**HTTPS en valida.edpain.com**~~ **RESUELTO el 22-ago por la noche.** El certificado no salía solo
   (`https_certificate: null` durante horas). Lo que lo destrabó fue **quitar y volver a poner el dominio
   por la API** —el equivalente de tocarlo en Settings → Pages—, y en segundos pasó a `authorized` y luego
   a `approved`:

   ```bash
   gh api -X PUT repos/drraulferrer/valida-edpain/pages -f cname=""
   gh api -X PUT repos/drraulferrer/valida-edpain/pages -f cname="valida.edpain.com"
   gh api -X PUT repos/drraulferrer/valida-edpain/pages -F https_enforced=true
   ```

   Ahora `https://valida.edpain.com` responde 200 y el http redirige con un 301. Importa: por ahí viajan
   las claves de acceso de los panelistas.
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

### Sesión 3 (22-ago-2026, noche) · Resend, panel de paciente y dos bugs

- **Resend en marcha** (§5f): dominio verificado, DNS en Cloudflare, API key acotada en el Llavero y
  `pipeline/avisos.py` reescrito para mandar por la API HTTP de Resend (el SMTP sigue como alternativa).
- **Dos bugs reales del panel de dirección**: la línea `plazo_dias_propio` que rompía «Guardar
  configuración» y el `codigo_pruebas` que no se guardaba (§6).
- **«Asignar pacientes»**: no había ningún panelista de perfil paciente dado de alta en la base real, así
  que el botón asignaba 0 sin explicar nada. Ahora lo dice y remite al alta.
- **Panel de paciente**: ve **solo** el texto llano. Se le retiró el título del concepto (que es la
  afirmación técnica del corpus) de la pantalla del concepto, de la lista del bloque y del propio JSON que
  manda el servidor (`concepto_json` y `valida_bloque`), para no anclar el juicio de comprensibilidad al
  lenguaje profesional que precisamente se está poniendo a prueba. En su bloque los textos se numeran
  («Texto 1»), sin código de concepto.
- **Comprensibilidad en Likert 1-4** y en tres ítems (PEMAT-P), con I-CVI y V de Aiken calculados por el
  mismo código que las dimensiones expertas. `metricas.paciente()` ya no puntúa `sí/casi/no`.
- 80 tests en verde, build limpio, sin secretos en el bundle.



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
- **Exhaustividad juzgable**: la pantalla de fin de módulo enseña ahora el módulo entero —nombre, foco
  y la lista de TÍTULOS de todos sus conceptos del corpus, marcando los valorados— antes de la
  pregunta. Datos: `valida.catalogo.foco` y `valida.catalogo.conceptos` (solo títulos, sin texto),
  RPC `valida_modulo`. La decisión de la dirección fue «o se ven todos los títulos o se elimina».
- **HTTPS**: GitHub no había emitido el certificado a las 17:30 (`https_certificate: null`) pese a que el
  CNAME lleva horas resolviendo; se re-fijó el dominio por la API y queda un vigilante en la sesión que
  activa `https_enforced` en cuanto el certificado aparezca. Si al retomar sigue sin HTTPS: en GitHub →
  Settings → Pages, quitar y volver a poner `valida.edpain.com` fuerza la emisión.
- **Panel de dirección → Panelistas**: botón «Conceptos» por evaluador que despliega su bloque (por
  módulo, en su orden, con estado y puntuaciones). `valida_dir_datos` devuelve ahora también
  `asignaciones`. Acceso: `http://valida.edpain.com/#/direccion` con la clave del Llavero
  `valida-edpain-direccion` (código DIR-00).

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
