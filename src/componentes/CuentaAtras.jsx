// Cuenta atrás del plazo personal. Va arriba, siempre visible: en la cabecera como marcador
// compacto y en la pantalla del bloque con la frase entera. El dato llega del servidor
// (`valida.plazo_de`), no se calcula en el navegador: el reloj del panelista no decide plazos.

export function diasRestantes(plazo) {
  if (!plazo || plazo.dias_restantes == null) return null
  return Math.ceil(Number(plazo.dias_restantes))
}

export function nivel(dias) {
  if (dias == null) return ''
  if (dias <= 0) return 'peligro'
  if (dias <= 1) return 'peligro'
  if (dias <= 3) return 'aviso'
  return 'ok'
}

function fechaCorta(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

// Marcador compacto para la cabecera.
export default function CuentaAtras({ plazo }) {
  const dias = diasRestantes(plazo)
  if (dias == null) return null
  const n = nivel(dias)
  const texto = dias <= 0 ? 'plazo terminado' : dias === 1 ? 'último día' : `${dias} días`
  return (
    <span className={`cuenta-atras ${n}`} title={plazo.fin_efectivo ? `Tu plazo termina el ${fechaCorta(plazo.fin_efectivo)}` : ''}>
      <span className="reloj" aria-hidden="true" />
      {texto}
    </span>
  )
}

// Frase completa para la pantalla del bloque.
export function AvisoPlazo({ plazo, pendientes, cosa = 'conceptos' }) {
  const dias = diasRestantes(plazo)
  if (dias == null) return null
  const n = nivel(dias)
  const fin = fechaCorta(plazo.fin_efectivo)
  const total = plazo.dias
  const transcurrido = total ? Math.min(100, Math.max(0, ((total - dias) / total) * 100)) : 0

  if (dias <= 0) {
    return (
      <div className="plazo-caja peligro">
        <p><b>Tu plazo terminó el {fin}.</b> {pendientes > 0 ? `Te quedaron ${pendientes} ${cosa} sin valorar.` : 'Terminaste tu bloque a tiempo.'} Si necesitas más tiempo, escribe a la dirección del estudio y te lo ampliamos.</p>
      </div>
    )
  }
  return (
    <div className={`plazo-caja ${n}`}>
      <div className="cabeza">
        <b>{dias === 1 ? 'Hoy es el último día' : `Te quedan ${dias} días`}</b>
        <span className="silencio">hasta el {fin}</span>
      </div>
      <div className="barra"><span style={{ transform: `scaleX(${transcurrido / 100})` }} /></div>
      <p className="silencio" style={{ margin: '0.4rem 0 0' }}>
        {pendientes > 0
          ? `Te faltan ${pendientes} ${cosa}. Puedes repartirlos como quieras: todo se guarda solo.`
          : 'Has terminado tu bloque: no recibirás más avisos.'}
      </p>
    </div>
  )
}
