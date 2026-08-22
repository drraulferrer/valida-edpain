import { useEffect, useState } from 'react'
import * as api from '../lib/api.js'

export default function Cierre({ sesion }) {
  const [bloque, setBloque] = useState(null)
  useEffect(() => { api.bloque(sesion.clave).then(setBloque).catch(() => {}) }, [sesion.clave])
  if (!bloque) return <main className="pantalla"><p className="silencio">Cargando…</p></main>
  const hechas = bloque.items.filter((x) => x.estado === 'hecha').length
  const abst = bloque.items.filter((x) => x.estado === 'abstenida').length
  const pend = bloque.items.filter((x) => x.estado === 'pendiente').length
  return (
    <main className="pantalla centrada">
      <div className="tarjeta blanca" style={{ padding: '2rem 1.5rem' }}>
        <p className="etiqueta ok">Ronda {bloque.ronda}</p>
        <h1 style={{ marginTop: '0.75rem' }}>{pend ? 'Casi.' : 'Gracias. Esto es lo que has hecho.'}</h1>
        <div className="kpis">
          <div className="kpi"><div className="v">{hechas}</div><div className="l">conceptos valorados</div></div>
          <div className="kpi"><div className="v">{abst}</div><div className="l">abstenciones</div></div>
          <div className="kpi"><div className="v">{(bloque.cobertura || []).length}</div><div className="l">módulos con pregunta de cobertura</div></div>
        </div>
        {pend ? <p className="aviso-caja">Te quedan {pend} por hacer.</p> : (
          <p>Puedes volver a cualquier concepto y cambiar una respuesta hasta que la dirección editorial cierre la ronda. Si hay segunda ronda, verás qué opinó el grupo y qué opinaste tú.</p>
        )}
        <div className="acciones"><a className="boton secundario" href="#/bloque">Volver a mi bloque</a></div>
      </div>
    </main>
  )
}
