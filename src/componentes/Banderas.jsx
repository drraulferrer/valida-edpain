// Banderas: no puntúan, señalan. La de seguridad tiene efecto de veto.
export const BANDERAS = [
  { clave: 'seguridad', veto: true, etiqueta: 'Puede inducir una decisión clínica insegura',
    ayuda: 'Una sola marca bloquea la publicación del concepto hasta que sea revisado.' },
  { clave: 'certeza', etiqueta: 'El nivel de certeza no es el adecuado',
    detalle: 'Indica cuál consideras correcto: consenso, alta, moderada, baja o muy baja.' },
  { clave: 'fronteras', etiqueta: 'Problema de delimitación',
    ayuda: 'El concepto se solapa con otro, incluye más de una idea o debería dividirse.',
    detalle: 'Indica con cuál o cómo lo reorganizarías.' },
  { clave: 'caduco', etiqueta: 'Existe evidencia más reciente',
    detalle: 'Si conoces literatura que no se haya incorporado, añade la referencia.' },
]

export default function Banderas({ valor, onCambio }) {
  const v = valor || {}
  const poner = (clave, dato) => {
    const nueva = { ...v }
    if (dato === false || dato === '' || dato == null) delete nueva[clave]
    else nueva[clave] = dato
    onCambio(nueva)
  }
  return (
    <div className="banderas">
      {BANDERAS.map((b) => {
        const activa = v[b.clave] !== undefined
        return (
          <label key={b.clave} className={`casilla${b.veto ? ' veto' : ''}`}>
            <input type="checkbox" checked={activa}
              onChange={(e) => poner(b.clave, e.target.checked ? (b.detalle ? (typeof v[b.clave] === 'string' ? v[b.clave] : '') || ' ' : true) : false)} />
            <span style={{ flex: 1 }}>
              {b.etiqueta}
              {b.ayuda && <span className="sub">{b.ayuda}</span>}
              {activa && b.detalle && (
                <input type="text" placeholder={b.detalle} aria-label={b.detalle}
                  value={typeof v[b.clave] === 'string' ? v[b.clave].trim() : ''}
                  onChange={(e) => poner(b.clave, e.target.value || ' ')} />
              )}
            </span>
          </label>
        )
      })}
    </div>
  )
}
