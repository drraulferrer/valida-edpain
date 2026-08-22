// ---------------------------------------------------------------------------
// Instrumentos de base del panel de personas con dolor. Cada uno con sus ítems, su
// puntuación y sus puntos de corte publicados, en un solo sitio y con tests: sirven para
// **describir y estratificar** al panel, no para diagnosticar a nadie.
//
//   EGDC · Escala de Gradación del Dolor Crónico (Graded Chronic Pain Scale, Von Korff
//          et al., Pain 1992;50(2):133-49, doi:10.1016/0304-3959(92)90154-4). Siete ítems,
//          seis de ellos en la escala 0-10 ya conocida, y un grado de 0 a IV que combina
//          intensidad y discapacidad. Es el instrumento que el propio corpus cita
//          (REF-0079) para decir que la gravedad es un eje distinto de la duración.
//
//   PHQ-9 · Kroenke, Spitzer y Williams, J Gen Intern Med 2001;16(9):606-13,
//          doi:10.1046/j.1525-1497.2001.016009606.x. Nueve ítems que son los nueve
//          criterios de depresión mayor del DSM, 0-3 cada uno. **De uso libre**: no
//          requiere permiso ni licencia para reproducirlo, traducirlo o distribuirlo, que
//          es justo lo que descartó a la HADS (texto propiedad de GL Assessment). Validado
//          en español por Diez-Quevedo et al., Psychosom Med 2001;63(4):679-86.
//
//          Su ítem 9 pregunta por ideas de muerte. Eso obliga a dos cosas que están
//          implementadas: enseñar recursos de ayuda en cuanto se marca algo distinto de
//          «ningún día`, y no prometer en ningún sitio que alguien vigila las respuestas
//          en tiempo real, porque no es verdad.
// ---------------------------------------------------------------------------

// --------------------------------------------------------------------------- EGDC
export const EGDC_INTENSIDAD = [
  ['egdc_ahora', 'Tu dolor **ahora mismo**', 'Ningún dolor', 'El peor que puedas imaginar'],
  ['egdc_peor', 'En los últimos 6 meses, tu **peor** dolor', 'Ningún dolor', 'El peor que puedas imaginar'],
  ['egdc_medio', 'En los últimos 6 meses, tu dolor **de media**', 'Ningún dolor', 'El peor que puedas imaginar'],
]

export const EGDC_DISCAPACIDAD = [
  ['egdc_diaria', 'Cuánto ha estorbado el dolor en tus **actividades de cada día**', 'Nada', 'No he podido hacer nada'],
  ['egdc_social', 'Cuánto ha estorbado en tus **actividades de ocio, sociales y familiares**', 'Nada', 'No he podido hacer nada'],
  ['egdc_trabajo', 'Cuánto ha estorbado en tu **capacidad de trabajar**, incluidas las tareas de casa', 'Nada', 'No he podido hacer nada'],
]

export const EGDC_ITEMS = [...EGDC_INTENSIDAD, ...EGDC_DISCAPACIDAD]
export const EGDC_DIAS = 'egdc_dias'   // días de actividad perdidos en los últimos 6 meses (0-180)

export const EGDC_GRADOS = {
  0: { nombre: 'Grado 0', descripcion: 'sin dolor en los últimos seis meses' },
  1: { nombre: 'Grado I', descripcion: 'baja discapacidad y baja intensidad' },
  2: { nombre: 'Grado II', descripcion: 'baja discapacidad y alta intensidad' },
  3: { nombre: 'Grado III', descripcion: 'discapacidad alta, moderadamente limitante' },
  4: { nombre: 'Grado IV', descripcion: 'discapacidad alta, gravemente limitante' },
}

const num = (x) => (x === '' || x == null || !Number.isFinite(Number(x)) ? null : Number(x))
const media = (v) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null)

// Puntos de discapacidad por días perdidos (Von Korff 1992, tabla 2).
export function puntosDias(dias) {
  const d = num(dias)
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
  const dias = num(p[EGDC_DIAS])
  const completo = intensidad.length === 3 && discapacidad.length === 3 && dias != null
  if (!completo) return { completo: false, intensidad: null, discapacidad: null, puntos: null, grado: null }

  const ic = media(intensidad) * 10
  const pd = media(discapacidad) * 10
  const puntos = puntosDias(dias) + puntosDiscapacidad(pd)

  let grado
  if (ic === 0 && pd === 0 && dias === 0) grado = 0
  else if (puntos >= 5) grado = 4
  else if (puntos >= 3) grado = 3
  else if (ic >= 50) grado = 2
  else grado = 1

  return { completo: true, intensidad: ic, discapacidad: pd, dias, puntos, grado, ...EGDC_GRADOS[grado] }
}

// --------------------------------------------------------------------------- PHQ-9
export const PHQ9_OPCIONES = [
  [0, 'Ningún día'], [1, 'Varios días'], [2, 'Más de la mitad de los días'], [3, 'Casi todos los días'],
]

// Texto de la versión española del instrumento. **No se reescribe al tuteo del resto del
// formulario a propósito**: cambiar la redacción de un ítem validado rompe la comparabilidad
// con los baremos publicados, que es la única razón para usar un instrumento validado.
export const PHQ9_ENUNCIADO = 'Durante las **últimas 2 semanas**, ¿con qué frecuencia le han molestado los siguientes problemas?'

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

// Ítem 10 del instrumento: mide interferencia y **no suma** al total. Opcional aquí.
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
  return [
    g.completo && `EGDC ${EGDC_GRADOS[g.grado].nombre} (intensidad ${g.intensidad.toFixed(0)}/100, discapacidad ${g.discapacidad.toFixed(0)}/100)`,
    d.completo && `PHQ-9 ${d.total}/27 · depresión ${d.gravedad}${d.positivo ? ' (+)' : ''}`,
    // El ítem 9 se enseña a la dirección, pero en ninguna pantalla se promete vigilarlo.
    d.riesgo && 'PHQ-9 ítem 9 marcado',
  ].filter(Boolean).join(' · ')
}
