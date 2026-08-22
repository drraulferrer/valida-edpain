import { useEffect, useState } from 'react'
import * as api from '../lib/api.js'
import { FormularioExperto } from './Perfil.jsx'
import { puntuacionFehring } from '../lib/perfil.js'

// Convocatoria pública: cualquiera rellena el perfil; el servidor calcula la puntuación de
// Fehring y solo crea el panelista si alcanza el mínimo del estudio. La clave se enseña una
// sola vez. No se pide nombre ni correo: si se pierde la clave, se vuelve a solicitar.
export default function Participar({ onEntrar }) {
  const [publico, setPublico] = useState(null)
  const [error, setError] = useState('')
  const [codigo, setCodigo] = useState('')
  const [resultado, setResultado] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [entrando, setEntrando] = useState(false)

  useEffect(() => { api.publico().then(setPublico).catch((e) => setError(e.message)) }, [])

  const enviar = async (disciplina, anios, dominios, perfil) => {
    setEnviando(true); setError('')
    try {
      const r = await api.solicitar(1, codigo, disciplina, anios, dominios, perfil)
      setResultado({ ...r, estimada: puntuacionFehring(perfil, anios) })
      window.scrollTo({ top: 0 })
    } catch (e) { setError(e.message); window.scrollTo({ top: 0 }) } finally { setEnviando(false) }
  }

  const entrarAhora = async () => {
    setEntrando(true)
    try { await onEntrar(resultado.clave); window.location.hash = '#/bloque' } catch (e) { setError(e.message) } finally { setEntrando(false) }
  }

  const nombresDominios = Object.fromEntries((publico?.dominios || []).map((d) => [d.id, d.nombre]))

  if (resultado?.aceptado) {
    return (
      <div className="app"><main className="pantalla centrada">
        <div className="tarjeta blanca" style={{ padding: '2rem 1.5rem' }}>
          <p className="etiqueta ok">Solicitud aceptada</p>
          <h1 style={{ marginTop: '0.75rem' }}>Bienvenido/a al panel. Eres {resultado.codigo}.</h1>
          <p>Tu perfil cumple los criterios de expertise del estudio. Esta es tu clave de acceso: <b>guárdala ahora</b>. No se puede recuperar y no la asociamos a ningún nombre ni correo.</p>
          <p><span className="clave-nueva">{resultado.clave}</span></p>
          <p className="silencio">Tienes {resultado.asignados} conceptos asignados. Puedes entrar ahora o más tarde, desde cualquier dispositivo, con esa clave.</p>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="acciones">
            <button type="button" className="boton" disabled={entrando} onClick={entrarAhora}>{entrando ? 'Entrando…' : 'Ya la he guardado: entrar'}</button>
          </div>
        </div>
      </main></div>
    )
  }

  if (resultado && !resultado.aceptado) {
    return (
      <div className="app"><main className="pantalla centrada">
        <div className="tarjeta blanca" style={{ padding: '2rem 1.5rem' }}>
          <p className="etiqueta">Solicitud recibida</p>
          <h1 style={{ marginTop: '0.75rem' }}>Gracias por tu interés.</h1>
          <p>El estudio exige un perfil de experto según criterios publicados (titulación, formación específica en dolor, práctica, publicaciones e investigación; Fehring, 1987), y con los datos que has indicado no alcanza el mínimo ({resultado.puntuacion} de {resultado.minimo} puntos). No es un juicio sobre tu trabajo: es el criterio de inclusión del protocolo, fijado antes de abrir la convocatoria.</p>
          <p className="silencio">Si crees que ha habido un error en algún dato, puedes volver a enviar la solicitud. Si tienes dolor persistente y quieres participar en el panel de personas con dolor, escribe a la dirección editorial.</p>
          <div className="acciones"><a className="boton secundario" href="#/">Volver</a><button type="button" className="boton fantasma" onClick={() => setResultado(null)}>Corregir mis datos</button></div>
        </div>
      </main></div>
    )
  }

  return (
    <div className="app">
      <header className="cabecera"><div className="cabecera-int"><a className="marca-app" href="#/"><span className="punto" aria-hidden="true" />Valida</a><span className="relleno" /><a className="boton fantasma pequeno" href="#/">Ya tengo clave</a></div></header>
      <main className="pantalla">
        <p className="etiqueta acento">Convocatoria · panel experto</p>
        <h1>Participar como experto/a en la validación</h1>
        {error && <p className="error" role="alert">{error}</p>}
        {!publico && !error && <p className="silencio">Cargando…</p>}
        {publico && !publico.inscripcion_abierta && (
          <p className="aviso-caja">La inscripción no está abierta en este momento. Si tienes una clave, <a href="#/">entra con ella</a>.</p>
        )}
        {publico?.inscripcion_abierta && (
          <>
            <div className="lectura">
              <p>{publico.nombre}. Buscamos profesionales con experiencia en dolor para valorar, concepto a concepto, una muestra de una base de conocimiento sobre educación en dolor: relevancia, claridad y representatividad de la evidencia. Son unos 70–90 conceptos, a 2–4 minutos cada uno, que puedes repartir en varias sesiones.</p>
              <p>El protocolo fija un criterio de expertise (puntuación de Fehring ≥ {publico.fehring_minimo}): titulación, formación específica en dolor, práctica en el área, publicaciones e investigación. Rellena el perfil con sinceridad; si alcanza el mínimo, recibirás tu clave en el acto y tu bloque de conceptos. No pedimos nombre ni correo.</p>
            </div>
            {publico.requiere_codigo && (
              <div className="campo">
                <label htmlFor="codigo-invitacion">Código de invitación <span className="silencio">(el que acompaña a la convocatoria)</span></label>
                <input id="codigo-invitacion" type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} style={{ maxWidth: '16rem' }} autoCapitalize="characters" />
              </div>
            )}
            <FormularioExperto nombresDominios={nombresDominios} onEnviar={enviar} enviando={enviando} etiquetaBoton="Enviar solicitud" />
          </>
        )}
      </main>
    </div>
  )
}
