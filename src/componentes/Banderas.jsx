// Banderas: no puntúan, señalan. La de seguridad tiene efecto de veto.
export const BANDERAS = [
  { clave: 'seguridad', veto: true, etiqueta: 'Puede inducir una decisión clínica insegura',
    ayuda: 'Una sola marca de un solo panelista bloquea la publicación, aunque el resto esté de acuerdo. No se resuelve por mayoría.' },
  { clave: 'certeza', etiqueta: 'La certeza declarada no es la correcta', detalle: '¿Cuál debería ser? (consenso · alta · moderada · baja · muy baja)' },
  { clave: 'fronteras', etiqueta: 'Problema de frontera: se solapa, sobra o son dos conceptos', detalle: '¿Con qué concepto se solapa, o por dónde lo partirías?' },
  { clave: 'caduco', etiqueta: 'Hay literatura posterior que esto no recoge', detalle: 'Si puedes, la referencia: es la aportación más útil de todas.' },
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
