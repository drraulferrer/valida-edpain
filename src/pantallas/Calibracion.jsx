import { useEffect, useState } from 'react'
import * as api from '../lib/api.js'
import Lectura from '../componentes/Lectura.jsx'
import Likert from '../componentes/Likert.jsx'
import { ir } from '../App.jsx'

// Dos conceptos de práctica con «así lo vio el panel». No es entrenamiento para converger:
// es para que todo el mundo entienda igual las cuatro afirmaciones.
export default function Calibracion({ sesion, refrescar }) {
  const [items, setItems] = useState(null)
  const [nombres, setNombres] = useState({})
  const [i, setI] = useState(0)
  const [punt, setPunt] = useState({})
  const [revelado, setRevelado] = useState(false)
  const [error, setError] = useState('')
  const dims = (sesion.estudio?.dimensiones || []).filter((d) => d.quien !== 'paciente')

  useEffect(() => {
    Promise.all([api.calibracion(sesion.clave), api.bloque(sesion.clave)])
      .then(([k, b]) => { setItems(k); setNombres(b.nombres || {}) })
      .catch((e) => setError(e.message))
  }, [sesion.clave])

  const terminar = async () => {
    try { await api.calibracionHecha(sesion.clave); await refrescar(); ir('/bloque') } catch (e) { setError(e.message) }
  }

  if (error) return <main className="pantalla"><p className="error">{error}</p></main>
  if (!items) return <main className="pantalla"><p className="silencio">Cargando…</p></main>
  if (!items.length) {
    return (
      <main className="pantalla">
        <h1>Sin conceptos de práctica</h1>
        <p className="silencio">La dirección editorial no ha definido aún conceptos de calibración. Puedes empezar directamente.</p>
        <div className="acciones"><button className="boton" type="button" onClick={terminar}>Ir a mi bloque</button></div>
      </main>
    )
  }

  const item = items[i]
  const completo = dims.every((d) => punt[d.clave])

  return (
    <main className="pantalla">
      <p className="etiqueta acento">Práctica · {i + 1} de {items.length} · no cuenta</p>
      <Lectura concepto={item.concepto} nombres={nombres} />
      <div className="tarjeta blanca" style={{ marginTop: '1.5rem' }}>
        {dims.map((d) => (
          <div className="dimension" key={d.clave}>
            <div className="nombre">{d.nombre}</div>
            <p className="afirmacion">{d.afirmacion}</p>
            <Likert nombre={d.nombre} valor={punt[d.clave] || null} onCambio={(v) => setPunt({ ...punt, [d.clave]: v })} deshabilitado={revelado} />
            {revelado && (
              <p className="ayuda" style={{ marginTop: '0.5rem' }}>
                El panel suele dar <b>{item.modelo?.[d.clave] ?? '—'}</b>{punt[d.clave] ? <> · tú has dado <b>{punt[d.clave]}</b></> : null}.
              </p>
            )}
          </div>
        ))}
        {revelado && <div className="ok-caja">{item.explicacion}</div>}
        <div className="acciones">
          {!revelado
            ? <button className="boton" type="button" disabled={!completo} onClick={() => setRevelado(true)}>Ver cómo lo vio el panel</button>
            : i + 1 < items.length
              ? <button className="boton" type="button" onClick={() => { setI(i + 1); setPunt({}); setRevelado(false); window.scrollTo({ top: 0 }) }}>Siguiente práctica</button>
              : <button className="boton" type="button" onClick={terminar}>Empezar con mi bloque</button>}
          <button className="boton fantasma" type="button" onClick={terminar}>Saltar la práctica</button>
        </div>
      </div>
    </main>
  )
}
