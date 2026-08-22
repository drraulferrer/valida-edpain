import { useMemo, useState } from 'react'
import * as api from '../../lib/api.js'
import { Vacio, agrupar, contar, media, minimo, n2, ordenDe } from './comun.jsx'

const COLUMNAS = 11
const MAX_GENERALISTAS = 3

function resumirModulos(datos) {
  const { estudio, conceptos, valoraciones, cobertura, catalogo } = datos
  const ronda = estudio.ronda_actual
  const minimoPanel = estudio.umbrales?.minimo_panel ?? 5
  const orden = ordenDe(catalogo)

  const expertasCompletas = new Map()
  for (const v of valoraciones || []) {
    if (v.completa && !v.abstencion && v.perfil !== 'paciente' && v.ronda === ronda) {
      expertasCompletas.set(v.concepto_id, (expertasCompletas.get(v.concepto_id) || 0) + 1)
    }
  }

  const activos = (conceptos || []).filter((c) => c.activo !== false)
  return [...agrupar(activos, (c) => c.modulo)]
    .map(([modulo, cs]) => {
      const conPaciente = cs.filter((c) => c.tiene_paciente)
      const cob = (cobertura || []).filter((x) => x.modulo === modulo && x.ronda === ronda)
      return {
        modulo, dominio: cs[0].dominio, n: cs.length,
        juecesMin: minimo(cs.map((c) => c.jueces || 0)),
        juecesMedia: media(cs.map((c) => c.jueces || 0)),
        pocosAsignados: contar(cs, (c) => (c.jueces || 0) < (estudio.k_jueces ?? 7)),
        pocosValidos: contar(cs, (c) => (expertasCompletas.get(c.id) || 0) < minimoPanel),
        conPaciente: conPaciente.length,
        pacientesMin: minimo(conPaciente.map((c) => c.pacientes || 0)),
        pacientesMedia: media(conPaciente.map((c) => c.pacientes || 0)),
        cobertura: cob,
        exhaustividad: media(cob.map((x) => x.exhaustividad)),
      }
    })
    .sort((a, b) => orden(a.dominio) - orden(b.dominio) || orden(a.modulo) - orden(b.modulo))
}

export default function Cobertura({ datos, clave, nombres, recargar }) {
  const filas = useMemo(() => resumirModulos(datos), [datos])
  const [abierto, setAbierto] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState('')
  const { estudio } = datos
  const minimoPanel = estudio.umbrales?.minimo_panel ?? 5

  // Asignar no «falla» cuando no hay a quién asignar: devuelve 0 y parece que el botón no
  // hace nada. Por eso se distingue el caso y se dice qué falta hacer.
  const asignar = async (perfil) => {
    setOcupado(perfil)
    setMensaje('')
    setError('')
    try {
      const r = await api.dirAsignar(clave, perfil, MAX_GENERALISTAS)
      const quienes = perfil === 'paciente' ? 'pacientes' : 'expertos'
      if (!r?.panelistas_activos) {
        setError(`No hay ningún panelista con perfil «${perfil}» activo, así que no hay a quién asignar nada. `
          + (perfil === 'paciente'
            ? 'Da de alta a las personas con dolor en Panelistas → «Alta de panelista» eligiendo perfil «paciente», o ábreles la inscripción en Estudio, y vuelve aquí.'
            : 'Da de alta a los expertos en Panelistas → «Alta de panelista» y vuelve aquí.'))
        return
      }
      if (!r.asignadas && !r.capacidad_libre) {
        setError(`Los ${r.panelistas_activos} ${quienes} activos ya están a tope de capacidad: no cabe ni una valoración más. `
          + `Sube la capacidad en Estudio → «Capacidad por ${perfil}» o da de alta a más ${quienes}.`)
        return
      }
      const sin = r.sin_jueces_suficientes
        ? ` Todavía les faltan ${quienes} a ${r.sin_jueces_suficientes} conceptos.`
        : ` Todos los conceptos tienen ya sus ${quienes}.`
      setMensaje(`Asignadas ${r.asignadas} valoraciones nuevas de ${perfil} en la ronda ${r.ronda ?? estudio.ronda_actual}, `
        + `repartidas entre ${r.panelistas_activos} ${quienes} activos.${sin}`)
      await recargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado('')
    }
  }

  return (
    <section>
      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="button" className="boton" disabled={!!ocupado || !!estudio.cerrado_en} onClick={() => asignar('experto')}>
          {ocupado === 'experto' ? 'Asignando…' : 'Asignar expertos'}
        </button>
        <button type="button" className="boton secundario" disabled={!!ocupado || !!estudio.cerrado_en} onClick={() => asignar('paciente')}>
          {ocupado === 'paciente' ? 'Asignando…' : 'Asignar pacientes'}
        </button>
        <span className="silencio">Objetivo: {estudio.k_jueces} jueces y {estudio.k_paciente} pacientes por concepto; hasta {MAX_GENERALISTAS} generalistas.</span>
      </div>
      {mensaje && <p className="ok-caja" role="status">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {filas.length === 0 ? <Vacio>No hay conceptos en plataforma.</Vacio> : (
        <div className="tabla-env">
          <table className="tabla">
            <thead>
              <tr>
                <th>Dominio</th><th>Módulo</th><th className="num">Incluidos</th>
                <th className="num">Jueces mín.</th><th className="num">Jueces media</th>
                <th className="num">&lt; {estudio.k_jueces} asignados</th><th className="num">&lt; {minimoPanel} válidas</th>
                <th className="num">Con paciente</th><th className="num">Pacientes mín. / media</th>
                <th className="num">Exhaustividad</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <FilaModulo key={f.modulo} f={f} nombres={nombres} abierto={abierto === f.modulo}
                  onAlternar={() => setAbierto(abierto === f.modulo ? null : f.modulo)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function FilaModulo({ f, nombres, abierto, onAlternar }) {
  return (
    <>
      <tr className="clic" onClick={onAlternar} aria-expanded={abierto}>
        <td>{nombres[f.dominio] || f.dominio}</td>
        <td><span style={{ fontFamily: 'var(--mono)', fontSize: '0.8em', color: 'var(--tinta-3)' }}>{f.modulo}</span> {nombres[f.modulo] || ''}</td>
        <td className="num">{f.n}</td>
        <td className="num">{f.juecesMin ?? '—'}</td>
        <td className="num">{f.juecesMedia == null ? '—' : f.juecesMedia.toFixed(1)}</td>
        <td className="num">{f.pocosAsignados ? <span className="etiqueta aviso">{f.pocosAsignados}</span> : 0}</td>
        <td className="num">{f.pocosValidos ? <span className="etiqueta aviso">{f.pocosValidos}</span> : 0}</td>
        <td className="num">{f.conPaciente}</td>
        <td className="num">{f.conPaciente ? `${f.pacientesMin} / ${f.pacientesMedia.toFixed(1)}` : '—'}</td>
        <td className="num">{f.cobertura.length ? `${n2(f.exhaustividad)} (n = ${f.cobertura.length})` : '—'}</td>
        <td className="silencio">{abierto ? 'cerrar' : 'ver'}</td>
      </tr>
      {abierto && (
        <tr className="fila-detalle">
          <td colSpan={COLUMNAS}>
            {f.cobertura.length === 0 ? <Vacio>Ningún panelista ha respondido todavía a la pregunta de cobertura de este módulo.</Vacio> : (
              f.cobertura.map((x, i) => (
                <div key={`${x.panelista}-${i}`} style={{ marginBottom: '0.75rem' }}>
                  <p style={{ margin: '0 0 0.2rem' }}>
                    <span style={{ fontFamily: 'var(--mono)' }}>{x.panelista}</span>
                    <span className="silencio"> · exhaustividad {x.exhaustividad ?? '—'}</span>
                  </p>
                  {x.falta && <p className="comentario-cita"><b>Falta:</b> {x.falta}</p>}
                  {x.sobra && <p className="comentario-cita"><b>Sobra:</b> {x.sobra}</p>}
                  {!x.falta && !x.sobra && <p className="silencio">Sin texto.</p>}
                </div>
              ))
            )}
          </td>
        </tr>
      )}
    </>
  )
}
