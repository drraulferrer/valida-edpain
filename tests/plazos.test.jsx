import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { crearDemo, CLAVES_DEMO } from '../src/lib/demo.js'
import { diasRestantes, nivel } from '../src/componentes/CuentaAtras.jsx'

let demo
vi.mock('../src/lib/api.js', async () => {
  const real = await vi.importActual('../src/lib/api.js')
  const via = (nombre) => (...a) => demo.rpc(nombre, {
    valida_entrar: { clave: a[0] },
    valida_bloque: { clave: a[0] },
    valida_concepto: { clave: a[0], concepto_id: a[1] },
    valida_guardar: { clave: a[0], concepto_id: a[1], datos: a[2] },
    valida_publico: { estudio: a[0] },
  }[nombre])
  let guardada = ''
  return {
    ...real, DEMO: true,
    entrar: via('valida_entrar'), bloque: via('valida_bloque'), concepto: via('valida_concepto'), guardar: via('valida_guardar'),
    publico: via('valida_publico'), evento: async () => {},
    claveGuardada: () => guardada, guardarClave: (c) => { guardada = c || '' },
  }
})

import App from '../src/App.jsx'
import * as api from '../src/lib/api.js'

beforeEach(() => { cleanup(); demo = crearDemo(); api.guardarClave(''); window.location.hash = '#/'; window.scrollTo = () => {} })

const entrar = async (clave) => {
  render(<App />)
  const input = await screen.findByPlaceholderText('xxxx-xxxx-xxxx')
  fireEvent.change(input, { target: { value: clave } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

const listoParaValidar = () => {
  const p = demo._estado.panelistas[0]
  p.perfil_completado = true
  p.calibracion_hecha = true
  return p
}

describe('cuenta atrás', () => {
  it('traduce los días que quedan a un nivel de urgencia', () => {
    expect(diasRestantes(null)).toBe(null)
    expect(diasRestantes({ dias_restantes: 6.2 })).toBe(7)
    expect(nivel(10)).toBe('ok')
    expect(nivel(3)).toBe('aviso')
    expect(nivel(1)).toBe('peligro')
    expect(nivel(0)).toBe('peligro')
  })

  it('aparece arriba, en la cabecera, y con la frase entera en el bloque', async () => {
    listoParaValidar()
    await entrar(CLAVES_DEMO.experto)
    expect(await screen.findByText(/conceptos en/)).toBeTruthy()
    expect(screen.getByText('10 días')).toBeTruthy()               // marcador de la cabecera
    expect(screen.getByText(/Te quedan 10 días/)).toBeTruthy()     // frase del bloque
    expect(screen.getByText(/Te faltan 6 conceptos/)).toBeTruthy()
  })

  it('avisa el último día y cuando ha vencido', async () => {
    const p = listoParaValidar()
    const plazo = demo._estado.plazos.find((x) => x.panelista_id === p.id)
    plazo.inicio = new Date(Date.now() - 9.5 * 86400000).toISOString()
    await entrar(CLAVES_DEMO.experto)
    expect(await screen.findByText(/Hoy es el último día/)).toBeTruthy()
    expect(screen.getByText('último día')).toBeTruthy()
  })

  it('con el plazo vencido no deja guardar y lo dice', async () => {
    const p = listoParaValidar()
    const plazo = demo._estado.plazos.find((x) => x.panelista_id === p.id)
    plazo.inicio = new Date(Date.now() - 20 * 86400000).toISOString()
    await entrar(CLAVES_DEMO.experto)
    expect(await screen.findByText(/Tu plazo terminó el/)).toBeTruthy()
    await expect(demo.rpc('valida_guardar', {
      clave: CLAVES_DEMO.experto, concepto_id: 'DEMO-00001',
      datos: { puntuaciones: { relevancia: 4, claridad: 4, representatividad: 4 } },
    })).rejects.toThrow(/plazo/)
  })
})

describe('avisos de la dirección', () => {
  const conPlazo = (dias) => {
    for (const pl of demo._estado.plazos) pl.inicio = new Date(Date.now() - (10 - dias) * 86400000).toISOString()
  }
  const avisos = () => demo.rpc('valida_dir_avisos', { clave: CLAVES_DEMO.direccion })

  it('a la mitad del plazo, a 3 días, a 1 día y al vencer', async () => {
    conPlazo(6)
    expect((await avisos()).length).toBe(0)                       // aún no ha llegado a la mitad
    conPlazo(4)
    expect((await avisos()).every((a) => a.tipo === 'mitad')).toBe(true)
    conPlazo(3)
    expect((await avisos()).some((a) => a.tipo === 'tres_dias')).toBe(true)
    conPlazo(1)
    expect((await avisos()).some((a) => a.tipo === 'un_dia')).toBe(true)
    conPlazo(-1)
    const v = await avisos()
    expect(v.every((a) => a.tipo === 'vencido')).toBe(true)
    expect(v[0].pendientes).toBeGreaterThan(0)
  })

  it('el que termina su bloque deja de recibir avisos', async () => {
    conPlazo(2)
    const antes = await avisos()
    // los jueces PAN-02..07 de la demo ya tienen su bloque hecho: solo salen quienes tienen pendientes
    expect(antes.length).toBeGreaterThan(0)
    expect(antes.every((a) => a.pendientes > 0)).toBe(true)
    const objetivo = antes[0]
    const p = demo._estado.panelistas.find((x) => x.codigo === objetivo.codigo)
    for (const a of demo._estado.asignaciones.filter((x) => x.panelista_id === p.id)) a.estado = 'hecha'
    const despues = await avisos()
    expect(despues.find((a) => a.codigo === objetivo.codigo)).toBeUndefined()
  })

  it('marcar como enviado evita que se repita, y ampliar el plazo los reinicia', async () => {
    conPlazo(1)
    const antes = await avisos()
    const uno = antes[0]
    await demo.rpc('valida_dir_marcar_avisos', { clave: CLAVES_DEMO.direccion, codigos: [uno.codigo], tipo: uno.tipo })
    expect((await avisos()).find((a) => a.codigo === uno.codigo && a.tipo === uno.tipo)).toBeUndefined()
    const nuevo = await demo.rpc('valida_dir_plazo', { clave: CLAVES_DEMO.direccion, codigo: uno.codigo, dias: 30, motivo: 'ampliación' })
    expect(nuevo.dias).toBe(30)
    expect(nuevo.dias_restantes).toBeGreaterThan(3)
    expect(demo._estado.avisosEnviados.filter((a) => a.tipo === uno.tipo).length).toBe(0)
  })
})
