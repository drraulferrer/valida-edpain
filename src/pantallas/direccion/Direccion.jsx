import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from '../../lib/api.js'
import * as metricas from '../../lib/metricas.js'
import { agrupar } from './comun.jsx'
import Resumen from './Resumen.jsx'
import Panelistas from './Panelistas.jsx'
import Cobertura from './Cobertura.jsx'
import Consenso from './Consenso.jsx'
import Propuestas from './Propuestas.jsx'
import Plazos from './Plazos.jsx'
import Estudio from './Estudio.jsx'

// Panel de dirección: #/direccion[/pestaña]. La clave vive en sessionStorage (se va al
// cerrar la pestaña del navegador) y todo se carga de golpe con valida_dir_datos; las
// clasificaciones se calculan aquí una sola vez y se reparten a las pestañas.

const PESTANAS = [
  ['resumen', 'Resumen', Resumen],
  ['panelistas', 'Panelistas', Panelistas],
  ['plazos', 'Plazos y avisos', Plazos],
  ['cobertura', 'Cobertura', Cobertura],
  ['consenso', 'Consenso', Consenso],
  ['propuestas', 'Propuestas', Propuestas],
  ['estudio', 'Estudio', Estudio],
]

function clasificar(datos, dimsExpertas) {
  if (!datos) return new Map()
  const { estudio, conceptos, valoraciones } = datos
  const porConcepto = agrupar(valoraciones, (v) => v.concepto_id)
  return new Map((conceptos || []).map((c) => [
    c.id,
    metricas.concepto(porConcepto.get(c.id) || [], dimsExpertas, estudio.umbrales, estudio.ronda_actual),
  ]))
}

export default function Direccion({ ruta }) {
  const [clave, setClave] = useState(() => api.claveDireccion())
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  // Al arrancar, si hay clave de sesión, cargar con ella. Si falla, se vuelve a la entrada.
  useEffect(() => {
    const guardada = api.claveDireccion()
    if (!guardada) return undefined
    let vivo = true
    setCargando(true)
    api.dirDatos(guardada)
      .then((d) => { if (vivo) setDatos(d) })
      .catch((e) => { if (vivo) { api.guardarClaveDireccion(''); setClave(''); setError(e.message) } })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [])

  const entrar = useCallback(async (texto) => {
    const limpia = api.normalizarClave(texto)
    const d = await api.dirDatos(limpia)
    api.guardarClaveDireccion(limpia)
    setDatos(d)
    setClave(limpia)
    setError('')
  }, [])

  const recargar = useCallback(async () => {
    if (!clave) return
    setCargando(true)
    try {
      setDatos(await api.dirDatos(clave))
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [clave])

  const salir = useCallback(() => {
    api.guardarClaveDireccion('')
    setClave('')
    setDatos(null)
    setError('')
    window.location.hash = '#/direccion'
  }, [])

  const dimsExpertas = useMemo(
    () => (datos?.estudio?.dimensiones || []).filter((d) => d.quien !== 'paciente').map((d) => d.clave),
    [datos],
  )
  const clases = useMemo(() => clasificar(datos, dimsExpertas), [datos, dimsExpertas])
  const nombres = useMemo(
    () => Object.fromEntries(Object.entries(datos?.catalogo || {}).map(([k, v]) => [k, v.nombre])),
    [datos],
  )

  if (!clave) return <Acceso onEntrar={entrar} errorInicial={error} />

  if (!datos) {
    return (
      <div className="app">
        <main className="pantalla centrada">
          {error ? <p className="error" role="alert">{error}</p> : <p className="silencio">Abriendo el panel…</p>}
        </main>
      </div>
    )
  }

  const activa = PESTANAS.find(([k]) => k === ruta?.partes?.[1])?.[0] || 'resumen'
  const Pantalla = PESTANAS.find(([k]) => k === activa)[2]
  const { estudio } = datos
  const props = { datos, clave, clases, nombres, dimsExpertas, recargar }

  return (
    <div className="app">
      <header className="cabecera">
        <div className="cabecera-int ancha">
          <a className="marca-app" href="#/direccion"><span className="punto" aria-hidden="true" />Valida · dirección</a>
          <span className="silencio">{estudio.nombre}</span>
          <span className="etiqueta acento">ronda {estudio.ronda_actual}</span>
          {estudio.cerrado_en && <span className="etiqueta peligro">cerrado</span>}
          <span className="relleno" />
          <button type="button" className="boton secundario pequeno" onClick={recargar} disabled={cargando}>
            {cargando ? 'Cargando…' : 'Recargar'}
          </button>
          <button type="button" className="boton fantasma pequeno" onClick={salir}>Salir</button>
        </div>
      </header>
      <main className="pantalla ancha">
        <nav className="pestanas" role="tablist" aria-label="Secciones del panel">
          {PESTANAS.map(([k, nombre]) => (
            <button key={k} type="button" role="tab" aria-selected={k === activa}
              onClick={() => { window.location.hash = `#/direccion/${k}` }}>
              {nombre}
            </button>
          ))}
        </nav>
        {error && <p className="error" role="alert">{error}</p>}
        <Pantalla {...props} />
      </main>
    </div>
  )
}

function Acceso({ onEntrar, errorInicial }) {
  const [clave, setClave] = useState('')
  const [error, setError] = useState(errorInicial || '')
  const [cargando, setCargando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    if (!clave.trim()) return
    setCargando(true)
    setError('')
    try {
      await onEntrar(clave)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="app">
      <main className="pantalla centrada">
        <div className="tarjeta blanca" style={{ padding: '2rem 1.5rem' }}>
          <p className="etiqueta acento">Valida · dirección editorial</p>
          <h1 style={{ marginTop: '0.75rem' }}>Panel de dirección</h1>
          <p className="silencio">Escribe la clave de dirección. Dura lo que dure esta pestaña del navegador.</p>
          <form onSubmit={enviar}>
            <div className="campo">
              <label htmlFor="clave-direccion" className="oculto-visual">Clave de dirección</label>
              <input id="clave-direccion" className="clave" type="text" autoComplete="off" autoCapitalize="off"
                spellCheck="false" placeholder="xxxx-xxxx-xxxx" value={clave}
                onChange={(e) => setClave(e.target.value)} onBlur={() => setClave(api.normalizarClave(clave))} autoFocus />
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="acciones">
              <button className="boton" type="submit" disabled={cargando || !clave.trim()}>{cargando ? 'Entrando…' : 'Entrar'}</button>
              <a className="boton fantasma" href="#/">Volver al panel de jueces</a>
            </div>
          </form>
          {api.DEMO && (
            <p className="silencio" style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
              Modo demostración. Clave de dirección: <code>demo-dire-cci1</code>.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
