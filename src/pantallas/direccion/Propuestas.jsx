import { useMemo, useState } from 'react'
import * as api from '../../lib/api.js'
import { Vacio, agrupar, contar } from './comun.jsx'

const ESTADOS = [['aplicada', 'Aplicada'], ['descartada', 'Descartada'], ['pendiente', 'Pendiente']]
const CLASE_ESTADO = { aplicada: 'ok', descartada: '', pendiente: 'aviso' }

function aplanar(datos) {
  const { valoraciones, conceptos, propuestas_estado } = datos
  const titulos = new Map((conceptos || []).map((c) => [c.id, c.titulo]))
  const estados = new Map((propuestas_estado || []).map((p) => [`${p.valoracion_id}-${p.indice}`, p]))
  return (valoraciones || []).flatMap((v) => (v.ajustes || []).map((a, indice) => {
    const e = estados.get(`${v.id}-${indice}`)
    return {
      id: `${v.id}-${indice}`, valoracion_id: v.id, indice,
      concepto_id: v.concepto_id, titulo: titulos.get(v.concepto_id) || '',
      panelista: v.panelista, ronda: v.ronda,
      parte: a.parte || '', motivo: a.motivo || '', redaccion: a.redaccion || '',
      comentario: v.comentario || '',
      estado: e?.estado || 'pendiente', nota: e?.nota || '',
    }
  }))
}

export default function Propuestas({ datos, clave, recargar }) {
  const todas = useMemo(() => aplanar(datos), [datos])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroMotivo, setFiltroMotivo] = useState('')
  const [notas, setNotas] = useState({})
  const [ocupado, setOcupado] = useState('')
  const [error, setError] = useState('')

  const motivos = [...new Set(todas.map((p) => p.motivo).filter(Boolean))].sort()
  const visibles = todas.filter((p) => (!filtroEstado || p.estado === filtroEstado) && (!filtroMotivo || p.motivo === filtroMotivo))
  const grupos = [...agrupar(visibles, (p) => p.concepto_id)]
  const pendientes = contar(todas, (p) => p.estado === 'pendiente')

  const marcar = async (p, estado) => {
    setOcupado(p.id)
    setError('')
    try {
      const nota = notas[p.id] ?? p.nota
      await api.dirPropuesta(clave, p.valoracion_id, p.indice, estado, nota || null)
      await recargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado('')
    }
  }

  return (
    <section>
      <div className="filtros">
        <span><b>{todas.length}</b> propuestas · <b>{pendientes}</b> pendientes · {visibles.length} en pantalla</span>
        <label>
          <span className="oculto-visual">Estado</span>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">todos los estados</option>
            {ESTADOS.map(([k, n]) => <option key={k} value={k}>{n.toLowerCase()}</option>)}
          </select>
        </label>
        <label>
          <span className="oculto-visual">Motivo</span>
          <select value={filtroMotivo} onChange={(e) => setFiltroMotivo(e.target.value)}>
            <option value="">todos los motivos</option>
            {motivos.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <p className="silencio">Marcar una propuesta no toca el corpus: deja constancia de la decisión editorial. El cambio se hace en el repositorio.</p>

      {grupos.length === 0 ? <Vacio>No hay propuestas con esos filtros.</Vacio> : grupos.map(([conceptoId, lista]) => (
        <div key={conceptoId} className="tarjeta">
          <h3>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8em', color: 'var(--tinta-3)' }}>{conceptoId}</span>{' '}
            {lista[0].titulo}
          </h3>
          {lista.map((p) => (
            <Propuesta key={p.id} p={p} nota={notas[p.id] ?? p.nota} ocupado={ocupado === p.id}
              onNota={(texto) => setNotas((prev) => ({ ...prev, [p.id]: texto }))}
              onMarcar={(estado) => marcar(p, estado)} />
          ))}
        </div>
      ))}
    </section>
  )
}

function Propuesta({ p, nota, ocupado, onNota, onMarcar }) {
  return (
    <div className="tarjeta blanca" style={{ margin: '0.6rem 0' }}>
      <div className="miga" style={{ marginBottom: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--mono)' }}>{p.panelista}</span>
        <span className="sep">·</span><span>ronda {p.ronda}</span>
        <span className="sep">·</span><span className="etiqueta">{p.parte || 'sin parte'}</span>
        <span className="etiqueta acento">{p.motivo || 'sin motivo'}</span>
        <span className={`etiqueta ${CLASE_ESTADO[p.estado] || ''}`}>{p.estado}</span>
      </div>
      {p.redaccion ? <p className="comentario-cita">{p.redaccion}</p> : <p className="silencio">Sin redacción alternativa.</p>}
      {p.comentario && <p className="silencio" style={{ margin: '0.3rem 0' }}>Comentario de la valoración: {p.comentario}</p>}
      <div className="campo" style={{ margin: '0.5rem 0' }}>
        <label htmlFor={`nota-${p.id}`} className="oculto-visual">Nota de dirección</label>
        <input id={`nota-${p.id}`} type="text" placeholder="Nota de dirección (opcional)" value={nota} onChange={(e) => onNota(e.target.value)} />
      </div>
      <div className="acciones" style={{ marginTop: 0 }}>
        {ESTADOS.map(([k, n]) => (
          <button key={k} type="button" className={`boton pequeno ${k === 'aplicada' ? '' : 'secundario'}`}
            disabled={ocupado || p.estado === k} onClick={() => onMarcar(k)}>{n}</button>
        ))}
      </div>
    </div>
  )
}
