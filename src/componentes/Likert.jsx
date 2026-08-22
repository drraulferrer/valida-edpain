// Escala de 4 puntos sin punto medio. Teclado: 1-4 cuando la dimensión tiene el foco.
export const CATEGORIAS = [
  [1, 'Nada de acuerdo'],
  [2, 'Poco de acuerdo'],
  [3, 'Bastante de acuerdo'],
  [4, 'Totalmente de acuerdo'],
]

export default function Likert({ valor, onCambio, nombre, deshabilitado }) {
  return (
    <div className="likert" role="radiogroup" aria-label={nombre}
      onKeyDown={(e) => { if (/^[1-4]$/.test(e.key) && !deshabilitado) { e.preventDefault(); onCambio(Number(e.key)) } }}>
      {CATEGORIAS.map(([n, txt]) => (
        <button key={n} type="button" role="radio" aria-checked={valor === n} aria-pressed={valor === n}
          className={n <= 2 ? 'bajo' : ''} disabled={deshabilitado}
          onClick={() => onCambio(valor === n ? null : n)}>
          <span className="num">{n}</span>
          <span className="txt">{txt}</span>
        </button>
      ))}
    </div>
  )
}

export function Histograma({ datos, mia }) {
  if (!datos) return null
  const h = datos.h || {}
  const max = Math.max(1, ...[1, 2, 3, 4].map((k) => Number(h[k] || 0)))
  return (
    <div className="histograma" aria-label={`Respuestas del grupo en la ronda anterior (n = ${datos.n})`}>
      {[1, 2, 3, 4].map((k) => (
        <div key={k} className={`col${mia === k ? ' mia' : ''}`}>
          <div className="b"><span style={{ height: `${(Number(h[k] || 0) / max) * 100}%` }} /></div>
          <span>{h[k] || 0}{mia === k ? ' · tú' : ''}</span>
        </div>
      ))}
    </div>
  )
}
