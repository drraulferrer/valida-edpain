// Ajustes: sobre qué parte, por qué motivo y, si se puede, cómo lo redactarías tú.
// Es obligatorio cuando alguna dimensión está en 1 o 2; opcional en el resto.
export const PARTES = [
  ['definicion', 'Definición'],
  ['explicacion_profesional', 'Explicación profesional'],
  ['explicacion_paciente', 'Explicación para pacientes'],
  ['puntos_clave', 'Puntos clave'],
  ['advertencias', 'Advertencias de uso'],
  ['referencias', 'Referencias'],
  ['titulo', 'Título'],
]

export const MOTIVOS = [
  ['error_factual', 'Error factual'],
  ['evidencia', 'Evidencia insuficiente o mal atribuida'],
  ['certeza', 'Certeza declarada inflada o desinflada'],
  ['ambiguedad', 'Ambigüedad o redacción confusa'],
  ['nocebo', 'Lenguaje nocebo o invalidante'],
  ['desactualizado', 'Desactualizado: hay literatura posterior'],
  ['frontera', 'Frontera: solapa, sobra o son dos conceptos'],
  ['paciente', 'La explicación de paciente dice otra cosa'],
  ['otro', 'Otro'],
]

const vacio = () => ({ parte: '', motivo: '', redaccion: '' })

export default function Ajustes({ ajustes, onCambio, obligatorio, comentario, onComentario }) {
  const lista = ajustes.length ? ajustes : [vacio()]
  const cambiar = (i, campo, valor) => {
    const nueva = lista.map((a, j) => (j === i ? { ...a, [campo]: valor } : a))
    onCambio(nueva.filter((a) => a.parte || a.motivo || a.redaccion))
  }
  const quitar = (i) => onCambio(lista.filter((_, j) => j !== i))
  const anadir = () => onCambio([...lista, vacio()])

  return (
    <div>
      {obligatorio && (
        <p className="aviso-caja">Has puntuado 1 o 2 en alguna afirmación. Di dónde está el problema y, si puedes, cómo lo redactarías: es la aportación que más cambia el corpus. La reescritura final es nuestra; la propuesta, tuya.</p>
      )}
      {lista.map((a, i) => (
        <div className="ajuste" key={i}>
          <div className="fila">
            <div className="campo">
              <label htmlFor={`parte-${i}`}>Sobre qué parte</label>
              <select id={`parte-${i}`} value={a.parte} onChange={(e) => cambiar(i, 'parte', e.target.value)}>
                <option value="">— elige —</option>
                {PARTES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor={`motivo-${i}`}>Motivo</label>
              <select id={`motivo-${i}`} value={a.motivo} onChange={(e) => cambiar(i, 'motivo', e.target.value)}>
                <option value="">— elige —</option>
                {MOTIVOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="campo">
            <label htmlFor={`redaccion-${i}`}>Redacción alternativa <span className="silencio">(opcional, pero es lo más útil)</span></label>
            <textarea id={`redaccion-${i}`} value={a.redaccion} onChange={(e) => cambiar(i, 'redaccion', e.target.value)}
              placeholder="Escribe la frase o el párrafo como tú lo pondrías." />
          </div>
          {lista.length > 1 && <button type="button" className="boton fantasma pequeno" onClick={() => quitar(i)}>Quitar este ajuste</button>}
        </div>
      ))}
      <button type="button" className="boton secundario pequeno" onClick={anadir}>+ Otro ajuste</button>
      <div className="campo" style={{ marginTop: '1rem' }}>
        <label htmlFor="comentario">Comentario general <span className="silencio">(opcional)</span></label>
        <textarea id="comentario" value={comentario || ''} onChange={(e) => onComentario(e.target.value)}
          placeholder="Lo que no cabe arriba: contexto, una referencia, una duda." />
      </div>
    </div>
  )
}
