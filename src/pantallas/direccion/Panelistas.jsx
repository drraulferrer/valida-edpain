import { useMemo, useState } from 'react'
import * as api from '../../lib/api.js'
import { MS_MUY_RAPIDO, MiniBarra, PATRON_CODIGO, PERFILES, Vacio, entradasCatalogo, mmss, relativo } from './comun.jsx'
import { esExpertoFehring, puntuacionFehring, resumenPerfil } from '../../lib/perfil.js'

const ORDEN_PERFIL = { direccion: 0, experto: 1, paciente: 2 }
const NOMBRE_ESTADO = { pendiente: 'pendiente', hecha: 'hecha', abstenida: 'abstenida' }

function ordenar(panelistas) {
  return [...(panelistas || [])].sort((a, b) =>
    (ORDEN_PERFIL[a.perfil] ?? 9) - (ORDEN_PERFIL[b.perfil] ?? 9) || a.codigo.localeCompare(b.codigo))
}

export default function Panelistas({ datos, clave, nombres, recargar }) {
  const [error, setError] = useState('')
  const [claveNueva, setClaveNueva] = useState(null)   // { codigo, clave } — se enseña una sola vez
  const [ocupado, setOcupado] = useState('')
  const [abierto, setAbierto] = useState('')           // código del panelista cuyo bloque se ve
  const [identidades, setIdentidades] = useState(null) // se piden aparte: no viajan con los datos del estudio
  const lista = ordenar(datos.panelistas)

  const ejecutar = async (id, fn) => {
    setOcupado(id)
    setError('')
    try {
      await fn()
      await recargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado('')
    }
  }

  const reclave = (p) => {
    if (!window.confirm(`¿Generar una clave nueva para ${p.codigo}? La anterior dejará de funcionar en el acto.`)) return
    ejecutar(`reclave-${p.codigo}`, async () => {
      const r = await api.dirReclave(clave, p.codigo)
      setClaveNueva({ codigo: r.codigo || p.codigo, clave: r.clave })
    })
  }

  const verIdentidades = () => ejecutar('identidades', async () => { setIdentidades(await api.dirIdentidades(clave)) })

  const borrarPrueba = (p) => {
    if (!window.confirm(`¿Borrar al panelista de prueba ${p.codigo} con TODAS sus valoraciones y su identidad? No se puede deshacer.`)) return
    ejecutar(`borrar-${p.codigo}`, () => api.dirBorrarPrueba(clave, p.codigo))
  }

  const cambiarActivo = (p) => {
    const accion = p.activo ? 'desactivar' : 'activar'
    if (!window.confirm(`¿${accion === 'desactivar' ? 'Desactivar' : 'Activar'} a ${p.codigo}?`)) return
    ejecutar(`activo-${p.codigo}`, () => api.dirPanelista(clave, p.codigo, { activo: !p.activo }))
  }

  return (
    <section>
      {error && <p className="error" role="alert">{error}</p>}
      {claveNueva && <ClaveUnaVez claveNueva={claveNueva} onCerrar={() => setClaveNueva(null)} />}

      <h3>Panel ({lista.length})</h3>
      <p className="silencio">Cada panelista entra con su clave (se genera en el alta y se enseña una sola vez). «Conceptos» despliega el bloque que tiene asignado, por módulo y con el estado de cada concepto.</p>
      {lista.length === 0 ? <Vacio>No hay panelistas dados de alta.</Vacio> : (
        <div className="tabla-env">
          <table className="tabla">
            <thead>
              <tr>
                <th>Código</th><th>Perfil</th><th>Disciplina</th><th>Dominios</th><th className="num" title="Puntuación de Fehring (1987) adaptada, 0–14; experto ≥ 5">Fehring</th>
                <th className="num">Asignadas</th><th>Hechas</th><th className="num">Abstenidas</th>
                <th className="num">Tiempo medio</th><th>Último acceso</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <FilaConDetalle key={p.codigo} p={p} datos={datos} nombres={nombres} ocupado={ocupado}
                  abierto={abierto === p.codigo} onAbrir={() => setAbierto(abierto === p.codigo ? '' : p.codigo)}
                  onReclave={reclave} onActivo={cambiarActivo} onBorrarPrueba={borrarPrueba} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="tarjeta">
        <h3>Identidades y contacto</h3>
        <p className="silencio">
          Nombre, apellidos, correo, filiación y DOI declarados viven en una tabla aparte y <b>no</b> viajan con los datos del
          estudio ni con las exportaciones: el conjunto de análisis solo lleva códigos. Se consultan aquí, bajo petición, para
          la autoría del grupo, para avisar de cada ronda y para verificar los perfiles.
        </p>
        <div className="acciones" style={{ marginTop: 0 }}>
          <button type="button" className="boton secundario pequeno" disabled={!!ocupado} onClick={verIdentidades}>
            {identidades ? 'Actualizar' : 'Ver identidades'}
          </button>
          {identidades && <button type="button" className="boton fantasma pequeno" onClick={() => setIdentidades(null)}>Ocultar</button>}
          {identidades?.length > 0 && (
            <a className="boton fantasma pequeno" href={`mailto:?bcc=${identidades.map((i) => i.email).join(',')}`}>Escribir a todo el panel</a>
          )}
        </div>
        {identidades && <Identidades lista={identidades} />}
      </div>

      <Alta datos={datos} clave={clave} onAlta={async (r) => { setClaveNueva({ codigo: r.codigo, clave: r.clave }); await recargar() }} />
    </section>
  )
}

function FilaConDetalle(props) {
  const { p, datos, nombres, abierto } = props
  return (
    <>
      <Fila {...props} />
      {abierto && (
        <tr className="fila-detalle">
          <td colSpan={12}><PerfilResumen p={p} /><Asignadas p={p} datos={datos} nombres={nombres} /></td>
        </tr>
      )}
    </>
  )
}

function Fila({ p, nombres, ocupado, abierto, onAbrir, onReclave, onActivo, onBorrarPrueba }) {
  const muyRapido = p.tiempo_medio_ms > 0 && p.tiempo_medio_ms < MS_MUY_RAPIDO
  const dominios = p.dominios_competencia || []
  return (
    <tr style={p.activo ? undefined : { opacity: 0.55 }}>
      <td style={{ fontFamily: 'var(--mono)' }}>{p.codigo}</td>
      <td>{p.perfil}</td>
      <td>{p.disciplina || <span className="silencio">—</span>}</td>
      <td title={dominios.map((d) => nombres[d] || d).join(' · ')}>{dominios.length ? dominios.join(', ') : <span className="silencio">—</span>}</td>
      <td className="num">{p.perfil === 'experto' ? <Fehring p={p} /> : <span className="silencio">—</span>}</td>
      <td className="num">{p.asignadas ?? 0}</td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MiniBarra valor={p.hechas ?? 0} total={p.asignadas ?? 0} />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.hechas ?? 0}</span>
        </div>
      </td>
      <td className="num">{p.abstenidas ?? 0}</td>
      <td className="num">{mmss(p.tiempo_medio_ms)}</td>
      <td>{relativo(p.ultimo_acceso)}</td>
      <td>
        <span className={`etiqueta ${p.activo ? 'ok' : ''}`}>{p.activo ? 'activo' : 'inactivo'}</span>
        {muyRapido && <span className="etiqueta aviso" style={{ marginLeft: '0.3rem' }} title="Menos de 45 s por concepto de media">muy rápido</span>}
        {p.perfil === 'experto' && p.perfil_completado === false && <span className="etiqueta" style={{ marginLeft: '0.3rem' }}>sin perfil</span>}
        {p.es_prueba && <span className="etiqueta aviso" style={{ marginLeft: '0.3rem' }}>prueba</span>}
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {p.perfil !== 'direccion' && (
            <button type="button" className={`boton ${abierto ? '' : 'secundario'} pequeno`} aria-label={`Conceptos de ${p.codigo}`} aria-expanded={abierto} onClick={onAbrir}>
              {abierto ? 'Cerrar' : 'Conceptos'}
            </button>
          )}
          <button type="button" className="boton secundario pequeno" disabled={!!ocupado} onClick={() => onReclave(p)}>Nueva clave</button>
          <button type="button" className="boton fantasma pequeno" disabled={!!ocupado} onClick={() => onActivo(p)}>{p.activo ? 'Desactivar' : 'Activar'}</button>
          {p.es_prueba && <button type="button" className="boton fantasma pequeno" style={{ color: 'var(--peligro)' }} disabled={!!ocupado} onClick={() => onBorrarPrueba(p)}>Borrar prueba</button>}
        </div>
      </td>
    </tr>
  )
}

function Identidades({ lista }) {
  if (!lista.length) return <p className="silencio">Todavía no hay identidades registradas: se guardan cuando alguien rellena su perfil.</p>
  return (
    <div className="tabla-env" style={{ marginTop: '0.75rem' }}>
      <table className="tabla">
        <thead><tr><th>Código</th><th>Nombre y apellidos</th><th>Correo</th><th>Filiación</th><th>ORCID</th><th>DOI declarados</th><th className="num">Hechas</th></tr></thead>
        <tbody>
          {lista.map((i) => (
            <tr key={i.codigo}>
              <td style={{ fontFamily: 'var(--mono)' }}>{i.codigo}</td>
              <td>{i.nombre} {i.apellidos}</td>
              <td><a href={`mailto:${i.email}`}>{i.email}</a></td>
              <td className="silencio">{i.filiacion || '—'}</td>
              <td>{i.orcid ? <a href={`https://orcid.org/${i.orcid}`} target="_blank" rel="noopener noreferrer">{i.orcid}</a> : <span className="silencio">—</span>}</td>
              <td>
                {(i.dois || []).length === 0 ? <span className="silencio">—</span> : (i.dois || []).map((d) => (
                  <div key={d}><a href={`https://doi.org/${d}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: '0.8em' }}>{d}</a></div>
                ))}
              </td>
              <td className="num">{i.hechas}/{i.asignadas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Fehring({ p }) {
  if (!p.perfil_completado) return <span className="silencio" title="Aún no ha rellenado el perfil">—</span>
  const puntos = puntuacionFehring(p.perfil_datos, p.anios)
  return <span className={`sem ${esExpertoFehring(puntos) ? 'valido' : 'revisar'}`} title={esExpertoFehring(puntos) ? 'Cumple el criterio de experto (≥ 5)' : 'Por debajo del criterio de experto (< 5)'}>{puntos}/14</span>
}

function PerfilResumen({ p }) {
  const texto = resumenPerfil(p.perfil_datos || {}, p.perfil)
  if (!p.perfil_completado) return <p className="silencio" style={{ margin: '0 0 0.6rem' }}>Perfil no rellenado todavía.</p>
  return (
    <p style={{ margin: '0 0 0.6rem', fontSize: '0.9rem' }}>
      <b>Perfil</b> · {p.disciplina || '—'}{p.anios != null ? ` · ${p.anios} años en dolor` : ''}{texto ? ` · ${texto}` : ''}
      {p.perfil_datos?.consentimiento_en ? <span className="silencio"> · consentimiento {new Date(p.perfil_datos.consentimiento_en).toLocaleDateString('es-ES')}</span> : null}
    </p>
  )
}

// El bloque asignado a un panelista en la ronda actual, agrupado por módulo y en el orden en
// que lo ve, con el estado de cada concepto y las puntuaciones si ya lo valoró.
function Asignadas({ p, datos, nombres }) {
  const ronda = datos.estudio?.ronda_actual ?? 1
  const dims = (datos.estudio?.dimensiones || []).filter((d) => d.quien !== 'paciente').map((d) => d.clave)
  const modulos = useMemo(() => {
    const conceptos = new Map((datos.conceptos || []).map((c) => [c.id, c]))
    const valoraciones = new Map((datos.valoraciones || [])
      .filter((v) => v.panelista === p.codigo && v.ronda === ronda)
      .map((v) => [v.concepto_id, v]))
    const mias = (datos.asignaciones || [])
      .filter((a) => a.panelista === p.codigo && a.ronda === ronda)
      .sort((a, b) => a.orden - b.orden)
    const grupos = new Map()
    for (const a of mias) {
      const c = conceptos.get(a.concepto_id) || { id: a.concepto_id, titulo: a.concepto_id, modulo: '—', dominio: '—' }
      if (!grupos.has(c.modulo)) grupos.set(c.modulo, { modulo: c.modulo, dominio: c.dominio, items: [] })
      grupos.get(c.modulo).items.push({ ...a, titulo: c.titulo, valoracion: valoraciones.get(a.concepto_id) })
    }
    return [...grupos.values()]
  }, [datos, p.codigo, ronda])

  const total = modulos.reduce((s, m) => s + m.items.length, 0)
  if (!total) return <p className="silencio" style={{ margin: 0 }}>Sin conceptos asignados en la ronda {ronda}. Se asignan desde Cobertura → «Asignar expertos» / «Asignar pacientes».</p>
  const hechas = modulos.reduce((s, m) => s + m.items.filter((i) => i.estado === 'hecha').length, 0)

  return (
    <div className="asignadas-mod">
      <p style={{ margin: 0 }}><b>{p.codigo}</b> · ronda {ronda} · {total} conceptos en {modulos.length} {modulos.length === 1 ? 'módulo' : 'módulos'} · {hechas} hechos</p>
      {modulos.map((m) => (
        <div key={m.modulo}>
          <h4>{nombres[m.modulo] || m.modulo} <span style={{ fontWeight: 400 }}>· {nombres[m.dominio] || m.dominio} · {m.items.filter((i) => i.estado !== 'pendiente').length}/{m.items.length}</span></h4>
          <ol>
            {m.items.map((i) => (
              <li key={i.concepto_id}>
                <span className="orden">{i.orden}</span>
                <span className="id">{i.concepto_id}</span>
                <span className="t">{i.titulo}</span>
                {i.valoracion?.completa && !i.valoracion.abstencion && (
                  <span className="punt" title={dims.join(' · ')}>{dims.map((d) => i.valoracion.puntuaciones?.[d] ?? '—').join('·')}</span>
                )}
                <span className={`sem ${i.estado === 'hecha' ? 'valido' : i.estado === 'abstenida' ? 'insuficiente' : 'pendiente'}`}>{NOMBRE_ESTADO[i.estado] || i.estado}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}

function ClaveUnaVez({ claveNueva, onCerrar }) {
  return (
    <div className="tarjeta blanca">
      <h3>Clave para {claveNueva.codigo}</h3>
      <p><span className="clave-nueva">{claveNueva.clave}</span></p>
      <p className="aviso-caja">Cópiala ahora y envíasela al panelista. No se puede recuperar: si se pierde, habrá que generar otra.</p>
      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="button" className="boton secundario pequeno" onClick={onCerrar}>Ya la he copiado</button>
      </div>
    </div>
  )
}

const FORMULARIO_VACIO = { codigo: '', perfil: 'experto', disciplina: '', dominios: [], capacidad: '', notas: '', es_prueba: false }

function Alta({ datos, clave, onAlta }) {
  const [f, setF] = useState(FORMULARIO_VACIO)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const dominios = entradasCatalogo(datos.catalogo, 'dominio')
  const cambiar = (k, v) => setF((prev) => ({ ...prev, [k]: v }))
  const alternarDominio = (id) => setF((prev) => ({
    ...prev, dominios: prev.dominios.includes(id) ? prev.dominios.filter((x) => x !== id) : [...prev.dominios, id],
  }))

  const enviar = async (e) => {
    e.preventDefault()
    const codigo = f.codigo.trim().toUpperCase()
    if (!PATRON_CODIGO.test(codigo)) { setError('El código tiene la forma PAN-17: de dos a cuatro letras, guion y dos o tres cifras.'); return }
    const capacidad = f.capacidad === '' ? null : Number(f.capacidad)
    if (capacidad != null && (!Number.isInteger(capacidad) || capacidad <= 0)) { setError('La capacidad es un número entero positivo, o se deja vacía.'); return }
    setEnviando(true)
    setError('')
    try {
      const r = await api.dirAlta(clave, codigo, f.perfil, f.disciplina.trim() || null, f.dominios, capacidad, f.notas.trim() || null, f.es_prueba)
      setF(FORMULARIO_VACIO)
      await onAlta(r)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="tarjeta" onSubmit={enviar} style={{ marginTop: '1.5rem' }}>
      <h3>Alta de panelista</h3>
      <p className="silencio">Después del alta, asigna su bloque desde Cobertura → «Asignar expertos» (o «Asignar pacientes»): la asignación rellena solo lo que falta y respeta los dominios de competencia.</p>
      <div className="panel-dos">
        <div className="campo">
          <label htmlFor="alta-codigo">Código</label>
          <input id="alta-codigo" type="text" value={f.codigo} placeholder="PAN-17" pattern="^[A-Za-z]{2,4}-[0-9]{2,3}$"
            onChange={(e) => cambiar('codigo', e.target.value)} required />
          <p className="ayuda">Es el nombre público del panelista en el estudio: no lleva nombre ni correo.</p>
        </div>
        <div className="campo">
          <label htmlFor="alta-perfil">Perfil</label>
          <select id="alta-perfil" value={f.perfil} onChange={(e) => cambiar('perfil', e.target.value)}>
            {PERFILES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="alta-disciplina">Disciplina</label>
          <input id="alta-disciplina" type="text" value={f.disciplina} onChange={(e) => cambiar('disciplina', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="alta-capacidad">Capacidad (conceptos por ronda)</label>
          <input id="alta-capacidad" type="number" min="1" step="1" value={f.capacidad} placeholder={String(datos.estudio.capacidad ?? '')}
            onChange={(e) => cambiar('capacidad', e.target.value)} />
        </div>
      </div>
      <div className="campo">
        <span className="rotulo">Dominios de competencia</span>
        <div className="casillas">
          {dominios.map(([id, d]) => (
            <label key={id} className="casilla">
              <input type="checkbox" checked={f.dominios.includes(id)} onChange={() => alternarDominio(id)} />
              <span>{d.nombre}<span className="sub">{id}</span></span>
            </label>
          ))}
        </div>
      </div>
      <div className="campo">
        <label htmlFor="alta-notas">Notas</label>
        <textarea id="alta-notas" value={f.notas} onChange={(e) => cambiar('notas', e.target.value)} />
      </div>
      <label className="casilla">
        <input type="checkbox" checked={f.es_prueba} onChange={(e) => cambiar('es_prueba', e.target.checked)} />
        <span>Es un panelista de prueba<span className="sub">Para ensayar el circuito. No cuenta como panel real y se borra de un clic, con todas sus respuestas.</span></span>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="acciones">
        <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Dando de alta…' : 'Dar de alta y generar clave'}</button>
      </div>
    </form>
  )
}
