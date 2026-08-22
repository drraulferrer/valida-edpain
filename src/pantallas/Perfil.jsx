import { useEffect, useState } from 'react'
import * as api from '../lib/api.js'
import { ir } from '../App.jsx'
import {
  AMBITOS, AUTOEXPERTISE, DISCIPLINAS, DOLOR_PROPIO, EDAD, EDUCACION_DOLOR, ENTORNOS, ESTUDIOS, GENERO,
  PERFIL_EXPERTO_VACIO, PERFIL_PACIENTE_VACIO, PUBLICACIONES, PUBLICACIONES_EDU, TITULACIONES,
  validarPerfilExperto, validarPerfilPaciente,
} from '../lib/perfil.js'

// Se rellena una vez, antes de las instrucciones. Caracteriza el panel (CREDES) y permite
// calcular la puntuación de Fehring en la dirección; no identifica a la persona.
export default function Perfil({ sesion, refrescar }) {
  return sesion.perfil === 'paciente' ? <PerfilPaciente sesion={sesion} refrescar={refrescar} /> : <PerfilExperto sesion={sesion} refrescar={refrescar} />
}

function Consentimiento({ valor, onCambio }) {
  return (
    <div className="tarjeta">
      <h3>Información del estudio y consentimiento</h3>
      <p>Participas como panelista en un estudio de validez de contenido de una base de conocimiento sobre educación en dolor. Tus respuestas se guardan asociadas a tu código, no a tu nombre; en los informes y publicaciones el panel se describe de forma agregada (profesión, años de experiencia, titulación…), nunca persona a persona. Puedes dejarlo cuando quieras: lo ya enviado se conserva de forma anónima. Los datos se guardan en servidores de la Unión Europea y se usan solo para este estudio.</p>
      <label className="casilla">
        <input type="checkbox" checked={!!valor} onChange={(e) => onCambio(e.target.checked)} />
        <span><b>He leído la información y acepto participar en estas condiciones.</b></span>
      </label>
    </div>
  )
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
      <p className="silencio">No pedimos nombre ni correo. Estos datos describen el panel en el informe (siempre de forma agregada) y sirven para asignarte conceptos de tu campo. Son cinco minutos y se rellena una sola vez.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <FormularioExperto inicial={sesion.perfil_datos} disciplinaInicial={sesion.disciplina} aniosInicial={sesion.anios}
        dominiosInicial={sesion.dominios_competencia} nombresDominios={nombres} onEnviar={enviar} enviando={guardando} etiquetaBoton="Seguir" />
    </main>
  )
}

// El formulario del experto, reutilizable: en el perfil (con sesión) y en la convocatoria
// pública (sin sesión). `onEnviar(disciplina, anios, dominios, perfil)` recibe datos ya validados.
export function FormularioExperto({ inicial, disciplinaInicial, aniosInicial, dominiosInicial, nombresDominios = {}, onEnviar, enviando, etiquetaBoton = 'Seguir' }) {
  const previo = inicial || {}
  const [disciplina, setDisciplina] = useState(disciplinaInicial || '')
  const [otra, setOtra] = useState('')
  const [anios, setAnios] = useState(aniosInicial ?? '')
  const [dominios, setDominios] = useState(dominiosInicial || [])
  const [f, setF] = useState({ ...PERFIL_EXPERTO_VACIO, ...previo, reparto: { ...PERFIL_EXPERTO_VACIO.reparto, ...(previo.reparto || {}) } })
  const [error, setError] = useState('')

  const listaDominios = Object.keys(nombresDominios).filter((k) => /^D\d\d$/.test(k)).sort()
  const cambiar = (k, v) => setF((prev) => ({ ...prev, [k]: v }))
  const alternar = (k, v) => setF((prev) => ({ ...prev, [k]: prev[k].includes(v) ? prev[k].filter((x) => x !== v) : [...prev[k], v] }))
  const alternarDominio = (d) => setDominios((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  const reparto = (k, v) => setF((prev) => ({ ...prev, reparto: { ...prev.reparto, [k]: v } }))

  const enviar = (e) => {
    e.preventDefault()
    const disc = disciplina === 'otra' ? otra.trim() : disciplina
    const problema = validarPerfilExperto(f, disc, anios, dominios)
    if (problema) { setError(problema); window.scrollTo({ top: 0 }); return }
    setError('')
    const perfil = { ...f, anios_profesion: f.anios_profesion === '' ? null : Number(f.anios_profesion),
      reparto: Object.fromEntries(Object.entries(f.reparto).map(([k, v]) => [k, v === '' ? null : Number(v)])),
      consentimiento_en: previo.consentimiento_en || new Date().toISOString() }
    onEnviar(disc, Number(anios), dominios, perfil)
  }

  return (
    <form onSubmit={enviar}>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="tarjeta">
        <h3>1 · Formación y profesión</h3>
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
        <h3>2 · Actividad y experiencia</h3>
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
        <h3>3 · Investigación y producción</h3>
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
        <h3>4 · Cómo te ves tú</h3>
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

      <Consentimiento valor={f.consentimiento} onCambio={(v) => cambiar('consentimiento', v)} />
      <div className="acciones">
        <button className="boton" type="submit" disabled={enviando}>{enviando ? 'Guardando…' : etiquetaBoton}</button>
      </div>
    </form>
  )
}

function PerfilPaciente({ sesion, refrescar }) {
  const previo = sesion.perfil_datos || {}
  const [f, setF] = useState({ ...PERFIL_PACIENTE_VACIO, ...previo })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cambiar = (k, v) => setF((prev) => ({ ...prev, [k]: v }))

  const enviar = async (e) => {
    e.preventDefault()
    const problema = validarPerfilPaciente(f)
    if (problema) { setError(problema); window.scrollTo({ top: 0 }); return }
    setGuardando(true); setError('')
    try {
      const perfil = { ...f, anios_dolor: Number(f.anios_dolor), consentimiento_en: previo.consentimiento_en || new Date().toISOString() }
      await api.guardarPerfil(sesion.clave, 'persona con dolor', Number(f.anios_dolor), [], perfil)
      await refrescar()
      ir('/instrucciones')
    } catch (err) { setError(err.message) } finally { setGuardando(false) }
  }

  return (
    <main className="pantalla">
      <p className="etiqueta acento">Antes de empezar</p>
      <h1>Unos datos sobre ti</h1>
      <p className="silencio">No pedimos nombre ni correo. Sirven para describir al grupo de personas con dolor que ha participado, siempre en conjunto.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <form onSubmit={enviar}>
        <div className="tarjeta">
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
        <Consentimiento valor={f.consentimiento} onCambio={(v) => cambiar('consentimiento', v)} />
        {error && <p className="error" role="alert">{error}</p>}
        <div className="acciones">
          <button className="boton" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Seguir'}</button>
        </div>
      </form>
    </main>
  )
}
