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
//   PHQ-4 · Kroenke, Spitzer, Williams y Löwe, Psychosomatics 2009;50(6):613-21,
//          doi:10.1016/S0033-3182(09)70864-3. Cuatro ítems: GAD-2 (ansiedad) + PHQ-2
//          (depresión). De uso libre, sin licencia ni permiso.
//
//   HADS · Zigmond y Snaith, Acta Psychiatr Scand 1983;67(6):361-70. La puntuación está
//          implementada, pero **los 14 ítems no se distribuyen aquí**: el texto es
//          propiedad de GL Assessment y su uso exige licencia. Ver `HADS` más abajo.
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

// --------------------------------------------------------------------------- PHQ-4
export const PHQ4_OPCIONES = [
  [0, 'Ningún día'], [1, 'Varios días'], [2, 'Más de la mitad de los días'], [3, 'Casi todos los días'],
]

export const PHQ4_ITEMS = [
  ['phq4_nervioso', 'Sentirte con los nervios de punta, ansioso/a o muy tenso/a', 'ansiedad'],
  ['phq4_preocupacion', 'No poder parar de preocuparte o controlar la preocupación', 'ansiedad'],
  ['phq4_interes', 'Poco interés o alegría por hacer cosas', 'depresion'],
  ['phq4_animo', 'Sentirte con el ánimo bajo, deprimido/a o sin esperanza', 'depresion'],
]

export const PHQ4_ENUNCIADO = 'Durante las **últimas dos semanas**, ¿con qué frecuencia te han molestado estos problemas?'

// Corte de 3 en cada subescala (Kroenke 2009) y gravedad del total 0-12.
export function phq4(p = {}) {
  const de = (dominio) => PHQ4_ITEMS.filter(([, , d]) => d === dominio).map(([k]) => num(p[k]))
  const a = de('ansiedad')
  const d = de('depresion')
  const completo = [...a, ...d].every((x) => x != null)
  if (!completo) return { completo: false, ansiedad: null, depresion: null, total: null }
  const ansiedad = a.reduce((s, x) => s + x, 0)
  const depresion = d.reduce((s, x) => s + x, 0)
  const total = ansiedad + depresion
  const gravedad = total >= 9 ? 'grave' : total >= 6 ? 'moderada' : total >= 3 ? 'leve' : 'ninguna'
  return {
    completo: true, ansiedad, depresion, total, gravedad,
    ansiedad_positiva: ansiedad >= 3, depresion_positiva: depresion >= 3,
  }
}

// --------------------------------------------------------------------------- HADS
//
// La puntuación está lista; los ítems, no. El texto de la HADS es propiedad de
// GL Assessment y su reproducción —también en una web— exige licencia, así que aquí no
// se distribuye. Cuando el estudio tenga la licencia de la versión española, basta con
// rellenar `texto` en los catorce huecos de abajo y activarla en la configuración del
// estudio: el cálculo, los cortes y la interfaz ya funcionan.
export const HADS_OPCIONES_NOTA = 'Cada ítem se puntúa de 0 a 3 con las cuatro respuestas propias del ítem.'

export const HADS_ITEMS = Array.from({ length: 14 }, (_, i) => ({
  clave: `hads_${String(i + 1).padStart(2, '0')}`,
  texto: '',                                   // ← licencia
  dominio: i % 2 === 0 ? 'ansiedad' : 'depresion',   // impares = A, pares = D
  opciones: [],                                // ← licencia
}))

export const HADS_DISPONIBLE = HADS_ITEMS.every((i) => i.texto && i.opciones.length)

// Subescalas de 0 a 21. Cortes clásicos: ≤7 normal · 8-10 dudoso · ≥11 caso probable.
export function hads(p = {}, items = HADS_ITEMS) {
  const de = (dominio) => items.filter((i) => i.dominio === dominio).map((i) => num(p[i.clave]))
  const a = de('ansiedad')
  const d = de('depresion')
  const completo = [...a, ...d].length > 0 && [...a, ...d].every((x) => x != null)
  if (!completo) return { completo: false, ansiedad: null, depresion: null }
  const suma = (v) => v.reduce((s, x) => s + x, 0)
  const categoria = (v) => (v >= 11 ? 'caso probable' : v >= 8 ? 'dudoso' : 'normal')
  const ansiedad = suma(a)
  const depresion = suma(d)
  return {
    completo: true, ansiedad, depresion,
    categoria_ansiedad: categoria(ansiedad), categoria_depresion: categoria(depresion),
  }
}

// --------------------------------------------------------------------------- resumen
// Una línea por instrumento, para el panel de dirección y para describir al grupo.
export function resumenInstrumentos(p = {}) {
  const g = egdc(p)
  const e = phq4(p)
  const h = hads(p)
  return [
    g.completo && `EGDC ${EGDC_GRADOS[g.grado].nombre} (intensidad ${g.intensidad.toFixed(0)}/100, discapacidad ${g.discapacidad.toFixed(0)}/100)`,
    e.completo && `PHQ-4 ${e.total}/12 · ansiedad ${e.ansiedad}/6${e.ansiedad_positiva ? ' (+)' : ''} · depresión ${e.depresion}/6${e.depresion_positiva ? ' (+)' : ''}`,
    h.completo && `HADS A ${h.ansiedad}/21 (${h.categoria_ansiedad}) · D ${h.depresion}/21 (${h.categoria_depresion})`,
  ].filter(Boolean).join(' · ')
}
