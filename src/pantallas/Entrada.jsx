import { useState } from 'react'
import { DEMO, normalizarClave } from '../lib/api.js'

export default function Entrada({ onEntrar, errorInicial }) {
  const [clave, setClave] = useState('')
  const [error, setError] = useState(errorInicial || '')
  const [cargando, setCargando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    if (!clave.trim()) return
    setCargando(true); setError('')
    try { await onEntrar(clave) } catch (err) { setError(err.message) } finally { setCargando(false) }
  }

  return (
    <div className="app">
      <main className="pantalla centrada">
        <div className="tarjeta blanca" style={{ padding: '2rem 1.5rem' }}>
          <p className="etiqueta acento">Educación en Dolor · estudio de validez de contenido</p>
          <h1 style={{ marginTop: '0.75rem' }}>Hola. Gracias por estar en el panel.</h1>
          <p className="silencio">Escribe la clave que te ha enviado la dirección editorial. Son tres grupos de cuatro letras y números. No hace falta cuenta ni contraseña: la clave es tu acceso y tu anonimato.</p>
          <form onSubmit={enviar}>
            <div className="campo">
              <label htmlFor="clave" className="oculto-visual">Clave de acceso</label>
              <input id="clave" className="clave" type="text" autoComplete="off" autoCapitalize="off" spellCheck="false"
                inputMode="text" placeholder="xxxx-xxxx-xxxx" value={clave}
                onChange={(e) => setClave(e.target.value)} onBlur={() => setClave(normalizarClave(clave))} autoFocus />
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="acciones">
              <button className="boton" type="submit" disabled={cargando || !clave.trim()}>{cargando ? 'Entrando…' : 'Entrar'}</button>
              <a className="boton fantasma" href="#/direccion">Dirección editorial</a>
            </div>
          </form>
          {DEMO && (
            <p className="silencio" style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
              Modo demostración. Claves: <code>demo-expe-rto1</code> (experto) · <code>demo-paci-ent1</code> (paciente) · <code>demo-dire-cci1</code> (dirección).
            </p>
          )}
        </div>
        <p className="silencio" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
          Tus respuestas se guardan solas a cada paso. Puedes cerrar y volver cuando quieras con la misma clave.
        </p>
      </main>
    </div>
  )
}
