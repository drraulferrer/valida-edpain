import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { crearDemo, CLAVES_DEMO } from '../src/lib/demo.js'

// La api real se sustituye por el backend de demostración en memoria: mismas funciones,
// mismos errores, sin red. Cada test arranca con una demo nueva.
let demo
vi.mock('../src/lib/api.js', async () => {
  const real = await vi.importActual('../src/lib/api.js')
  const via = (nombre) => (...args) => demo.rpc(nombre, argsA(nombre, args))
  const argsA = (nombre, a) => ({
    valida_entrar: { clave: a[0] },
    valida_perfil: { clave: a[0], disciplina: a[1], anios: a[2], dominios: a[3] },
    valida_calibracion: { clave: a[0] },
    valida_calibracion_hecha: { clave: a[0] },
    valida_bloque: { clave: a[0] },
    valida_concepto: { clave: a[0], concepto_id: a[1] },
    valida_guardar: { clave: a[0], concepto_id: a[1], datos: a[2] },
    valida_cobertura: { clave: a[0], modulo: a[1], exhaustividad: a[2], falta: a[3], sobra: a[4] },
    valida_evento: { clave: a[0], tipo: a[1], detalle: a[2] },
  })[nombre]
  let guardada = ''
  return {
    ...real,
    DEMO: true,
    entrar: via('valida_entrar'), guardarPerfil: via('valida_perfil'), calibracion: via('valida_calibracion'),
    calibracionHecha: via('valida_calibracion_hecha'), bloque: via('valida_bloque'), concepto: via('valida_concepto'),
    guardar: via('valida_guardar'), cobertura: via('valida_cobertura'), evento: via('valida_evento'),
    claveGuardada: () => guardada, guardarClave: (c) => { guardada = c || '' },
  }
})

import App from '../src/App.jsx'
import * as api from '../src/lib/api.js'

beforeEach(() => { cleanup(); demo = crearDemo(); api.guardarClave(''); window.location.hash = '#/'; window.scrollTo = () => {} })

const entrarComo = async (clave) => {
  render(<App />)
  const input = await screen.findByPlaceholderText('xxxx-xxxx-xxxx')
  fireEvent.change(input, { target: { value: clave } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('entrada', () => {
  it('rechaza una clave que no existe', async () => {
    await entrarComo('zzzz-zzzz-zzzz')
    expect((await screen.findByRole('alert')).textContent).toMatch(/válida/)
  })
  it('un experto nuevo pasa por el perfil', async () => {
    await entrarComo(CLAVES_DEMO.experto)
    expect(await screen.findByText('Cuatro datos sobre ti')).toBeTruthy()
  })
})

describe('flujo del experto', () => {
  it('perfil → instrucciones → calibración → bloque', async () => {
    await entrarComo(CLAVES_DEMO.experto)
    await screen.findByText('Cuatro datos sobre ti')
    fireEvent.change(screen.getByLabelText('Disciplina principal'), { target: { value: 'fisioterapia' } })
    const casilla = await screen.findByLabelText(/Fundamentos del dolor/)
    fireEvent.click(casilla)
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    expect(await screen.findByText('Cuatro afirmaciones por concepto')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Practicar con dos conceptos' }))
    expect(await screen.findByText(/Práctica · 1 de 2/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Saltar la práctica' }))
    expect(await screen.findByText(/conceptos en/)).toBeTruthy()
    expect(demo._estado.panelistas[0].calibracion_hecha).toBe(true)
  })

  it('el wizard exige ajuste con un 2 y guarda la valoración', async () => {
    const p = demo._estado.panelistas[0]
    p.perfil_completado = true; p.calibracion_hecha = true
    await entrarComo(CLAVES_DEMO.experto)
    fireEvent.click(await screen.findByRole('link', { name: 'Empezar' }))
    expect(await screen.findByRole('button', { name: 'He leído: puntuar' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'He leído: puntuar' }))
    const grupos = await screen.findAllByRole('radiogroup')
    expect(grupos.length).toBe(4)
    // 4, 2, 4, 4 → la claridad en 2 obliga a ajustar
    const valores = [4, 2, 4, 4]
    grupos.forEach((g, i) => fireEvent.click(g.querySelectorAll('button')[valores[i] - 1]))
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    expect(await screen.findByText(/Has puntuado 1 o 2/)).toBeTruthy()
    const seguir = screen.getByRole('button', { name: 'Seguir' })
    expect(seguir.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Sobre qué parte'), { target: { value: 'definicion' } })
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'ambiguedad' } })
    fireEvent.change(screen.getByLabelText(/Redacción alternativa/), { target: { value: 'Mi redacción.' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Seguir' }).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    expect(await screen.findByText('Tus puntuaciones')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y siguiente' }))
    await waitFor(() => {
      const v = demo._estado.valoraciones.find((x) => x.panelista_id === 1 && x.concepto_id === 'DEMO-00001')
      expect(v?.completa).toBe(true)
      expect(v.puntuaciones).toEqual({ relevancia: 4, claridad: 2, representatividad: 4, comprensibilidad: 4 })
      expect(v.ajustes[0].redaccion).toBe('Mi redacción.')
    })
    expect(window.location.hash).toBe('#/c/DEMO-00002')
  })

  it('la abstención no exige puntuar y deja el estado abstenida', async () => {
    const p = demo._estado.panelistas[0]
    p.perfil_completado = true; p.calibracion_hecha = true
    window.location.hash = '#/c/DEMO-00003'
    await entrarComo(CLAVES_DEMO.experto)
    fireEvent.click(await screen.findByRole('button', { name: 'He leído: puntuar' }))
    fireEvent.click(await screen.findByRole('button', { name: /fuera de mi ámbito: me abstengo/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar y siguiente' }))
    await waitFor(() => {
      const a = demo._estado.asignaciones.find((x) => x.panelista_id === 1 && x.concepto_id === 'DEMO-00003')
      expect(a.estado).toBe('abstenida')
    })
  })

  it('al terminar un módulo pide la pregunta de cobertura', async () => {
    const p = demo._estado.panelistas[0]
    p.perfil_completado = true; p.calibracion_hecha = true
    // DEMO-00001 ya hecha; al cerrar DEMO-00002 se completa D01.M01
    await demo.rpc('valida_guardar', { clave: CLAVES_DEMO.experto, concepto_id: 'DEMO-00001', datos: { puntuaciones: { relevancia: 4, claridad: 4, representatividad: 4, comprensibilidad: 4 } } })
    window.location.hash = '#/c/DEMO-00002'
    await entrarComo(CLAVES_DEMO.experto)
    fireEvent.click(await screen.findByRole('button', { name: 'He leído: puntuar' }))
    const grupos = await screen.findAllByRole('radiogroup')
    grupos.forEach((g) => fireEvent.click(g.querySelectorAll('button')[3]))
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar y siguiente' }))
    await waitFor(() => expect(window.location.hash).toBe('#/modulo/D01.M01'))
    expect(await screen.findByText('Fin del módulo')).toBeTruthy()
    const grupo = await screen.findByRole('radiogroup', { name: 'Exhaustividad' })
    fireEvent.click(grupo.querySelectorAll('button')[3])
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y seguir' }))
    await waitFor(() => expect(demo._estado.cobertura.length).toBe(1))
    expect(demo._estado.cobertura[0].exhaustividad).toBe(4)
  })
})

describe('flujo del paciente', () => {
  it('ve solo la explicación de paciente y su instrumento', async () => {
    await entrarComo(CLAVES_DEMO.paciente)
    fireEvent.click(await screen.findByRole('button', { name: 'Empezar' }))
    fireEvent.click(await screen.findByRole('link', { name: 'Empezar' }))
    expect(await screen.findByRole('radiogroup', { name: '¿Se entiende?' })).toBeTruthy()
    expect(screen.queryByText('Explicación profesional')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Se entiende a la primera' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Igual que antes de leerlo' }))
    fireEvent.click(screen.getByLabelText('Suena a que la culpa es mía'))
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar y siguiente' }))
    await waitFor(() => {
      const v = demo._estado.valoraciones.find((x) => x.panelista_id === 2)
      expect(v?.completa).toBe(true)
      expect(v.paciente).toEqual({ comprension: 'si', efecto: 'igual', vetos: ['culpa'] })
    })
  })
})
