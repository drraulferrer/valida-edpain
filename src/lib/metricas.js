// ---------------------------------------------------------------------------
// Métricas de validez de contenido. Sin interfaz, sin red: solo cálculo.
//
// Es el único sitio donde viven las reglas de decisión, y se mantiene separado de las
// pantallas a propósito: los umbrales se fijan antes de ver datos (llegan en
// `estudio.umbrales`) y el cálculo tiene tests (tests/metricas.test.js).
//
// Primaria: I-CVI (Lynn 1986; Polit & Beck 2006) con kappa* (Polit, Beck & Owen 2007).
// Secundaria: V de Aiken (1985) con IC 95 % (Penfield & Giacobbi 2004), igual que
// build/consenso_metricas.py del corpus y que Di-Bonaventura et al., Phys Ther 2026.
// ---------------------------------------------------------------------------

export const UMBRALES_POR_DEFECTO = Object.freeze({
  icvi_n_pequeno: 1.0,     // I-CVI exigido con n < n_corte_icvi (Lynn: 1,00 con ≤ 5 jueces)
  icvi_n_grande: 0.78,     // I-CVI exigido con n ≥ n_corte_icvi
  n_corte_icvi: 6,
  aiken: 0.70,
  exigir_ic: true,
  minimo_panel: 5,
  desacuerdo: 0.30,        // proporción en cada extremo que declara panel partido
  scvi_ave: 0.90,
  paciente_comprension: 0.75,
  minimo_paciente: 3,
  estable_v: 0.10,
  rondas_max: 3,
})

export const CATEGORIAS = 4
const Z = 1.96

export function umbrales(u) {
  return { ...UMBRALES_POR_DEFECTO, ...(u || {}) }
}

// --- Proporciones y I-CVI ----------------------------------------------------

export function icvi(puntuaciones) {
  const p = soloValidas(puntuaciones)
  const n = p.length
  const acuerdo = p.filter((x) => x >= 3).length
  return { n, acuerdo, icvi: n ? acuerdo / n : null }
}

export function umbralIcvi(n, u) {
  const t = umbrales(u)
  return n >= t.n_corte_icvi ? t.icvi_n_grande : t.icvi_n_pequeno
}

// kappa* = (I-CVI − pc) / (1 − pc), con pc = C(n, a) · 0,5^n (probabilidad de que
// exactamente `a` jueces coincidan al azar). Polit, Beck & Owen 2007.
export function kappaEstrella(n, a) {
  if (!n) return null
  const pc = combinaciones(n, a) * Math.pow(0.5, n)
  const i = a / n
  if (pc >= 1) return null
  return (i - pc) / (1 - pc)
}

export function combinaciones(n, k) {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 1; i <= k; i += 1) r = (r * (n - k + i)) / i
  return Math.round(r)
}

// --- V de Aiken --------------------------------------------------------------

export function aiken(puntuaciones, categorias = CATEGORIAS) {
  const p = soloValidas(puntuaciones)
  if (!p.length) return null
  const media = p.reduce((s, x) => s + x, 0) / p.length
  return (media - 1) / (categorias - 1)
}

// IC 95 % de la V (Penfield & Giacobbi 2004). k = intervalos de la escala = categorías − 1.
export function icAiken(V, n, categorias = CATEGORIAS, z = Z) {
  if (V === null || !n) return null
  const k = categorias - 1
  const nk = n * k
  const raiz = Math.sqrt(4 * nk * V * (1 - V) + z * z)
  const den = 2 * (nk + z * z)
  return [(2 * nk * V + z * z - z * raiz) / den, (2 * nk * V + z * z + z * raiz) / den]
}

// La V mínima con la que el límite inferior del IC alcanza el umbral, para n jueces.
// Es la tabla que decide el tamaño del panel antes que ninguna otra consideración.
export function aikenMinimaParaIc(n, umbral = 0.70, categorias = CATEGORIAS) {
  let V = umbral
  while (V < 1 && icAiken(V, n, categorias)[0] < umbral) V += 0.001
  return Math.round(V * 1000) / 1000
}

// --- Clasificación de una dimensión -------------------------------------------

export function dimension(puntuaciones, u) {
  const t = umbrales(u)
  const { n, acuerdo, icvi: i } = icvi(puntuaciones)
  const p = soloValidas(puntuaciones)
  const V = aiken(p)
  const ic = icAiken(V, n)
  const unos = p.filter((x) => x === 1).length / (n || 1)
  const cuatros = p.filter((x) => x === 4).length / (n || 1)
  const partido = n >= t.minimo_panel && unos >= t.desacuerdo && cuatros >= t.desacuerdo
  const insuficiente = n < t.minimo_panel
  const umbralI = umbralIcvi(n, t)
  const superaIcvi = !insuficiente && i !== null && i >= umbralI - 1e-9
  const superaAiken = !insuficiente && V !== null && V >= t.aiken && (!t.exigir_ic || ic[0] >= t.aiken)
  return {
    n, acuerdo, icvi: i, kappa: n ? kappaEstrella(n, acuerdo) : null, umbral_icvi: umbralI,
    V, ic, media: n ? p.reduce((s, x) => s + x, 0) / n : null,
    histograma: [1, 2, 3, 4].map((v) => p.filter((x) => x === v).length),
    partido, insuficiente, supera: superaIcvi, supera_aiken: superaAiken,
    discrepan: !insuficiente && superaIcvi !== superaAiken,
  }
}

// --- Clasificación de un concepto -------------------------------------------
//
// `valoraciones`: filas tal como las devuelve valida_dir_datos (panelista, perfil,
// puntuaciones, abstencion, banderas, paciente, completa, ronda).
// `dimensiones`: claves de las dimensiones del perfil experto (orden del estudio).
//
// Resultado: { clase, por_dimension, bloqueado_por, paciente, n }
//   clase ∈ valido | revisar | partido | bloqueado | insuficiente | pendiente

export function concepto(valoraciones, dimensiones, u, ronda, dimensionesPaciente) {
  const t = umbrales(u)
  // Fuera las de panelistas de prueba: son ensayos de la dirección y meterlas en el I-CVI
  // corrompería el resultado publicado. Se descartan aquí, en el único sitio que decide.
  const filas = valoraciones.filter((v) => v.completa && !v.es_prueba && (ronda == null || v.ronda === ronda))
  const expertas = filas.filter((v) => v.perfil !== 'paciente' && !v.abstencion)
  const pacientes = filas.filter((v) => v.perfil === 'paciente' && !v.abstencion && v.paciente)

  const por_dimension = {}
  for (const d of dimensiones) {
    por_dimension[d] = dimension(expertas.map((v) => v.puntuaciones?.[d]).filter((x) => x != null), t)
  }
  const bloqueado_por = filas
    .filter((v) => v.banderas && v.banderas.seguridad === true)
    .map((v) => v.panelista)

  const pac = paciente(pacientes, t, dimensionesPaciente)
  const dims = Object.values(por_dimension)
  const n = expertas.length

  let clase
  if (!filas.length) clase = 'pendiente'
  else if (bloqueado_por.length) clase = 'bloqueado'
  else if (dims.some((d) => d.insuficiente)) clase = 'insuficiente'
  else if (dims.some((d) => d.partido)) clase = 'partido'
  else if (dims.every((d) => d.supera) && (pac.n < t.minimo_paciente || pac.supera)) clase = 'valido'
  else clase = 'revisar'

  return { clase, por_dimension, bloqueado_por, paciente: pac, n, n_pacientes: pac.n }
}

// Panel de paciente. Las dimensiones de comprensibilidad se puntúan en la MISMA Likert
// 1-4 de acuerdo que las expertas, así que se resumen con el mismo I-CVI y la misma V de
// Aiken (`dimension()`); es como se validan los materiales educativos con pacientes en la
// literatura (Cho et al. 2023, doi:10.1177/20543581221150676; ETHIC, Cocchi et al. 2023,
// doi:10.3390/healthcare11081154), y los ítems replican los dominios de comprensibilidad
// del PEMAT-P (Shoemaker, Wolf & Brach 2014, doi:10.1016/j.pec.2014.05.027).
//
// El efecto afectivo y los vetos NO entran en el CVI: son un veto categórico. Un solo
// paciente que marque una bandera obliga a reescribir, puntúe como puntúe.
//
// `dimensiones` son las claves de las dimensiones con quien = 'paciente'. Si no se pasan,
// se deducen de las puntuaciones presentes, para que la función siga valiendo con datos
// exportados sin el catálogo al lado.
export function paciente(filas, u, dimensiones) {
  const t = umbrales(u)
  const n = filas.length
  const claves = dimensiones && dimensiones.length
    ? dimensiones
    : [...new Set(filas.flatMap((v) => Object.keys(v.puntuaciones || {})))]

  const por_dimension = {}
  for (const d of claves) {
    por_dimension[d] = dimension(filas.map((v) => v.puntuaciones?.[d]).filter((x) => x != null), t)
  }
  const dims = Object.values(por_dimension)
  const peor = filas.filter((v) => v.paciente?.efecto === 'peor').length
  const vetos = filas.flatMap((v) => v.paciente?.vetos || [])

  // `comprension` se conserva como resumen en [0,1] para las pantallas y el histórico:
  // ahora es la proporción de acuerdo (puntuación ≥ 3) del ítem de comprensibilidad,
  // o la media de los ítems si esa clave no está.
  const principal = por_dimension.comprensibilidad
  const comprension = principal && principal.n
    ? principal.icvi
    : (dims.filter((d) => d.n).length
        ? dims.filter((d) => d.n).reduce((s, d) => s + d.icvi, 0) / dims.filter((d) => d.n).length
        : null)

  return {
    n, por_dimension, comprension, peor, vetos,
    supera: n >= t.minimo_paciente && vetos.length === 0
      && dims.length > 0 && dims.every((d) => d.n > 0 && d.icvi >= t.paciente_comprension),
  }
}

// --- Agregados por módulo / dominio -------------------------------------------

export function scvi(clasificaciones, dimensiones) {
  const out = {}
  for (const d of dimensiones) {
    const valores = clasificaciones.map((c) => c.por_dimension[d]).filter((x) => x && !x.insuficiente)
    const ave = valores.length ? valores.reduce((s, x) => s + x.icvi, 0) / valores.length : null
    const ua = valores.length ? valores.filter((x) => x.icvi === 1).length / valores.length : null
    out[d] = { ave, ua, n: valores.length }
  }
  return out
}

// Tasa de validez con IC 95 % (Wilson), para la muestra aleatoria: es la cifra del corpus.
export function tasaValidez(clasificaciones) {
  const decididas = clasificaciones.filter((c) => ['valido', 'revisar', 'partido', 'bloqueado'].includes(c.clase))
  const n = decididas.length
  const k = decididas.filter((c) => c.clase === 'valido').length
  if (!n) return { n: 0, k: 0, p: null, ic: null }
  const p = k / n
  const z2 = Z * Z
  const centro = (p + z2 / (2 * n)) / (1 + z2 / n)
  const medio = (Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n)
  return { n, k, p, ic: [Math.max(0, centro - medio), Math.min(1, centro + medio)] }
}

// Estabilidad entre rondas: la V no se mueve más de `estable_v` → «sin consenso estable».
export function estable(vAnterior, vActual, u) {
  const t = umbrales(u)
  if (vAnterior == null || vActual == null) return false
  return Math.abs(vActual - vAnterior) <= t.estable_v
}

// --- utilidades ----------------------------------------------------------------

function soloValidas(puntuaciones) {
  return (puntuaciones || [])
    .map((x) => Number(x))
    .filter((x) => Number.isInteger(x) && x >= 1 && x <= CATEGORIAS)
}
