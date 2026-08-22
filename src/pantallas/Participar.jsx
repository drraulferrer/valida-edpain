import { useEffect, useState } from 'react'
import * as api from '../lib/api.js'
import { FormularioExperto } from './Perfil.jsx'

const URL_ESTUDIO = 'https://valida.edpain.com/'

// Convocatoria pública: cualquiera rellena el perfil; el servidor calcula la puntuación de
// Fehring y solo crea el panelista si alcanza el mínimo. La clave se enseña una sola vez, con
// la opción de mandársela por correo a sí mismo y un botón para entrar en el estudio.
export default function Participar({ onEntrar }) {
  const [publico, setPublico] = useState(null)
  const [error, setError] = useState('')
  const [codigo, setCodigo] = useState('')
  const [mostrarCerrado, setMostrarCerrado] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => { api.publico().then(setPublico).catch((e) => setError(e.message)) }, [])

  const enviar = async (disciplina, anios, dominios, perfil) => {
    setEnviando(true); setError('')
    try {
      const r = await api.solicitar(1, codigo, disciplina, anios, dominios, perfil)
      setResultado({ ...r, email: perfil?.identidad?.email || '', nombre: perfil?.identidad?.nombre || '' })
      window.scrollTo({ top: 0 })
    } catch (e) { setError(e.message); window.scrollTo({ top: 0 }) } finally { setEnviando(false) }
  }

  if (resultado?.aceptado) return <Aceptado r={resultado} onEntrar={onEntrar} estudio={publico} />
  if (resultado) return <NoAceptado r={resultado} onReintentar={() => setResultado(null)} estudio={publico} />

  const nombresDominios = Object.fromEntries((publico?.dominios || []).map((d) => [d.id, d.nombre]))
  const abierta = !!publico?.inscripcion_abierta
  const formularioVisible = abierta || mostrarCerrado

  return (
    <div className="app">
      <header className="cabecera">
        <div className="cabecera-int">
          <a className="marca-app" href="#/"><span className="punto" aria-hidden="true" />Valida</a>
          <span className="relleno" />
          <a className="boton fantasma pequeno" href="#/">Ya tengo clave</a>
        </div>
      </header>
      <main className="pantalla">
        <p className="etiqueta acento">Convocatoria · panel experto</p>
        <h1>Participar como experto/a en la validación</h1>
        {error && <p className="error" role="alert">{error}</p>}
        {!publico && !error && <p className="silencio">Cargando…</p>}

        {publico && !abierta && (
          <>
            <p className="aviso-caja">La inscripción no está abierta en este momento. Si ya tienes una clave, <a href="#/">entra con ella</a>.</p>
            {publico.pruebas && !mostrarCerrado && (
              <button type="button" className="boton secundario" onClick={() => setMostrarCerrado(true)}>Tengo un código de acceso</button>
            )}
          </>
        )}

        {publico && formularioVisible && (
          <>
            <div className="lectura">
              <p>
                {publico.nombre}. Buscamos profesionales con experiencia en dolor para valorar, concepto a concepto, una muestra de
                una base de conocimiento sobre educación en dolor: relevancia, claridad y representatividad de la evidencia. Son
                unos 70–120 conceptos, a 2–4 minutos cada uno, que puedes repartir en varias sesiones.
              </p>
              <p>
                El protocolo fija un criterio de expertise (puntuación de Fehring ≥ {publico.fehring_minimo}): titulación, formación
                específica en dolor, práctica en el área, publicaciones e investigación. Rellena el perfil con sinceridad; si alcanza
                el mínimo, recibirás tu clave en el acto y tu bloque de conceptos.
              </p>
              <p className="silencio">
                Investigador principal: {publico.investigador_principal}. Dudas: <a href={`mailto:${publico.contacto_email}`}>{publico.contacto_email}</a>.
              </p>
            </div>
            {(publico.requiere_codigo || !abierta) && (
              <div className="campo">
                <label htmlFor="codigo-invitacion">Código de {abierta ? 'invitación' : 'acceso'} <span className="silencio">({abierta ? 'el que acompaña a la convocatoria' : 'el que te ha dado la dirección del estudio'})</span></label>
                <input id="codigo-invitacion" type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} style={{ maxWidth: '20rem' }} autoCapitalize="characters" />
              </div>
            )}
            <FormularioExperto nombresDominios={nombresDominios} estudio={publico} onEnviar={enviar} enviando={enviando} etiquetaBoton="Enviar solicitud" />
          </>
        )}
      </main>
    </div>
  )
}

function textoCorreo(r, estudio) {
  return [
    `Tu clave de acceso al estudio EdPain`,
    ``,
    `Código de panelista: ${r.codigo}`,
    `Clave de acceso: ${r.clave}`,
    ``,
    `Entra en ${URL_ESTUDIO} y escribe la clave para valorar tus conceptos (${r.asignados} asignados).`,
    `Puedes entrar tantas veces como quieras, desde cualquier dispositivo; todo se guarda solo.`,
    ``,
    `Guarda este correo: la clave no se puede recuperar. Si la pierdes, escribe a ${estudio?.contacto_email || 'estudio@edpain.com'} y se te generará otra.`,
    ``,
    `Estudio de validez de contenido de la base de conocimiento sobre educación en dolor.`,
    `Investigador principal: ${estudio?.investigador_principal || 'Dr. Raúl Ferrer-Peña'}.`,
  ].join('\n')
}

function Aceptado({ r, onEntrar, estudio }) {
  const [email, setEmail] = useState(r.email || '')
  const [entrando, setEntrando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState('')

  const entrarAhora = async () => {
    setEntrando(true)
    try { await onEntrar(r.clave); window.location.hash = '#/bloque' } catch (e) { setError(e.message) } finally { setEntrando(false) }
  }
  const copiar = async () => {
    try { await navigator.clipboard.writeText(r.clave); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch { setError('No se pudo copiar; selecciona la clave y cópiala a mano.') }
  }
  const correo = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Tu clave de acceso · Estudio EdPain')}&body=${encodeURIComponent(textoCorreo(r, estudio))}`

  return (
    <div className="app">
      <main className="pantalla centrada">
        <div className="tarjeta blanca" style={{ padding: '2rem 1.5rem' }}>
          <p className="etiqueta ok">Solicitud aceptada</p>
          <h1 style={{ marginTop: '0.75rem' }}>Bienvenido/a al panel{r.nombre ? `, ${r.nombre}` : ''}. Eres {r.codigo}.</h1>
          {r.prueba && <p className="aviso-caja">Alta de <b>prueba</b>: se ha creado con el código de pruebas y la dirección del estudio podrá borrarla con todo su rastro.</p>}
          <p>Tu perfil cumple los criterios de expertise del estudio. Esta es tu clave de acceso: <b>guárdala ahora</b>, no se puede recuperar.</p>
          <p><span className="clave-nueva">{r.clave}</span></p>
          <div className="acciones" style={{ marginTop: '0.5rem' }}>
            <button type="button" className="boton secundario pequeno" onClick={copiar}>{copiado ? 'Clave copiada' : 'Copiar la clave'}</button>
          </div>

          <div className="tarjeta" style={{ marginTop: '1.25rem' }}>
            <h3>Enviarme la clave por correo</h3>
            <p className="silencio">Se abrirá tu programa de correo con el mensaje escrito —clave, enlace al estudio y a quién escribir— para que lo mandes a la dirección que quieras y lo tengas guardado.</p>
            <div className="campo">
              <label htmlFor="email-clave">Enviar a</label>
              <input id="email-clave" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
            </div>
            <div className="acciones" style={{ marginTop: 0 }}>
              <a className={`boton secundario${email ? '' : ' fantasma'}`} href={correo} aria-disabled={!email}>Preparar el correo</a>
            </div>
          </div>

          <p className="silencio">Tienes <b>{r.asignados}</b> conceptos asignados. Puedes empezar ahora o cuando quieras.</p>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="acciones">
            <button type="button" className="boton" disabled={entrando} onClick={entrarAhora}>{entrando ? 'Entrando…' : 'Entrar en el estudio'}</button>
            <a className="boton secundario" href="#/">Entrar escribiendo la clave</a>
          </div>
        </div>
      </main>
    </div>
  )
}

function NoAceptado({ r, onReintentar, estudio }) {
  return (
    <div className="app">
      <main className="pantalla centrada">
        <div className="tarjeta blanca" style={{ padding: '2rem 1.5rem' }}>
          <p className="etiqueta">Solicitud recibida</p>
          <h1 style={{ marginTop: '0.75rem' }}>Gracias por tu interés.</h1>
          <p>
            El estudio exige un perfil de experto según criterios publicados —titulación, formación específica en dolor, práctica,
            publicaciones e investigación (Fehring, 1987)— y con los datos que has indicado no alcanza el mínimo
            ({r.puntuacion} de {r.minimo} puntos). No es un juicio sobre tu trabajo: es el criterio de inclusión del protocolo,
            fijado antes de abrir la convocatoria.
          </p>
          <p className="silencio">
            Si crees que ha habido un error en algún dato, corrígelo y vuelve a enviarlo. Si tienes dolor persistente y quieres
            participar en el panel de personas con dolor, escribe a <a href={`mailto:${estudio?.contacto_email || 'estudio@edpain.com'}`}>{estudio?.contacto_email || 'estudio@edpain.com'}</a>.
          </p>
          <div className="acciones">
            <button type="button" className="boton" onClick={onReintentar}>Corregir mis datos</button>
            <a className="boton secundario" href="#/">Volver</a>
          </div>
        </div>
      </main>
    </div>
  )
}
