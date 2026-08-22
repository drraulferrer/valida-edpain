import { describe, it, expect } from 'vitest'
import { prn, muestrear } from '../src/lib/prn.js'

// Vectores calculados con `python3 pipeline/prn.py valida-2026 ...`: los dos lenguajes
// tienen que dar EXACTAMENTE el mismo número, o la muestra no sería reproducible.
const VECTORES = {
  'CPT-00001': 0.9132712180346365,
  'CPT-00002': 0.4539525885597997,
  'CPT-04030': 0.9250640238192032,
  'CPT-00070': 0.4545764584543506,
}

describe('prn', () => {
  it('coincide bit a bit con pipeline/prn.py', async () => {
    for (const [id, esperado] of Object.entries(VECTORES)) {
      expect(await prn('valida-2026', id)).toBe(esperado)
    }
  })
  it('cambia con la semilla y está en [0, 1)', async () => {
    const a = await prn('valida-2026', 'CPT-00001')
    const b = await prn('otra', 'CPT-00001')
    expect(a).not.toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
  })
})

describe('muestrear', () => {
  const corpus = []
  for (const [dom, n] of [['D01', 200], ['D11', 300], ['D15', 30], ['D12', 50]]) {
    for (let i = 0; i < n; i += 1) {
      // prn sintético determinista, suficiente para probar las propiedades
      corpus.push({ id: `${dom}-${i}`, dominio: dom, prn: ((i * 7919) % 1000) / 1000 })
    }
  }
  it('es monótona: la muestra al 10 % está dentro de la del 25 %', () => {
    const m10 = muestrear(corpus, 0.10, 8)
    const m25 = muestrear(corpus, 0.25, 8)
    for (const id of m10) expect(m25.has(id)).toBe(true)
    expect(m25.size).toBeGreaterThan(m10.size)
  })
  it('aplica el suelo a los dominios pequeños', () => {
    const m = muestrear(corpus, 0.10, 8)
    const d15 = [...m].filter((id) => id.startsWith('D15')).length
    const d12 = [...m].filter((id) => id.startsWith('D12')).length
    expect(d15).toBe(8)
    expect(d12).toBe(8)
  })
  it('con el corpus parcial, lo incluido sigue incluido al crecer (salvo efecto del suelo)', () => {
    const parcial = corpus.filter((c) => c.dominio !== 'D15' || Number(c.id.split('-')[1]) < 10)
    const antes = muestrear(parcial, 0.10, 8)
    const despues = muestrear(corpus, 0.10, 8)
    const grandes = [...antes].filter((id) => !id.startsWith('D15'))
    for (const id of grandes) expect(despues.has(id)).toBe(true)
  })
})
