import { useEffect, useState } from 'react'
import * as api from '../lib/api.js'
import Likert from '../componentes/Likert.jsx'
import { ir } from '../App.jsx'
import { siguientePendiente } from './Bloque.jsx'

// Exhaustividad: la pregunta que no se puede hacer por concepto.
export default function FinModulo({ sesion, modulo }) {
  const [bloque, setBloque] = useState(null)
  const [exh, setExh] = useState(null)
  const [falta, setFalta] = useState('')
  const [sobra, setSobra] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    api.bloque(sesion.clave).then((b) => {
      setBloque(b)
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

  if (!bloque) return <main className="pantalla"><p className="silencio">Cargando…</p></main>
  const nombre = bloque.nombres[modulo] || modulo
  const titulos = bloque.items.filter((x) => x.modulo === modulo).map((x) => x.titulo)

  return (
    <main className="pantalla">
      <p className="etiqueta acento">Fin del módulo</p>
      <h1>{nombre}</h1>
      <p className="silencio">Has visto {titulos.length} {titulos.length === 1 ? 'concepto' : 'conceptos'} de este módulo (son los que te tocaron del sorteo, no todos los del módulo). Ahora una pregunta sobre el conjunto.</p>
      <details className="plegable"><summary>Los que has visto</summary><div className="cuerpo"><ul className="lectura" style={{ fontSize: '1rem' }}>{titulos.map((t) => <li key={t}>{t}</li>)}</ul></div></details>
      <form onSubmit={enviar}>
        <div className="dimension">
          <div className="nombre">Exhaustividad</div>
          <p className="afirmacion">En este módulo no falta ningún concepto que una persona formada en dolor esperaría encontrar.</p>
          <p className="ayuda">Piensa en lo que NO has leído. Es la única pregunta que puede detectar lo que no está escrito.</p>
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
