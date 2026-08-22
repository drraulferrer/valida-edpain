import { useEffect, useMemo, useState } from 'react'
import * as api from '../lib/api.js'
import Progreso from '../componentes/Progreso.jsx'
import { AvisoPlazo } from '../componentes/CuentaAtras.jsx'

// Agrupa el bloque por módulo respetando el orden asignado.
export function agruparPorModulo(items) {
  const modulos = []
  const indice = new Map()
  for (const it of items) {
    if (!indice.has(it.modulo)) { indice.set(it.modulo, modulos.length); modulos.push({ modulo: it.modulo, dominio: it.dominio, items: [] }) }
    modulos[indice.get(it.modulo)].items.push(it)
  }
  return modulos
}

export function siguientePendiente(items, desdeId) {
  const i = desdeId ? items.findIndex((x) => x.id === desdeId) : -1
  const orden = [...items.slice(i + 1), ...items.slice(0, i + 1)]
  return orden.find((x) => x.estado === 'pendiente') || null
}

export default function Bloque({ sesion }) {
  const [bloque, setBloque] = useState(null)
  const [error, setError] = useState('')
  const paciente = sesion.perfil === 'paciente'

  useEffect(() => {
    api.bloque(sesion.clave).then(setBloque).catch((e) => setError(e.message))
  }, [sesion.clave])

  const modulos = useMemo(() => (bloque ? agruparPorModulo(bloque.items) : []), [bloque])
  if (error) return <main className="pantalla"><p className="error">{error}</p></main>
  if (!bloque) return <main className="pantalla"><p className="silencio">Cargando tu bloque…</p></main>

  const items = bloque.items
  const hechas = items.filter((x) => x.estado !== 'pendiente').length
  const siguiente = siguientePendiente(items)
  const coberturaHecha = new Set((bloque.cobertura || []).map((c) => c.modulo))
  const modulosPendientesCobertura = paciente ? [] : modulos.filter((m) => m.items.every((x) => x.estado !== 'pendiente') && !coberturaHecha.has(m.modulo))
  const todoHecho = !siguiente && modulosPendientesCobertura.length === 0

  if (!items.length) {
    return (
      <main className="pantalla">
        <h1>Todavía no tienes conceptos asignados</h1>
        <p className="silencio">La dirección editorial los asigna cuando el panel está completo. Te avisará. Tu clave seguirá valiendo.</p>
      </main>
    )
  }

  return (
    <main className="pantalla">
      <p className="etiqueta acento">Ronda {bloque.ronda} · tu bloque</p>
      <h1>{items.length} conceptos en {modulos.length} {modulos.length === 1 ? 'módulo' : 'módulos'}</h1>
      <AvisoPlazo plazo={bloque.plazo} pendientes={items.length - hechas} />
      <Progreso hechas={hechas} total={items.length} texto={todoHecho ? 'completado' : `${items.length - hechas} por hacer`} />
      <div className="acciones" style={{ marginTop: 0 }}>
        {siguiente && <a className="boton" href={`#/c/${encodeURIComponent(siguiente.id)}`}>{hechas ? 'Continuar' : 'Empezar'}</a>}
        {!siguiente && modulosPendientesCobertura[0] && <a className="boton" href={`#/modulo/${encodeURIComponent(modulosPendientesCobertura[0].modulo)}`}>Cerrar el módulo «{bloque.nombres[modulosPendientesCobertura[0].modulo] || modulosPendientesCobertura[0].modulo}»</a>}
        {todoHecho && <a className="boton" href="#/fin">Ver el resumen</a>}
      </div>
      {items.some((x) => x.cambiado) && <p className="aviso-caja">Algún concepto ha cambiado desde que lo valoraste: está marcado en la lista. La dirección editorial decidirá si hace falta revisarlo.</p>}

      {modulos.map((m) => {
        const completo = m.items.every((x) => x.estado !== 'pendiente')
        return (
          <section className="modulo-bloque" key={m.modulo}>
            <h3>
              <span>{bloque.nombres[m.modulo] || m.modulo}</span>
              <span className="n">{bloque.nombres[m.dominio] || m.dominio} · {m.items.filter((x) => x.estado !== 'pendiente').length}/{m.items.length}</span>
            </h3>
            <ul className="lista-conceptos">
              {m.items.map((it) => (
                <li key={it.id}>
                  <a href={`#/c/${encodeURIComponent(it.id)}`}>
                    <span className={`est ${it.estado}${it.estado === 'pendiente' && !it.completa && it.cambiado ? ' parcial' : ''}`} aria-hidden="true">
                      {it.estado === 'hecha' ? '✓' : it.estado === 'abstenida' ? '–' : ''}
                    </span>
                    <span className="t">{it.titulo}{it.cambiado ? <span className="etiqueta aviso" style={{ marginLeft: '0.5rem' }}>ha cambiado</span> : null}</span>
                    <span className="id">{it.id}</span>
                  </a>
                </li>
              ))}
            </ul>
            {!paciente && completo && (
              coberturaHecha.has(m.modulo)
                ? <p className="cobertura-hecha">✓ Pregunta de cobertura del módulo contestada · <a href={`#/modulo/${encodeURIComponent(m.modulo)}`}>cambiarla</a></p>
                : <a className="boton secundario pequeno" href={`#/modulo/${encodeURIComponent(m.modulo)}`}>¿Falta algo en este módulo?</a>
            )}
          </section>
        )
      })}
    </main>
  )
}
