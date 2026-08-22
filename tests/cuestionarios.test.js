import { describe, it, expect } from 'vitest'
import {
  egdc, phq4, hads, puntosDias, puntosDiscapacidad, resumenInstrumentos,
  EGDC_ITEMS, PHQ4_ITEMS, HADS_ITEMS, HADS_DISPONIBLE,
} from '../src/lib/cuestionarios.js'

// Un caso completo de EGDC: intensidad media 6 → 60/100; discapacidad media 5 → 50/100.
const DOLOR = {
  egdc_ahora: 5, egdc_peor: 8, egdc_medio: 5,
  egdc_dias: 20, egdc_diaria: 5, egdc_social: 6, egdc_trabajo: 4,
}

describe('EGDC · Escala de Gradación del Dolor Crónico', () => {
  it('puntúa intensidad y discapacidad sobre 100 y da el grado', () => {
    const r = egdc(DOLOR)
    expect(r.completo).toBe(true)
    expect(r.intensidad).toBe(60)
    expect(r.discapacidad).toBe(50)
    // 20 días → 2 puntos · discapacidad 50 → 2 puntos · total 4 → grado III
    expect(r.puntos).toBe(4)
    expect(r.grado).toBe(3)
    expect(r.nombre).toBe('Grado III')
  })

  it('los puntos por días y por discapacidad siguen los cortes de Von Korff', () => {
    expect([0, 6, 7, 14, 15, 30, 31].map(puntosDias)).toEqual([0, 0, 1, 1, 2, 2, 3])
    expect([0, 29, 30, 49, 50, 69, 70].map(puntosDiscapacidad)).toEqual([0, 0, 1, 1, 2, 2, 3])
  })

  it('sin dolor ni días perdidos es grado 0, y el dolor intenso sin discapacidad es grado II', () => {
    const cero = Object.fromEntries(EGDC_ITEMS.map(([k]) => [k, 0]))
    expect(egdc({ ...cero, egdc_dias: 0 }).grado).toBe(0)
    // Intensidad 70, discapacidad 0, sin días perdidos: duele mucho pero no incapacita.
    expect(egdc({ ...cero, egdc_ahora: 7, egdc_peor: 7, egdc_medio: 7, egdc_dias: 0 }).grado).toBe(2)
    // Lo mismo pero con intensidad baja: grado I.
    expect(egdc({ ...cero, egdc_ahora: 3, egdc_peor: 4, egdc_medio: 2, egdc_dias: 0 }).grado).toBe(1)
  })

  it('si falta cualquier ítem no inventa un grado', () => {
    expect(egdc({ ...DOLOR, egdc_trabajo: '' }).completo).toBe(false)
    expect(egdc({ ...DOLOR, egdc_dias: null }).grado).toBeNull()
    expect(egdc({}).completo).toBe(false)
  })
})

describe('PHQ-4', () => {
  const todo = (n) => Object.fromEntries(PHQ4_ITEMS.map(([k]) => [k, n]))

  it('suma las dos subescalas y marca los cortes de 3', () => {
    const r = phq4({ phq4_nervioso: 2, phq4_preocupacion: 2, phq4_interes: 1, phq4_animo: 0 })
    expect(r.ansiedad).toBe(4)
    expect(r.depresion).toBe(1)
    expect(r.total).toBe(5)
    expect(r.ansiedad_positiva).toBe(true)
    expect(r.depresion_positiva).toBe(false)
  })

  it('gradúa el total de 0 a 12', () => {
    expect(phq4(todo(0)).gravedad).toBe('ninguna')
    expect(phq4(todo(1)).gravedad).toBe('leve')
    expect(phq4(todo(2)).gravedad).toBe('moderada')
    expect(phq4(todo(3)).gravedad).toBe('grave')
    expect(phq4(todo(3)).total).toBe(12)
  })

  it('un cero es una respuesta, no un hueco', () => {
    expect(phq4(todo(0)).completo).toBe(true)
    expect(phq4({ ...todo(0), phq4_animo: '' }).completo).toBe(false)
  })
})

describe('HADS', () => {
  it('no se distribuye sin licencia: la puntuación está, los ítems no', () => {
    expect(HADS_ITEMS.length).toBe(14)
    expect(HADS_ITEMS.every((i) => i.texto === '')).toBe(true)
    expect(HADS_DISPONIBLE).toBe(false)
  })

  it('cuando haya ítems, cada subescala va de 0 a 21 con los cortes 8 y 11', () => {
    // Se le pasan unos ítems de prueba, que es justo lo que hará el día que haya licencia.
    const items = Array.from({ length: 14 }, (_, i) => ({ clave: `h${i}`, dominio: i % 2 === 0 ? 'ansiedad' : 'depresion' }))
    const resp = (a, d) => Object.fromEntries(items.map((it, i) => [it.clave, i % 2 === 0 ? a : d]))
    expect(hads(resp(3, 3), items)).toMatchObject({ ansiedad: 21, depresion: 21, categoria_ansiedad: 'caso probable' })
    expect(hads(resp(1, 0), items)).toMatchObject({ ansiedad: 7, categoria_ansiedad: 'normal', categoria_depresion: 'normal' })
    // Ocho puntos de ansiedad (2+1+1+1+1+1+1) caen en la franja dudosa.
    const dudoso = Object.fromEntries(items.map((it, i) => [it.clave, i === 0 ? 2 : i % 2 === 0 ? 1 : 0]))
    expect(hads(dudoso, items)).toMatchObject({ ansiedad: 8, categoria_ansiedad: 'dudoso' })
    expect(hads({}, items).completo).toBe(false)
  })

  it('sin ítems no aporta nada al resumen', () => {
    expect(resumenInstrumentos(DOLOR)).not.toMatch(/HADS/)
  })
})

describe('resumen para la dirección', () => {
  it('une en una línea lo que esté contestado', () => {
    const linea = resumenInstrumentos({ ...DOLOR, phq4_nervioso: 3, phq4_preocupacion: 3, phq4_interes: 0, phq4_animo: 0 })
    expect(linea).toMatch(/EGDC Grado III \(intensidad 60\/100, discapacidad 50\/100\)/)
    expect(linea).toMatch(/PHQ-4 6\/12 · ansiedad 6\/6 \(\+\) · depresión 0\/6/)
  })

  it('un perfil vacío no dice nada', () => {
    expect(resumenInstrumentos({})).toBe('')
  })
})
