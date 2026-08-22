import { useState } from 'react'
import * as api from '../../lib/api.js'
import { aikenMinimaParaIc } from '../../lib/metricas.js'
import { fecha, n2 } from './comun.jsx'

const CAMPOS_EDITABLES = ['nombre', 'corpus_commit', 'fraccion', 'suelo', 'k_jueces', 'k_paciente', 'capacidad', 'capacidad_paciente', 'notas', 'codigo_invitacion', 'codigo_pruebas', 'tope_solicitudes_dia', 'fehring_minimo', 'investigador_principal', 'contacto_email', 'comite_etica', 'grupo_autoria']
const NUMERICOS = ['fraccion', 'suelo', 'k_jueces', 'k_paciente', 'capacidad', 'capacidad_paciente', 'tope_solicitudes_dia', 'fehring_minimo']
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
  return { ...Object.fromEntries(CAMPOS_EDITABLES.map((k) => [k, estudio[k] == null ? '' : String(estudio[k])])),
    inscripcion_abierta: !!estudio.inscripcion_abierta, inscripcion_pacientes_abierta: !!estudio.inscripcion_pacientes_abierta }
}

function aDatos(f) {
  const d = Object.fromEntries(CAMPOS_EDITABLES.map((k) => {
    if (NUMERICOS.includes(k)) return [k, f[k] === '' ? null : Number(f[k])]
    if (k === 'codigo_invitacion' || k === 'codigo_pruebas' || k === 'comite_etica') return [k, f[k].trim()]   // vacío = sin código (el servidor lo pone a null)
    return [k, f[k].trim() === '' ? null : f[k].trim()]
  }))
  return { ...d, inscripcion_abierta: !!f.inscripcion_abierta, inscripcion_pacientes_abierta: !!f.inscripcion_pacientes_abierta }
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

        <h3 style={{ marginTop: '1rem' }}>Convocatoria pública</h3>
        <p className="silencio">
          En <code>#/participar</code> quien llega elige vía. Los dos paneles se abren y se cierran por separado, porque no se
          reclutan a la vez. El código de invitación va en la convocatoria y frena el ruido; el tope diario frena el abuso.
        </p>
        <label className="casilla" style={{ marginBottom: '0.6rem' }}>
          <input type="checkbox" checked={!!f.inscripcion_abierta} onChange={(e) => cambiar('inscripcion_abierta', e.target.checked)} />
          <span><b>Inscripción abierta · panel experto</b><span className="sub">El servidor calcula la puntuación de Fehring y solo da de alta a quien alcanza el mínimo.{estudio.inscripcion_abierta ? ' Abierta ahora.' : ' Cerrada ahora.'}</span></span>
        </label>
        <label className="casilla" style={{ marginBottom: '0.6rem' }}>
          <input type="checkbox" checked={!!f.inscripcion_pacientes_abierta} onChange={(e) => cambiar('inscripcion_pacientes_abierta', e.target.checked)} />
          <span>
            <b>Inscripción abierta · panel de personas con dolor</b>
            <span className="sub">
              Aquí <b>no hay nota de corte</b>: solo elegibilidad (dolor de 3 meses o más, CIE-11) y consentimiento. Enlace
              directo para carteles y asociaciones: <code>#/participar/paciente</code>.{estudio.inscripcion_pacientes_abierta ? ' Abierta ahora.' : ' Cerrada ahora.'}
            </span>
          </span>
        </label>
        <div className="panel-dos">
          <Campo id="codigo_invitacion" etiqueta="Código de invitación" f={f} cambiar={cambiar} ayuda="Vacío = sin código. No es secreto: va en el mensaje de la convocatoria." />
          <Campo id="fehring_minimo" etiqueta="Puntuación de Fehring mínima (0–14)" f={f} cambiar={cambiar} tipo="number" ayuda="Fehring (1987) fija el experto en 5. Máster 4 · doctorado +2 · formación en dolor +2 · ≥ 1 año en dolor +1 · publicaciones +2 · investigación +2 · máster/tesis en dolor +1." />
          <Campo id="tope_solicitudes_dia" etiqueta="Tope de solicitudes por día" f={f} cambiar={cambiar} tipo="number" />
          <Campo id="codigo_pruebas" etiqueta="Código de pruebas" f={f} cambiar={cambiar} ayuda="Funciona AUNQUE la inscripción esté cerrada y crea panelistas marcados como prueba, borrables de un clic desde Panelistas. Vacío = desactivado." />
        </div>

        <h3 style={{ marginTop: '1rem' }}>Ficha del estudio</h3>
        <p className="silencio">Lo que se muestra en la hoja de información al participante y en la convocatoria.</p>
        <div className="panel-dos">
          <Campo id="investigador_principal" etiqueta="Investigador principal" f={f} cambiar={cambiar} />
          <Campo id="contacto_email" etiqueta="Correo de contacto del estudio" f={f} cambiar={cambiar} ayuda="Público: es el que ve el panel. Redirígelo donde quieras (Cloudflare Email Routing)." />
          <Campo id="grupo_autoria" etiqueta="Nombre del grupo de autoría" f={f} cambiar={cambiar} />
          <Campo id="comite_etica" etiqueta="Comité de ética / dictamen" f={f} cambiar={cambiar} ayuda="Cuando lo haya. Vacío = no se muestra." />
        </div>
        {datos.solicitudes && (
          <p className="silencio">
            Solicitudes recibidas: <b>{datos.solicitudes.total}</b> · aceptadas {datos.solicitudes.aceptadas} ·
            no alcanzaron el criterio {datos.solicitudes.rechazadas}
            {datos.solicitudes.bloqueadas > 0 && <> · <b>reenvíos no tramitados {datos.solicitudes.bloqueadas}</b></>} ·
            en las últimas 24 h: {datos.solicitudes.hoy}.
            {datos.solicitudes.bloqueadas > 0 && ' Un reenvío no tramitado es alguien que, tras no alcanzar el criterio, volvió a enviarlo con los datos cambiados: no se le dio de alta y queda registrado con su correo por si hay que responderle.'}
          </p>
        )}
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
