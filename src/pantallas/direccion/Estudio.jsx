import { useState } from 'react'
import * as api from '../../lib/api.js'
import { aikenMinimaParaIc } from '../../lib/metricas.js'
import { fecha, n2 } from './comun.jsx'

const CAMPOS_EDITABLES = ['nombre', 'corpus_commit', 'fraccion', 'suelo', 'k_jueces', 'k_paciente', 'capacidad', 'capacidad_paciente', 'notas']
const NUMERICOS = ['fraccion', 'suelo', 'k_jueces', 'k_paciente', 'capacidad', 'capacidad_paciente']
const N_AIKEN = [5, 6, 7, 8, 9, 10, 11, 12]
const CATEGORIAS = 4

const NOMBRE_UMBRAL = {
  icvi_n_pequeno: 'I-CVI exigido con n pequeño',
  icvi_n_grande: 'I-CVI exigido con n grande',
  n_corte_icvi: 'n a partir del cual se aplica el umbral grande',
  aiken: 'V de Aiken mínima (V y límite inferior del IC)',
  exigir_ic: 'Exigir el IC 95 % de la V',
  minimo_panel: 'Jueces válidos mínimos para clasificar',
  desacuerdo: 'Proporción en cada extremo que declara panel partido',
  scvi_ave: 'S-CVI/Ave mínimo por módulo y dominio',
  paciente_comprension: 'Proporción «se entiende» mínima del panel de paciente',
  minimo_paciente: 'Pacientes mínimos por concepto',
  estable_v: 'Variación de V entre rondas que se considera estable',
  rondas_max: 'Rondas máximas',
}

function formularioDe(estudio) {
  return Object.fromEntries(CAMPOS_EDITABLES.map((k) => [k, estudio[k] == null ? '' : String(estudio[k])]))
}

function aDatos(f) {
  return Object.fromEntries(CAMPOS_EDITABLES.map((k) => {
    if (NUMERICOS.includes(k)) return [k, f[k] === '' ? null : Number(f[k])]
    return [k, f[k].trim() === '' ? null : f[k].trim()]
  }))
}

export default function Estudio({ datos, clave, recargar }) {
  const { estudio } = datos
  const [f, setF] = useState(() => formularioDe(estudio))
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState('')
  const cambiar = (k, v) => setF((prev) => ({ ...prev, [k]: v }))

  const guardar = async (e) => {
    e.preventDefault()
    const d = aDatos(f)
    const malo = NUMERICOS.find((k) => d[k] != null && Number.isNaN(d[k]))
    if (malo) { setError(`El campo ${malo} tiene que ser numérico.`); return }
    if (d.fraccion != null && (d.fraccion <= 0 || d.fraccion > 1)) { setError('La fracción es una proporción entre 0 y 1.'); return }
    setOcupado('guardar')
    setError('')
    setMensaje('')
    try {
      await api.dirEstudio(clave, { id: estudio.id, ...d })
      setMensaje('Configuración guardada.')
      await recargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado('')
    }
  }

  const cerrar = async () => {
    if (!window.confirm('¿Cerrar el estudio? No se podrán guardar más valoraciones ni abrir rondas. Esta acción no se deshace desde el panel.')) return
    setOcupado('cerrar')
    setError('')
    try {
      await api.dirCerrar(clave)
      setMensaje('Estudio cerrado.')
      await recargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado('')
    }
  }

  return (
    <section>
      <div className="kpis">
        <div className="kpi"><div className="v">{estudio.ronda_actual}</div><div className="l">Ronda actual</div><div className="s">de {estudio.umbrales?.rondas_max ?? '—'} como máximo</div></div>
        <div className="kpi"><div className="v" style={{ fontSize: '1.1rem' }}>{estudio.semilla || '—'}</div><div className="l">Semilla</div><div className="s">commit {estudio.corpus_commit || '—'}</div></div>
        <div className="kpi"><div className="v" style={{ fontSize: '1.1rem' }}>{fecha(estudio.abierto_en)}</div><div className="l">Abierto</div><div className="s">{estudio.cerrado_en ? `cerrado ${fecha(estudio.cerrado_en)}` : 'abierto'}</div></div>
      </div>
      {mensaje && <p className="ok-caja" role="status">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <form className="tarjeta" onSubmit={guardar}>
        <h3>Configuración</h3>
        <div className="panel-dos">
          <Campo id="nombre" etiqueta="Nombre" f={f} cambiar={cambiar} />
          <Campo id="corpus_commit" etiqueta="Commit del corpus" f={f} cambiar={cambiar} ayuda="El commit de ~/educacion-en-dolor con el que se calculó la muestra." />
          <Campo id="fraccion" etiqueta="Fracción muestreada" f={f} cambiar={cambiar} tipo="number" paso="0.01" ayuda="Proporción por dominio (0,10 = 10 %)." />
          <Campo id="suelo" etiqueta="Suelo por dominio" f={f} cambiar={cambiar} tipo="number" />
          <Campo id="k_jueces" etiqueta="Jueces por concepto (k)" f={f} cambiar={cambiar} tipo="number" />
          <Campo id="k_paciente" etiqueta="Pacientes por concepto" f={f} cambiar={cambiar} tipo="number" />
          <Campo id="capacidad" etiqueta="Capacidad por experto" f={f} cambiar={cambiar} tipo="number" />
          <Campo id="capacidad_paciente" etiqueta="Capacidad por paciente" f={f} cambiar={cambiar} tipo="number" />
        </div>
        <div className="campo">
          <label htmlFor="estudio-notas">Notas</label>
          <textarea id="estudio-notas" value={f.notas} onChange={(e) => cambiar('notas', e.target.value)} />
        </div>
        <div className="acciones">
          <button type="submit" className="boton" disabled={!!ocupado}>{ocupado === 'guardar' ? 'Guardando…' : 'Guardar configuración'}</button>
          <button type="button" className="boton secundario" disabled={!!ocupado} onClick={() => setF(formularioDe(estudio))}>Deshacer cambios</button>
        </div>
      </form>

      <div className="panel-dos">
        <div>
          <h3>Umbrales</h3>
          <p className="silencio">Fijados antes de ver datos y registrados en el protocolo. No se editan desde el panel.</p>
          <div className="tabla-env">
            <table className="tabla">
              <thead><tr><th>Umbral</th><th>Qué fija</th><th className="num">Valor</th></tr></thead>
              <tbody>
                {Object.entries(estudio.umbrales || {}).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.85em' }}>{k}</td>
                    <td>{NOMBRE_UMBRAL[k] || ''}</td>
                    <td className="num">{typeof v === 'boolean' ? (v ? 'sí' : 'no') : String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h3>V de Aiken mínima por n jueces</h3>
          <p className="silencio">La V con la que el límite inferior del IC 95 % alcanza {estudio.umbrales?.aiken ?? 0.7}; es la tabla que decide el tamaño del panel.</p>
          <div className="tabla-env">
            <table className="tabla">
              <thead><tr><th className="num">Jueces válidos (n)</th><th className="num">V mínima</th><th className="num">Media mínima /4</th></tr></thead>
              <tbody>
                {N_AIKEN.map((n) => {
                  const v = aikenMinimaParaIc(n, estudio.umbrales?.aiken ?? 0.7, CATEGORIAS)
                  return (
                    <tr key={n}>
                      <td className="num">{n}</td>
                      <td className="num">{v.toFixed(3)}</td>
                      <td className="num">{n2(1 + v * (CATEGORIAS - 1))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: '1.5rem' }}>Dimensiones</h3>
      <div className="tabla-env">
        <table className="tabla">
          <thead><tr><th className="num">Orden</th><th>Clave</th><th>Nombre</th><th>Quién</th><th>Afirmación</th></tr></thead>
          <tbody>
            {(estudio.dimensiones || []).map((d) => (
              <tr key={d.clave}>
                <td className="num">{d.orden}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: '0.85em' }}>{d.clave}</td>
                <td>{d.nombre}</td>
                <td>{d.quien}</td>
                <td className="silencio">{d.afirmacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tarjeta" style={{ marginTop: '1.5rem' }}>
        <h3>Cerrar el estudio</h3>
        <p className="silencio">
          {estudio.cerrado_en ? `El estudio se cerró el ${fecha(estudio.cerrado_en)}.` : 'Deja de aceptar valoraciones y rondas. Exporta antes los datos desde la pestaña Consenso.'}
        </p>
        <div className="acciones" style={{ marginTop: 0 }}>
          <button type="button" className="boton peligro" disabled={!!ocupado || !!estudio.cerrado_en} onClick={cerrar}>
            {ocupado === 'cerrar' ? 'Cerrando…' : 'Cerrar el estudio'}
          </button>
        </div>
      </div>
    </section>
  )
}

function Campo({ id, etiqueta, f, cambiar, tipo = 'text', paso, ayuda }) {
  return (
    <div className="campo">
      <label htmlFor={`estudio-${id}`}>{etiqueta}</label>
      <input id={`estudio-${id}`} type={tipo} step={paso} value={f[id]} onChange={(e) => cambiar(id, e.target.value)} />
      {ayuda && <p className="ayuda">{ayuda}</p>}
    </div>
  )
}
