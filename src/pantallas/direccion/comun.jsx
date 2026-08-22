// ---------------------------------------------------------------------------
// Utilidades compartidas por las pantallas del panel de dirección: formato de
// números y fechas, agrupación, descarga de ficheros y un par de piezas mínimas.
// Sin red y sin estado.
// ---------------------------------------------------------------------------

export const CLASES = ['valido', 'revisar', 'partido', 'bloqueado', 'insuficiente', 'pendiente']
export const NOMBRE_CLASE = {
  valido: 'válido',
  revisar: 'revisar',
  partido: 'panel partido',
  bloqueado: 'bloqueado',
  insuficiente: 'panel insuficiente',
  pendiente: 'pendiente',
}
export const ESTRATOS = ['aleatorio', 'controversia', 'cribado']
export const PERFILES = ['experto', 'paciente', 'direccion']
export const PATRON_CODIGO = /^[A-Z]{2,4}-[0-9]{2,3}$/
export const MS_MUY_RAPIDO = 45000

// --- formato -----------------------------------------------------------------

export function n2(x) {
  return x == null || Number.isNaN(Number(x)) ? '—' : Number(x).toFixed(2)
}

export function pct(x, decimales = 0) {
  return x == null || Number.isNaN(Number(x)) ? '—' : `${(Number(x) * 100).toFixed(decimales)} %`
}

export function fecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-ES')
}

export function relativo(iso, ahora = Date.now()) {
  if (!iso) return 'nunca'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const s = Math.max(0, Math.round((ahora - t) / 1000))
  if (s < 60) return 'hace un momento'
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  if (d < 30) return `hace ${d} d`
  return fecha(iso)
}

export function mmss(ms) {
  if (!ms || ms <= 0) return '—'
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function hoyIso() {
  return new Date().toISOString().slice(0, 10)
}

// --- agregación ---------------------------------------------------------------

export function media(valores) {
  const v = (valores || []).map(Number).filter((x) => !Number.isNaN(x))
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
}

export function minimo(valores) {
  const v = (valores || []).map(Number).filter((x) => !Number.isNaN(x))
  return v.length ? Math.min(...v) : null
}

export function agrupar(lista, clavede) {
  const grupos = new Map()
  for (const x of lista || []) {
    const k = clavede(x)
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k).push(x)
  }
  return grupos
}

export function contar(lista, pred) {
  return (lista || []).filter(pred).length
}

// Entradas del catálogo de un tipo, ordenadas: [[id, {nombre, tipo, orden}], ...]
export function entradasCatalogo(catalogo, tipo) {
  return Object.entries(catalogo || {})
    .filter(([, v]) => v.tipo === tipo)
    .sort((a, b) => (a[1].orden ?? 0) - (b[1].orden ?? 0))
}

export function ordenDe(catalogo) {
  return (id) => catalogo?.[id]?.orden ?? Number.MAX_SAFE_INTEGER
}

// El histograma de metricas.dimension ([n1, n2, n3, n4]) en la forma que pinta <Histograma />.
export function histogramaDe(dim) {
  const h = dim?.histograma || [0, 0, 0, 0]
  return { n: dim?.n || 0, h: { 1: h[0] || 0, 2: h[1] || 0, 3: h[2] || 0, 4: h[3] || 0 } }
}

// --- ficheros -------------------------------------------------------------------

export function descargar(nombre, contenido, tipo = 'application/json') {
  try {
    const blob = new Blob([contenido], { type: `${tipo};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch {
    return false
  }
}

export function aCsv(filas, columnas) {
  const esc = (v) => {
    if (v == null) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const cabecera = columnas.join(',')
  const cuerpo = filas.map((f) => columnas.map((c) => esc(f[c])).join(','))
  return [cabecera, ...cuerpo].join('\n')
}

// --- piezas mínimas ----------------------------------------------------------------

export function Sem({ clase, children, title }) {
  const c = CLASES.includes(clase) ? clase : 'pendiente'
  return <span className={`sem ${c}`} title={title}>{children ?? NOMBRE_CLASE[c]}</span>
}

export function MiniBarra({ valor, total }) {
  const f = total > 0 ? Math.min(1, Math.max(0, valor / total)) : 0
  return (
    <span className="mini-barra" role="img" aria-label={`${valor} de ${total}`}>
      <span style={{ width: `${Math.round(f * 100)}%` }} />
    </span>
  )
}

export function Vacio({ children }) {
  return <p className="silencio">{children}</p>
}
