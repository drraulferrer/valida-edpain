import { useEffect, useState } from 'react'
import * as api from '../lib/api.js'
import Likert from '../componentes/Likert.jsx'
import { ir } from '../App.jsx'
import { siguientePendiente } from './Bloque.jsx'

// Exhaustividad: la pregunta que no se puede hacer por concepto. Con uno o dos conceptos
// muestreados no se puede juzgar un módulo, así que aquí se enseña el módulo ENTERO —su
// nombre, su foco y todos sus títulos—, marcando los que el panelista ha valorado.
export default function FinModulo({ sesion, modulo }) {
  const [bloque, setBloque] = useState(null)
  const [mod, setMod] = useState(null)
  const [exh, setExh] = useState(null)
  const [falta, setFalta] = useState('')
  const [sobra, setSobra] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    Promise.all([api.bloque(sesion.clave), api.modulo(sesion.clave, modulo)]).then(([b, m]) => {
      setBloque(b); setMod(m)
      const previa = (b.cobertura || []).find((c) => c.modulo === modulo)
      if (previa) { setExh(previa.exhaustividad); setFalta(previa.falta || ''); setSobra(previa.sobra || '') }
    }).catch((e) => setError(e.message))
  }, [sesion.clave, modulo])

  const enviar = async (e) => {
    e.preventDefault()
    if (!exh) { setError('Elige un valor de 1 a 4.'); return }
    if (exh <= 2 && !falta.trim()) { setError('Con 1 o 2, di qué falta: es lo que nadie más puede ver.'); return }
    setGuardando(true); setError('')
    try {
      await api.cobertura(sesion.clave, modulo, exh, falta.trim() || null, sobra.trim() || null)
      const sig = siguientePendiente(bloque.items)
      ir(sig ? `/c/${encodeURIComponent(sig.id)}` : '/bloque')
    } catch (err) { setError(err.message) } finally { setGuardando(false) }
  }

  if (error && !mod) return <main className="pantalla"><p className="error">{error}</p><a className="boton secundario" href="#/bloque">Volver al bloque</a></main>
  if (!bloque || !mod) return <main className="pantalla"><p className="silencio">Cargando el módulo…</p></main>

  const todos = mod.conceptos || []
  const valorados = todos.filter((c) => c.en_tu_bloque).length

  return (
    <main className="pantalla">
      <p className="etiqueta acento">Fin del módulo · {mod.dominio_nombre || mod.dominio}</p>
      <h1>{mod.nombre}</h1>
      {mod.foco && <p className="lectura" style={{ fontSize: '1.05rem' }}>{mod.foco}</p>}
      <p className="silencio">Este módulo tiene {todos.length} {todos.length === 1 ? 'concepto' : 'conceptos'}; has valorado {valorados} (marcados). Lee la lista entera de títulos y contesta sobre el conjunto, no solo sobre los que te han tocado.</p>

      <section className="modulo-bloque">
        <ol className="lista-titulos">
          {todos.map((c) => (
            <li key={c.id} className={c.en_tu_bloque ? 'valorado' : ''}>
              <span className="est" aria-hidden="true">{c.en_tu_bloque ? '✓' : ''}</span>
              <span className="t">{c.titulo}</span>
              {c.en_tu_bloque && <span className="oculto-visual"> (valorado por ti)</span>}
            </li>
          ))}
          {!todos.length && <li className="silencio">No hay lista de títulos para este módulo.</li>}
        </ol>
      </section>

      <form onSubmit={enviar}>
        <div className="dimension">
          <div className="nombre">Exhaustividad</div>
          <p className="afirmacion">En este módulo no falta ningún concepto que una persona formada en dolor esperaría encontrar.</p>
          <p className="ayuda">Piensa en lo que NO está en la lista. Es la única pregunta que puede detectar lo que no está escrito.</p>
          <Likert nombre="Exhaustividad" valor={exh} onCambio={setExh} />
        </div>
        <div className="campo">
          <label htmlFor="falta">¿Qué falta? <span className="silencio">{exh && exh <= 2 ? '(obligatorio con 1 o 2)' : '(opcional)'}</span></label>
          <textarea id="falta" value={falta} onChange={(e) => setFalta(e.target.value)} placeholder="Un concepto, una idea, una controversia que debería estar y no está." />
        </div>
        <div className="campo">
          <label htmlFor="sobra">¿Qué sobra o está repetido? <span className="silencio">(opcional)</span></label>
          <textarea id="sobra" value={sobra} onChange={(e) => setSobra(e.target.value)} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="acciones">
          <button className="boton" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar y seguir'}</button>
          <a className="boton fantasma" href="#/bloque">Volver al bloque</a>
        </div>
      </form>
    </main>
  )
}
