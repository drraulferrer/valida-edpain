import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as api from '../src/lib/api.js'
import Direccion from '../src/pantallas/direccion/Direccion.jsx'
import { aCsv } from '../src/pantallas/direccion/comun.jsx'

// Estado de sesión compartido con el mock (vi.mock se iza por encima de los imports).
const sesion = vi.hoisted(() => ({ clave: 'demo-dire-cci1' }))

// La capa de datos se sustituye por el backend de demostración en memoria: las mismas RPC
// `valida_dir_*`, con 60 ms de latencia, y una clave de dirección ya en sesión.
vi.mock('../src/lib/api.js', async () => {
  const { crearDemo } = await import('../src/lib/demo.js')
  const demo = crearDemo()
  const via = (nombre, params) => vi.fn((...args) => demo.rpc(nombre, params(...args)))
  return {
    DEMO: true,
    claveDireccion: () => sesion.clave,
    guardarClaveDireccion: (c) => { sesion.clave = c || '' },
    normalizarClave: (t) => (t || '').trim(),
    dirDatos: via('valida_dir_datos', (clave) => ({ clave })),
    dirConcepto: via('valida_dir_concepto', (clave, concepto_id) => ({ clave, concepto_id })),
    dirAlta: via('valida_dir_alta', (clave, codigo, perfil, disciplina, dominios, capacidad, notas) =>
      ({ clave, codigo, perfil, disciplina, dominios, capacidad, notas })),
    dirReclave: via('valida_dir_reclave', (clave, codigo) => ({ clave, codigo })),
    dirPanelista: via('valida_dir_panelista', (clave, codigo, datos) => ({ clave, codigo, datos })),
    dirAsignar: via('valida_dir_asignar', (clave, perfil_objetivo, max_generalistas = 3) => ({ clave, perfil_objetivo, max_generalistas })),
    dirRonda: via('valida_dir_ronda', (clave, conceptos) => ({ clave, conceptos })),
    dirCerrar: via('valida_dir_cerrar', (clave) => ({ clave })),
    dirEstudio: via('valida_dir_estudio', (clave, datos) => ({ clave, datos })),
    dirPropuesta: via('valida_dir_propuesta', (clave, valoracion_id, indice, estado, nota) =>
      ({ clave, valoracion_id, indice, estado, nota })),
  }
})

const ruta = (pestana) => ({ partes: pestana ? ['direccion', pestana] : ['direccion'], ruta: pestana ? `/direccion/${pestana}` : '/direccion' })
const filaDe = (texto) => screen.getAllByText(texto)[0].closest('tr')

describe('Panel de dirección', () => {
  afterEach(() => { cleanup(); sesion.clave = 'demo-dire-cci1' })

  it('sin clave en sesión pide la clave y entra con la de la demo', async () => {
    sesion.clave = ''
    render(<Direccion ruta={ruta()} />)
    const input = await screen.findByPlaceholderText('xxxx-xxxx-xxxx')
    expect(screen.getByText(/demo-dire-cci1/)).toBeTruthy()
    fireEvent.change(input, { target: { value: 'clave-mala-0000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    fireEvent.change(input, { target: { value: 'demo-dire-cci1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Conceptos en plataforma')).toBeTruthy()
    expect(sesion.clave).toBe('demo-dire-cci1')
  })

  it('carga los datos y pinta el Resumen con sus KPI', async () => {
    render(<Direccion ruta={ruta()} />)
    expect(await screen.findByText('Conceptos en plataforma')).toBeTruthy()
    expect(screen.getByText('Jueces por concepto')).toBeTruthy()
    expect(screen.getByText('Panelistas activos')).toBeTruthy()
    expect(screen.getByText('Tasa de validez · aleatorio')).toBeTruthy()
    expect(document.querySelector('.kpi .v').textContent).toBe('6')
    expect(screen.getByRole('tab', { name: 'Resumen' }).getAttribute('aria-selected')).toBe('true')
    expect(api.dirDatos).toHaveBeenCalledWith('demo-dire-cci1')
  })

  it('Consenso lista los seis conceptos de la demo con su clase', async () => {
    render(<Direccion ruta={ruta('consenso')} />)
    await screen.findAllByText('DEMO-00001')
    for (const n of [1, 2, 3, 4, 5, 6]) expect(screen.getAllByText(`DEMO-0000${n}`).length).toBeGreaterThan(0)
    expect(document.querySelectorAll('.sem.revisar').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('.sem.partido').length).toBeGreaterThan(0)
    expect(filaDe('DEMO-00005').querySelector('.sem.revisar')).toBeTruthy()
    expect(filaDe('DEMO-00003').querySelector('.sem.partido')).toBeTruthy()
    expect(filaDe('DEMO-00001').querySelector('.sem.valido')).toBeTruthy()
  })

  it('al pulsar una fila de Consenso se abre el expediente del concepto', async () => {
    render(<Direccion ruta={ruta('consenso')} />)
    await screen.findAllByText('DEMO-00005')
    fireEvent.click(filaDe('DEMO-00005'))
    expect(await screen.findByText('Por dimensión')).toBeTruthy()
    expect(screen.getByText(/Valoraciones de expertos \(6\)/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ver texto completo' }))
    await waitFor(() => expect(api.dirConcepto).toHaveBeenCalledWith('demo-dire-cci1', 'DEMO-00005'))
    expect(await screen.findByText('Explicación profesional')).toBeTruthy()
  })

  it('Panelistas lista PAN-01 a PAN-07 con sus acciones', async () => {
    render(<Direccion ruta={ruta('panelistas')} />)
    await screen.findAllByText('PAN-01')
    for (const n of [1, 2, 3, 4, 5, 6, 7]) expect(screen.getAllByText(`PAN-0${n}`).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Nueva clave' }).length).toBeGreaterThanOrEqual(7)
    expect(screen.getByText('Alta de panelista')).toBeTruthy()
  })

  it('Propuestas muestra una redacción alternativa y «Aplicada» llama a la api', async () => {
    render(<Direccion ruta={ruta('propuestas')} />)
    const botones = await screen.findAllByRole('button', { name: 'Aplicada' })
    expect(botones.length).toBeGreaterThan(0)
    fireEvent.click(botones[0])
    await waitFor(() => expect(api.dirPropuesta).toHaveBeenCalled())
    const [clave, valoracionId, indice, estado] = api.dirPropuesta.mock.calls[0]
    expect(clave).toBe('demo-dire-cci1')
    expect(typeof valoracionId).toBe('number')
    expect(indice).toBe(0)
    expect(estado).toBe('aplicada')
    await waitFor(() => expect(document.querySelector('.etiqueta.ok')).toBeTruthy())
  })

  it('Cobertura y Estudio se pintan con sus acciones', async () => {
    render(<Direccion ruta={ruta('cobertura')} />)
    expect(await screen.findByRole('button', { name: 'Asignar expertos' })).toBeTruthy()
    expect(screen.getAllByText('Sensibilización central').length).toBeGreaterThan(0)
    cleanup()
    render(<Direccion ruta={ruta('estudio')} />)
    expect(await screen.findByRole('button', { name: 'Cerrar el estudio' })).toBeTruthy()
    expect(screen.getByText('V de Aiken mínima por n jueces')).toBeTruthy()
    expect(screen.getByText('0.932')).toBeTruthy()
  })
})

describe('aCsv', () => {
  it('escapa comas, comillas y saltos de línea y serializa objetos', () => {
    const csv = aCsv([{ a: 'x, y', b: 'di "hola"', c: 'l1\nl2', d: { k: 1 }, e: null }], ['a', 'b', 'c', 'd', 'e'])
    expect(csv.split('\n')[0]).toBe('a,b,c,d,e')
    expect(csv).toContain('"x, y"')
    expect(csv).toContain('"di ""hola"""')
    expect(csv).toContain('"l1\nl2"')
    expect(csv).toContain('"{""k"":1}"')
    expect(csv.endsWith(',')).toBe(true)
  })
})

describe('asignaciones por panelista', () => {
  it('la pestaña Panelistas enseña qué conceptos tiene asignados cada evaluador', async () => {
    render(<Direccion ruta={{ partes: ['direccion', 'panelistas'], ruta: '/direccion/panelistas' }} />)
    const boton = await screen.findByRole('button', { name: 'Conceptos de PAN-02' }, { timeout: 4000 })
    fireEvent.click(boton)
    expect(await screen.findByText('La sensibilización central amplifica la respuesta a estímulos normales')).toBeTruthy()
    expect(screen.getAllByText(/hecha/).length).toBeGreaterThan(0)
  })
})
