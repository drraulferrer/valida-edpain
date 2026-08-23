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
- **Base de datos**: proyecto Supabase **`valida-edpain`** (`nnelofgevsvdaiaryjbk`, org `drraulferrer`,
  **eu-west-3 = París**), esquema `valida`. Migrado el 22-ago desde «Delphi Educación en Dolor»
  (`mmwytewpfnckymjxldye`, eu-west-2 = **Londres**), que queda **pausado** como marcha atrás. Se movió
  porque los datos de salud del panel de paciente no pueden salir de la UE, y eu-west-2 es Reino Unido.
  Detalle de la migración en §5h. El buzón `public.respuestas_consenso` (de `consenso.py`, del repo
  del corpus) **también se recreó** en el proyecto nuevo, ya no a mano: lo crea
  `~/educacion-en-dolor/build/consenso_buzon.sql`, y `panel/envio.yaml` y el Llavero
  `supabase-consenso` apuntan ya a París.
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
| Clave anon de Supabase (pública por diseño) | `.env` (gitignored) → `VITE_SUPABASE_ANON_KEY`; también `supabase projects api-keys --project-ref nnelofgevsvdaiaryjbk` |
| **API key de Resend** (envío de avisos) | Llavero: `security find-generic-password -s valida-edpain-resend -w` · permiso «Sending access», limitada a edpain.com |
| Remitente de los avisos (opcional) | Llavero: `valida-edpain-remitente`; por defecto `Estudio EdPain <estudio@edpain.com>` |
| SQL contra la base | `supabase db query --linked --project-ref nnelofgevsvdaiaryjbk "select …"` (o `-f fichero.sql`) |

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
python3 pipeline/humo.py                 # ¿responden todas las RPC? (pasar tras cada schema.sql)
python3 pipeline/respaldo.py --estado    # ¿toca respaldo? (no toca nada)
python3 pipeline/respaldo.py --ahora     # respaldo cifrado ya mismo
python3 pipeline/avisos.py --simular     # a quién avisaría hoy y con qué texto
supabase db query -f supabase/schema.sql --linked --project-ref nnelofgevsvdaiaryjbk   # reaplicar esquema (idempotente)
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

## 5e-bis · Convocatoria de pacientes y su conjunto mínimo de datos (22-ago, sesión 3)

`#/participar` pregunta primero **quién eres** y bifurca. Los dos paneles se abren y se cierran
por separado desde Dirección → Estudio. Enlace directo para carteles y asociaciones:
**`#/participar/paciente`**.

**Al paciente NO se le puntúa.** Fehring mide expertise profesional; aplicárselo a quien participa
por su experiencia vivida dejaría fuera justo a quien hace falta para saber si un texto se
entiende. La puerta es de **elegibilidad**, no de nota: 18 años o más, **dolor de 3 meses o más**
—definición de dolor crónico de la IASP para la CIE-11 (Treede et al., *Pain* 2019)— y
consentimiento. El control de reintentos tampoco le aplica: no hay nota que inflar.

**Qué se le pregunta y de dónde sale** (todo en `src/lib/perfil.js`, con la justificación en su
cabecera; la misma regla de elegibilidad está duplicada a propósito en `valida.elegible_paciente`
para que el servidor no dependa del navegador):

| Bloque | Qué | Base |
|---|---|---|
| Quién es | **fecha de nacimiento**, **sexo**, estudios, situación laboral | GRIPP2: describir quién participó |
| Temporalidad | cuánto tiempo, con qué frecuencia | CIE-11 (≥ 3 meses); modelo de «dos preguntas» del NIH Task Force |
| Localización | zonas del cuerpo | familias de la CIE-11, en lenguaje llano |
| Diagnóstico | qué le han dicho (multi) + «no me han dado ninguno» + si se lo explicaron | CIE-11 primario/secundario |
| Impacto | **EGDC** (Escala de Gradación del Dolor Crónico): 3 de intensidad + 3 de discapacidad (0-10) + días de actividad perdidos → grado 0-IV | Von Korff et al., *Pain* 1992 |
| Ánimo | **GAD-7** (7 ítems, ansiedad) + **PHQ-9** (9 ítems, depresión); cribados, no diagnósticos | Spitzer et al. 2006 · Kroenke et al. 2001 |
| Tratamientos | qué ha probado (multi) + quién le lleva | conjunto mínimo del NIH Task Force |
| Educación previa | si le han explicado el dolor, si lee por su cuenta | el sesgo grande de un panel de comprensibilidad |
| Alfabetización | **3 ítems de Chew** (ayuda para leer, seguridad con impresos, dificultad para entender) | Chew et al., *Fam Med* 2004 |

Las dos últimas filas no son decorativas: **si el panel entero lee bien y ya sabe de dolor, dirá
que todo se entiende y el estudio no vale**. Se miden para poder describir la diversidad del panel
y para que la dirección la vigile —nunca para excluir—. `resumenPerfil` avisa en la fila del
panelista cuando la alfabetización sale limitada (señal validada: ≥ 3 en el ítem de rellenar
impresos, el que mejor discrimina en el original).

Referencias: Deyo et al., *J Pain* 2014 (NIH Task Force, doi:10.1016/j.jpain.2014.03.005) ·
Treede et al., *Pain* 2019 (doi:10.1097/j.pain.0000000000001384) · Krebs et al. 2009
(doi:10.1007/s11606-009-0981-1) · Chew et al., *Fam Med* 2004 · Staniszewska et al., *BMJ* 2017 (GRIPP2).

## 5e-ter · Instrumentos del panel de paciente y qué se le promete (22-ago, sesión 3)

**El PEG salió y entró la EGDC** (`src/lib/cuestionarios.js`, tests en `tests/cuestionarios.test.js`).
Da **intensidad característica y discapacidad sobre 100 y un grado de 0 a IV**, que es lo que permite
comparar este panel con la literatura y estratificarlo en el informe.

**Y es la versión española validada, no una traducción** (23-ago): Ferrer-Peña, Gil-Martínez,
Pardo-Montero, Jiménez-Penick, Gallego-Izquierdo y La Touche, *Reumatol Clin* 2016;12(3):130-8
(doi:10.1016/j.reuma.2015.07.004) —la del propio IP—. Tres cosas que la primera versión tenía mal y
conviene no volver a romper:

1. **Son ocho ítems, no siete.** El ítem 1 pregunta cuántos días ha habido dolor en los últimos seis
   meses; describe el patrón y **no entra en la puntuación**.
2. **El periodo es de tres meses**, no de seis, en todo lo demás.
3. **Los días de actividad limitada se preguntan por tramos** (Ninguno · 1 · 2 · 3-4 · 5-6 · 7-10 ·
   11-15 · 16-24 · 25-60 · 61-75 · 76-90), no como número libre. La puntuación se resuelve por el
   **punto medio** de cada tramo contra los cortes publicados (0-6 · 7-14 · 15-30 · 31+), y dos tramos
   caen a caballo de un corte: **11-15 → 1 punto** y **25-60 → 3 puntos**. Está decidido en la tercera
   columna de `EGDC_DIAS_TRAMOS` y fijado con tests; si la dirección prefiere otra regla, se cambia ahí
   y en ningún sitio más. `diasDeTramo` sigue entendiendo un número suelto, que es como respondieron
   los perfiles anteriores.

Los enunciados van **en usted y con la instrucción de la escala pegada**, tal como se publicaron. Del
original solo se corrigen dos erratas de imprenta («dónde» por «donde», «ningúna» por «ninguna»). El cribado de ánimo lo hacen el **PHQ-9** y el **GAD-7** (23-ago), que sustituyen a la vez a la HADS y
al PHQ-4 que hubo un rato en medio. Los dos comparten enunciado y las cuatro respuestas, así que se
contestan de corrido: primero los siete de ansiedad, luego los nueve de ánimo.

**Por qué el PHQ-9 y no la HADS.** El texto de la HADS es propiedad de **GL Assessment** y
reproducirlo en una web exige licencia: se llegó a implementar su puntuación con los catorce ítems
vacíos, y se retiró al entrar el PHQ-9. El PHQ-9 es **de uso libre** —no hace falta permiso para
reproducirlo, traducirlo ni distribuirlo—, son los nueve criterios de depresión mayor del DSM, y está
validado en español (Diez-Quevedo 2001). Total 0-27, franjas 5/10/15/20 y **corte de decisión en 10**.
Ojo con no confundir la franja con el corte: un 9 es «leve» pero cribado negativo.

**Lo que obliga su ítem 9.** Pregunta por ideas de muerte, así que el formulario hace dos cosas, y las
dos están en tests: en cuanto la respuesta deja de ser «ningún día» aparece una caja con el **024**, el
**112** y el Teléfono de la Esperanza; y **en ningún sitio se promete que alguien lee las respuestas en
el momento**, porque no es verdad y prometerlo crearía un deber de vigilancia que este estudio no puede
sostener. La hoja de información lo avisa **antes**, al describir los datos de salud. La dirección ve
«PHQ-9 ítem 9 marcado» en el resumen del panelista —conviene que lo vea—, pero eso no es un sistema de
alerta ni se ofrece como tal.

**Los ítems no están tuteados** como el resto del formulario, a propósito: reescribir un ítem validado
rompe la comparabilidad con los baremos publicados, que es la única razón para usar un instrumento
validado. La pantalla lo explica en una línea para que no parezca un descuido.

**El GAD-7** (Spitzer et al., *Arch Intern Med* 2006; validado en español por García-Campayo 2010) es
lo que devuelve la ansiedad que se perdió al retirar el PHQ-4, y con siete ítems en vez de dos. Total
0-21, franjas 5/10/15 y **corte de decisión también en 10**. También de uso libre.

**El ítem de interferencia se pregunta una sola vez**, al final de la tanda: lo traen igual los dos
cuestionarios, no suma a ningún total, y repetirlo palabra por palabra solo cansaría.

**El formulario de paciente va en DOS PASOS** (23-ago), porque ~35 preguntas de una sentada son
demasiadas. El reparto no es estético:

- **Paso 1 — quién eres y qué te pasa**: correo, fecha de nacimiento y sexo, tiempo y frecuencia del
  dolor, zonas, diagnósticos, y la **hoja de información con el consentimiento**. Es corto y es el que
  decide: quien no llega a los tres meses de dolor lo ve ahí, con el botón «Seguir» deshabilitado, y no
  contesta treinta preguntas clínicas para nada. Y el consentimiento se da **antes** de entregar los
  datos de salud, no después, que es como debe ser.
- **Paso 2 — cómo te afecta**: EGDC, GAD-7, PHQ-9, tratamientos, educación previa y alfabetización.

La validación va partida igual (`validarPacientePaso1` / `validarPacientePaso2` en `src/lib/perfil.js`)
y `validarPerfilPaciente` las encadena, que es lo que siguen llamando el envío final, el backend de
demostración y los tests. Todo vive en el mismo estado del formulario: **«Volver» no pierde nada**, y
hay un test que lo fija.

**Aun partido, son ~35 preguntas**, y eso tiene un coste: en jsdom cada `fireEvent`
repinta el formulario entero y la suite se pasaba de los 5 s por defecto. Por eso `vite.config.js`
fija `testTimeout: 20000`. En el navegador no pasa —se contesta una pregunta cada vez—, así que el
lento es el test, no la web.

**Al paciente NO se le reconoce autoría, y la hoja se lo dice.** Los textos ya están escritos y los
firma quien responde de ellos; decir si se entienden es otra cosa. En su lugar se le ofrece lo que
sí es cierto: sus correcciones entran en los textos, la publicación agradece al panel como grupo y
dice cuántos fueron, y si lo pide se le mandan los textos corregidos. Por eso **tampoco se le pide
nombre ni apellidos** —sin autoría no hacen falta, y sin ellos sus respuestas no quedan unidas a un
nombre—: solo un correo, que se archiva aparte y del que se guarda una **huella** para comprobar que
nadie responde dos veces. El experto sí da nombre, apellidos y filiación, porque la autoría de grupo
del ICMJE los exige.

Referencias: Von Korff et al., *Pain* 1992 (doi:10.1016/0304-3959(92)90154-4) · Kroenke et al. 2009
(doi:10.1016/S0033-3182(09)70864-3) · Zigmond y Snaith, *Acta Psychiatr Scand* 1983.

## 5g · El apartado RGPD de la hoja de información (22-ago, sesión 3)

Reescrito entero al abrir el panel de paciente, porque ahora se recogen **datos de categoría
especial** (art. 9 RGPD) y el texto anterior no los nombraba. `HojaInformacion.jsx` tiene ahora un
apartado 6 con nueve subapartados —responsable, qué se recoge, para qué y con qué base jurídica,
seudonimización, encargados y dónde están, plazos, decisiones automatizadas, derechos y si es
obligatorio— y **cambia según el perfil**: al paciente le nombra sus datos de salud y le pide
consentimiento **expreso** (art. 9.2.a exige que se nombren, no vale un «acepto participar»
genérico); al experto le declara el rechazo automático de Fehring.

Tres cosas que salieron al escribirlo y conviene no perder de vista:

1. **La hoja decía «Supabase, región eu-west-2, Irlanda». Es falso: eu-west-2 es Londres.** La base
   con los datos de salud está en **Reino Unido**, fuera del EEE. Ahora se declara como
   transferencia internacional amparada en la decisión de adecuación de la Comisión Europea. Sigue
   siendo mejor mover el proyecto a una región de la UE antes de presentar al CEIm; Supabase no deja
   cambiar de región en caliente, hay que crear proyecto nuevo y migrar. La región ya no está
   escrita en el código: sale de `estudios.region_datos`.
2. **El rechazo por Fehring es una decisión automatizada del art. 22** y hay que declararla, junto
   con el derecho a revisión humana. Eso obliga a mencionar también el **control de reenvíos**, que
   en la sesión 2 se decidió no explicar en ningún sitio. Se ha resuelto diciendo la verdad sin dar
   el manual: «se comprueba de forma automática que no haya varias solicitudes con el mismo correo».
   El detalle del salto de puntuación entre envíos sigue sin aparecer.
3. **El responsable del tratamiento suele ser la institución, no el investigador principal.** Se han
   añadido `estudios.responsable_tratamiento` y `estudios.dpd_contacto`, editables en Dirección →
   Estudio. Mientras estén vacíos la hoja cae en el IP, que es lo mínimo defendible pero **hay que
   concretarlo antes de presentar al comité**.

`tests/hoja.test.jsx` fija por contenido lo que el RGPD obliga a decir, para que no se pierda en una
reescritura: artículos citados, plazos, derechos, AEPD, la transferencia internacional y las dos
variantes de perfil.

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

## 5h · La migración a la UE (22-ago, sesión 3)

**Por qué.** La base estaba en `eu-west-2`, que es **Londres**, no Irlanda como decía la hoja de
información. Con el panel de paciente recogiendo datos de salud, eso es una transferencia fuera del
EEE evitable. Se migró a `eu-west-3` (París): estado miembro y el más cercano a España.

**Cómo, sin Docker ni `pg_dump`** (no hay ninguno de los dos en este Mac):

1. Volcado tabla a tabla con `supabase db query` a JSON → `~/valida-edpain-migracion/datos/`
   (`volcar.sh`). 902 filas, 4,6 MB.
2. Verificado el volcado antes de tocar nada: recuentos, los `clave_hash` de los tres panelistas y
   la **semilla del muestreo**, que es lo único irrecuperable —si cambia, cambia la muestra—.
3. Supabase free solo deja **2 proyectos activos**, así que hubo que **pausar** el viejo. Pausar no
   borra y es reversible; el CLI no tiene `pause`, va por la API de gestión:
   `curl -X POST https://api.supabase.com/v1/projects/<ref>/pause` con el token del Llavero
   (servicio `Supabase CLI`).
4. Proyecto nuevo, `supabase link`, `schema.sql`, y `restaurar.py` reconstruye cada tabla con
   `jsonb_populate_recordset` (respeta tipos, fechas y arrays sin escribir un INSERT a mano).
5. Comprobado que la **huella SHA-256 del conjunto de conceptos es idéntica** y que la clave de
   dirección del Llavero sigue abriendo contra la base nueva.

**Contraseña de la base nueva**: Llavero, servicio `valida-edpain-db-nueva`.

**El proyecto de Londres se borró el 23-ago**, una vez comprobado que la plataforma, la web y el
circuito de `consenso.py` funcionaban solos contra París. La única copia de seguridad de la base es
ahora `~/valida-edpain-migracion/respaldo-AAAA-MM-DD.tar.gz.enc`, **cifrado con AES-256** porque
lleva nombres, correos y los hash de las claves; la contraseña está en el Llavero
(`valida-edpain-respaldo`) y las instrucciones para abrirlo y restaurarlo, en el `LEEME.md` de esa
carpeta. `./volcar.sh` genera uno nuevo y borra el volcado en claro; conviene pasarlo antes de cada
ronda, porque las respuestas del panel no se pueden repetir.

6. **`.env` y el sitio publicado** apuntaban todavía al proyecto viejo, así que desde que se pausó,
   `valida.edpain.com` respondía «TypeError: Failed to fetch» en cuanto tocaba la base: la URL se
   compila dentro del bundle, o sea que **no basta con cambiar `.env`, hay que volver a publicar**.
   Resuelto el 22-ago a las 23:5x: `.env` → `nnelofgevsvdaiaryjbk`, `npm run deploy`, y comprobado en
   vivo que la convocatoria de pacientes carga y que la hoja ya no declara transferencia
   internacional. El `.env` viejo quedó como `.env.bak-2352` (gitignored) por si hace falta la marcha
   atrás.

**Gotchas de la migración**, todos reales:

- `supabase db dump` **exige Docker**. Sin él, la vía es `db query` + JSON.
- El endpoint de `db query` devuelve **413 por encima de ~1 MB**: hay que trocear (`restaurar.py`
  parte en trozos de 400 kB).
- `supabase db query --project-ref X` **solo vale junto a `--linked`**: hay que enlazar el proyecto
  destino antes.
- **`valida.avisos` no tiene `id`** (su clave es compuesta), así que una lista de secuencias escrita
  a mano falla. `restaurar.py` las saca del catálogo (`pg_depend`).
- **El volcado es una foto: lo que se toque después de volcar, se pierde.** Le pasó a
  `estudios.codigo_pruebas`, que llegó a la base nueva en `null` y dejó sin efecto el alta de
  panelistas de prueba. Restaurado el 23-ago a su valor de siempre, `PRUEBA-EDPAIN-26`. Al migrar,
  repasar la fila de `valida.estudios` entera contra lo que dice este documento; el resto de la
  configuración (fracción 12 %, suelo 8, k 5/3, plazo 10 días, Fehring ≥ 8, semilla) sí llegó bien.
- **Lo que no crea `schema.sql` no viaja.** El buzón `public.respuestas_consenso` lo había creado a
  mano una instrucción comentada de otro repo, así que el proyecto nuevo nació sin él y `consenso.py`
  habría muerto en silencio al borrar el viejo. Antes de migrar, mirar qué hay en `public` que no sea
  del esquema propio.
- Al recrearlo salió un agujero que arrastraba el DDL original: Supabase concede `all privileges` a
  `anon` sobre lo que se cree en `public`, y ahí va **TRUNCATE, que no pasa por el RLS**. Con la clave
  pública de los cuadernos se podía vaciar el buzón. Arreglado en `build/consenso_buzon.sql`.

## 5i · El respaldo se dispara al cerrar cada ronda (23-ago)

`pipeline/respaldo.py`. **El panel no puede lanzarlo**: el respaldo necesita el CLI de Supabase y
el Llavero, y el panel corre en un navegador. Lo que hace el panel es dejar constancia —
`valida_dir_ronda` y `valida_dir_cerrar` ya escribían los eventos `ronda_nueva` y
`estudio_cerrado`— y el script mira si hay alguno posterior al último evento `respaldo`. Una línea
de cron **cada hora** basta: si no se ha cerrado nada, no hace nada.

```
17 * * * * cd ~/valida-edpain && /usr/bin/python3 pipeline/respaldo.py >> ~/valida-edpain-respaldos/respaldo.log 2>&1
```

- Guarda **todas** las tablas de `valida` —las pregunta al catálogo, no hay lista escrita a mano,
  así que una tabla nueva entra sola— más `public.respuestas_consenso` si está.
- `.tar.gz` cifrado con **AES-256** en `~/valida-edpain-respaldos/`, fuera del repositorio.
  Contraseña en el Llavero (`valida-edpain-respaldo`).
- **Se comprueba solo**: descifra lo que acaba de escribir y cuenta las filas contra la base. Si no
  cuadra, aborta y no lo da por bueno.
- Deja un evento `respaldo`, y **Dirección → Estudio enseña el estado**: «al día», o un aviso en
  oro si se cerró una ronda y no hay copia posterior.
- Tarda **5-7 minutos**: cada tabla es una llamada al CLI y cada una paga su «Initialising login
  role». Da igual para algo que corre una vez por ronda.

**Cuatro cosas que solo se ven probándolo con el entorno de verdad del cron** (`env -i` con el
PATH pelado), y las cuatro habrían fallado en silencio:

1. **cron arranca con `PATH=/usr/bin:/bin:/usr/sbin:/sbin`** y `supabase` vive en `~/.local/bin`.
   El script resuelve los binarios por ruta absoluta en vez de fiarse del PATH.
2. **El CLI devuelve dos formas de JSON** según si cree que le habla un agente: `{"rows": [...]}`
   envuelto en el terminal, y la lista pelada desde cron. Dar por hecha la primera revienta.
3. **Python almacena la salida** cuando escribe a un fichero: el log se quedaba vacío durante los
   minutos del volcado, indistinguible de un cuelgue. `line_buffering=True`.
4. **El log NO puede ir en `dist/`**: cada `vite build` vacía esa carpeta. Va junto a los
   respaldos. (`avisos.py` documentaba la misma ruta y también se ha corregido.)

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
- **`lpad(n::text, 2, '0')` TRUNCA**, no solo rellena: el panelista 100 salía como `PAC-10` y
  podía chocar con el 10, que ya existía. `to_char(n, 'FM00')` tampoco vale (desborda a `##`). Lo
  correcto es `lpad(n::text, greatest(2, length(n::text)), '0')`. Afectaba también a `PAN-`.
- **`solicitudes.puntuacion` era `not null`** y un paciente no tiene puntuación. Se dejó nullable:
  meter un 0 se leería como «sacó cero», que es justo lo contrario de lo que pasa.
- **`Api.rpc` de `pipeline/importar.py` aborta con `sys.exit`**, que lanza `SystemExit` —una
  `BaseException`—, así que **`except Exception` no la captura**. Quien tenga que seguir después de
  un fallo (recorrer más pruebas, avisar de lo que quedó a medias) debe usar `Api.intentar`, que
  lanza `ErrorApi`. Se descubrió porque `avisos.py` mandó los correos, falló al marcarlos y murió
  sin decir cuáles se habían quedado sin marcar.
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
1b. **ANTES DE PRESENTAR AL CEIm** (los tres los deja abiertos la hoja de información, §5g):
   - ~~**Responsable del tratamiento**~~ **DECIDIDO**: es el investigador principal, Dr. Raúl
     Ferrer-Peña, a título personal. Ya está puesto. Sin DPD, porque no hay institución detrás.
   - ~~**La base de datos está en Londres**~~ **RESUELTO**: migrada a eu-west-3 (París) el 22-ago (§5h).
   - **Plazo de conservación**: la hoja dice cinco años tras la publicación. Confirmarlo con el comité,
     que a veces fija otro.

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
- **Circuito del panel de paciente probado de punta a punta** contra la base real con un
  panelista de prueba (`PAC-99`, marcado `es_prueba`): alta → asignación → entrada → perfil con
  consentimiento → bloque → 4 textos valorados con distintas combinaciones → métricas de la
  dirección → exportación a CSV → aviso de plazo por correo. El veto se comportó como debe: un
  texto con acuerdo 4·4·4 **no supera** porque un paciente marcó «culpa» y «miedo».
- **Alta de panelista acepta ahora `es_prueba`** (casilla en el formulario). Antes solo se podía
  crear un panelista de prueba por la convocatoria, y esa vía **solo crea expertos**: no había
  forma de ensayar el circuito de paciente sin ensuciar el panel real.
- **Tercer bug de plpgsql, y el peor**: `valida_dir_marcar_avisos` tenía `tipo` ambiguo en el
  `on conflict`. Los correos **se mandaban y no se marcaban**, así que se habrían repetido cada
  día a cada panelista. Se descubrió justo al probar el circuito entero.
- **`pipeline/humo.py`**: chequeo de humo que recorre las RPC y dice cuáles revientan. Nace de que
  los tres bugs de esta sesión eran errores de runtime de plpgsql que ni los tests de JS ni el
  `create function` pueden coger. Comprobado rompiendo funciones a propósito y viendo que las caza.
- **Convocatoria de pacientes abierta** (§5e-bis): vía propia en `#/participar`, interruptor
  independiente, sin puntuación y con el conjunto mínimo de datos de dolor, diagnósticos,
  tratamientos, temporalidad, impacto (PEG) y alfabetización en salud (Chew).
- Probada contra la base real de punta a punta; en el camino salieron dos bugs más: el `lpad` que
  trunca los códigos a partir del 100 y el `not null` de `solicitudes.puntuacion` (§6).
- **Apartado RGPD de la hoja reescrito** (§5g), con consentimiento expreso para datos de salud y la
  región de los datos corregida: estaba declarada como Irlanda y es Londres.
- 101 tests en verde, build limpio, sin secretos en el bundle.



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
- **HTTPS**: resuelto el 22-ago. GitHub tardó unas horas en emitir el certificado después de re-fijar el
  dominio por la API; en cuanto apareció se activó `https_enforced`. Si algún día vuelve a fallar, el
  remedio conocido es quitar y volver a poner `valida.edpain.com` en GitHub → Settings → Pages.
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
