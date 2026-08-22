import { useCallback, useEffect, useState } from 'react'
import * as api from './lib/api.js'
import Entrada from './pantallas/Entrada.jsx'
import Perfil from './pantallas/Perfil.jsx'
import Instrucciones from './pantallas/Instrucciones.jsx'
import Calibracion from './pantallas/Calibracion.jsx'
import Bloque from './pantallas/Bloque.jsx'
import Concepto from './pantallas/Concepto.jsx'
import FinModulo from './pantallas/FinModulo.jsx'
import Cierre from './pantallas/Cierre.jsx'
import Direccion from './pantallas/direccion/Direccion.jsx'
import Participar from './pantallas/Participar.jsx'

// Rutas por hash: #/ entrada · #/bloque · #/c/<id> · #/modulo/<id> · #/instrucciones ·
// #/calibracion · #/fin · #/direccion[/pestaña]. Sin biblioteca de rutas a propósito.
export function leerRuta() {
  const h = (window.location.hash || '#/').replace(/^#/, '')
  const partes = h.split('/').filter(Boolean)
  return { partes, ruta: '/' + partes.join('/') }
}
export function ir(ruta) {
  window.location.hash = ruta.startsWith('#') ? ruta : '#' + ruta
  window.scrollTo({ top: 0 })
}

export default function App() {
  const [ruta, setRuta] = useState(leerRuta)
  const [sesion, setSesion] = useState(null)       // resultado de valida_entrar + clave
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const f = () => setRuta(leerRuta())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])

  const entrar = useCallback(async (clave) => {
    const limpia = api.normalizarClave(clave)
    const datos = await api.entrar(limpia)
    api.guardarClave(limpia)
    setSesion({ ...datos, clave: limpia })
    setError('')
    return datos
  }, [])

  const salir = useCallback(() => {
    api.guardarClave('')
    setSesion(null)
    ir('/')
  }, [])

  const refrescar = useCallback(async () => {
    if (!sesion) return
    const datos = await api.entrar(sesion.clave)
    setSesion({ ...datos, clave: sesion.clave })
  }, [sesion])

  // Al arrancar: si hay clave guardada, entrar con ella. Pinta primero, restaura después.
  useEffect(() => {
    let vivo = true
    const guardada = api.claveGuardada()
    if (!guardada || ['direccion', 'participar'].includes(ruta.partes[0])) { setCargando(false); return undefined }
    entrar(guardada)
      .catch((e) => { api.guardarClave(''); if (vivo) setError(e.message) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (ruta.partes[0] === 'direccion') {
    return <Direccion ruta={ruta} />
  }
  if (ruta.partes[0] === 'participar' && !sesion) {
    return <Participar onEntrar={entrar} />
  }

  if (cargando) {
    return <div className="app"><main className="pantalla centrada"><p className="silencio">Abriendo…</p></main></div>
  }

  if (!sesion) {
    return <Entrada onEntrar={entrar} errorInicial={error} />
  }

  const props = { sesion, refrescar, salir, ruta }
  const [p0, p1] = ruta.partes

  let pantalla
  // `calibracion_hecha` marca también «instrucciones vistas» para el perfil paciente.
  const primeraVez = !sesion.calibracion_hecha
  if (p0 === 'instrucciones') pantalla = <Instrucciones {...props} primeraVez={primeraVez} />
  else if (!sesion.perfil_completado) pantalla = <Perfil {...props} />
  else if (primeraVez && p0 !== 'calibracion') pantalla = <Instrucciones {...props} primeraVez />
  else if (p0 === 'calibracion') pantalla = <Calibracion {...props} />
  else if (p0 === 'c' && p1) pantalla = <Concepto {...props} conceptoId={decodeURIComponent(p1)} />
  else if (p0 === 'modulo' && p1) pantalla = <FinModulo {...props} modulo={decodeURIComponent(p1)} />
  else if (p0 === 'fin') pantalla = <Cierre {...props} />
  else pantalla = <Bloque {...props} />

  return (
    <div className="app">
      <header className="cabecera">
        <div className="cabecera-int">
          <a className="marca-app" href="#/bloque"><span className="punto" aria-hidden="true" />Valida</a>
          <span className="relleno" />
          <span className="codigo" title="Tu código en el panel">{sesion.codigo}</span>
          <a className="boton fantasma pequeno" href="#/instrucciones">Instrucciones</a>
          <button type="button" className="boton fantasma pequeno" onClick={salir}>Salir</button>
        </div>
      </header>
      {pantalla}
    </div>
  )
}
