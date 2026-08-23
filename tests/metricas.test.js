import { describe, it, expect } from 'vitest'
import {
  icvi, kappaEstrella, combinaciones, aiken, icAiken, aikenMinimaParaIc, dimension, concepto,
  paciente, scvi, tasaValidez, umbralIcvi, estable,
} from '../src/lib/metricas.js'

const DIMS = ['relevancia', 'claridad', 'representatividad']
const DIMS_PAC = ['comprensibilidad', 'palabras', 'orden']

function fila(puntuaciones, extra = {}) {
  return { panelista: 'PAN-01', perfil: 'experto', ronda: 1, completa: true, abstencion: false,
           banderas: {}, puntuaciones, ...extra }
}
function todas(v, extra = {}) {
  return fila(Object.fromEntries(DIMS.map((d) => [d, v])), extra)
}

describe('I-CVI y kappa*', () => {
  it('cuenta 3 y 4 como acuerdo y excluye valores no válidos', () => {
    expect(icvi([4, 3, 2, 1, 4, 3])).toEqual({ n: 6, acuerdo: 4, icvi: 4 / 6 })
    expect(icvi([4, null, 'x', 3, 0, 5])).toEqual({ n: 2, acuerdo: 2, icvi: 1 })
    expect(icvi([]).icvi).toBeNull()
  })
  it('umbral de Lynn: 1,00 con ≤ 5 jueces y 0,78 desde 6', () => {
    expect(umbralIcvi(5)).toBe(1)
    expect(umbralIcvi(6)).toBe(0.78)
    expect(umbralIcvi(10)).toBe(0.78)
  })
  it('kappa* de Polit 2007: n=6, a=5 → 0,816', () => {
    expect(combinaciones(6, 5)).toBe(6)
    expect(kappaEstrella(6, 5)).toBeCloseTo(0.8161, 3)
    // acuerdo total: pc = 0,5^n, kappa → 1
    expect(kappaEstrella(8, 8)).toBeCloseTo(1, 5)
  })
})

describe('V de Aiken con IC (Penfield & Giacobbi 2004)', () => {
  it('reproduce el ejemplo del proyecto: 7 jueces entre 3 y 4 dan V = 0,81 con IC inferior 0,60', () => {
    const p = [3, 3, 3, 3, 4, 4, 4]
    const V = aiken(p)
    expect(V).toBeCloseTo(0.8095, 3)
    const [lo] = icAiken(V, 7)
    expect(lo).toBeCloseTo(0.600, 2)
  })
  it('la V mínima para que el IC llegue a 0,70 baja con n (tabla de la spec)', () => {
    expect(aikenMinimaParaIc(5)).toBeCloseTo(0.932, 2)
    expect(aikenMinimaParaIc(7)).toBeCloseTo(0.896, 2)
    expect(aikenMinimaParaIc(10)).toBeCloseTo(0.864, 2)
    expect(aikenMinimaParaIc(20)).toBeCloseTo(0.816, 2)
  })
  it('V = 1 con todos en 4 y 0 con todos en 1', () => {
    expect(aiken([4, 4, 4])).toBe(1)
    expect(aiken([1, 1])).toBe(0)
    expect(aiken([])).toBeNull()
  })
})

describe('clasificación de una dimensión', () => {
  it('panel insuficiente con menos de 5', () => {
    const d = dimension([4, 4, 4, 4])
    expect(d.insuficiente).toBe(true)
    expect(d.supera).toBe(false)
  })
  it('supera I-CVI con 7/8 pero no la V con IC: se marca la discrepancia', () => {
    const d = dimension([4, 4, 4, 4, 3, 3, 3, 2])
    expect(d.n).toBe(8)
    expect(d.icvi).toBeCloseTo(0.875, 3)
    expect(d.supera).toBe(true)
    expect(d.supera_aiken).toBe(false)
    expect(d.discrepan).toBe(true)
  })
  it('panel partido: ≥ 30 % en 1 y ≥ 30 % en 4', () => {
    const d = dimension([1, 1, 1, 4, 4, 4, 2])
    expect(d.partido).toBe(true)
  })
  it('histograma y media', () => {
    const d = dimension([1, 2, 3, 4, 4])
    expect(d.histograma).toEqual([1, 1, 1, 2])
    expect(d.media).toBeCloseTo(2.8, 5)
  })
})

describe('clasificación de un concepto', () => {
  it('pendiente sin valoraciones completas', () => {
    expect(concepto([fila({}, { completa: false })], DIMS).clase).toBe('pendiente')
  })
  it('válido con 6 jueces unánimes en 3-4 y sin paciente', () => {
    const filas = Array.from({ length: 6 }, (_, i) => todas(i % 2 ? 3 : 4, { panelista: `PAN-0${i}` }))
    const r = concepto(filas, DIMS)
    expect(r.clase).toBe('valido')
    expect(r.n).toBe(6)
  })
  it('bloqueado por una sola bandera de seguridad aunque el resto esté de acuerdo', () => {
    const filas = Array.from({ length: 7 }, (_, i) => todas(4, { panelista: `PAN-0${i}` }))
    filas[3] = todas(4, { panelista: 'PAN-03', banderas: { seguridad: true } })
    const r = concepto(filas, DIMS)
    expect(r.clase).toBe('bloqueado')
    expect(r.bloqueado_por).toEqual(['PAN-03'])
  })
  it('las abstenciones salen del denominador', () => {
    const filas = Array.from({ length: 6 }, (_, i) => todas(4, { panelista: `PAN-0${i}` }))
    filas.push(fila({}, { panelista: 'PAN-09', abstencion: true }))
    const r = concepto(filas, DIMS)
    expect(r.n).toBe(6)
    expect(r.clase).toBe('valido')
  })
  it('revisar cuando una dimensión no llega al umbral', () => {
    const filas = Array.from({ length: 6 }, (_, i) =>
      fila({ relevancia: 4, claridad: i < 3 ? 2 : 4, representatividad: 4, comprensibilidad: 4 }, { panelista: `PAN-0${i}` }))
    expect(concepto(filas, DIMS).clase).toBe('revisar')
  })
  it('el panel de paciente manda en comprensibilidad cuando hay ≥ 3', () => {
    const filas = Array.from({ length: 6 }, (_, i) => todas(4, { panelista: `PAN-0${i}` }))
    // El paciente puntúa sus dimensiones en la misma Likert 1-4 que el experto.
    const pac = (v, n) => fila(Object.fromEntries(DIMS_PAC.map((d) => [d, v])),
      { panelista: `PAC-0${n}`, perfil: 'paciente', paciente: { efecto: 'igual', vetos: [] } })
    expect(concepto([...filas, pac(4, 1), pac(4, 2), pac(3, 3)], DIMS, null, null, DIMS_PAC).clase).toBe('valido')
    expect(concepto([...filas, pac(1, 1), pac(2, 2), pac(2, 3)], DIMS, null, null, DIMS_PAC).clase).toBe('revisar')
  })
  it('con menos pacientes que el mínimo, el panel experto decide solo', () => {
    const filas = Array.from({ length: 6 }, (_, i) => todas(4, { panelista: `PAN-0${i}` }))
    const pac = fila(Object.fromEntries(DIMS_PAC.map((d) => [d, 1])),
      { panelista: 'PAC-01', perfil: 'paciente', paciente: { efecto: 'igual', vetos: [] } })
    expect(concepto([...filas, pac], DIMS, null, null, DIMS_PAC).clase).toBe('valido')
  })
  it('solo cuenta la ronda pedida', () => {
    const r1 = Array.from({ length: 6 }, (_, i) => todas(2, { panelista: `PAN-0${i}`, ronda: 1 }))
    const r2 = Array.from({ length: 6 }, (_, i) => todas(4, { panelista: `PAN-0${i}`, ronda: 2 }))
    expect(concepto([...r1, ...r2], DIMS, null, 1).clase).toBe('revisar')
    expect(concepto([...r1, ...r2], DIMS, null, 2).clase).toBe('valido')
  })
})

describe('valoraciones de prueba', () => {
  // Un ensayo de la dirección metido en el I-CVI corrompe el resultado publicado.
  it('no entran en la clasificación', () => {
    const reales = Array.from({ length: 6 }, (_, i) => todas(4, { panelista: `PAN-0${i}` }))
    const prueba = Array.from({ length: 6 }, (_, i) => todas(1, { panelista: `PRU-0${i}`, es_prueba: true }))
    expect(concepto(reales, DIMS).clase).toBe('valido')
    // Seis valoraciones de prueba con un 1 en todo: si contaran, esto sería «revisar».
    expect(concepto([...reales, ...prueba], DIMS).clase).toBe('valido')
    expect(concepto([...reales, ...prueba], DIMS).n).toBe(6)
  })

  it('un concepto valorado SOLO por cuentas de prueba queda pendiente, no válido', () => {
    const prueba = Array.from({ length: 6 }, (_, i) => todas(4, { panelista: `PRU-0${i}`, es_prueba: true }))
    expect(concepto(prueba, DIMS).clase).toBe('pendiente')
  })
})

describe('paciente', () => {
  const pac = (v, vetos = []) => ({ puntuaciones: Object.fromEntries(DIMS_PAC.map((d) => [d, v])),
                                    paciente: { efecto: 'calma', vetos } })

  it('resume cada ítem con I-CVI y V de Aiken, igual que el panel experto', () => {
    const p = paciente([pac(4), pac(4), pac(3)], null, DIMS_PAC)
    expect(p.n).toBe(3)
    expect(p.por_dimension.comprensibilidad.icvi).toBe(1)
    expect(p.por_dimension.palabras.V).toBeGreaterThan(0.8)
    expect(p.comprension).toBe(1)
    expect(p.supera).toBe(true)
  })

  it('un veto basta para no superar, por alto que sea el acuerdo', () => {
    const p = paciente([pac(4), pac(4, ['culpa']), pac(4)], null, DIMS_PAC)
    expect(p.comprension).toBe(1)
    expect(p.vetos).toEqual(['culpa'])
    expect(p.supera).toBe(false)
  })

  it('basta con que un ítem no llegue al umbral', () => {
    const filas = [
      { puntuaciones: { comprensibilidad: 4, palabras: 1, orden: 4 }, paciente: { efecto: 'calma', vetos: [] } },
      { puntuaciones: { comprensibilidad: 4, palabras: 1, orden: 4 }, paciente: { efecto: 'calma', vetos: [] } },
      { puntuaciones: { comprensibilidad: 4, palabras: 2, orden: 4 }, paciente: { efecto: 'calma', vetos: [] } },
    ]
    const p = paciente(filas, null, DIMS_PAC)
    expect(p.por_dimension.comprensibilidad.icvi).toBe(1)
    expect(p.por_dimension.palabras.icvi).toBe(0)
    expect(p.supera).toBe(false)
  })

  it('deduce las dimensiones de las puntuaciones si no se le pasan', () => {
    const p = paciente([pac(4), pac(4), pac(4)])
    expect(Object.keys(p.por_dimension).sort()).toEqual([...DIMS_PAC].sort())
  })
})

describe('agregados', () => {
  it('S-CVI/Ave y /UA', () => {
    const c1 = concepto(Array.from({ length: 6 }, (_, i) => todas(4, { panelista: `P${i}` })), DIMS)
    const c2 = concepto(Array.from({ length: 6 }, (_, i) => todas(i < 5 ? 4 : 2, { panelista: `P${i}` })), DIMS)
    const s = scvi([c1, c2], DIMS)
    expect(s.relevancia.ave).toBeCloseTo((1 + 5 / 6) / 2, 5)
    expect(s.relevancia.ua).toBe(0.5)
  })
  it('tasa de validez con IC de Wilson', () => {
    const cls = [...Array(85).fill({ clase: 'valido' }), ...Array(15).fill({ clase: 'revisar' }), { clase: 'pendiente' }]
    const t = tasaValidez(cls)
    expect(t.n).toBe(100)
    expect(t.p).toBe(0.85)
    expect(t.ic[0]).toBeGreaterThan(0.76)
    expect(t.ic[1]).toBeLessThan(0.91)
  })
  it('estabilidad entre rondas', () => {
    expect(estable(0.80, 0.85)).toBe(true)
    expect(estable(0.60, 0.85)).toBe(false)
    expect(estable(null, 0.85)).toBe(false)
  })
})
