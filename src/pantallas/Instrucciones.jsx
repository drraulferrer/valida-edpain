import { useState } from 'react'
import { CATEGORIAS } from '../componentes/Likert.jsx'
import { BANDERAS } from '../componentes/Banderas.jsx'
import { ir } from '../App.jsx'
import * as api from '../lib/api.js'
import { CERTEZA, CERTEZA_INTRO, MADUREZ, MADUREZ_INTRO } from '../lib/escalas.js'

// Texto de la dirección editorial (22-ago-2026). Las afirmaciones y ayudas de cada
// dimensión no están aquí: vienen de `valida.dimensiones`, para que esta pantalla y el
// wizard digan exactamente lo mismo.
export default function Instrucciones({ sesion, primeraVez, refrescar }) {
  const empezarPaciente = async () => { try { await api.calibracionHecha(sesion.clave); await refrescar() } catch { /* sin red: se reintenta al entrar */ } ir('/bloque') }
  const [pagina, setPagina] = useState(0)
  const dims = sesion.estudio?.dimensiones || []
  const paciente = sesion.perfil === 'paciente'
  const arriba = () => window.scrollTo({ top: 0 })

  if (paciente) {
    return (
      <main className="pantalla">
        <p className="etiqueta acento">Cómo funciona</p>
        <h1>Vas a leer textos pensados para personas con dolor</h1>
        <div className="lectura">
          <p>Cada texto explica una idea sobre el dolor con palabras de todos los días. Tú no tienes que saber si es verdad: eso lo miran otros. Tú nos dices <strong>si se entiende</strong> y <strong>cómo te deja</strong>.</p>
          <p>Hay una lista de frases del tipo «me hace sentir que es culpa mía». Si alguna te pasa con un texto, márcala: <strong>una sola marca tuya obliga a reescribirlo</strong>. No hace falta explicar por qué.</p>
          <p>Todo se guarda solo. Puedes parar cuando quieras y volver con tu clave.</p>
        </div>
        <div className="acciones"><button className="boton" type="button" onClick={empezarPaciente}>Empezar</button></div>
      </main>
    )
  }

  return (
    <main className="pantalla">
      <p className="etiqueta acento">Antes de empezar · {primeraVez ? '2' : '·'} de 3 · página {pagina + 1} de 2</p>
      {pagina === 0 ? (
        <>
          <h1>Cuatro afirmaciones por concepto</h1>
          <p className="silencio">Cada concepto se valora con las mismas cuatro afirmaciones. Indica tu grado de acuerdo en una escala del 1 al 4. No existe un punto medio: la idea es obligar a posicionarse.</p>
          {dims.map((d) => (
            <div className="dimension" key={d.clave}>
              <div className="nombre">{d.nombre}</div>
              <p className="afirmacion">{d.afirmacion}</p>
              <p className="ayuda">{d.ayuda}</p>
            </div>
          ))}
          <div className="tarjeta">
            <h3>Escala</h3>
            <div className="likert" aria-hidden="true">
              {CATEGORIAS.map(([n, t]) => <button key={n} type="button" tabIndex={-1} className={n <= 2 ? 'bajo' : ''}><span className="num">{n}</span><span className="txt">{t}</span></button>)}
            </div>
            <p style={{ marginTop: '0.8rem', marginBottom: 0 }}>Si puntúas con <b>1</b> o <b>2</b>, explica qué cambiarías y, si puedes, propón una redacción alternativa. Con <b>3</b> o <b>4</b>, el comentario es opcional.</p>
          </div>
          <div className="tarjeta">
            <h3>Certeza y madurez: qué significan</h3>
            <p>Cada concepto declara un <b>grado de certeza</b>. {CERTEZA_INTRO}</p>
            <ul style={{ paddingLeft: '1.2em', marginBottom: '0.9rem' }}>
              {Object.entries(CERTEZA).map(([k, v]) => <li key={k} style={{ marginBottom: '0.25rem' }}><b>{v.nombre}</b> ({v.familia}): {v.descripcion}</li>)}
            </ul>
            <p>Y un <b>nivel de madurez</b>. {MADUREZ_INTRO}</p>
            <ul style={{ paddingLeft: '1.2em', marginBottom: 0 }}>
              {Object.entries(MADUREZ).map(([k, v]) => <li key={k} style={{ marginBottom: '0.25rem' }}><b>{k} · {v.nombre}</b>: {v.descripcion}</li>)}
            </ul>
          </div>
          <div className="tarjeta">
            <h3>«Fuera de mi ámbito»</h3>
            <p>Si el concepto queda fuera de tu área de conocimiento, abstente de valorarlo.</p>
            <p style={{ marginBottom: 0 }}>Esta respuesta no cuenta como una puntuación y queda fuera del análisis. Es preferible abstenerse que emitir una valoración poco fundamentada.</p>
          </div>
          <div className="acciones"><button className="boton" type="button" onClick={() => { setPagina(1); arriba() }}>Seguir</button></div>
        </>
      ) : (
        <>
          <h1>Banderas de revisión</h1>
          <p className="silencio">Además de puntuar, puedes marcar cualquiera de estas incidencias.</p>
          <div className="tarjeta">
            {BANDERAS.map((b) => (
              <p key={b.clave} style={{ marginBottom: '0.6rem' }}><b>{b.etiqueta}.</b> {[b.ayuda, b.detalle].filter(Boolean).join(' ')}</p>
            ))}
          </div>
          <div className="tarjeta">
            <h3>Tiempo estimado</h3>
            <p>Cada concepto suele llevar entre 2 y 4 minutos.</p>
            <p style={{ marginBottom: 0 }}>Los conceptos están agrupados por módulos para facilitar la valoración. Cada veinte conceptos te sugeriremos hacer una pausa. Todas las respuestas se guardan automáticamente y podrás continuar más tarde o modificar cualquier respuesta mientras la ronda permanezca abierta.</p>
          </div>
          <div className="tarjeta">
            <h3>¿Qué haremos con tus respuestas?</h3>
            <p>Las puntuaciones se analizarán mediante los criterios definidos para el estudio, incluyendo el I-CVI, la V de Aiken con intervalo de confianza y un mínimo de cinco evaluadores por concepto.</p>
            <p>Las propuestas de redacción se revisarán de forma editorial. Ningún cambio se incorporará automáticamente.</p>
            <p style={{ marginBottom: 0 }}>En los informes solo aparecerá tu código de participante.</p>
          </div>
          <div className="acciones">
            <button className="boton secundario" type="button" onClick={() => { setPagina(0); arriba() }}>Atrás</button>
            {primeraVez
              ? <button className="boton" type="button" onClick={() => ir('/calibracion')}>Practicar con dos conceptos</button>
              : <button className="boton" type="button" onClick={() => ir('/bloque')}>Volver a mi bloque</button>}
          </div>
        </>
      )}
    </main>
  )
}
