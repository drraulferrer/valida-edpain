import { useEffect, useState } from 'react'
import * as api from '../lib/api.js'
import { FormularioExperto, FormularioPaciente } from './Perfil.jsx'

const URL_ESTUDIO = 'https://valida.edpain.com/'

// Convocatoria pública, dos vías:
//
//   EXPERTO  → el servidor calcula la puntuación de Fehring y solo crea el panelista si llega
//              al mínimo del protocolo.
//   PACIENTE → NO se puntúa. Se comprueba la elegibilidad (dolor de 3 meses o más, CIE-11) y
//              punto. Puntuar la experiencia vivida dejaría fuera justo a quien hace falta
//              para saber si un texto se entiende.
//
// La clave se enseña una sola vez, con la opción de mandársela por correo a sí mismo.
export default function Participar({ onEntrar, ruta }) {
  const [publico, setPublico] = useState(null)
  const [error, setError] = useState('')
  const [codigo, setCodigo] = useState('')
  const [mostrarCerrado, setMostrarCerrado] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [enviando, setEnviando] = useState(false)
  // #/participar/paciente entra directo a la vía de paciente; es el enlace que se pone en los
  // carteles de las salas de espera y en el correo a las asociaciones.
  const [via, setVia] = useState(() => (String(ruta || '').includes('paciente') ? 'paciente' : null))

  useEffect(() => { api.publico().then(setPublico).catch((e) => setError(e.message)) }, [])
  // La ruta manda sobre la elección: el inicializador de useState solo corre en el primer
  // montaje, así que sin esto ir de #/participar a #/participar/paciente no cambiaba nada.
  useEffect(() => { if (String(ruta || '').includes('paciente')) setVia('paciente') }, [ruta])

  const enviar = async (disciplina, anios, dominios, perfil) => {
    setEnviando(true); setError('')
    try {
      const r = await api.solicitar(1, codigo, disciplina, anios, dominios, perfil, via)
      setResultado({ ...r, via, email: perfil?.identidad?.email || '', nombre: perfil?.identidad?.nombre || '' })
      window.scrollTo({ top: 0 })
    } catch (e) { setError(e.message); window.scrollTo({ top: 0 }) } finally { setEnviando(false) }
  }
  const enviarPaciente = (perfil) => enviar(null, null, [], perfil)

  if (resultado?.aceptado) return <Aceptado r={resultado} onEntrar={onEntrar} estudio={publico} />
  if (resultado) return <NoAceptado r={resultado} estudio={publico} />

  const nombresDominios = Object.fromEntries((publico?.dominios || []).map((d) => [d.id, d.nombre]))
  const abiertaExperto = !!publico?.inscripcion_abierta
  const abiertaPaciente = !!publico?.inscripcion_pacientes_abierta
  const abierta = via === 'paciente' ? abiertaPaciente : abiertaExperto
  const formularioVisible = abierta || mostrarCerrado

  const marco = (contenido) => (
    <div className="app">
      <header className="cabecera">
        <div className="cabecera-int">
          <a className="marca-app" href="#/"><span className="punto" aria-hidden="true" />Valida</a>
          <span className="relleno" />
          <a className="boton fantasma pequeno" href="#/">Ya tengo clave</a>
        </div>
      </header>
      <main className="pantalla">
        {error && <p className="error" role="alert">{error}</p>}
        {!publico && !error && <p className="silencio">Cargando…</p>}
        {contenido}
      </main>
    </div>
  )

  // Antes de nada: ¿quién eres? Los dos paneles piden cosas muy distintas y mezclarlos en una
  // sola pantalla haría que cada uno leyera instrucciones que no son suyas.
  if (publico && !via) {
    return marco(
      <>
        <p className="etiqueta acento">Convocatoria</p>
        <h1>Participar en la validación</h1>
        <p className="lectura">
          {publico.nombre}. Estamos comprobando, texto a texto, si una base de conocimiento sobre educación en dolor está bien
          hecha. Hacen falta dos grupos distintos, y cada uno mira una cosa.
        </p>
        <div className="vias">
          <button type="button" className="via" onClick={() => setVia('experto')} disabled={!abiertaExperto && !publico.pruebas}>
            <span className="etiqueta">Panel experto</span>
            <b>Soy profesional con experiencia en dolor</b>
            <span className="silencio">
              Valoras si cada concepto es relevante, está claro y refleja la evidencia. Hay un criterio de expertise publicado
              (Fehring) que el formulario comprueba. Unos 70–120 conceptos.
            </span>
            {!abiertaExperto && <span className="etiqueta aviso">Cerrada ahora mismo</span>}
          </button>
          <button type="button" className="via" onClick={() => setVia('paciente')} disabled={!abiertaPaciente && !publico.pruebas}>
            <span className="etiqueta">Panel de personas con dolor</span>
            <b>Tengo dolor desde hace tres meses o más</b>
            <span className="silencio">
              Lees los textos escritos para pacientes y nos dices si se entienden y cómo te dejan. No hace falta saber nada de
              medicina: hace falta justo lo contrario. No se puntúa a nadie.
            </span>
            {!abiertaPaciente && <span className="etiqueta aviso">Cerrada ahora mismo</span>}
          </button>
        </div>
        <p className="silencio">
          Investigador principal: {publico.investigador_principal}. Dudas: <a href={`mailto:${publico.contacto_email}`}>{publico.contacto_email}</a>.
        </p>
      </>,
    )
  }

  const volver = <button type="button" className="boton fantasma pequeno" onClick={() => { setVia(null); setMostrarCerrado(false) }}>← No soy yo, volver</button>

  const campoCodigo = publico && (publico.requiere_codigo || !abierta) && (
    <div className="campo">
      <label htmlFor="codigo-invitacion">Código de {abierta ? 'invitación' : 'acceso'} <span className="silencio">({abierta ? 'el que acompaña a la convocatoria' : 'el que te ha dado la dirección del estudio'})</span></label>
      <input id="codigo-invitacion" type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} style={{ maxWidth: '20rem' }} autoCapitalize="characters" />
    </div>
  )

  const cerrada = publico && !abierta && (
    <>
      <p className="aviso-caja">La inscripción no está abierta en este momento. Si ya tienes una clave, <a href="#/">entra con ella</a>.</p>
      {publico.pruebas && !mostrarCerrado && (
        <button type="button" className="boton secundario" onClick={() => setMostrarCerrado(true)}>Tengo un código de acceso</button>
      )}
    </>
  )

  if (via === 'paciente') {
    return marco(
      <>
        <p className="etiqueta acento">Convocatoria · panel de personas con dolor</p>
        <h1>Participar como persona con dolor</h1>
        {cerrada}
        {publico && formularioVisible && (
          <>
            <div className="lectura">
              <p>
                Vas a leer textos cortos escritos para personas con dolor y decirnos <b>si se entienden</b>: si las palabras son
                palabras tuyas, si puedes seguirlos sin perderte y cómo te dejan al terminar. No tienes que saber si lo que dicen
                es verdad —de eso se ocupa otro grupo— ni tener ningún estudio.
              </p>
              <p>
                Son unos <b>25 textos</b>, de dos o tres minutos cada uno, que puedes repartir como quieras a lo largo de varias
                semanas. Todo se guarda solo y puedes parar cuando quieras.
              </p>
              <p>
                Para entrar solo hace falta <b>tener 18 años o más y llevar tres meses o más con dolor</b>. No hay ninguna prueba
                que pasar ni nota que sacar: si has llegado hasta aquí y cumples eso, entras.
              </p>
              <p className="silencio">
                Después te preguntamos por tu dolor, tus tratamientos y qué te han dicho que tienes. Es para poder describir en la
                publicación a qué personas les resultaron claros estos textos —siempre en conjunto, nunca una por una—. Se tarda
                unos cinco minutos y es la única vez.
              </p>
              <p className="silencio">
                Investigador principal: {publico.investigador_principal}. Dudas: <a href={`mailto:${publico.contacto_email}`}>{publico.contacto_email}</a>.
              </p>
            </div>
            {campoCodigo}
            <FormularioPaciente estudio={publico} onEnviar={enviarPaciente} enviando={enviando} etiquetaBoton="Enviar solicitud" />
          </>
        )}
        <div className="acciones">{volver}</div>
      </>,
    )
  }

  return marco(
    <>
      <p className="etiqueta acento">Convocatoria · panel experto</p>
      <h1>Participar como experto/a en la validación</h1>
      {cerrada}
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
          {campoCodigo}
          <FormularioExperto nombresDominios={nombresDominios} estudio={publico} onEnviar={enviar} enviando={enviando} etiquetaBoton="Enviar solicitud" />
        </>
      )}
      <div className="acciones">{volver}</div>
    </>,
  )
}

function textoCorreo(r, estudio) {
  return [
    `Tu clave de acceso al estudio EdPain`,
    ``,
    `Código de panelista: ${r.codigo}`,
    `Clave de acceso: ${r.clave}`,
    ``,
    `Entra en ${URL_ESTUDIO} y escribe la clave para valorar tus ${r.perfil === 'paciente' ? 'textos' : 'conceptos'} (${r.asignados} asignados).`,
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
          <p>
            {r.perfil === 'paciente'
              ? 'Ya estás dentro. Esta es tu clave de acceso: '
              : 'Tu perfil cumple los criterios de expertise del estudio. Esta es tu clave de acceso: '}
            <b>guárdala ahora</b>, no se puede recuperar.
          </p>
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

          <p className="silencio">Tienes <b>{r.asignados}</b> {r.perfil === 'paciente' ? 'textos' : 'conceptos'} asignados. Puedes empezar ahora o cuando quieras.</p>
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

function NoAceptado({ r, estudio }) {
  const contacto = estudio?.contacto_email || 'estudio@edpain.com'
  if (r.bloqueado || r.ya_registrado) {
    return (
      <div className="app">
        <main className="pantalla centrada">
          <div className="tarjeta blanca" style={{ padding: '2rem 1.5rem' }}>
            <p className="etiqueta aviso">Solicitud no tramitada</p>
            <h1 style={{ marginTop: '0.75rem' }}>
              {r.ya_registrado ? 'Este correo ya está en el panel.' : 'No es posible tramitar esta solicitud.'}
            </h1>
            <p>
              {r.ya_registrado
                ? 'Ya hay una alta con este correo. Entra con la clave que recibiste; si la has perdido, escríbenos y te generamos otra.'
                : 'No podemos darte de alta en el panel con esta solicitud.'}
            </p>
            <p className="silencio">
              Si crees que es un error, escribe a <a href={`mailto:${contacto}`}>{contacto}</a> y lo revisamos contigo.
            </p>
            <div className="acciones"><a className="boton" href="#/">Ir a la entrada</a></div>
          </div>
        </main>
      </div>
    )
  }
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
            Si crees que hay un error, escribe a <a href={`mailto:${contacto}`}>{contacto}</a>. Si tienes dolor persistente y quieres
            participar en el panel de personas con dolor, cuéntanoslo en ese mismo correo.
          </p>
          <div className="acciones"><a className="boton secundario" href="#/">Volver</a></div>
        </div>
      </main>
    </div>
  )
}
