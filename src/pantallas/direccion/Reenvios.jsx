import { fecha } from './comun.jsx'

export const CONTACTO_POR_DEFECTO = 'estudio@edpain.com'

// Solicitudes que no se tramitaron porque el mismo correo ya había sido rechazado antes y volvió
// con el perfil cambiado. Casi siempre es lo que parece, pero **también cae aquí quien se equivocó
// de buena fe al marcar una casilla**, así que se enseñan una a una, con el salto de puntuación
// entre los dos envíos, para poder decidir y responder. La persona nunca ve este control.
export function ReenviosNoTramitados({ solicitudes, contacto = CONTACTO_POR_DEFECTO }) {
  const bloqueadas = (solicitudes?.ultimas || []).filter((x) => x.bloqueada)
  if (!bloqueadas.length) return null

  // `ultimas` viene ordenada de más reciente a más antigua: el intento previo es el primer
  // rechazo del mismo correo que aparece DESPUÉS en la lista. Se busca por posición y no por
  // fecha porque dos envíos seguidos pueden compartir marca de tiempo al milisegundo.
  const lista = solicitudes.ultimas || []
  const previa = (b) => {
    const desde = lista.indexOf(b) + 1
    return lista.slice(desde).find((x) => !x.bloqueada && !x.aceptada && x.email && b.email && x.email === b.email)
  }

  return (
    <div className="tarjeta destacado">
      <h3>Reenvíos no tramitados ({bloqueadas.length})</h3>
      <p className="silencio">
        Alguien que no alcanzó el criterio y volvió a enviar la solicitud con los datos cambiados. No se le dio de alta y no
        sabe por qué: si fue un error suyo al rellenar, aquí es donde se ve. Escríbele si procede y, para darle de alta,
        usa el alta manual desde Panelistas.
      </p>
      <ul className="avisos-lista">
        {bloqueadas.map((b) => {
          const antes = previa(b)
          return (
            <li key={`${b.email}-${b.creada_en}`}>
              <span className="sem revisar">{fecha(b.creada_en)}</span>
              <span className="quien">
                <b>{b.nombre || 'sin nombre'}</b>
                <span className="silencio">
                  {b.email || 'sin correo'} · {b.disciplina || 'sin disciplina'}
                  {antes ? ` · pasó de ${antes.puntuacion} a ${b.puntuacion} puntos` : ` · ${b.puntuacion} puntos en el reenvío`}
                </span>
              </span>
              {b.email && (
                <a className="boton secundario pequeno"
                  href={`mailto:${b.email}?subject=${encodeURIComponent('Tu solicitud al estudio EdPain')}&body=${encodeURIComponent(
                    `Hola${b.nombre ? ` ${b.nombre.split(' ')[0]}` : ''}:\n\nHemos recibido tu solicitud para participar como panelista en el estudio EdPain y necesitamos comprobar contigo algunos de los datos que has indicado antes de darte de alta.\n\n¿Puedes confirmarnos tu titulación, tu formación específica en dolor y, si las tienes, el DOI de alguna de tus publicaciones sobre educación en dolor?\n\nGracias,\n${contacto}`)}`}>
                  Escribirle
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
