import { useEffect, useState } from 'react'
import * as api from '../../lib/api.js'
import { Vacio, fecha } from './comun.jsx'

const NOMBRE_TIPO = {
  mitad: 'Mitad del plazo', tres_dias: 'Quedan 3 días', un_dia: 'Último día', vencido: 'Plazo vencido',
}
const CLASE_TIPO = { mitad: 'pendiente', tres_dias: 'revisar', un_dia: 'bloqueado', vencido: 'bloqueado' }

function iso(valor) {
  // datetime-local → ISO con la zona del navegador; vacío se queda vacío.
  return valor ? new Date(valor).toISOString() : ''
}
function paraInput(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function Plazos({ datos, clave, recargar }) {
  const { estudio } = datos
  const ronda = estudio.ronda_actual
  const [avisos, setAvisos] = useState(null)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState('')

  const cargarAvisos = async () => {
    setOcupado('avisos'); setError('')
    try { setAvisos(await api.dirAvisos(clave)) } catch (e) { setError(e.message) } finally { setOcupado('') }
  }
  useEffect(() => { cargarAvisos() }, [clave]) // eslint-disable-line react-hooks/exhaustive-deps

  const ejecutar = async (id, fn, texto) => {
    setOcupado(id); setError(''); setMensaje('')
    try { await fn(); if (texto) setMensaje(texto); await recargar(); await cargarAvisos() }
    catch (e) { setError(e.message) } finally { setOcupado('') }
  }

  const plazoDe = (codigo) => (datos.plazos || []).find((x) => x.panelista === codigo && x.ronda === ronda)
  const panelistas = (datos.panelistas || []).filter((p) => p.perfil !== 'direccion')

  return (
    <section>
      {error && <p className="error" role="alert">{error}</p>}
      {mensaje && <p className="ok-caja" role="status">{mensaje}</p>}

      <Calendario datos={datos} clave={clave} ejecutar={ejecutar} ocupado={ocupado} />

      <h3 style={{ marginTop: '1.5rem' }}>Avisos que toca mandar ahora</h3>
      <p className="silencio">
        Se calculan solos: a la mitad del plazo, a 3 días, el último día y al vencer. Un panelista solo aparece
        aquí si le quedan conceptos pendientes, así que <b>en cuanto termina su bloque los avisos desaparecen</b>.
        «Preparar correo» abre tu programa de correo con el mensaje escrito; «Marcar como enviado» evita que se repita.
      </p>
      {!avisos && <p className="silencio">Calculando…</p>}
      {avisos && avisos.length === 0 && <Vacio>No hay ningún aviso pendiente ahora mismo.</Vacio>}
      {avisos && avisos.length > 0 && (
        <div className="tarjeta">
          <div className="acciones" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
            {[...new Set(avisos.map((a) => a.tipo))].map((t) => (
              <button key={t} type="button" className="boton secundario pequeno" disabled={!!ocupado}
                onClick={() => ejecutar(`marcar-${t}`, () => api.dirMarcarAvisos(clave, avisos.filter((a) => a.tipo === t).map((a) => a.codigo), t), `Avisos de «${NOMBRE_TIPO[t]}» marcados como enviados.`)}>
                Marcar todos: {NOMBRE_TIPO[t]}
              </button>
            ))}
          </div>
          <ul className="avisos-lista">
            {avisos.map((a) => (
              <li key={`${a.codigo}-${a.tipo}`}>
                <span className={`sem ${CLASE_TIPO[a.tipo]}`}>{NOMBRE_TIPO[a.tipo]}</span>
                <span className="quien">
                  <b>{a.codigo}{a.nombre ? ` · ${a.nombre} ${a.apellidos || ''}` : ''}{a.es_prueba ? ' (prueba)' : ''}</b>
                  <span className="silencio">
                    {a.email || 'sin correo'} · le faltan <b>{a.pendientes}</b> de {a.total} · termina el {fecha(a.fin)}
                  </span>
                </span>
                <span style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {a.email && (
                    <a className="boton secundario pequeno" href={`mailto:${a.email}?subject=${encodeURIComponent(a.asunto)}&body=${encodeURIComponent(a.cuerpo)}`}>Preparar correo</a>
                  )}
                  <button type="button" className="boton fantasma pequeno" disabled={!!ocupado}
                    onClick={() => ejecutar(`m-${a.codigo}-${a.tipo}`, () => api.dirMarcarAvisos(clave, [a.codigo], a.tipo))}>Marcar como enviado</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 style={{ marginTop: '1.5rem' }}>Plazo de cada panelista · ronda {ronda}</h3>
      <div className="tabla-env">
        <table className="tabla">
          <thead>
            <tr><th>Código</th><th>Perfil</th><th className="num">Días</th><th>Empieza</th><th>Termina</th>
              <th className="num">Quedan</th><th className="num">Pendientes</th><th>Ampliar</th></tr>
          </thead>
          <tbody>
            {panelistas.map((p) => {
              const pl = plazoDe(p.codigo)
              const quedan = pl ? Math.ceil(Number(pl.dias_restantes)) : null
              const pendientes = (p.asignadas || 0) - (p.hechas || 0) - (p.abstenidas || 0)
              return (
                <tr key={p.codigo} style={p.activo ? undefined : { opacity: 0.55 }}>
                  <td style={{ fontFamily: 'var(--mono)' }}>{p.codigo}</td>
                  <td>{p.perfil}{p.es_prueba && <span className="etiqueta aviso" style={{ marginLeft: '0.3rem' }}>prueba</span>}</td>
                  <td className="num">{pl ? pl.dias : <span className="silencio">—</span>}</td>
                  <td>{pl ? fecha(pl.inicio) : <span className="silencio">sin plazo</span>}</td>
                  <td>{pl ? fecha(pl.fin) : '—'}</td>
                  <td className="num">
                    {quedan == null ? <span className="silencio">—</span>
                      : <span className={`sem ${quedan <= 0 ? 'bloqueado' : quedan <= 3 ? 'revisar' : 'valido'}`}>{quedan <= 0 ? 'vencido' : `${quedan} d`}</span>}
                  </td>
                  <td className="num">{pendientes > 0 ? pendientes : <span className="silencio">0</span>}</td>
                  <td><Ampliar p={p} pl={pl} clave={clave} ejecutar={ejecutar} ocupado={ocupado} /></td>
                </tr>
              )
            })}
            {!panelistas.length && <tr><td colSpan={8}><Vacio>No hay panelistas.</Vacio></td></tr>}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: '1.5rem' }}>Avisos ya enviados</h3>
      {!(datos.avisos || []).length ? <Vacio>Todavía no se ha marcado ningún aviso como enviado.</Vacio> : (
        <div className="tabla-env">
          <table className="tabla">
            <thead><tr><th>Código</th><th className="num">Ronda</th><th>Tipo</th><th>Enviado</th><th className="num">Le faltaban</th></tr></thead>
            <tbody>
              {(datos.avisos || []).map((a) => (
                <tr key={`${a.panelista}-${a.ronda}-${a.tipo}`}>
                  <td style={{ fontFamily: 'var(--mono)' }}>{a.panelista}</td>
                  <td className="num">{a.ronda}</td>
                  <td>{NOMBRE_TIPO[a.tipo] || a.tipo}</td>
                  <td>{fecha(a.enviado_en)}</td>
                  <td className="num">{a.pendientes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Ampliar({ p, pl, clave, ejecutar, ocupado }) {
  const [dias, setDias] = useState('')
  const nuevo = Number(dias)
  return (
    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" className="boton secundario pequeno" disabled={!!ocupado}
        onClick={() => ejecutar(`p7-${p.codigo}`, () => api.dirPlazo(clave, p.codigo, (pl?.dias || 10) + 7, '+7 días desde el panel'), `Plazo de ${p.codigo} ampliado 7 días.`)}>
        +7 días
      </button>
      <input type="number" min="1" max="365" value={dias} onChange={(e) => setDias(e.target.value)} placeholder="días"
        style={{ width: '5.5rem', minHeight: '2rem', padding: '0.25rem 0.5rem' }} aria-label={`Días de plazo para ${p.codigo}`} />
      <button type="button" className="boton fantasma pequeno" disabled={!!ocupado || !Number.isInteger(nuevo) || nuevo < 1}
        onClick={() => ejecutar(`pn-${p.codigo}`, () => api.dirPlazo(clave, p.codigo, nuevo, 'fijado desde el panel'), `Plazo de ${p.codigo}: ${nuevo} días.`)}>
        Fijar
      </button>
    </div>
  )
}

function Calendario({ datos, clave, ejecutar, ocupado }) {
  const ronda = datos.estudio.ronda_actual
  const actual = (datos.rondas || []).find((r) => r.ronda === ronda)
  const [abre, setAbre] = useState(paraInput(actual?.abre_en))
  const [cierra, setCierra] = useState(paraInput(actual?.cierra_en))
  const [dias, setDias] = useState(String(datos.estudio.plazo_dias ?? 10))

  return (
    <div className="tarjeta">
      <h3>Calendario de la ronda {ronda}</h3>
      <p className="silencio">
        El cierre de la ronda es un tope duro: cuando pasa, nadie puede guardar más valoraciones aunque le quede
        plazo personal. El plazo por defecto es lo que se le da a cada panelista <b>desde que entra</b> en la ronda.
      </p>
      <div className="panel-dos">
        <div className="campo">
          <label htmlFor="ronda-abre">Apertura</label>
          <input id="ronda-abre" type="datetime-local" value={abre} onChange={(e) => setAbre(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="ronda-cierra">Cierre</label>
          <input id="ronda-cierra" type="datetime-local" value={cierra} onChange={(e) => setCierra(e.target.value)} />
          <p className="ayuda">Vacío = sin tope de ronda; manda solo el plazo de cada panelista.</p>
        </div>
        <div className="campo">
          <label htmlFor="plazo-dias">Plazo por defecto (días)</label>
          <input id="plazo-dias" type="number" min="1" max="365" value={dias} onChange={(e) => setDias(e.target.value)} />
          <p className="ayuda">Se aplica a quien entre a partir de ahora; a los que ya tienen plazo se les cambia uno a uno abajo.</p>
        </div>
      </div>
      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="button" className="boton" disabled={!!ocupado}
          onClick={() => ejecutar('calendario', async () => {
            await api.dirRondaFechas(clave, ronda, iso(abre), cierra ? iso(cierra) : '', null)
            await api.dirEstudio(clave, { id: datos.estudio.id, plazo_dias: Number(dias) })
          }, 'Calendario guardado.')}>
          Guardar calendario
        </button>
      </div>
      {(datos.rondas || []).length > 1 && (
        <p className="silencio" style={{ marginTop: '0.75rem' }}>
          Rondas anteriores: {(datos.rondas || []).filter((r) => r.ronda !== ronda).map((r) => `${r.ronda} (${fecha(r.abre_en)}${r.cierra_en ? ` → ${fecha(r.cierra_en)}` : ''})`).join(' · ')}
        </p>
      )}
    </div>
  )
}
