export default function Progreso({ hechas, total, texto }) {
  const pct = total ? Math.round((hechas / total) * 100) : 0
  return (
    <div className="progreso" role="progressbar" aria-valuenow={hechas} aria-valuemin={0} aria-valuemax={total} aria-label="Progreso del bloque">
      <strong>{hechas} / {total}</strong>
      <div className="barra"><span style={{ transform: `scaleX(${total ? hechas / total : 0})` }} /></div>
      <span>{texto || `${pct} %`}</span>
    </div>
  )
}
