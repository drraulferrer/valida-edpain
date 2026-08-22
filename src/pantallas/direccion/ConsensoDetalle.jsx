import { useState } from 'react'
import * as api from '../../lib/api.js'
import Lectura from '../../componentes/Lectura.jsx'
import { Histograma } from '../../componentes/Likert.jsx'
import { Sem, Vacio, fecha, histogramaDe, n2, pct } from './comun.jsx'

// Expediente de un concepto: métricas por dimensión, todas las valoraciones y, a petición,
// el texto completo (dirección sí puede leerlo entero).
export default function ConsensoDetalle({ concepto: c, clasif: k, valoraciones, dimensiones, dimsExpertas, nombres, clave, onCerrar }) {
  const [texto, setTexto] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const nombreDim = Object.fromEntries((dimensiones || []).map((d) => [d.clave, d.nombre]))

  const porRonda = (a, b) => (b.ronda - a.ronda) || String(a.panelista).localeCompare(String(b.panelista))
  const expertas = (valoraciones || []).filter((v) => v.perfil !== 'paciente').sort(porRonda)
  const pacientes = (valoraciones || []).filter((v) => v.perfil === 'paciente').sort(porRonda)

  const verTexto = async () => {
    if (texto) { setTexto(null); return }
    setCargando(true)
    setError('')
    try {
      setTexto(await api.dirConcepto(clave, c.id))
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="tarjeta blanca" id="detalle-concepto">
      <div className="miga">
        <span style={{ fontFamily: 'var(--mono)' }}>{c.id}</span>
        <span className="sep">·</span><span>{nombres[c.dominio] || c.dominio}</span>
        <span className="sep">·</span><span>{nombres[c.modulo] || c.modulo}</span>
        {(c.estratos || []).map((e) => <span key={e} className="etiqueta">{e}</span>)}
        {c.controversia && <span className="etiqueta aviso">controversia</span>}
        {(c.senales || []).map((s, i) => <span key={i} className="etiqueta morado" title={s.detalle || ''}>{s.tipo}</span>)}
      </div>
      <h2 style={{ marginTop: '0.4rem' }}>{c.titulo}</h2>
      <div className="acciones" style={{ marginTop: 0 }}>
        <Sem clase={k?.clase} />
        <span className="silencio">{k?.n ?? 0} jueces válidos · certeza {c.certeza || '—'} · {c.tipo_afirmacion || '—'}</span>
        {k?.bloqueado_por?.length > 0 && <span className="etiqueta peligro">bandera de seguridad: {k.bloqueado_por.join(', ')}</span>}
        <span className="relleno" />
        <button type="button" className="boton secundario pequeno" onClick={verTexto} disabled={cargando}>
          {cargando ? 'Cargando…' : texto ? 'Ocultar texto' : 'Ver texto completo'}
        </button>
        <button type="button" className="boton fantasma pequeno" onClick={onCerrar}>Cerrar</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="panel-dos">
        <div>
          <h3>Por dimensión</h3>
          {dimsExpertas.map((d) => <Dimension key={d} nombre={nombreDim[d] || d} d={k?.por_dimension?.[d]} />)}
          <h3 style={{ marginTop: '1rem' }}>Panel de paciente</h3>
          {k?.paciente?.n ? (
            <div className="cuadricula-celdas">
              <div className="celda"><b>{k.paciente.n}</b>n</div>
              <div className="celda"><b>{pct(k.paciente.comprension)}</b>se entiende</div>
              <div className="celda"><b>{k.paciente.peor}</b>«me deja peor»</div>
              <div className="celda"><b>{k.paciente.vetos.length}</b>vetos</div>
            </div>
          ) : <Vacio>Sin respuestas de pacientes en esta ronda.</Vacio>}
        </div>
        <div>
          <h3>Valoraciones de expertos ({expertas.length})</h3>
          {expertas.length === 0 ? <Vacio>Todavía nadie ha valorado este concepto.</Vacio> : expertas.map((v) => (
            <Valoracion key={v.id} v={v} dimsExpertas={dimsExpertas} nombreDim={nombreDim} />
          ))}
          {pacientes.length > 0 && (
            <>
              <h3 style={{ marginTop: '1rem' }}>Respuestas de pacientes ({pacientes.length})</h3>
              {pacientes.map((v) => <RespuestaPaciente key={v.id} v={v} />)}
            </>
          )}
        </div>
      </div>

      {texto && (
        <div className="tarjeta" style={{ marginTop: '1rem' }}>
          <Lectura concepto={texto} nombres={nombres} completo />
        </div>
      )}
    </div>
  )
}

function Dimension({ nombre, d }) {
  if (!d || !d.n) {
    return <div className="tarjeta" style={{ margin: '0.5rem 0' }}><b>{nombre}</b> <Sem clase="pendiente">sin datos</Sem></div>
  }
  const clase = d.insuficiente ? 'insuficiente' : d.partido ? 'partido' : d.supera ? 'valido' : 'revisar'
  return (
    <div className="tarjeta" style={{ margin: '0.5rem 0' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <b>{nombre}</b>
        <Sem clase={clase}>{clase === 'valido' ? 'supera' : clase === 'revisar' ? 'no supera' : clase === 'partido' ? 'panel partido' : 'panel insuficiente'}</Sem>
        {d.discrepan && <span className="etiqueta aviso" title="Una supera su umbral y la otra no; se informa, no se elige">I-CVI y V discrepan</span>}
      </div>
      <Histograma datos={histogramaDe(d)} />
      <div className="cuadricula-celdas">
        <div className="celda"><b>{d.n}</b>n</div>
        <div className="celda"><b>{n2(d.icvi)}</b>I-CVI ≥ {n2(d.umbral_icvi)}</div>
        <div className="celda"><b>{n2(d.kappa)}</b>kappa*</div>
        <div className="celda"><b>{n2(d.V)}</b>V [{n2(d.ic?.[0])}, {n2(d.ic?.[1])}]</div>
      </div>
    </div>
  )
}

function Valoracion({ v, dimsExpertas, nombreDim }) {
  const banderas = Object.entries(v.banderas || {}).filter(([, x]) => x)
  const estado = v.abstencion ? 'abstención' : v.completa ? 'completa' : 'incompleta'
  return (
    <div className="tarjeta" style={{ margin: '0.5rem 0' }}>
      <div className="miga">
        <span style={{ fontFamily: 'var(--mono)' }}>{v.panelista}</span>
        <span className="sep">·</span><span>ronda {v.ronda}</span>
        <span className="sep">·</span><span>{estado}</span>
        <span className="sep">·</span><span>{fecha(v.actualizada_en)}</span>
      </div>
      {v.abstencion && v.motivo_abstencion && <p className="silencio">Motivo: {v.motivo_abstencion}</p>}
      {!v.abstencion && (
        <div className="cuadricula-celdas" style={{ margin: '0.4rem 0' }}>
          {dimsExpertas.map((d) => <div key={d} className="celda"><b>{v.puntuaciones?.[d] ?? '—'}</b>{nombreDim[d] || d}</div>)}
        </div>
      )}
      {banderas.length > 0 && (
        <div className="miga" style={{ margin: '0.3rem 0' }}>
          {banderas.map(([k, x]) => (
            <span key={k} className={`etiqueta ${k === 'seguridad' ? 'peligro' : 'aviso'}`}>{k}{typeof x === 'string' ? `: ${x}` : ''}</span>
          ))}
        </div>
      )}
      {v.comentario && <p className="comentario-cita">{v.comentario}</p>}
      {(v.ajustes || []).map((a, i) => (
        <p key={i} className="comentario-cita">
          <span className="etiqueta">{a.parte || 'parte'}</span> <span className="etiqueta acento">{a.motivo || 'motivo'}</span> {a.redaccion}
        </p>
      ))}
    </div>
  )
}

function RespuestaPaciente({ v }) {
  const p = v.paciente || {}
  return (
    <div className="tarjeta" style={{ margin: '0.5rem 0' }}>
      <div className="miga">
        <span style={{ fontFamily: 'var(--mono)' }}>{v.panelista}</span>
        <span className="sep">·</span><span>ronda {v.ronda}</span>
        {v.abstencion && <><span className="sep">·</span><span>abstención</span></>}
      </div>
      {!v.abstencion && (
        <p style={{ margin: '0.3rem 0' }}>
          Se entiende: <b>{p.comprension || '—'}</b> · Cómo te deja: <b>{p.efecto || '—'}</b>
          {(p.vetos || []).length > 0 && <> · Vetos: <b>{p.vetos.join(', ')}</b></>}
        </p>
      )}
      {v.comentario && <p className="comentario-cita">{v.comentario}</p>}
    </div>
  )
}
