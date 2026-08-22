import Texto from './Texto.jsx'
import { minutosLectura } from '../lib/texto.js'

export const CERTEZAS = { consenso: 'consenso', alta: 'alta', moderada: 'moderada', baja: 'baja', muy_baja: 'muy baja', no_aplica: 'no aplica' }

// El concepto como lo lee el experto: lo imprescindible arriba, el resto desplegable.
// `nombres` traduce D11.M07 a su nombre; `completo` abre todo de entrada (dirección).
export default function Lectura({ concepto: c, nombres = {}, completo = false, paciente = false }) {
  if (!c) return null
  const dom = nombres[c.dominio] || c.dominio
  const mod = nombres[c.modulo] || c.modulo

  if (paciente) {
    return (
      <article>
        <div className="miga"><span>{dom}</span><span className="sep">·</span><span>{mod}</span></div>
        <h1 className="titulo-concepto">{c.titulo}</h1>
        <Texto md={c.explicacion_paciente} />
      </article>
    )
  }

  const min = minutosLectura(c.definicion, c.resumen, c.explicacion_profesional, c.puntos_clave, c.advertencias)
  return (
    <article>
      <div className="miga">
        <span>{dom}</span><span className="sep">·</span><span>{mod}</span>
        <span className="sep">·</span><span className="id" style={{ fontFamily: 'var(--mono)' }}>{c.id}</span>
        <span className="sep">·</span><span>{min} min de lectura</span>
      </div>
      <h1 className="titulo-concepto">{c.titulo}</h1>
      <div className="miga" style={{ marginBottom: '1rem' }}>
        {c.tipo_afirmacion && <span className="etiqueta">{c.tipo_afirmacion}</span>}
        {c.certeza && <span className={`etiqueta ${['baja', 'muy_baja'].includes(c.certeza) ? 'aviso' : 'acento'}`}>certeza {CERTEZAS[c.certeza] || c.certeza}</span>}
        {c.controversia && <span className="etiqueta aviso">controversia declarada</span>}
      </div>

      <section className="seccion"><h3>Definición</h3><Texto md={c.definicion} /></section>
      <section className="seccion"><h3>Resumen</h3><Texto md={c.resumen} /></section>

      {c.controversia && c.nota_controversia && (
        <section className="seccion"><h3>Qué está en disputa, según el autor</h3><p className="nota-controversia">{c.nota_controversia}</p></section>
      )}

      <details className="plegable" open={completo}>
        <summary>Explicación profesional</summary>
        <div className="cuerpo">
          {c.exigencia_evidencia && (
            <p className="exigencia">Para una afirmación de tipo <b>{c.tipo_afirmacion}</b>, el corpus exige: <b>{c.exigencia_evidencia}</b>. Juzga la evidencia contra ese listón, no contra el de tu especialidad.</p>
          )}
          <Texto md={c.explicacion_profesional} />
        </div>
      </details>

      <details className="plegable" open={completo}>
        <summary>Puntos clave y advertencias de uso</summary>
        <div className="cuerpo">
          <Texto md={c.puntos_clave} />
          {c.advertencias && (<><h3 style={{ marginTop: '0.8rem' }}>Advertencias</h3><Texto md={c.advertencias} /></>)}
        </div>
      </details>

      <details className="plegable" open={completo}>
        <summary>Explicación para pacientes</summary>
        <div className="cuerpo"><Texto md={c.explicacion_paciente} /></div>
      </details>

      <details className="plegable" open={completo}>
        <summary>Referencias ({(c.referencias || []).length})</summary>
        <div className="cuerpo">
          {(c.referencias || []).length === 0 ? <p className="silencio">Este concepto no cita referencias.</p> : (
            <ol className="referencias">
              {c.referencias.map((r) => (
                <li key={r.id} id={`ref-${r.id}`}>
                  <span className="ref-id">{r.id}</span>{r.apa}
                  {r.nota_uso && <span className="nota">Nota de uso: {r.nota_uso}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </details>
    </article>
  )
}
