import Texto from './Texto.jsx'
import { minutosLectura, mapasDe, apaSinEnlace, enLineaHtml } from '../lib/texto.js'
import { certeza as escalaCerteza, madurez as escalaMadurez } from '../lib/escalas.js'

// El concepto como lo lee el experto: lo imprescindible arriba, el resto desplegable.
// `nombres` traduce D11.M07 a su nombre; `completo` abre todo de entrada (dirección).
export default function Lectura({ concepto: c, nombres = {}, completo = false, paciente = false }) {
  if (!c) return null
  const dom = nombres[c.dominio] || c.dominio
  const mod = nombres[c.modulo] || c.modulo
  const mapas = mapasDe(c)

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
  const cert = escalaCerteza(c.certeza)
  const mad = escalaMadurez(c.madurez)
  return (
    <article>
      <div className="miga">
        <span>{dom}</span><span className="sep">·</span><span>{mod}</span>
        <span className="sep">·</span><span className="id" style={{ fontFamily: 'var(--mono)' }}>{c.id}</span>
        <span className="sep">·</span><span>{min} min de lectura</span>
      </div>
      <h1 className="titulo-concepto">{c.titulo}</h1>
      <div className="miga" style={{ marginBottom: '0.4rem' }}>
        {c.tipo_afirmacion && <span className="etiqueta">{c.tipo_afirmacion}</span>}
        <span className={`etiqueta ${['baja', 'muy_baja'].includes(c.certeza) ? 'aviso' : 'acento'}`}>certeza {cert.nombre}</span>
        <span className="etiqueta">madurez {c.madurez || '—'} · {mad.nombre}</span>
        {c.controversia && <span className="etiqueta aviso">controversia declarada</span>}
      </div>
      <p className="escalas">
        <b>Certeza {cert.nombre}</b>{cert.familia ? ` (escala ${cert.familia})` : ''}: {cert.descripcion}{' '}
        <b>Madurez {c.madurez || '—'}, {mad.nombre}</b>: {mad.descripcion}
      </p>

      <section className="seccion"><h3>Definición</h3><Texto md={c.definicion} mapas={mapas} /></section>
      <section className="seccion"><h3>Resumen</h3><Texto md={c.resumen} mapas={mapas} /></section>

      {c.controversia && c.nota_controversia && (
        <section className="seccion"><h3>Qué está en disputa, según el autor</h3><div className="nota-controversia"><Texto md={c.nota_controversia} mapas={mapas} /></div></section>
      )}

      <details className="plegable" open={completo}>
        <summary>Explicación profesional</summary>
        <div className="cuerpo">
          {c.exigencia_evidencia && (
            <p className="exigencia">Para una afirmación de tipo <b>{c.tipo_afirmacion}</b>, el corpus exige: <b>{c.exigencia_evidencia}</b>. Juzga la evidencia contra ese listón, no contra el de tu especialidad.</p>
          )}
          <Texto md={c.explicacion_profesional} mapas={mapas} />
        </div>
      </details>

      <details className="plegable" open={completo}>
        <summary>Puntos clave y advertencias de uso</summary>
        <div className="cuerpo">
          <Texto md={c.puntos_clave} mapas={mapas} />
          {c.advertencias && (<><h3 style={{ marginTop: '0.8rem' }}>Advertencias</h3><Texto md={c.advertencias} mapas={mapas} /></>)}
        </div>
      </details>

      <details className="plegable" open={completo}>
        <summary>Explicación para pacientes</summary>
        <div className="cuerpo"><Texto md={c.explicacion_paciente} mapas={mapas} /></div>
      </details>

      <details className="plegable" open={completo}>
        <summary>Referencias ({(c.referencias || []).length})</summary>
        <div className="cuerpo">
          {(c.referencias || []).length === 0 ? <p className="silencio">Este concepto no cita referencias.</p> : (
            <ol className="referencias">
              {c.referencias.map((r) => <Referencia key={r.id} r={r} />)}
            </ol>
          )}
        </div>
      </details>
    </article>
  )
}

function Referencia({ r }) {
  const doi = (r.doi || '').replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
  const enlace = doi ? `https://doi.org/${doi}` : (r.url || '')
  return (
    <li id={`ref-${r.id}`}>
      <span className="ref-id">{r.id}</span>
      <span dangerouslySetInnerHTML={{ __html: enLineaHtml(apaSinEnlace(r.apa)) }} />
      {enlace && <> <a className="doi" href={enlace} target="_blank" rel="noopener noreferrer">{doi ? `https://doi.org/${doi}` : enlace}</a></>}
      {r.pmid && <> · <a className="doi" href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`} target="_blank" rel="noopener noreferrer">PMID {r.pmid}</a></>}
      {r.nota_uso && <span className="nota">Nota de uso: {r.nota_uso}</span>}
    </li>
  )
}
