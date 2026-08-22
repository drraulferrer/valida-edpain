import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../lib/api.js'
import Lectura from '../componentes/Lectura.jsx'
import Likert, { Histograma } from '../componentes/Likert.jsx'
import Ajustes from '../componentes/Ajustes.jsx'
import Banderas from '../componentes/Banderas.jsx'
import Progreso from '../componentes/Progreso.jsx'
import { ir } from '../App.jsx'
import { siguientePendiente } from './Bloque.jsx'

// El wizard: una decisión por pantalla. Leer → puntuar → (ajustar si algo está en 1-2) →
// banderas y siguiente. Todo se guarda solo a cada paso.
const PASOS = [['leer', 'Leer'], ['puntuar', 'Puntuar'], ['ajustar', 'Ajustar'], ['cerrar', 'Banderas']]
const PAUSA_CADA = 20

export const VETOS_PACIENTE = [
  ['exagero', 'Suena a que exagero o a que me lo invento'],
  ['culpa', 'Suena a que la culpa es mía'],
  ['sin_arreglo', 'Suena a que esto no tiene arreglo'],
  ['no_creen', 'Suena a que no me creen'],
  ['miedo', 'Me asusta'],
  ['palabras', 'Hay palabras que no significan nada para mí'],
]
const COMPRENSION = [['si', 'Se entiende a la primera'], ['casi', 'Casi: hay algo que se atraganta'], ['no', 'No se entiende']]
const EFECTO = [['calma', 'Con más calma, y con algo que puedo hacer hoy'], ['igual', 'Igual que antes de leerlo'], ['peor', 'Con más preocupación que antes']]

const VACIA = { puntuaciones: {}, abstencion: false, motivo_abstencion: '', banderas: {}, comentario: '', ajustes: [], paciente: { comprension: null, efecto: null, vetos: [] } }

function desdeServidor(val) {
  if (!val) return { ...VACIA }
  return {
    puntuaciones: val.puntuaciones || {}, abstencion: !!val.abstencion, motivo_abstencion: val.motivo_abstencion || '',
    banderas: val.banderas || {}, comentario: val.comentario || '', ajustes: val.ajustes || [],
    paciente: val.paciente || { comprension: null, efecto: null, vetos: [] },
  }
}

export default function Concepto({ sesion, conceptoId }) {
  const paciente = sesion.perfil === 'paciente'
  const dims = (sesion.estudio?.dimensiones || []).filter((d) => (paciente ? d.quien !== 'experto' : d.quien !== 'paciente'))
  const [datos, setDatos] = useState(null)
  const [bloque, setBloque] = useState(null)
  const [paso, setPaso] = useState('leer')
  const [v, setV] = useState({ ...VACIA })
  const [guardado, setGuardado] = useState('')
  const [error, setError] = useState('')
  const [pausa, setPausa] = useState(false)
  const ultimoGuardado = useRef(Date.now())
  const temporizador = useRef(null)
  const sucio = useRef(false)
  const vRef = useRef(v)
  vRef.current = v

  useEffect(() => {
    let vivo = true
    setDatos(null); setBloque(null); setPaso('leer'); setError(''); setGuardado(''); setPausa(false)
    Promise.all([api.concepto(sesion.clave, conceptoId), api.bloque(sesion.clave)]).then(([d, b]) => {
      if (!vivo) return
      setDatos(d); setBloque(b)
      if (d.valoracion) { setV(desdeServidor(d.valoracion)); setPaso(d.valoracion.completa ? 'cerrar' : 'puntuar') }
      else if (d.previa) { setV(desdeServidor(d.previa)); setPaso('puntuar') }
      else setV({ ...VACIA })
      ultimoGuardado.current = Date.now()
      sucio.current = false
    }).catch((e) => { if (vivo) setError(e.message) })
    return () => { vivo = false; clearTimeout(temporizador.current) }
  }, [sesion.clave, conceptoId])

  useEffect(() => {
    const aviso = (e) => { if (sucio.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [])

  const guardar = useCallback(async (valor) => {
    const ahora = Date.now()
    const delta = Math.min(ahora - ultimoGuardado.current, 30 * 60 * 1000)
    ultimoGuardado.current = ahora
    setGuardado('guardando')
    try {
      const r = await api.guardar(sesion.clave, conceptoId, { ...valor, tiempo_ms: delta })
      sucio.current = false
      setGuardado('guardado')
      return r
    } catch (e) {
      setGuardado('error'); setError(e.message); throw e
    }
  }, [sesion.clave, conceptoId])

  // Acepta un objeto o una función sobre el estado vivo (vRef), y actualiza vRef en el acto:
  // dos cambios seguidos en el mismo tick (teclado rápido, tests) no se pisan.
  const cambiar = (parche) => {
    setError('')
    sucio.current = true
    const base = vRef.current
    const nuevo = { ...base, ...(typeof parche === 'function' ? parche(base) : parche) }
    vRef.current = nuevo
    setV(nuevo)
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => guardar(nuevo).catch(() => {}), 900)
  }

  if (error && !datos) return <main className="pantalla"><p className="error">{error}</p><a className="boton secundario" href="#/bloque">Volver al bloque</a></main>
  if (!datos || !bloque) return <main className="pantalla"><p className="silencio">Cargando el concepto…</p></main>

  const c = datos.concepto
  const items = bloque.items
  const posicion = items.findIndex((x) => x.id === conceptoId)
  const hechasAntes = items.filter((x) => x.estado !== 'pendiente' && x.id !== conceptoId).length
  const necesitaAjuste = !v.abstencion && Object.values(v.puntuaciones).some((x) => Number(x) <= 2)
  const apartado = datos.ronda >= 2 && datos.grupo && dims.some((d) => {
    const g = datos.grupo[d.clave]; const mio = v.puntuaciones[d.clave]
    return g && g.mediana != null && mio && Math.abs(Number(mio) - Number(g.mediana)) >= 2
  })
  const puntuadoTodo = paciente
    ? !!(v.paciente?.comprension && v.paciente?.efecto)
    : dims.every((d) => v.puntuaciones[d.clave])
  const hayAjuste = (v.ajustes || []).some((a) => a.parte || a.motivo || a.redaccion) || (v.comentario || '').trim().length > 0
  const listo = v.abstencion || (puntuadoTodo && (!(necesitaAjuste || apartado) || hayAjuste))

  const avanzar = async () => {
    clearTimeout(temporizador.current)
    try { await guardar(vRef.current) } catch { return }
    const estado = vRef.current.abstencion ? 'abstenida' : 'hecha'
    const actualizados = items.map((it) => (it.id === conceptoId ? { ...it, estado } : it))
    const delModulo = actualizados.filter((it) => it.modulo === c.modulo)
    const moduloCompleto = delModulo.every((it) => it.estado !== 'pendiente')
    const coberturaHecha = (bloque.cobertura || []).some((x) => x.modulo === c.modulo)
    const hechas = actualizados.filter((it) => it.estado !== 'pendiente').length
    const sig = siguientePendiente(actualizados, conceptoId)
    if (!paciente && moduloCompleto && !coberturaHecha) return ir(`/modulo/${encodeURIComponent(c.modulo)}`)
    if (!sig) return ir('/fin')
    if (hechas % PAUSA_CADA === 0) { setPausa(sig.id); return undefined }
    return ir(`/c/${encodeURIComponent(sig.id)}`)
  }

  if (pausa) {
    return (
      <main className="pantalla centrada">
        <div className="tarjeta blanca" style={{ padding: '2rem 1.5rem' }}>
          <p className="etiqueta acento">Pausa sugerida</p>
          <h1>Llevas {hechasAntes + 1}. ¿Un descanso?</h1>
          <p className="silencio">La fatiga infla las puntuaciones hacia el 4 y se nota en los datos. Todo está guardado: puedes volver cuando quieras.</p>
          <div className="acciones">
            <a className="boton" href={`#/c/${encodeURIComponent(pausa)}`} onClick={() => setPausa(false)}>Seguir ahora</a>
            <a className="boton secundario" href="#/bloque">Volver al bloque</a>
          </div>
        </div>
      </main>
    )
  }

  const indicePaso = PASOS.findIndex(([k]) => k === paso)
  const pasosVisibles = PASOS.filter(([k]) => k !== 'ajustar' || necesitaAjuste || apartado || hayAjuste || paso === 'ajustar')
  const estadoTexto = guardado === 'guardando' ? 'Guardando…' : guardado === 'guardado' ? 'Guardado' : guardado === 'error' ? 'No se pudo guardar' : ''

  // ---------------------------------------------------------------- paciente
  if (paciente) {
    const p = v.paciente || { comprension: null, efecto: null, vetos: [] }
    const ponerPaciente = (parche) => cambiar((prev) => ({ paciente: { ...(prev.paciente || {}), ...parche } }))
    return (
      <main className="pantalla">
        <Progreso hechas={hechasAntes} total={items.length} texto={`${posicion + 1} de ${items.length}`} />
        <Lectura concepto={c} nombres={bloque.nombres} paciente />
        <div className="tarjeta blanca">
          <div className="dimension">
            <div className="nombre">¿Se entiende?</div>
            <div className="likert" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} role="radiogroup" aria-label="¿Se entiende?">
              {COMPRENSION.map(([k, t]) => <button key={k} type="button" role="radio" aria-checked={p.comprension === k} aria-pressed={p.comprension === k} className={k === 'no' ? 'bajo' : ''} onClick={() => ponerPaciente({ comprension: k })}><span className="txt" style={{ fontSize: '0.9rem' }}>{t}</span></button>)}
            </div>
          </div>
          <div className="dimension">
            <div className="nombre">¿Cómo te deja?</div>
            <div className="likert" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} role="radiogroup" aria-label="¿Cómo te deja?">
              {EFECTO.map(([k, t]) => <button key={k} type="button" role="radio" aria-checked={p.efecto === k} aria-pressed={p.efecto === k} className={k === 'peor' ? 'bajo' : ''} onClick={() => ponerPaciente({ efecto: k })}><span className="txt" style={{ fontSize: '0.9rem' }}>{t}</span></button>)}
            </div>
          </div>
          <div className="dimension">
            <div className="nombre">Si alguna de estas frases te pasa con este texto, márcala</div>
            <p className="ayuda">Una sola marca tuya obliga a reescribirlo. No hace falta explicar por qué.</p>
            <div className="banderas">
              {VETOS_PACIENTE.map(([k, t]) => (
                <label key={k} className="casilla">
                  <input type="checkbox" checked={(p.vetos || []).includes(k)} onChange={(e) => ponerPaciente({ vetos: e.target.checked ? [...(p.vetos || []), k] : (p.vetos || []).filter((x) => x !== k) })} />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="campo">
            <label htmlFor="comentario-pac">¿Algo más? <span className="silencio">(opcional)</span></label>
            <textarea id="comentario-pac" value={v.comentario} onChange={(e) => cambiar({ comentario: e.target.value })} placeholder="Una palabra que no entendiste, una frase que cambiarías…" />
          </div>
        </div>
        <div className="pie-fijo">
          <span className="estado-guardado">{estadoTexto}</span>
          <span className="relleno" />
          <a className="boton fantasma" href="#/bloque">Bloque</a>
          <button className="boton" type="button" disabled={!listo} onClick={avanzar}>Guardar y siguiente</button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </main>
    )
  }

  // ---------------------------------------------------------------- experto
  return (
    <main className="pantalla">
      <Progreso hechas={hechasAntes} total={items.length} texto={`${posicion + 1} de ${items.length}`} />
      <div className="pasos" aria-label="Pasos">
        {pasosVisibles.map(([k, t]) => {
          const i = PASOS.findIndex(([x]) => x === k)
          return <span key={k} className={k === paso ? 'activo' : i < indicePaso ? 'hecho' : ''} role="button" tabIndex={0} onClick={() => setPaso(k)} onKeyDown={(e) => e.key === 'Enter' && setPaso(k)}>{t}</span>
        })}
      </div>

      {paso === 'leer' && (
        <>
          <Lectura concepto={c} nombres={bloque.nombres} />
          {datos.ronda >= 2 && <p className="aviso-caja">Segunda ronda: este concepto no alcanzó consenso. Al puntuar verás cómo se repartió el grupo y qué respondiste tú.</p>}
          <div className="pie-fijo">
            <span className="estado-guardado">{estadoTexto}</span>
            <span className="relleno" />
            <a className="boton fantasma" href="#/bloque">Bloque</a>
            <button className="boton" type="button" onClick={() => { setPaso('puntuar'); window.scrollTo({ top: 0 }) }}>He leído: puntuar</button>
          </div>
        </>
      )}

      {paso === 'puntuar' && (
        <>
          <h1 className="titulo-concepto" style={{ fontSize: '1.3rem' }}>{c.titulo}</h1>
          <details className="plegable"><summary>Releer el concepto</summary><div className="cuerpo"><Lectura concepto={c} nombres={bloque.nombres} completo /></div></details>
          <div className="tarjeta blanca">
            {dims.map((d) => (
              <div className="dimension" key={d.clave}>
                <div className="nombre">{d.nombre}</div>
                <p className="afirmacion">{d.afirmacion}</p>
                <p className="ayuda">{d.ayuda}</p>
                {datos.grupo?.[d.clave] && <Histograma datos={datos.grupo[d.clave]} mia={datos.previa?.puntuaciones?.[d.clave]} />}
                <Likert nombre={d.nombre} valor={v.puntuaciones[d.clave] ? Number(v.puntuaciones[d.clave]) : null}
                  deshabilitado={v.abstencion}
                  onCambio={(n) => cambiar((prev) => { const p = { ...prev.puntuaciones }; if (n) p[d.clave] = n; else delete p[d.clave]; return { puntuaciones: p } })} />
              </div>
            ))}
            <div className="abstencion">
              <button type="button" aria-pressed={v.abstencion} onClick={() => cambiar({ abstencion: !v.abstencion })}>
                {v.abstencion ? 'Me abstengo: fuera de mi ámbito (pulsa para deshacer)' : 'Este concepto está fuera de mi ámbito: me abstengo'}
              </button>
              {v.abstencion && (
                <div className="campo">
                  <label htmlFor="motivo-abst">Motivo <span className="silencio">(opcional)</span></label>
                  <input id="motivo-abst" type="text" value={v.motivo_abstencion} onChange={(e) => cambiar({ motivo_abstencion: e.target.value })} placeholder="Por ejemplo: no es mi campo clínico." />
                </div>
              )}
            </div>
          </div>
          <div className="pie-fijo">
            <span className="estado-guardado">{estadoTexto}</span>
            <span className="relleno" />
            <button className="boton secundario" type="button" onClick={() => setPaso('leer')}>Atrás</button>
            {v.abstencion
              ? <button className="boton" type="button" onClick={avanzar}>Guardar y siguiente</button>
              : <button className="boton" type="button" disabled={!puntuadoTodo} onClick={() => { setPaso(necesitaAjuste || apartado || hayAjuste ? 'ajustar' : 'cerrar'); window.scrollTo({ top: 0 }) }}>Seguir</button>}
            {!v.abstencion && puntuadoTodo && !(necesitaAjuste || apartado) && <button className="boton fantasma" type="button" onClick={() => setPaso('ajustar')}>Añadir un comentario</button>}
          </div>
        </>
      )}

      {paso === 'ajustar' && (
        <>
          <h1 className="titulo-concepto" style={{ fontSize: '1.3rem' }}>{c.titulo}</h1>
          <details className="plegable"><summary>Releer el concepto</summary><div className="cuerpo"><Lectura concepto={c} nombres={bloque.nombres} completo /></div></details>
          {apartado && !necesitaAjuste && <p className="aviso-caja">Te apartas de una respuesta en la que el grupo estaba de acuerdo en la ronda anterior. Es legítimo: cuéntanos por qué.</p>}
          <Ajustes ajustes={v.ajustes} onCambio={(a) => cambiar({ ajustes: a })} obligatorio={necesitaAjuste}
            comentario={v.comentario} onComentario={(t) => cambiar({ comentario: t })} />
          <div className="pie-fijo">
            <span className="estado-guardado">{estadoTexto}</span>
            <span className="relleno" />
            <button className="boton secundario" type="button" onClick={() => setPaso('puntuar')}>Atrás</button>
            <button className="boton" type="button" disabled={(necesitaAjuste || apartado) && !hayAjuste} onClick={() => { setPaso('cerrar'); window.scrollTo({ top: 0 }) }}>Seguir</button>
          </div>
        </>
      )}

      {paso === 'cerrar' && (
        <>
          <h1 className="titulo-concepto" style={{ fontSize: '1.3rem' }}>{c.titulo}</h1>
          <div className="tarjeta">
            <h3>Tus puntuaciones</h3>
            {v.abstencion ? <p className="silencio">Abstención: fuera de tu ámbito.</p> : (
              <div className="cuadricula-celdas">
                {dims.map((d) => <div className="celda" key={d.clave}><b>{v.puntuaciones[d.clave] || '—'}</b>{d.nombre}</div>)}
              </div>
            )}
            {hayAjuste && <p className="silencio" style={{ marginTop: '0.6rem' }}>Con {(v.ajustes || []).filter((a) => a.parte || a.motivo || a.redaccion).length} ajuste(s){(v.comentario || '').trim() ? ' y un comentario' : ''}. <button type="button" className="boton fantasma pequeno" onClick={() => setPaso('ajustar')}>Editar</button></p>}
          </div>
          {!v.abstencion && (
            <div className="tarjeta blanca">
              <h3>Banderas <span className="silencio" style={{ fontWeight: 400 }}>· solo si pasa algo</span></h3>
              <Banderas valor={v.banderas} onCambio={(b) => cambiar({ banderas: b })} />
            </div>
          )}
          {error && <p className="error" role="alert">{error}</p>}
          <div className="pie-fijo">
            <span className="estado-guardado">{estadoTexto}</span>
            <span className="relleno" />
            <button className="boton secundario" type="button" onClick={() => setPaso(necesitaAjuste || hayAjuste ? 'ajustar' : 'puntuar')}>Atrás</button>
            <button className="boton" type="button" disabled={!listo} onClick={avanzar}>Guardar y siguiente</button>
          </div>
        </>
      )}
    </main>
  )
}
