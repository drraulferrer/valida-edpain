import { useMemo } from 'react'
import { scvi, tasaValidez } from '../../lib/metricas.js'
import { CLASES, ESTRATOS, NOMBRE_CLASE, Sem, Vacio, contar, entradasCatalogo, fecha, media, n2, pct } from './comun.jsx'

const EVENTOS_VISIBLES = 15

function resumir(datos, clases, dimsExpertas) {
  const { estudio, conceptos, valoraciones, panelistas, catalogo } = datos
  const ronda = estudio.ronda_actual
  const minimoPanel = estudio.umbrales?.minimo_panel ?? 5
  const activos = (conceptos || []).filter((c) => c.activo !== false)
  const clasif = (c) => clases.get(c.id)

  const porEstrato = Object.fromEntries(ESTRATOS.map((e) => [e, contar(activos, (c) => (c.estratos || []).includes(e))]))
  const juecesMedia = media(activos.map((c) => c.jueces || 0))
  const pocosJueces = contar(activos, (c) => (c.jueces || 0) < minimoPanel)
  const completas = contar(valoraciones, (v) => v.completa && v.ronda === ronda)
  const asignadas = (panelistas || []).reduce((s, p) => s + (p.asignadas || 0), 0)
  const activosExperto = contar(panelistas, (p) => p.activo && p.perfil === 'experto')
  const activosPaciente = contar(panelistas, (p) => p.activo && p.perfil === 'paciente')

  const todas = activos.map(clasif).filter(Boolean)
  const aleatorio = activos.filter((c) => (c.estratos || []).includes('aleatorio')).map(clasif).filter(Boolean)
  const tasa = tasaValidez(aleatorio)
  const porClase = Object.fromEntries(CLASES.map((k) => [k, contar(todas, (x) => x.clase === k)]))
  const s = scvi(todas, dimsExpertas)

  const valoradosIds = new Set(valoraciones.filter((v) => v.completa && v.ronda === ronda).map((v) => v.concepto_id))
  const dominios = entradasCatalogo(catalogo, 'dominio')
    .map(([id, d]) => {
      const cs = activos.filter((c) => c.dominio === id)
      const ks = cs.map(clasif).filter(Boolean)
      return {
        id, nombre: d.nombre, incluidos: cs.length,
        valorados: contar(cs, (c) => valoradosIds.has(c.id)),
        validos: contar(ks, (k) => k.clase === 'valido'),
        revisar: contar(ks, (k) => k.clase === 'revisar'),
        partidos: contar(ks, (k) => k.clase === 'partido'),
        bloqueados: contar(ks, (k) => k.clase === 'bloqueado'),
      }
    })
    .filter((d) => d.incluidos > 0)

  return { activos: activos.length, porEstrato, juecesMedia, pocosJueces, minimoPanel, completas, asignadas,
    activosExperto, activosPaciente, tasa, porClase, scvi: s, dominios }
}

export default function Resumen({ datos, clases, dimsExpertas }) {
  const r = useMemo(() => resumir(datos, clases, dimsExpertas), [datos, clases, dimsExpertas])
  const { estudio, eventos_recientes } = datos
  const nombreDim = Object.fromEntries((estudio.dimensiones || []).map((d) => [d.clave, d.nombre]))
  const umbralScvi = estudio.umbrales?.scvi_ave ?? 0.9
  const eventos = (eventos_recientes || []).slice(0, EVENTOS_VISIBLES)

  return (
    <section>
      <div className="kpis">
        <div className="kpi">
          <div className="v">{r.activos}</div>
          <div className="l">Conceptos en plataforma</div>
          <div className="s">aleatorio {r.porEstrato.aleatorio} · controversia {r.porEstrato.controversia} · cribado {r.porEstrato.cribado}</div>
        </div>
        <div className="kpi">
          <div className="v">{r.juecesMedia == null ? '—' : r.juecesMedia.toFixed(1)}</div>
          <div className="l">Jueces por concepto</div>
          <div className="s">{r.pocosJueces} con menos de {r.minimoPanel} expertos asignados</div>
        </div>
        <div className="kpi">
          <div className="v">{r.asignadas ? pct(r.completas / r.asignadas) : '—'}</div>
          <div className="l">Valoraciones completas</div>
          <div className="s">{r.completas} de {r.asignadas} asignadas · ronda {estudio.ronda_actual}</div>
        </div>
        <div className="kpi">
          <div className="v">{r.activosExperto + r.activosPaciente}</div>
          <div className="l">Panelistas activos</div>
          <div className="s">experto {r.activosExperto} · paciente {r.activosPaciente}</div>
        </div>
        <div className="kpi">
          <div className="v">{pct(r.tasa.p)}</div>
          <div className="l">Tasa de validez · aleatorio</div>
          <div className="s">
            {r.tasa.ic ? `IC 95 % ${pct(r.tasa.ic[0])} – ${pct(r.tasa.ic[1])} · ${r.tasa.k} de ${r.tasa.n} decididos` : 'sin conceptos decididos'}
          </div>
        </div>
      </div>

      <div className="tarjeta">
        <h3>Clasificación en la ronda {estudio.ronda_actual}</h3>
        <div className="acciones" style={{ marginTop: 0 }}>
          {CLASES.map((k) => (
            <Sem key={k} clase={k}>{NOMBRE_CLASE[k]} · {r.porClase[k]}</Sem>
          ))}
        </div>
        <h3 style={{ marginTop: '1rem' }}>S-CVI/Ave por dimensión</h3>
        <div className="cuadricula-celdas">
          {dimsExpertas.map((d) => {
            const x = r.scvi[d]
            const bien = x?.ave != null && x.ave >= umbralScvi
            return (
              <div key={d} className="celda" title={`Media de los I-CVI de ${x?.n ?? 0} conceptos con panel suficiente`}>
                <b>{n2(x?.ave)}</b>
                {nombreDim[d] || d}
                {x?.ave != null && <span className={`etiqueta ${bien ? 'ok' : 'aviso'}`} style={{ marginLeft: '0.4rem' }}>{bien ? 'supera' : `< ${umbralScvi}`}</span>}
              </div>
            )
          })}
        </div>
      </div>

      <h3>Por dominio</h3>
      {r.dominios.length === 0 ? <Vacio>No hay conceptos en plataforma.</Vacio> : (
        <div className="tabla-env">
          <table className="tabla">
            <thead>
              <tr>
                <th>Dominio</th><th className="num">Incluidos</th><th className="num">Valorados</th>
                <th className="num">Válidos</th><th className="num">Revisar</th><th className="num">Partidos</th><th className="num">Bloqueados</th>
              </tr>
            </thead>
            <tbody>
              {r.dominios.map((d) => (
                <tr key={d.id}>
                  <td><span style={{ fontFamily: 'var(--mono)', fontSize: '0.8em', color: 'var(--tinta-3)' }}>{d.id}</span> {d.nombre}</td>
                  <td className="num">{d.incluidos}</td>
                  <td className="num">{d.valorados}</td>
                  <td className="num">{d.validos}</td>
                  <td className="num">{d.revisar}</td>
                  <td className="num">{d.partidos}</td>
                  <td className="num">{d.bloqueados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ marginTop: '1.5rem' }}>Actividad reciente</h3>
      {eventos.length === 0 ? <Vacio>Sin actividad registrada todavía.</Vacio> : (
        <div className="tabla-env">
          <table className="tabla">
            <thead><tr><th>Tipo</th><th>Cuándo</th><th>Detalle</th></tr></thead>
            <tbody>
              {eventos.map((e, i) => (
                <tr key={`${e.en}-${i}`}>
                  <td>{e.tipo}</td>
                  <td>{fecha(e.en)}</td>
                  <td className="silencio">{typeof e.detalle === 'string' ? e.detalle : e.detalle ? JSON.stringify(e.detalle) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
