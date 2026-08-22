import { useState } from 'react'
import { CATEGORIAS } from '../componentes/Likert.jsx'
import { BANDERAS } from '../componentes/Banderas.jsx'
import { ir } from '../App.jsx'
import * as api from '../lib/api.js'

export default function Instrucciones({ sesion, primeraVez, refrescar }) {
  const empezarPaciente = async () => { try { await api.calibracionHecha(sesion.clave); await refrescar() } catch { /* sin red: se reintenta al entrar */ } ir('/bloque') }
  const [pagina, setPagina] = useState(0)
  const dims = sesion.estudio?.dimensiones || []
  const paciente = sesion.perfil === 'paciente'

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
          <p className="silencio">Cada concepto se juzga con las mismas cuatro afirmaciones. Dirás cuánto estás de acuerdo con cada una, de 1 a 4. No hay punto medio a propósito: obliga a tomar partido.</p>
          {dims.map((d) => (
            <div className="dimension" key={d.clave}>
              <div className="nombre">{d.nombre}</div>
              <p className="afirmacion">{d.afirmacion}</p>
              <p className="ayuda">{d.ayuda}</p>
            </div>
          ))}
          <div className="tarjeta">
            <h3>La escala</h3>
            <div className="likert" aria-hidden="true">
              {CATEGORIAS.map(([n, t]) => <button key={n} type="button" tabIndex={-1} className={n <= 2 ? 'bajo' : ''}><span className="num">{n}</span><span className="txt">{t}</span></button>)}
            </div>
            <p style={{ marginTop: '0.8rem', marginBottom: 0 }}>Un <b>1</b> o un <b>2</b> piden que digas dónde está el problema y, si puedes, cómo lo redactarías tú. Con <b>3</b> o <b>4</b> el comentario es opcional.</p>
          </div>
          <div className="tarjeta">
            <h3>«Fuera de mi ámbito»</h3>
            <p style={{ marginBottom: 0 }}>Si un concepto no es de tu campo, abstente. Tu abstención sale del recuento: no es un punto medio ni cuenta en contra. Es mejor una abstención honesta que un 3 por compromiso.</p>
          </div>
          <div className="acciones"><button className="boton" type="button" onClick={() => { setPagina(1); window.scrollTo({ top: 0 }) }}>Seguir</button></div>
        </>
      ) : (
        <>
          <h1>Banderas, tiempo y cómo se guarda</h1>
          <div className="tarjeta">
            <h3>Cuatro banderas que no puntúan: señalan</h3>
            {BANDERAS.map((b) => (
              <p key={b.clave} style={{ marginBottom: '0.5rem' }}><b>{b.etiqueta}.</b> {b.ayuda || b.detalle}</p>
            ))}
          </div>
          <div className="tarjeta">
            <h3>Cuánto tiempo lleva</h3>
            <p>Entre dos y cuatro minutos por concepto. Tu bloque está agrupado por módulos para que los conceptos vecinos vayan seguidos. Cada veinte conceptos te sugeriremos una pausa: la fatiga infla las puntuaciones, y eso se nota en los datos.</p>
            <p style={{ marginBottom: 0 }}>Todo se guarda a cada paso. Puedes cerrar y volver; puedes cambiar cualquier respuesta hasta que cierre la ronda.</p>
          </div>
          <div className="tarjeta">
            <h3>Qué se hace con lo que digas</h3>
            <p style={{ marginBottom: 0 }}>Las puntuaciones se agregan con reglas fijadas antes de empezar (I-CVI, V de Aiken con intervalo, mínimo cinco jueces). Tus redacciones alternativas van a la dirección editorial como propuestas: nada cambia en el corpus sin una persona que lo decida. Tu código es lo único que aparece en los informes.</p>
          </div>
          <div className="acciones">
            <button className="boton secundario" type="button" onClick={() => { setPagina(0); window.scrollTo({ top: 0 }) }}>Atrás</button>
            {primeraVez
              ? <button className="boton" type="button" onClick={() => ir('/calibracion')}>Practicar con dos conceptos</button>
              : <button className="boton" type="button" onClick={() => ir('/bloque')}>Volver a mi bloque</button>}
          </div>
        </>
      )}
    </main>
  )
}
