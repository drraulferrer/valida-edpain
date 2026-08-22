import { useEffect, useState } from 'react'
import * as api from '../lib/api.js'
import { ir } from '../App.jsx'

const DISCIPLINAS = ['fisioterapia', 'medicina de familia', 'medicina del dolor', 'rehabilitación', 'enfermería', 'psicología clínica',
  'terapia ocupacional', 'farmacia', 'docencia universitaria', 'metodología de la investigación', 'diseño instruccional', 'salud digital', 'otra']

export default function Perfil({ sesion, refrescar }) {
  const [disciplina, setDisciplina] = useState(sesion.disciplina || '')
  const [otra, setOtra] = useState('')
  const [anios, setAnios] = useState(sesion.anios || '')
  const [dominios, setDominios] = useState(sesion.dominios_competencia || [])
  const [nombres, setNombres] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    api.bloque(sesion.clave).then((b) => setNombres(b.nombres || {})).catch(() => {})
  }, [sesion.clave])

  const listaDominios = Object.keys(nombres).filter((k) => /^D\d\d$/.test(k)).sort()
  const alternar = (d) => setDominios(dominios.includes(d) ? dominios.filter((x) => x !== d) : [...dominios, d])

  const enviar = async (e) => {
    e.preventDefault()
    const disc = disciplina === 'otra' ? otra.trim() : disciplina
    if (!disc) { setError('Indica tu disciplina.'); return }
    if (!dominios.length) { setError('Marca al menos un dominio en el que te consideres competente: gobierna qué conceptos te tocan.'); return }
    setGuardando(true); setError('')
    try {
      await api.guardarPerfil(sesion.clave, disc, Number(anios) || null, dominios)
      await refrescar()
      ir('/instrucciones')
    } catch (err) { setError(err.message) } finally { setGuardando(false) }
  }

  return (
    <main className="pantalla">
      <p className="etiqueta acento">Antes de empezar · 1 de 3</p>
      <h1>Cuatro datos sobre ti</h1>
      <p className="silencio">No pedimos nombre ni correo. Esto sirve para asignarte conceptos de tu campo y para describir el panel en el informe (agregado, nunca por persona).</p>
      <form onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="disciplina">Disciplina principal</label>
          <select id="disciplina" value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
            <option value="">— elige —</option>
            {DISCIPLINAS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {disciplina === 'otra' && <input type="text" style={{ marginTop: '0.4rem' }} placeholder="¿Cuál?" value={otra} onChange={(e) => setOtra(e.target.value)} />}
        </div>
        <div className="campo">
          <label htmlFor="anios">Años de experiencia en dolor</label>
          <input id="anios" type="number" min="0" max="60" value={anios} onChange={(e) => setAnios(e.target.value)} style={{ width: '8rem' }} />
        </div>
        <div className="campo">
          <span className="rotulo">Dominios en los que te consideras competente para juzgar</span>
          <p className="ayuda" style={{ marginBottom: '0.5rem' }}>Marca solo en los que podrías discutir la evidencia con un colega. En los demás siempre podrás abstenerte concepto a concepto.</p>
          <div className="casillas">
            {listaDominios.map((d) => (
              <label key={d} className="casilla">
                <input type="checkbox" checked={dominios.includes(d)} onChange={() => alternar(d)} />
                <span>{nombres[d]}<span className="sub">{d}</span></span>
              </label>
            ))}
            {!listaDominios.length && <p className="silencio">Cargando dominios…</p>}
          </div>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="acciones">
          <button className="boton" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Seguir'}</button>
        </div>
      </form>
    </main>
  )
}
