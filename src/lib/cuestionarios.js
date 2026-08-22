// ---------------------------------------------------------------------------
// Instrumentos de base del panel de personas con dolor. Cada uno con sus ítems, su
// puntuación y sus puntos de corte publicados, en un solo sitio y con tests: sirven para
// **describir y estratificar** al panel, no para diagnosticar a nadie.
//
//   EGDC · Escala de Gradación del Dolor Crónico. Original de Von Korff et al., Pain
//          1992;50(2):133-49, doi:10.1016/0304-3959(92)90154-4. **Aquí se usa la adaptación
//          española validada**: Ferrer-Peña R, Gil-Martínez A, Pardo-Montero J,
//          Jiménez-Penick V, Gallego-Izquierdo T, La Touche R. Adaptación y validación de la
//          Escala de gradación del dolor crónico al español. Reumatol Clin 2016;12(3):130-8,
//          doi:10.1016/j.reuma.2015.07.004. Ocho ítems y un grado de 0 a IV que combina
//          intensidad y discapacidad. Es el instrumento que el propio corpus cita (REF-0079)
//          para decir que la gravedad es un eje distinto de la duración.
//
//   PHQ-9 · Kroenke, Spitzer y Williams, J Gen Intern Med 2001;16(9):606-13,
//          doi:10.1046/j.1525-1497.2001.016009606.x. Nueve ítems que son los nueve
//          criterios de depresión mayor del DSM, 0-3 cada uno. **De uso libre**: no
//          requiere permiso ni licencia para reproducirlo, traducirlo o distribuirlo, que
//          es justo lo que descartó a la HADS (texto propiedad de GL Assessment). Validado
//          en español por Diez-Quevedo et al., Psychosom Med 2001;63(4):679-86.
//
//   GAD-7 · Spitzer, Kroenke, Williams y Löwe, Arch Intern Med 2006;166(10):1092-7,
//          doi:10.1001/archinte.166.10.1092. Siete ítems de ansiedad generalizada, misma
//          familia que el PHQ y con las mismas cuatro respuestas, así que se contestan de
//          corrido. También de uso libre. Validado en español por García-Campayo et al.,
//          Health Qual Life Outcomes 2010;8:8. Es lo que devuelve la ansiedad que se perdió
//          al retirar el PHQ-4.
//
//          Su ítem 9 pregunta por ideas de muerte. Eso obliga a dos cosas que están
//          implementadas: enseñar recursos de ayuda en cuanto se marca algo distinto de
//          «ningún día`, y no prometer en ningún sitio que alguien vigila las respuestas
//          en tiempo real, porque no es verdad.
// ---------------------------------------------------------------------------

// --------------------------------------------------------------------------- EGDC
// Los ocho ítems son los de la **adaptación española validada** (Ferrer-Peña et al.,
// Reumatol Clin 2016;12(3):130-8), copiados palabra por palabra: mismo orden, mismo
// tratamiento de usted, mismos anclajes y el mismo periodo de referencia —los últimos **tres
// meses**, salvo el ítem 1, que pregunta por los seis—. No se tutean ni se acortan para que
// peguen con el resto del formulario: cambiar la redacción de un ítem validado rompe la
// comparabilidad, que es la única razón para usar una versión validada. Lo único que se
// corrige del original son dos erratas de imprenta («dónde» por «donde», «ningúna» por
// «ninguna»), que no tocan ni una palabra del contenido.

// Ítem 1. Describe el patrón del dolor y **no entra en la puntuación**.
export const EGDC_DIAS_DOLOR = 'egdc_dias_dolor'
export const EGDC_DIAS_DOLOR_TEXTO = '¿Cuántos días ha tenido dolor en los **últimos seis meses**?'

// Ítems 2, 3 y 4 → intensidad característica del dolor.
export const EGDC_INTENSIDAD = [
  ['egdc_ahora', '¿Cómo valoraría su dolor **EN ESTE MOMENTO**? Use una escala entre 0 y 10 donde 0 significa «ningún dolor» y 10 «el peor dolor imaginable».', 'Ningún dolor', 'El peor dolor imaginable'],
  ['egdc_peor', 'En los últimos tres meses, ¿cómo valoraría su **PEOR** dolor? Use una escala entre 0 y 10 donde 0 significa «ningún dolor» y 10 «el peor dolor imaginable».', 'Ningún dolor', 'El peor dolor imaginable'],
  ['egdc_medio', '**EN PROMEDIO**, en los últimos tres meses, ¿cómo valoraría su dolor? Use una escala entre 0 y 10 donde 0 significa «ningún dolor» y 10 «el peor dolor imaginable».', 'Ningún dolor', 'El peor dolor imaginable'],
]

// Ítems 6, 7 y 8 → puntuación de discapacidad.
export const EGDC_DISCAPACIDAD = [
  ['egdc_diaria', 'En los últimos tres meses, ¿cuánto ha interferido su dolor en sus **ACTIVIDADES DIARIAS**? Use una escala entre 0 y 10 donde 0 significa «ninguna interferencia» y 10 es «incapaz de realizar ninguna actividad».', 'Ninguna interferencia', 'Incapaz de realizar ninguna actividad'],
  ['egdc_social', 'En los últimos tres meses, ¿cuánto ha interferido su dolor en sus **ACTIVIDADES DE OCIO, SOCIALES Y FAMILIARES**? Use una escala entre 0 y 10 donde 0 significa «ninguna interferencia» y 10 es «incapaz de realizar ninguna actividad».', 'Ninguna interferencia', 'Incapaz de realizar ninguna actividad'],
  ['egdc_trabajo', 'En los últimos tres meses, ¿cuánto ha interferido su dolor en su **CAPACIDAD PARA TRABAJAR**, incluyendo las tareas del hogar? Use una escala entre 0 y 10 donde 0 significa «ninguna interferencia» y 10 es «incapaz de realizar ninguna actividad».', 'Ninguna interferencia', 'Incapaz de realizar ninguna actividad'],
]

export const EGDC_ITEMS = [...EGDC_INTENSIDAD, ...EGDC_DISCAPACIDAD]

// Ítem 5 → días de actividad limitada. En la versión española **no es un número libre, son
// once tramos**, así que la puntuación se resuelve por el punto medio de cada tramo contra los
// cortes publicados (0-6 · 7-14 · 15-30 · 31+). Dos tramos caen a caballo de un corte y hay que
// decidirlos a mano, que es justo lo que hace la tercera columna: **11-15** (punto medio 13) va
// a 1 punto y **25-60** (punto medio 42,5) va a 3. Si la dirección prefiere otra regla, se
// cambia aquí y en ningún sitio más.
export const EGDC_DIAS = 'egdc_dias'
export const EGDC_DIAS_TEXTO = 'En los últimos tres meses, ¿cuántos días su dolor le impidió realizar las **TAREAS HABITUALES**, como trabajar, ir al colegio, o realizar las labores del hogar?'
export const EGDC_DIAS_TRAMOS = [
  ['ninguno', 'Ninguno', 0],
  ['1', '1 día', 1],
  ['2', '2 días', 2],
  ['3-4', '3-4 días', 3.5],
  ['5-6', '5-6 días', 5.5],
  ['7-10', '7-10 días', 8.5],
  ['11-15', '11-15 días', 13],
  ['16-24', '16-24 días', 20],
  ['25-60', '25-60 días', 42.5],
  ['61-75', '61-75 días', 68],
  ['76-90', '76-90 días', 83],
]

export const EGDC_GRADOS = {
  0: { nombre: 'Grado 0', descripcion: 'sin dolor en los últimos tres meses' },
  1: { nombre: 'Grado I', descripcion: 'baja discapacidad y baja intensidad' },
  2: { nombre: 'Grado II', descripcion: 'baja discapacidad y alta intensidad' },
  3: { nombre: 'Grado III', descripcion: 'discapacidad alta, moderadamente limitante' },
  4: { nombre: 'Grado IV', descripcion: 'discapacidad alta, gravemente limitante' },
}

const num = (x) => (x === '' || x == null || !Number.isFinite(Number(x)) ? null : Number(x))
const media = (v) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null)

// Días del tramo elegido, por su punto medio. Acepta también un número suelto, que es como
// llegan los datos de quien contestó antes de que la escala pasara a tramos.
export function diasDeTramo(valor) {
  if (valor === '' || valor == null) return null
  const tramo = EGDC_DIAS_TRAMOS.find(([clave]) => clave === valor)
  return tramo ? tramo[2] : num(valor)
}

// Puntos de discapacidad por días de actividad limitada (Von Korff 1992, tabla 2).
export function puntosDias(valor) {
  const d = diasDeTramo(valor)
  if (d == null) return null
  if (d <= 6) return 0
  if (d <= 14) return 1
  if (d <= 30) return 2
  return 3
}

// Puntos de discapacidad por la puntuación de discapacidad (0-100).
export function puntosDiscapacidad(puntuacion) {
  if (puntuacion == null) return null
  if (puntuacion < 30) return 0
  if (puntuacion < 50) return 1
  if (puntuacion < 70) return 2
  return 3
}

// Devuelve intensidad característica (0-100), discapacidad (0-100), puntos (0-6) y grado (0-IV).
export function egdc(p = {}) {
  const intensidad = EGDC_INTENSIDAD.map(([k]) => num(p[k])).filter((x) => x != null)
  const discapacidad = EGDC_DISCAPACIDAD.map(([k]) => num(p[k])).filter((x) => x != null)
  const dias = diasDeTramo(p[EGDC_DIAS])
  const completo = intensidad.length === 3 && discapacidad.length === 3 && dias != null
  if (!completo) return { completo: false, intensidad: null, discapacidad: null, puntos: null, grado: null }

  const ic = media(intensidad) * 10
  const pd = media(discapacidad) * 10
  const puntos = puntosDias(p[EGDC_DIAS]) + puntosDiscapacidad(pd)

  let grado
  if (ic === 0 && pd === 0 && dias === 0) grado = 0
  else if (puntos >= 5) grado = 4
  else if (puntos >= 3) grado = 3
  else if (ic >= 50) grado = 2
  else grado = 1

  return { completo: true, intensidad: ic, discapacidad: pd, dias, puntos, grado, ...EGDC_GRADOS[grado] }
}

// ------------------------------------------------------------------ PHQ-9 y GAD-7
// Los dos instrumentos comparten enunciado y las cuatro respuestas: por eso se contestan de
// corrido, como una sola tanda. El texto es el de la versión española y **no se reescribe al
// tuteo del resto del formulario a propósito**: cambiar la redacción de un ítem validado rompe
// la comparabilidad con los baremos publicados, que es la única razón para usar un instrumento
// validado.
export const FRECUENCIA_2SEMANAS = [
  [0, 'Ningún día'], [1, 'Varios días'], [2, 'Más de la mitad de los días'], [3, 'Casi todos los días'],
]
export const ENUNCIADO_2SEMANAS = 'Durante las **últimas 2 semanas**, ¿con qué frecuencia le han molestado los siguientes problemas?'

export const PHQ9_OPCIONES = FRECUENCIA_2SEMANAS
export const PHQ9_ENUNCIADO = ENUNCIADO_2SEMANAS

export const PHQ9_ITEMS = [
  ['phq9_interes', 'Poco interés o placer en hacer las cosas'],
  ['phq9_animo', 'Se ha sentido desanimado/a, deprimido/a o sin esperanza'],
  ['phq9_sueno', 'Ha tenido dificultad para dormirse o para mantenerse dormido/a, o ha dormido demasiado'],
  ['phq9_energia', 'Se ha sentido cansado/a o con poca energía'],
  ['phq9_apetito', 'Ha tenido poco apetito o ha comido en exceso'],
  ['phq9_fracaso', 'Se ha sentido mal con usted mismo/a, o ha sentido que es un fracaso o que se ha fallado a sí mismo/a o a su familia'],
  ['phq9_concentracion', 'Ha tenido dificultad para concentrarse en algo, como leer el periódico o ver la televisión'],
  ['phq9_lentitud', 'Se ha movido o ha hablado tan despacio que otras personas podrían haberlo notado; o al contrario, ha estado tan inquieto/a o agitado/a que se ha movido mucho más de lo habitual'],
  ['phq9_muerte', 'Ha pensado que estaría mejor muerto/a o ha pensado en hacerse daño de alguna manera'],
]

// El ítem que obliga a enseñar ayuda en pantalla. Se nombra, no se cuenta a mano.
export const PHQ9_ITEM_RIESGO = 'phq9_muerte'

// Ítem de interferencia: **no suma** a ningún total y lo traen igual los dos instrumentos, así
// que se pregunta una sola vez al final de la tanda en lugar de repetirlo palabra por palabra.
// Opcional.
export const PHQ9_FUNCIONAL = 'phq9_funcional'
export const PHQ9_FUNCIONAL_TEXTO = 'Si ha marcado alguno de los problemas anteriores, ¿hasta qué punto le han dificultado hacer su trabajo, ocuparse de las cosas de casa o relacionarse con los demás?'
export const PHQ9_FUNCIONAL_OPCIONES = [
  [0, 'Nada difícil'], [1, 'Algo difícil'], [2, 'Muy difícil'], [3, 'Extremadamente difícil'],
]

// Franjas de gravedad de Kroenke 2001. El corte de decisión es 10: por debajo, cribado negativo.
export const PHQ9_GRAVEDAD = [
  [0, 'mínima o ninguna'], [5, 'leve'], [10, 'moderada'], [15, 'moderadamente grave'], [20, 'grave'],
]

export function gravedadPhq9(total) {
  if (total == null) return null
  let etiqueta = null
  for (const [desde, nombre] of PHQ9_GRAVEDAD) if (total >= desde) etiqueta = nombre
  return etiqueta
}

// Total 0-27, franja de gravedad, corte ≥ 10 y la señal del ítem 9, que se devuelve aparte
// porque no es una puntuación: es el motivo por el que hay que enseñar ayuda.
export function phq9(p = {}) {
  const valores = PHQ9_ITEMS.map(([k]) => num(p[k]))
  const completo = valores.every((x) => x != null)
  const riesgo = num(p[PHQ9_ITEM_RIESGO])
  if (!completo) {
    return { completo: false, total: null, gravedad: null, positivo: null, riesgo: riesgo != null && riesgo > 0 }
  }
  const total = valores.reduce((s, x) => s + x, 0)
  return {
    completo: true,
    total,
    gravedad: gravedadPhq9(total),
    positivo: total >= 10,           // corte de cribado de depresión mayor
    riesgo: riesgo > 0,              // ítem 9 marcado: hay que enseñar recursos de ayuda
    funcional: num(p[PHQ9_FUNCIONAL]),
  }
}

// --------------------------------------------------------------------------- GAD-7
export const GAD7_OPCIONES = FRECUENCIA_2SEMANAS
export const GAD7_ENUNCIADO = ENUNCIADO_2SEMANAS

export const GAD7_ITEMS = [
  ['gad7_nervioso', 'Se ha sentido nervioso/a, ansioso/a o con los nervios de punta'],
  ['gad7_preocupacion', 'No ha sido capaz de parar o controlar su preocupación'],
  ['gad7_exceso', 'Se ha preocupado demasiado por diferentes cosas'],
  ['gad7_relajarse', 'Ha tenido dificultad para relajarse'],
  ['gad7_inquietud', 'Se ha sentido tan inquieto/a que no ha podido quedarse quieto/a'],
  ['gad7_irritable', 'Se ha molestado o irritado fácilmente'],
  ['gad7_miedo', 'Ha sentido miedo, como si algo terrible fuera a pasar'],
]

// Franjas de Spitzer 2006. El corte de decisión también es 10, igual que en el PHQ-9.
export const GAD7_GRAVEDAD = [[0, 'mínima o ninguna'], [5, 'leve'], [10, 'moderada'], [15, 'grave']]

export function gravedadGad7(total) {
  if (total == null) return null
  let etiqueta = null
  for (const [desde, nombre] of GAD7_GRAVEDAD) if (total >= desde) etiqueta = nombre
  return etiqueta
}

// Total 0-21, franja de gravedad y corte ≥ 10 de cribado de ansiedad generalizada.
export function gad7(p = {}) {
  const valores = GAD7_ITEMS.map(([k]) => num(p[k]))
  if (!valores.every((x) => x != null)) return { completo: false, total: null, gravedad: null, positivo: null }
  const total = valores.reduce((s, x) => s + x, 0)
  return { completo: true, total, gravedad: gravedadGad7(total), positivo: total >= 10 }
}

// --------------------------------------------------------------------------- ayuda
// Lo que se enseña en cuanto el ítem 9 deja de ser «ningún día». Vive aquí, con el
// instrumento, porque forma parte de usarlo con responsabilidad y no es un adorno de la
// interfaz: quien pregunta por ideas de muerte en una web, sin nadie al otro lado, tiene que
// dar a la vez dónde pedir ayuda y decir la verdad sobre quién lee lo que se contesta.
export const AYUDA_RIESGO = {
  titulo: 'Si lo estás pasando mal, pide ayuda ahora',
  aviso: 'Esta web es un estudio: nadie lee tus respuestas en el momento, así que no las uses para pedir ayuda. Estos teléfonos sí están atendidos.',
  recursos: [
    ['024', 'Línea de Atención a la Conducta Suicida del Ministerio de Sanidad. Gratuita, 24 horas y confidencial.'],
    ['112', 'Emergencias, si hay peligro inmediato.'],
    ['717 003 717', 'Teléfono de la Esperanza.'],
  ],
  cierre: 'Contestar con sinceridad no te deja fuera del estudio ni cambia nada de lo que hagas aquí.',
}

// --------------------------------------------------------------------------- resumen
// Una línea por instrumento, para el panel de dirección y para describir al grupo.
export function resumenInstrumentos(p = {}) {
  const g = egdc(p)
  const d = phq9(p)
  const a = gad7(p)
  return [
    g.completo && `EGDC ${EGDC_GRADOS[g.grado].nombre} (intensidad ${g.intensidad.toFixed(0)}/100, discapacidad ${g.discapacidad.toFixed(0)}/100)`,
    d.completo && `PHQ-9 ${d.total}/27 · depresión ${d.gravedad}${d.positivo ? ' (+)' : ''}`,
    a.completo && `GAD-7 ${a.total}/21 · ansiedad ${a.gravedad}${a.positivo ? ' (+)' : ''}`,
    // El ítem 9 se enseña a la dirección, pero en ninguna pantalla se promete vigilarlo.
    d.riesgo && 'PHQ-9 ítem 9 marcado',
  ].filter(Boolean).join(' · ')
}
