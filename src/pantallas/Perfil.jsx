import { useEffect, useState } from 'react'
import * as api from '../lib/api.js'
import { ir } from '../App.jsx'
import HojaInformacion from '../componentes/HojaInformacion.jsx'
import {
  AMBITOS, AUTOEXPERTISE, CHEW, DIAGNOSTICOS, DISCIPLINAS, DOLOR_PROPIO, DURACION_DOLOR, EDAD_MAXIMA, EDAD_MINIMA,
  EDUCACION_DOLOR, EGDC_DISCAPACIDAD, EGDC_INTENSIDAD, EGDC_DIAS, EGDC_DIAS_TEXTO, EGDC_DIAS_TRAMOS,
  EGDC_DIAS_DOLOR, EGDC_DIAS_DOLOR_TEXTO, ENUNCIADO_2SEMANAS, GAD7_ITEMS, GAD7_OPCIONES,
  PHQ9_ITEMS, PHQ9_OPCIONES,
  PHQ9_ITEM_RIESGO, PHQ9_FUNCIONAL, PHQ9_FUNCIONAL_TEXTO, PHQ9_FUNCIONAL_OPCIONES, AYUDA_RIESGO, SEXO, edadDe,
  EDUCACION_PREVIA, ENTORNOS, ESTUDIOS, EXPLICACION_RECIBIDA, FRECUENCIA_DOLOR, IDENTIDAD_VACIA,
  LECTURA_PROPIA, PERFIL_EXPERTO_VACIO, PERFIL_PACIENTE_VACIO, PUBLICACIONES, PUBLICACIONES_EDU, SEGUIMIENTO,
  SITUACION, TITULACIONES, TRATAMIENTOS, ZONAS_DOLOR,
  elegibilidadPaciente, prepararPerfil, validarPerfilExperto, validarPacientePaso1, validarPerfilPaciente,
} from '../lib/perfil.js'

// Se rellena una vez, antes de las instrucciones. Caracteriza el panel (CREDES), permite calcular
// la puntuación de Fehring y recoge la identidad para la autoría del grupo y la trazabilidad. La
// identidad se guarda en su propia tabla: no viaja con las valoraciones.
export default function Perfil({ sesion, refrescar }) {
  return sesion.perfil === 'paciente'
    ? <PerfilPaciente sesion={sesion} refrescar={refrescar} />
    : <PerfilExperto sesion={sesion} refrescar={refrescar} />
}

function PerfilExperto({ sesion, refrescar }) {
  const [nombres, setNombres] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  useEffect(() => { api.bloque(sesion.clave).then((b) => setNombres(b.nombres || {})).catch(() => {}) }, [sesion.clave])

  const enviar = async (disc, anios, dominios, perfil) => {
    setGuardando(true); setError('')
    try {
      await api.guardarPerfil(sesion.clave, disc, anios, dominios, perfil)
      await refrescar()
      ir('/instrucciones')
    } catch (err) { setError(err.message); window.scrollTo({ top: 0 }) } finally { setGuardando(false) }
  }

  return (
    <main className="pantalla">
      <p className="etiqueta acento">Antes de empezar · 1 de 3</p>
      <h1>Tu perfil como panelista</h1>
      <p className="silencio">
        Se rellena una sola vez, en cinco minutos. Los datos de formación y experiencia describen al panel en el informe
        (siempre en conjunto) y deciden qué conceptos te tocan; los de contacto sirven para avisarte de cada ronda y para
        el reconocimiento de autoría.
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      <FormularioExperto inicial={sesion.perfil_datos} disciplinaInicial={sesion.disciplina} aniosInicial={sesion.anios}
        dominiosInicial={sesion.dominios_competencia} nombresDominios={nombres} estudio={sesion.estudio}
        onEnviar={enviar} enviando={guardando} etiquetaBoton="Guardar y seguir" />
    </main>
  )
}

// El formulario del experto, reutilizable: en el perfil (con sesión) y en la convocatoria pública
// (sin sesión). `onEnviar(disciplina, anios, dominios, perfil)` recibe datos ya validados.
export function FormularioExperto({ inicial, disciplinaInicial, aniosInicial, dominiosInicial, nombresDominios = {}, estudio, onEnviar, enviando, etiquetaBoton = 'Seguir' }) {
  const previo = inicial || {}
  const [disciplina, setDisciplina] = useState(disciplinaInicial || '')
  const [otra, setOtra] = useState('')
  const [anios, setAnios] = useState(aniosInicial ?? '')
  const [dominios, setDominios] = useState(dominiosInicial || [])
  const [f, setF] = useState({
    ...PERFIL_EXPERTO_VACIO, ...previo,
    reparto: { ...PERFIL_EXPERTO_VACIO.reparto, ...(previo.reparto || {}) },
    identidad: { ...IDENTIDAD_VACIA, ...(previo.identidad || {}) },
  })
  const [error, setError] = useState('')

  const listaDominios = Object.keys(nombresDominios).filter((k) => /^D\d\d$/.test(k)).sort()
  const cambiar = (k, v) => setF((prev) => ({ ...prev, [k]: v }))
  const ident = (k, v) => setF((prev) => ({ ...prev, identidad: { ...prev.identidad, [k]: v } }))
  const alternar = (k, v) => setF((prev) => ({ ...prev, [k]: prev[k].includes(v) ? prev[k].filter((x) => x !== v) : [...prev[k], v] }))
  const alternarDominio = (d) => setDominios((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  const reparto = (k, v) => setF((prev) => ({ ...prev, reparto: { ...prev.reparto, [k]: v } }))
  const grupo = estudio?.grupo_autoria || 'Grupo del Estudio EdPain'

  const enviar = (e) => {
    e.preventDefault()
    const disc = disciplina === 'otra' ? otra.trim() : disciplina
    const problema = validarPerfilExperto(f, disc, anios, dominios)
    if (problema) { setError(problema); window.scrollTo({ top: 0 }); return }
    setError('')
    const perfil = prepararPerfil({
      ...f,
      anios_profesion: f.anios_profesion === '' ? null : Number(f.anios_profesion),
      reparto: Object.fromEntries(Object.entries(f.reparto).map(([k, v]) => [k, v === '' ? null : Number(v)])),
    }, previo)
    onEnviar(disc, Number(anios), dominios, perfil)
  }

  return (
    <form onSubmit={enviar} noValidate>
      {/* `noValidate`: la validación la llevan `validarPerfil*`, que dicen QUÉ falta y en qué
          orden, arriba y con un solo estilo. Dejar además la del navegador significaba que un
          `required` vacío abortaba el envío en silencio —sin nuestro mensaje— y con el globo
          nativo pegado a un campo que puede estar fuera de la pantalla. */}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="tarjeta">
        <h3>1 · Quién eres</h3>
        <p className="destacado-oro">
          <b>Autoría de grupo.</b> Quien complete <b>todas las rondas</b> del estudio será reconocido como miembro del <b>{grupo}</b> en
          las publicaciones que se deriven, con nombre, apellidos y filiación. Por eso se piden aquí: son los que se indexarán.
        </p>
        <div className="panel-dos">
          <div className="campo">
            <label htmlFor="id-nombre">Nombre</label>
            <input id="id-nombre" type="text" autoComplete="given-name" value={f.identidad.nombre} onChange={(e) => ident('nombre', e.target.value)} required />
          </div>
          <div className="campo">
            <label htmlFor="id-apellidos">Apellidos</label>
            <input id="id-apellidos" type="text" autoComplete="family-name" value={f.identidad.apellidos} onChange={(e) => ident('apellidos', e.target.value)} required />
          </div>
          <div className="campo">
            <label htmlFor="id-email">Correo de contacto</label>
            <input id="id-email" type="email" autoComplete="email" value={f.identidad.email} onChange={(e) => ident('email', e.target.value)} required />
            <p className="ayuda">Para avisarte de cada ronda y para la trazabilidad del panel. No se publica ni se cede.</p>
          </div>
          <div className="campo">
            <label htmlFor="id-orcid">ORCID <span className="silencio">(opcional)</span></label>
            <input id="id-orcid" type="text" value={f.identidad.orcid} onChange={(e) => ident('orcid', e.target.value)} placeholder="0000-0002-1825-0097" />
          </div>
        </div>
        <div className="campo">
          <label htmlFor="id-filiacion">Filiación <span className="silencio">(centro o universidad, como debe aparecer en la publicación)</span></label>
          <input id="id-filiacion" type="text" value={f.identidad.filiacion} onChange={(e) => ident('filiacion', e.target.value)} />
        </div>
      </div>

      <div className="tarjeta">
        <h3>2 · Formación y profesión</h3>
        <div className="campo">
          <label htmlFor="disciplina">Disciplina principal</label>
          <select id="disciplina" value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
            <option value="">— elige —</option>
            {DISCIPLINAS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {disciplina === 'otra' && <input type="text" style={{ marginTop: '0.4rem' }} placeholder="¿Cuál?" value={otra} onChange={(e) => setOtra(e.target.value)} />}
        </div>
        <div className="campo">
          <label htmlFor="titulacion">Titulación académica máxima</label>
          <select id="titulacion" value={f.titulacion} onChange={(e) => cambiar('titulacion', e.target.value)}>
            <option value="">— elige —</option>
            {TITULACIONES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="campo">
          <label className="casilla">
            <input type="checkbox" checked={!!f.formacion_dolor} onChange={(e) => cambiar('formacion_dolor', e.target.checked)} />
            <span>Tengo formación específica acreditada en dolor (máster, experto, certificación)</span>
          </label>
          {f.formacion_dolor && <input type="text" placeholder="¿Cuál? (p. ej. Máster en Fisioterapia del Dolor)" value={f.formacion_dolor_cual} onChange={(e) => cambiar('formacion_dolor_cual', e.target.value)} />}
        </div>
        <div className="panel-dos">
          <div className="campo">
            <label htmlFor="exp-sexo">Sexo <span className="silencio">(opcional)</span></label>
            <select id="exp-sexo" value={f.sexo || ''} onChange={(e) => cambiar('sexo', e.target.value)}>
              <option value="">— elige —</option>
              {SEXO.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <p className="ayuda">Para describir la composición del panel en el informe.</p>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="pais">País donde ejerces</label>
          <input id="pais" type="text" value={f.pais} onChange={(e) => cambiar('pais', e.target.value)} style={{ maxWidth: '20rem' }} />
        </div>
      </div>

      <div className="tarjeta">
        <h3>3 · Actividad y experiencia</h3>
        <div className="campo">
          <span className="rotulo">Ámbitos de trabajo <span className="silencio">(los que apliquen)</span></span>
          <div className="casillas">
            {AMBITOS.map(([k, v]) => (
              <label key={k} className="casilla"><input type="checkbox" checked={f.ambitos.includes(k)} onChange={() => alternar('ambitos', k)} /><span>{v}</span></label>
            ))}
          </div>
        </div>
        <div className="campo">
          <label htmlFor="entorno">Entorno principal <span className="silencio">(opcional)</span></label>
          <select id="entorno" value={f.entorno} onChange={(e) => cambiar('entorno', e.target.value)}>
            <option value="">— elige —</option>
            {ENTORNOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="panel-dos">
          <div className="campo">
            <label htmlFor="anios-profesion">Años de ejercicio profesional</label>
            <input id="anios-profesion" type="number" min="0" max="60" value={f.anios_profesion} onChange={(e) => cambiar('anios_profesion', e.target.value)} style={{ width: '8rem' }} />
          </div>
          <div className="campo">
            <label htmlFor="anios">Años de experiencia en dolor <span className="silencio">(clínica, docente o investigadora)</span></label>
            <input id="anios" type="number" min="0" max="60" value={anios} onChange={(e) => setAnios(e.target.value)} style={{ width: '8rem' }} />
          </div>
        </div>
        <div className="campo">
          <span className="rotulo">Reparto aproximado de tu tiempo <span className="silencio">(%, opcional; no tiene que sumar 100)</span></span>
          <div className="panel-dos" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {[['clinica', 'Clínica'], ['docencia', 'Docencia'], ['investigacion', 'Investigación']].map(([k, v]) => (
              <div key={k}>
                <label htmlFor={`reparto-${k}`} style={{ fontWeight: 500 }}>{v}</label>
                <input id={`reparto-${k}`} type="number" min="0" max="100" value={f.reparto[k]} onChange={(e) => reparto(k, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        <div className="campo">
          <span className="rotulo">Educación en dolor</span>
          <div className="casillas" style={{ gridTemplateColumns: '1fr' }}>
            {EDUCACION_DOLOR.map(([k, v]) => (
              <label key={k} className="casilla"><input type="checkbox" checked={f.educacion_dolor.includes(k)} onChange={() => alternar('educacion_dolor', k)} /><span>{v}</span></label>
            ))}
          </div>
        </div>
      </div>

      <div className="tarjeta">
        <h3>4 · Investigación y producción</h3>
        <div className="panel-dos">
          <div className="campo">
            <label htmlFor="pub-dolor">Publicaciones revisadas por pares sobre dolor</label>
            <select id="pub-dolor" value={f.publicaciones_dolor} onChange={(e) => cambiar('publicaciones_dolor', e.target.value)}>
              <option value="">— elige —</option>
              {PUBLICACIONES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="pub-edu">De ellas, sobre educación en dolor</label>
            <select id="pub-edu" value={f.publicaciones_educacion} onChange={(e) => cambiar('publicaciones_educacion', e.target.value)}>
              <option value="">— elige —</option>
              {PUBLICACIONES_EDU.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        {f.publicaciones_educacion && f.publicaciones_educacion !== '0' && (
          <div className="campo">
            <label htmlFor="id-dois">DOI de algunas de tus publicaciones sobre educación en dolor</label>
            <textarea id="id-dois" value={f.identidad.dois} onChange={(e) => ident('dois', e.target.value)}
              placeholder="10.1097/j.pain.0000000000001939&#10;10.1093/ptj/pzab001" style={{ minHeight: '5rem', fontFamily: 'var(--mono)', fontSize: '0.9rem' }} />
            <p className="ayuda">Uno por línea (o separados por comas). Sirven para verificar el perfil del panel a posteriori, que es lo que hace defendible el criterio de expertise. Vale el DOI solo o la URL completa.</p>
          </div>
        )}
        <div className="casillas" style={{ gridTemplateColumns: '1fr' }}>
          <label className="casilla"><input type="checkbox" checked={!!f.investigacion_dolor} onChange={(e) => cambiar('investigacion_dolor', e.target.checked)} /><span>Participo o he participado en proyectos de investigación sobre dolor</span></label>
          <label className="casilla"><input type="checkbox" checked={!!f.delphi_previo} onChange={(e) => cambiar('delphi_previo', e.target.checked)} /><span>He participado antes en un Delphi, un consenso de expertos o la elaboración de una guía</span></label>
        </div>
        <div className="campo">
          <label htmlFor="sociedades">Sociedades científicas de dolor a las que perteneces <span className="silencio">(opcional)</span></label>
          <input id="sociedades" type="text" value={f.sociedades} onChange={(e) => cambiar('sociedades', e.target.value)} placeholder="SED, IASP, EFIC…" />
        </div>
      </div>

      <div className="tarjeta">
        <h3>5 · Cómo te ves tú</h3>
        <div className="campo">
          <span className="rotulo">Tu nivel en educación en dolor</span>
          <div className="casillas" style={{ gridTemplateColumns: '1fr' }}>
            {AUTOEXPERTISE.map(([k, v]) => (
              <label key={k} className="casilla"><input type="radio" name="autoexpertise" checked={f.autoexpertise === k} onChange={() => cambiar('autoexpertise', k)} /><span>{v}</span></label>
            ))}
          </div>
        </div>
        <div className="campo">
          <span className="rotulo">Dominios en los que te consideras competente para juzgar</span>
          <p className="ayuda" style={{ marginBottom: '0.5rem' }}>Marca solo en los que podrías discutir la evidencia con un colega. En los demás siempre podrás abstenerte concepto a concepto.</p>
          <div className="casillas">
            {listaDominios.map((d) => (
              <label key={d} className="casilla">
                <input type="checkbox" checked={dominios.includes(d)} onChange={() => alternarDominio(d)} />
                <span>{nombresDominios[d]}<span className="sub">{d}</span></span>
              </label>
            ))}
            {!listaDominios.length && <p className="silencio">Cargando dominios…</p>}
          </div>
        </div>
        <div className="campo">
          <span className="rotulo">¿Tienes o has tenido dolor persistente? <span className="silencio">(opcional; la experiencia propia también cuenta)</span></span>
          <div className="casillas">
            {DOLOR_PROPIO.map(([k, v]) => (
              <label key={k} className="casilla"><input type="radio" name="dolor-propio" checked={f.dolor_propio === k} onChange={() => cambiar('dolor_propio', k)} /><span>{v}</span></label>
            ))}
          </div>
        </div>
      </div>

      <HojaInformacion estudio={estudio} perfil="experto" valor={f.consentimiento} onCambio={(v) => cambiar('consentimiento', v)} />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="acciones">
        <button className="boton" type="submit" disabled={enviando}>{enviando ? 'Guardando…' : etiquetaBoton}</button>
      </div>
    </form>
  )
}

function PerfilPaciente({ sesion, refrescar }) {
  const previo = sesion.perfil_datos || {}
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const enviar = async (perfil) => {
    setGuardando(true); setError('')
    try {
      await api.guardarPerfil(sesion.clave, null, null, [], prepararPerfil(perfil, previo))
      await refrescar()
      ir('/instrucciones')
    } catch (err) { setError(err.message); window.scrollTo({ top: 0 }) } finally { setGuardando(false) }
  }

  return (
    <main className="pantalla">
      <p className="etiqueta acento">Antes de empezar</p>
      <h1>Unos datos sobre ti</h1>
      <p className="silencio">
        Sirven para describir en la publicación al grupo de personas con dolor que ha participado —siempre en conjunto, nunca
        una por una— y para avisarte de cada ronda. Van en <b>dos pasos</b> y son unos ocho minutos: es la única vez que te
        preguntamos esto.
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      <FormularioPaciente inicial={previo} estudio={sesion.estudio} onEnviar={enviar} enviando={guardando}
        etiquetaBoton="Guardar y seguir" />
    </main>
  )
}

// El mismo formulario en los dos sitios: al entrar con clave (arriba) y en la convocatoria
// pública (#/participar). Así no hay dos versiones del conjunto mínimo de datos que se
// desincronicen. Qué se pregunta y por qué, en la cabecera de src/lib/perfil.js.
export function FormularioPaciente({ inicial = {}, estudio, onEnviar, enviando, etiquetaBoton = 'Enviar' }) {
  const [f, setF] = useState({
    ...PERFIL_PACIENTE_VACIO, ...inicial,
    identidad: { ...IDENTIDAD_VACIA, ...(inicial.identidad || {}) },
  })
  const [error, setError] = useState('')
  const cambiar = (k, v) => setF((prev) => ({ ...prev, [k]: v }))
  const ident = (k, v) => setF((prev) => ({ ...prev, identidad: { ...prev.identidad, [k]: v } }))
  const alternar = (k, id) => setF((prev) => {
    const ya = prev[k] || []
    return { ...prev, [k]: ya.includes(id) ? ya.filter((x) => x !== id) : [...ya, id] }
  })
  const noElegible = elegibilidadPaciente(f)
  // Dos pasos. El primero es corto y decide: si no encajas por edad o por tiempo de dolor, te
  // enteras ahí y no después de treinta preguntas. Todo vive en el mismo `f`, así que volver
  // atrás no pierde nada.
  const [paso, setPaso] = useState(1)
  const arriba = () => window.scrollTo({ top: 0 })

  const enviar = (e) => {
    e.preventDefault()
    if (paso === 1) {
      const problema = validarPacientePaso1(f)
      if (problema) { setError(problema); arriba(); return }
      setError(''); setPaso(2); arriba()
      return
    }
    const problema = validarPerfilPaciente(f)
    if (problema) { setError(problema); arriba(); return }
    setError('')
    onEnviar(f)
  }

  const volver = () => { setError(''); setPaso(1); arriba() }

  return (
    <form onSubmit={enviar} noValidate>
      {/* `noValidate`: la validación la llevan `validarPerfil*`, que dicen QUÉ falta y en qué
          orden, arriba y con un solo estilo. Dejar además la del navegador significaba que un
          `required` vacío abortaba el envío en silencio —sin nuestro mensaje— y con el globo
          nativo pegado a un campo que puede estar fuera de la pantalla. */}
      <div className="pasos-perfil">
        <p className="etiqueta acento" style={{ margin: 0 }}>Paso {paso} de 2</p>
        <p className="silencio" style={{ margin: '0.2rem 0 0' }}>
          {paso === 1
            ? 'Quién eres y qué te pasa. Son unas pocas preguntas y sirven para saber si encajas en el panel.'
            : 'Cómo te afecta. Es la parte larga: unos cuatro minutos, y es la única vez que se pregunta.'}
        </p>
        <div className="barra"><span style={{ transform: `scaleX(${paso / 2})` }} /></div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {paso === 1 && <>
      <div className="tarjeta">
        <h3>Cómo te avisamos</h3>
        <p className="silencio">
          No te pedimos el nombre: en este panel no hace falta y así tus respuestas no van unidas a él. Solo un correo,
          que <b>se guarda aparte de lo que contestes</b> y sirve para tres cosas: mandarte tu clave, avisarte cuando haya
          textos nuevos y comprobar que nadie responde dos veces.
        </p>
        <div className="campo">
          <label htmlFor="pac-email">Correo de contacto</label>
          <input id="pac-email" type="email" autoComplete="email" value={f.identidad.email} onChange={(e) => ident('email', e.target.value)} required />
          <p className="ayuda">No se publica, no se cede y no aparece en ningún resultado del estudio.</p>
        </div>
      </div>

      <div className="tarjeta">
        <h3>Quién eres</h3>
        <div className="panel-dos">
          <div className="campo">
            <label htmlFor="pac-nacimiento">Fecha de nacimiento</label>
            <input id="pac-nacimiento" type="date" value={f.nacimiento} onChange={(e) => cambiar('nacimiento', e.target.value)}
              min={limiteFecha(EDAD_MAXIMA)} max={limiteFecha(EDAD_MINIMA)} required />
            {edadDe(f.nacimiento) != null && <p className="ayuda">{edadDe(f.nacimiento)} años</p>}
          </div>
          <Elegir id="sexo" etiqueta="Sexo" opcional valor={f.sexo} onCambio={(v) => cambiar('sexo', v)} opciones={SEXO} />
          <Elegir id="estudios" etiqueta="Estudios" opcional valor={f.estudios} onCambio={(v) => cambiar('estudios', v)} opciones={ESTUDIOS} />
          <Elegir id="situacion" etiqueta="Situación laboral" opcional valor={f.situacion} onCambio={(v) => cambiar('situacion', v)} opciones={SITUACION} />
        </div>
      </div>

      <div className="tarjeta">
        <h3>Tu dolor</h3>
        <div className="panel-dos">
          <Elegir id="duracion-dolor" etiqueta="¿Cuánto tiempo llevas con dolor?" valor={f.duracion_dolor}
            onCambio={(v) => cambiar('duracion_dolor', v)} opciones={DURACION_DOLOR} />
          <Elegir id="frecuencia-dolor" etiqueta="¿Cada cuánto te duele?" valor={f.frecuencia_dolor}
            onCambio={(v) => cambiar('frecuencia_dolor', v)} opciones={FRECUENCIA_DOLOR} />
        </div>
        {noElegible && f.duracion_dolor === 'menos_3m' && <p className="aviso-caja">{noElegible}</p>}

        <Casillas etiqueta="¿Dónde te duele?" ayuda="Marca todas las que hagan falta."
          opciones={ZONAS_DOLOR} marcadas={f.zonas} onAlternar={(id) => alternar('zonas', id)} />

        <Casillas etiqueta="¿Qué te han dicho que tienes?" ayuda="Marca lo que te hayan dicho, aunque no estés de acuerdo o te hayan dicho varias cosas."
          opciones={DIAGNOSTICOS} marcadas={f.diagnosticos} onAlternar={(id) => alternar('diagnosticos', id)} />
        {(f.diagnosticos || []).includes('otro') && (
          <div className="campo">
            <label htmlFor="dx-otro">¿Cuál?</label>
            <input id="dx-otro" type="text" value={f.diagnostico_otro} onChange={(e) => cambiar('diagnostico_otro', e.target.value)} />
          </div>
        )}

        <Elegir id="explicacion-recibida" etiqueta="¿Te han explicado a qué se debe tu dolor?" opcional
          valor={f.explicacion_recibida} onCambio={(v) => cambiar('explicacion_recibida', v)} opciones={EXPLICACION_RECIBIDA} />

        <div className="campo">
          <label htmlFor="diagnostico">Tu dolor, en tus palabras <span className="silencio">(opcional)</span></label>
          <textarea id="diagnostico" value={f.diagnostico} onChange={(e) => cambiar('diagnostico', e.target.value)}
            placeholder="Lo que quieras contarnos: cómo empezó, cómo es un mal día, qué te preocupa…" />
        </div>
      </div>

      <HojaInformacion estudio={estudio} perfil="paciente" valor={f.consentimiento} onCambio={(v) => cambiar('consentimiento', v)} />
      </>}

      {paso === 2 && <>
      <div className="tarjeta">
        <h3>Cómo te afecta</h3>
        <p className="silencio">
          Son las ocho preguntas de la <b>Escala de Gradación del Dolor Crónico</b>, en su versión española validada. Van tal
          cual se publicaron —de ahí el «usted» y el tono de cuestionario—, porque cambiarles las palabras estropearía la
          comparación con otros estudios. Salvo la primera, todas se refieren a los <b>últimos tres meses</b>.
        </p>
        <div className="campo">
          <label htmlFor="egdc-dias-dolor"><Marcado texto={EGDC_DIAS_DOLOR_TEXTO} /></label>
          <input id="egdc-dias-dolor" type="number" min="0" max="180" value={f[EGDC_DIAS_DOLOR]}
            onChange={(e) => cambiar(EGDC_DIAS_DOLOR, e.target.value)} style={{ maxWidth: '9rem' }} required />
          <p className="ayuda">De 0 a 180 días. Si no sabes el número exacto, pon el que más se acerque.</p>
        </div>
        {EGDC_INTENSIDAD.map(([clave, etiqueta, izq, der]) => (
          <Escala0a10 key={clave} id={clave.replace('_', '-')} etiqueta={<Marcado texto={etiqueta} />} izquierda={izq} derecha={der}
            valor={f[clave]} onCambio={(v) => cambiar(clave, v)} />
        ))}
        <Elegir id="egdc-dias" etiqueta={<Marcado texto={EGDC_DIAS_TEXTO} />} valor={f[EGDC_DIAS]}
          onCambio={(v) => cambiar(EGDC_DIAS, v)} opciones={EGDC_DIAS_TRAMOS.map(([k, etiqueta]) => [k, etiqueta])} />
        {EGDC_DISCAPACIDAD.map(([clave, etiqueta, izq, der]) => (
          <Escala0a10 key={clave} id={clave.replace('_', '-')} etiqueta={<Marcado texto={etiqueta} />} izquierda={izq} derecha={der}
            valor={f[clave]} onCambio={(v) => cambiar(clave, v)} />
        ))}
      </div>

      <div className="tarjeta">
        <h3>Cómo te has sentido</h3>
        <p className="silencio">
          <Marcado texto={ENUNCIADO_2SEMANAS} /> Son dos cuestionarios de cribado —siete preguntas sobre preocupación y nueve
          sobre ánimo—: <b>no son un diagnóstico</b> y nadie te va a llamar por ellas. Sirven para describir al grupo, porque
          la preocupación y el ánimo cambian cómo se lee un texto. Están tal cual se publicaron, en un castellano algo más
          formal que el resto: cambiarles las palabras estropearía la comparación con otros estudios.
        </p>
        {GAD7_ITEMS.map(([clave, pregunta]) => (
          <Elegir key={clave} id={`gad7-${clave}`} etiqueta={pregunta} valor={f[clave]}
            onCambio={(v) => cambiar(clave, v === '' ? '' : Number(v))} opciones={GAD7_OPCIONES} />
        ))}
        {PHQ9_ITEMS.map(([clave, pregunta]) => (
          <Elegir key={clave} id={`phq9-${clave}`} etiqueta={pregunta} valor={f[clave]}
            onCambio={(v) => cambiar(clave, v === '' ? '' : Number(v))} opciones={PHQ9_OPCIONES} />
        ))}
        {/* El ítem 9 pregunta por ideas de muerte: en cuanto deja de ser «ningún día» hay que
            enseñar dónde pedir ayuda, y decir que aquí no hay nadie leyendo en el momento. */}
        {Number(f[PHQ9_ITEM_RIESGO]) > 0 && (
          <div className="plazo-caja peligro" role="status">
            <p style={{ margin: 0 }}><b>{AYUDA_RIESGO.titulo}</b></p>
            <p className="silencio" style={{ margin: '0.35rem 0' }}>{AYUDA_RIESGO.aviso}</p>
            <ul style={{ margin: '0.35rem 0' }}>
              {AYUDA_RIESGO.recursos.map(([numero, que]) => (
                <li key={numero}><b><a href={`tel:${numero.replace(/\s/g, '')}`}>{numero}</a></b> · {que}</li>
              ))}
            </ul>
            <p className="silencio" style={{ margin: 0 }}>{AYUDA_RIESGO.cierre}</p>
          </div>
        )}
        <Elegir id="phq9-funcional" etiqueta={PHQ9_FUNCIONAL_TEXTO} opcional valor={f[PHQ9_FUNCIONAL]}
          onCambio={(v) => cambiar(PHQ9_FUNCIONAL, v === '' ? '' : Number(v))} opciones={PHQ9_FUNCIONAL_OPCIONES} />
      </div>

      <div className="tarjeta">
        <h3>Qué has probado</h3>
        <Casillas etiqueta="Tratamientos que estés haciendo o hayas hecho por este dolor" ayuda="Marca todos los que apliquen."
          opciones={TRATAMIENTOS} marcadas={f.tratamientos} onAlternar={(id) => alternar('tratamientos', id)} />
        <Elegir id="seguimiento" etiqueta="¿Quién te lleva ahora mismo?" opcional valor={f.seguimiento}
          onCambio={(v) => cambiar('seguimiento', v)} opciones={SEGUIMIENTO} />
      </div>

      <div className="tarjeta">
        <h3>Lo que ya sabes sobre el dolor</h3>
        <p className="silencio">
          Esto no puntúa ni deja fuera a nadie: al revés. Si el panel entero ya supiera de dolor, diría que todo se entiende y el
          estudio no valdría. Nos hace falta gente que llegue de nuevas tanto como gente que ya haya pasado por un programa.
        </p>
        <Elegir id="educacion-previa" etiqueta="¿Alguna vez un profesional te ha explicado cómo funciona el dolor?"
          valor={f.educacion_previa} onCambio={(v) => cambiar('educacion_previa', v)} opciones={EDUCACION_PREVIA} />
        <Elegir id="lectura-propia" etiqueta="¿Lees o ves cosas por tu cuenta sobre el dolor?" opcional
          valor={f.lectura_propia} onCambio={(v) => cambiar('lectura_propia', v)} opciones={LECTURA_PROPIA} />
      </div>

      <div className="tarjeta">
        <h3>La información escrita de salud</h3>
        <p className="silencio">
          Tres preguntas cortas y muy usadas. Sirven para saber a quién le resultan claros estos textos: si solo los entiende
          quien se maneja bien con los papeles del médico, es que hay que reescribirlos.
        </p>
        {CHEW.map(([clave, pregunta, escala]) => (
          <Elegir key={clave} id={`chew-${clave}`} etiqueta={pregunta} valor={f[clave]}
            onCambio={(v) => cambiar(clave, v === '' ? '' : Number(v))} opciones={escala} />
        ))}
      </div>

      </>}

      {error && <p className="error" role="alert">{error}</p>}
      <div className="acciones">
        {paso === 2 && (
          <button className="boton fantasma" type="button" onClick={volver}>Volver</button>
        )}
        {/* Solo se apaga el botón cuando la persona de verdad NO puede participar. Apagarlo
            porque falte algo por rellenar lo dejaría muerto sin decir por qué: para eso está el
            aviso, que sí explica qué falta. */}
        <button className="boton" type="submit"
          disabled={enviando || (paso === 1 && f.duracion_dolor === 'menos_3m')}>
          {paso === 1 ? 'Seguir' : enviando ? 'Guardando…' : etiquetaBoton}
        </button>
      </div>
      {paso === 1 && (
        <p className="silencio" style={{ fontSize: '0.85rem' }}>
          En el paso siguiente se pregunta por tu dolor con más detalle. Nada se envía hasta que lo termines.
        </p>
      )}
    </form>
  )
}

// Fecha máxima/mínima admitida en el campo de nacimiento, a partir de la edad.
function limiteFecha(anios) {
  const d = new Date()
  d.setFullYear(d.getFullYear() - anios)
  return d.toISOString().slice(0, 10)
}

// Los enunciados de los instrumentos llevan **negrita** para lo que hay que leer sin falta.
function Marcado({ texto }) {
  const trozos = String(texto).split(/\*\*(.+?)\*\*/g)
  return <>{trozos.map((t, i) => (i % 2 ? <b key={i}>{t}</b> : t))}</>
}

// --- piezas del formulario de paciente ---------------------------------------

function Elegir({ id, etiqueta, opciones, valor, onCambio, opcional = false }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}{opcional && <span className="silencio"> (opcional)</span>}</label>
      <select id={id} value={valor ?? ''} onChange={(e) => onCambio(e.target.value)}>
        <option value="">— elige —</option>
        {opciones.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  )
}

function Casillas({ etiqueta, ayuda, opciones, marcadas = [], onAlternar }) {
  return (
    <div className="campo">
      <span className="rotulo">{etiqueta}</span>
      {ayuda && <p className="ayuda">{ayuda}</p>}
      <div className="casillas">
        {opciones.map(([k, v]) => (
          <label key={k} className="casilla">
            <input type="checkbox" checked={marcadas.includes(k)} onChange={() => onAlternar(k)} />
            <span>{v}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// 0-10 en botones, no en un deslizador: en móvil un slider es un suplicio y con dolor de manos
// más. Cada número es un objetivo tocable.
function Escala0a10({ id, etiqueta, izquierda, derecha, valor, onCambio }) {
  return (
    <div className="campo">
      <span className="rotulo" id={`${id}-rotulo`}>{etiqueta}</span>
      <div className="escala-0-10" role="radiogroup" aria-labelledby={`${id}-rotulo`}>
        {Array.from({ length: 11 }, (_, n) => (
          <button key={n} type="button" role="radio" aria-checked={Number(valor) === n}
            className={Number(valor) === n ? 'sel' : ''}
            onClick={() => onCambio(valor === n ? '' : n)}>{n}</button>
        ))}
      </div>
      <p className="ayuda escala-extremos"><span>0 · {izquierda}</span><span>10 · {derecha}</span></p>
    </div>
  )
}
