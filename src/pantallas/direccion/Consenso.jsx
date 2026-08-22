import { useMemo, useState } from 'react'
import * as api from '../../lib/api.js'
import ConsensoDetalle from './ConsensoDetalle.jsx'
import { CLASES, ESTRATOS, NOMBRE_CLASE, Sem, Vacio, aCsv, descargar, entradasCatalogo, hoyIso, n2, pct } from './comun.jsx'

const FILTROS_INICIALES = { clase: '', dominio: '', estrato: '', dimension: '', texto: '' }

function filtrar(conceptos, clases, f) {
  const texto = f.texto.trim().toLowerCase()
  const filas = (conceptos || [])
    .filter((c) => c.activo !== false)
    .map((c) => ({ c, k: clases.get(c.id) }))
    .filter(({ c, k }) => {
      if (f.clase && k?.clase !== f.clase) return false
      if (f.dominio && c.dominio !== f.dominio) return false
      if (f.estrato && !(c.estratos || []).includes(f.estrato)) return false
      if (texto && !(c.id.toLowerCase().includes(texto) || (c.titulo || '').toLowerCase().includes(texto))) return false
      return true
    })
  if (!f.dimension) return filas
  const valor = (x) => { const i = x.k?.por_dimension?.[f.dimension]?.icvi; return i == null ? Infinity : i }
  return [...filas].sort((a, b) => valor(a) - valor(b) || a.c.id.localeCompare(b.c.id))
}

function filasCsv(valoraciones, dims) {
  return (valoraciones || []).map((v) => ({
    id: v.id, concepto_id: v.concepto_id, panelista: v.panelista, perfil: v.perfil, ronda: v.ronda,
    completa: v.completa ? 1 : 0, abstencion: v.abstencion ? 1 : 0, motivo_abstencion: v.motivo_abstencion || '',
    ...Object.fromEntries(dims.map((d) => [`p_${d}`, v.puntuaciones?.[d] ?? ''])),
    banderas: Object.keys(v.banderas || {}).length ? v.banderas : '',
    comentario: v.comentario || '',
    n_ajustes: (v.ajustes || []).length, ajustes: (v.ajustes || []).length ? v.ajustes : '',
    paciente_comprension: v.paciente?.comprension || '', paciente_efecto: v.paciente?.efecto || '',
    paciente_vetos: (v.paciente?.vetos || []).join(' | '),
    tiempo_ms: v.tiempo_ms ?? '', actualizada_en: v.actualizada_en || '',
  }))
}

export default function Consenso({ datos, clave, clases, nombres, dimsExpertas, recargar }) {
  const { estudio, conceptos, valoraciones } = datos
  const [f, setF] = useState(FILTROS_INICIALES)
  const [seleccionado, setSeleccionado] = useState(null)
  const [seleccionRonda, setSeleccionRonda] = useState(() =>
    (conceptos || []).filter((c) => clases.get(c.id)?.clase === 'revisar').map((c) => c.id))
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const filas = useMemo(() => filtrar(conceptos, clases, f), [conceptos, clases, f])
  const nombreDim = Object.fromEntries((estudio.dimensiones || []).map((d) => [d.clave, d.nombre]))
  const dominios = entradasCatalogo(datos.catalogo, 'dominio').filter(([id]) => (conceptos || []).some((c) => c.dominio === id))
  const cambiar = (k, v) => setF((prev) => ({ ...prev, [k]: v }))
  const cerrado = !!estudio.cerrado_en

  const exportarJson = () => {
    const cuerpo = JSON.stringify({ exportado_en: new Date().toISOString(), ...datos, clasificaciones: Object.fromEntries(clases) }, null, 2)
    if (!descargar(`valida-export-${hoyIso()}.json`, cuerpo, 'application/json')) setError('El navegador no ha permitido la descarga.')
  }
  const exportarCsv = () => {
    const dims = (estudio.dimensiones || []).map((d) => d.clave)
    const filasCsvTodas = filasCsv(valoraciones, dims)
    const columnas = filasCsvTodas.length ? Object.keys(filasCsvTodas[0]) : ['id']
    if (!descargar(`valida-valoraciones-${hoyIso()}.csv`, aCsv(filasCsvTodas, columnas), 'text/csv')) setError('El navegador no ha permitido la descarga.')
  }

  const alternarRonda = (id) => setSeleccionRonda((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const abrirRonda = async () => {
    const siguiente = estudio.ronda_actual + 1
    if (!window.confirm(`¿Abrir la ronda ${siguiente} con ${seleccionRonda.length} conceptos? Los mismos jueces volverán a verlos con el histograma del grupo.`)) return
    setOcupado(true)
    setError('')
    setMensaje('')
    try {
      const r = await api.dirRonda(clave, seleccionRonda)
      setMensaje(`Ronda ${r?.ronda ?? siguiente} abierta con ${r?.asignaciones ?? 0} asignaciones.`)
      setSeleccionRonda([])
      await recargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado(false)
    }
  }

  const detalle = seleccionado ? (conceptos || []).find((c) => c.id === seleccionado) : null

  return (
    <section>
      <div className="filtros">
        <label><span className="oculto-visual">Clase</span>
          <select value={f.clase} onChange={(e) => cambiar('clase', e.target.value)}>
            <option value="">todas las clases</option>
            {CLASES.map((k) => <option key={k} value={k}>{NOMBRE_CLASE[k]}</option>)}
          </select>
        </label>
        <label><span className="oculto-visual">Dominio</span>
          <select value={f.dominio} onChange={(e) => cambiar('dominio', e.target.value)}>
            <option value="">todos los dominios</option>
            {dominios.map(([id, d]) => <option key={id} value={id}>{id} · {d.nombre}</option>)}
          </select>
        </label>
        <label><span className="oculto-visual">Estrato</span>
          <select value={f.estrato} onChange={(e) => cambiar('estrato', e.target.value)}>
            <option value="">todos los estratos</option>
            {ESTRATOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label><span className="oculto-visual">Ordenar por dimensión</span>
          <select value={f.dimension} onChange={(e) => cambiar('dimension', e.target.value)}>
            <option value="">orden por id</option>
            {dimsExpertas.map((d) => <option key={d} value={d}>I-CVI de {nombreDim[d] || d} ascendente</option>)}
          </select>
        </label>
        <label><span className="oculto-visual">Buscar</span>
          <input type="text" placeholder="Buscar por título o id" value={f.texto} onChange={(e) => cambiar('texto', e.target.value)} />
        </label>
        <span className="relleno" />
        <button type="button" className="boton secundario pequeno" onClick={exportarJson}>Exportar JSON</button>
        <button type="button" className="boton secundario pequeno" onClick={exportarCsv}>Exportar CSV</button>
      </div>
      {mensaje && <p className="ok-caja" role="status">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {filas.length === 0 ? <Vacio>Ningún concepto cumple los filtros.</Vacio> : (
        <div className="tabla-env">
          <table className="tabla">
            <thead>
              <tr>
                <th>Id</th><th>Título</th><th>Dominio</th><th>Estratos</th><th className="num">n</th>
                {dimsExpertas.map((d) => <th key={d} className="num">{nombreDim[d] || d}</th>)}
                <th>Paciente</th><th>Clase</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ c, k }) => (
                <tr key={c.id} className="clic" onClick={() => setSeleccionado(seleccionado === c.id ? null : c.id)} aria-selected={seleccionado === c.id}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.85em' }}>{c.id}</td>
                  <td>{c.titulo}{c.cambiado && <span className="etiqueta aviso" style={{ marginLeft: '0.3rem' }}>cambiado</span>}</td>
                  <td>{nombres[c.dominio] || c.dominio}</td>
                  <td>{(c.estratos || []).map((e) => <span key={e} className={`etiqueta ${e === 'aleatorio' ? '' : e === 'controversia' ? 'aviso' : 'morado'}`} style={{ marginRight: '0.2rem' }}>{e}</span>)}</td>
                  <td className="num">{k?.n ?? 0}</td>
                  {dimsExpertas.map((d) => <CeldaDimension key={d} d={k?.por_dimension?.[d]} />)}
                  <td>{k?.paciente?.n ? `${pct(k.paciente.comprension)} · ${k.paciente.vetos.length} vetos` : <span className="silencio">—</span>}</td>
                  <td><Sem clase={k?.clase} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detalle && (
        <ConsensoDetalle concepto={detalle} clasif={clases.get(detalle.id)} dimensiones={estudio.dimensiones || []}
          dimsExpertas={dimsExpertas} nombres={nombres} clave={clave}
          valoraciones={(valoraciones || []).filter((v) => v.concepto_id === detalle.id)}
          onCerrar={() => setSeleccionado(null)} />
      )}

      <div className="tarjeta" style={{ marginTop: '1.5rem' }}>
        <h3>Segunda ronda</h3>
        <p className="silencio">
          Van a ronda los conceptos «revisar», reescritos con las redacciones recibidas. Partidos y bloqueados van al comité, no a otra ronda.
          Preseleccionados los «revisar»; la lista sigue los filtros de arriba.
        </p>
        <div className="casillas lista-scroll">
          {filas.map(({ c, k }) => (
            <label key={c.id} className="casilla">
              <input type="checkbox" checked={seleccionRonda.includes(c.id)} onChange={() => alternarRonda(c.id)} disabled={cerrado} />
              <span><span style={{ fontFamily: 'var(--mono)', fontSize: '0.8em' }}>{c.id}</span> · {NOMBRE_CLASE[k?.clase] || 'pendiente'}<span className="sub">{c.titulo}</span></span>
            </label>
          ))}
        </div>
        <div className="acciones">
          <button type="button" className="boton" disabled={cerrado || ocupado || seleccionRonda.length === 0} onClick={abrirRonda}>
            {ocupado ? 'Abriendo…' : `Abrir ronda ${estudio.ronda_actual + 1} con los seleccionados`}
          </button>
          <span className="silencio">{seleccionRonda.length} seleccionados{cerrado ? ' · el estudio está cerrado' : ''}</span>
        </div>
      </div>
    </section>
  )
}

function CeldaDimension({ d }) {
  if (!d || !d.n) return <td className="num"><span className="sem pendiente">—</span></td>
  const clase = d.insuficiente ? 'insuficiente' : d.supera ? 'valido' : 'revisar'
  const titulo = `I-CVI ${n2(d.icvi)} (umbral ${n2(d.umbral_icvi)}) · kappa* ${n2(d.kappa)} · V ${n2(d.V)} IC [${n2(d.ic?.[0])}, ${n2(d.ic?.[1])}]${d.discrepan ? ' · I-CVI y V discrepan' : ''}`
  return (
    <td className="num">
      <Sem clase={clase} title={titulo}>{n2(d.icvi)}</Sem>
      <div className="sub-metrica">V {n2(d.V)} · IC {n2(d.ic?.[0])}{d.discrepan ? ' ≠' : ''}</div>
    </td>
  )
}
