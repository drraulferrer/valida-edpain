import { useEffect, useState } from 'react'
import * as api from '../lib/api.js'
import { ir } from '../App.jsx'
import HojaInformacion from '../componentes/HojaInformacion.jsx'
import {
  AMBITOS, AUTOEXPERTISE, DISCIPLINAS, DOLOR_PROPIO, EDAD, EDUCACION_DOLOR, ENTORNOS, ESTUDIOS, GENERO,
  IDENTIDAD_VACIA, PERFIL_EXPERTO_VACIO, PERFIL_PACIENTE_VACIO, PUBLICACIONES, PUBLICACIONES_EDU, TITULACIONES,
  prepararPerfil, validarPerfilExperto, validarPerfilPaciente,
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
    <form onSubmit={enviar}>
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
  const [f, setF] = useState({ ...PERFIL_PACIENTE_VACIO, ...previo, identidad: { ...IDENTIDAD_VACIA, ...(previo.identidad || {}) } })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cambiar = (k, v) => setF((prev) => ({ ...prev, [k]: v }))
  const ident = (k, v) => setF((prev) => ({ ...prev, identidad: { ...prev.identidad, [k]: v } }))
  const grupo = sesion.estudio?.grupo_autoria || 'Grupo del Estudio EdPain'

  const enviar = async (e) => {
    e.preventDefault()
    const problema = validarPerfilPaciente(f)
    if (problema) { setError(problema); window.scrollTo({ top: 0 }); return }
    setGuardando(true); setError('')
    try {
      await api.guardarPerfil(sesion.clave, 'persona con dolor', Number(f.anios_dolor),
        [], prepararPerfil({ ...f, anios_dolor: Number(f.anios_dolor) }, previo))
      await refrescar()
      ir('/instrucciones')
    } catch (err) { setError(err.message) } finally { setGuardando(false) }
  }

  return (
    <main className="pantalla">
      <p className="etiqueta acento">Antes de empezar</p>
      <h1>Unos datos sobre ti</h1>
      <p className="silencio">Sirven para describir al grupo de personas con dolor que ha participado, siempre en conjunto, y para avisarte de cada ronda.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <form onSubmit={enviar}>
        <div className="tarjeta">
          <h3>Cómo te llamamos</h3>
          <p className="destacado-oro">Si completas <b>todas las rondas</b>, se te reconocerá como miembro del <b>{grupo}</b> en las publicaciones, con tu nombre y apellidos. Si prefieres no figurar, dínoslo y no aparecerás.</p>
          <div className="panel-dos">
            <div className="campo">
              <label htmlFor="pac-nombre">Nombre</label>
              <input id="pac-nombre" type="text" autoComplete="given-name" value={f.identidad.nombre} onChange={(e) => ident('nombre', e.target.value)} required />
            </div>
            <div className="campo">
              <label htmlFor="pac-apellidos">Apellidos</label>
              <input id="pac-apellidos" type="text" autoComplete="family-name" value={f.identidad.apellidos} onChange={(e) => ident('apellidos', e.target.value)} required />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="pac-email">Correo de contacto</label>
            <input id="pac-email" type="email" autoComplete="email" value={f.identidad.email} onChange={(e) => ident('email', e.target.value)} required />
            <p className="ayuda">Solo para avisarte cuando haya textos nuevos que leer. No se publica ni se cede a nadie.</p>
          </div>
        </div>
        <div className="tarjeta">
          <h3>Sobre tu dolor</h3>
          <div className="panel-dos">
            <div className="campo">
              <label htmlFor="edad">Edad</label>
              <select id="edad" value={f.edad} onChange={(e) => cambiar('edad', e.target.value)}>
                <option value="">— elige —</option>
                {EDAD.map((k) => <option key={k} value={k}>{k} años</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="genero">Género <span className="silencio">(opcional)</span></label>
              <select id="genero" value={f.genero} onChange={(e) => cambiar('genero', e.target.value)}>
                <option value="">— elige —</option>
                {GENERO.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="anios-dolor">Años que llevas con dolor</label>
              <input id="anios-dolor" type="number" min="0" max="90" value={f.anios_dolor} onChange={(e) => cambiar('anios_dolor', e.target.value)} style={{ width: '8rem' }} />
            </div>
            <div className="campo">
              <label htmlFor="estudios">Estudios <span className="silencio">(opcional)</span></label>
              <select id="estudios" value={f.estudios} onChange={(e) => cambiar('estudios', e.target.value)}>
                <option value="">— elige —</option>
                {ESTUDIOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="campo">
            <label htmlFor="diagnostico">Tu dolor, en tus palabras <span className="silencio">(opcional: dónde, desde cuándo, qué te han dicho que es)</span></label>
            <textarea id="diagnostico" value={f.diagnostico} onChange={(e) => cambiar('diagnostico', e.target.value)} />
          </div>
          <label className="casilla">
            <input type="checkbox" checked={!!f.educacion_previa} onChange={(e) => cambiar('educacion_previa', e.target.checked)} />
            <span>Alguna vez un profesional me ha explicado cómo funciona el dolor (educación en dolor)</span>
          </label>
        </div>
        <HojaInformacion estudio={sesion.estudio} perfil="paciente" valor={f.consentimiento} onCambio={(v) => cambiar('consentimiento', v)} />
        {error && <p className="error" role="alert">{error}</p>}
        <div className="acciones">
          <button className="boton" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar y seguir'}</button>
        </div>
      </form>
    </main>
  )
}
