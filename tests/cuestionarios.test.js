import { describe, it, expect } from 'vitest'
import {
  egdc, phq9, gad7, gravedadPhq9, gravedadGad7, puntosDias, puntosDiscapacidad, resumenInstrumentos,
  EGDC_ITEMS, EGDC_DIAS_TRAMOS, diasDeTramo, PHQ9_ITEMS, PHQ9_ITEM_RIESGO, PHQ9_FUNCIONAL,
  GAD7_ITEMS, GAD7_OPCIONES, PHQ9_OPCIONES, AYUDA_RIESGO,
} from '../src/lib/cuestionarios.js'

// Un caso completo de EGDC: intensidad media 6 → 60/100; discapacidad media 5 → 50/100.
const DOLOR = {
  egdc_dias_dolor: 150, egdc_ahora: 5, egdc_peor: 8, egdc_medio: 5,
  egdc_dias: '16-24', egdc_diaria: 5, egdc_social: 6, egdc_trabajo: 4,
}

describe('EGDC · Escala de Gradación del Dolor Crónico', () => {
  it('puntúa intensidad y discapacidad sobre 100 y da el grado', () => {
    const r = egdc(DOLOR)
    expect(r.completo).toBe(true)
    expect(r.intensidad).toBe(60)
    expect(r.discapacidad).toBe(50)
    // tramo 16-24 → 2 puntos · discapacidad 50 → 2 puntos · total 4 → grado III
    expect(r.puntos).toBe(4)
    expect(r.grado).toBe(3)
    expect(r.nombre).toBe('Grado III')
  })

  it('los puntos por días y por discapacidad siguen los cortes de Von Korff', () => {
    expect([0, 6, 7, 14, 15, 30, 31].map(puntosDias)).toEqual([0, 0, 1, 1, 2, 2, 3])
    expect([0, 29, 30, 49, 50, 69, 70].map(puntosDiscapacidad)).toEqual([0, 0, 1, 1, 2, 2, 3])
  })

  it('la versión española pregunta los días por tramos, y cada tramo puntúa por su punto medio', () => {
    expect(EGDC_DIAS_TRAMOS.length).toBe(11)
    expect(EGDC_DIAS_TRAMOS.map(([clave]) => puntosDias(clave)))
      .toEqual([0, 0, 0, 0, 0, 1, 1, 2, 3, 3, 3])
    // Los dos tramos que caen a caballo de un corte, fijados aquí para que no cambien sin querer.
    expect(diasDeTramo('11-15')).toBe(13)      // → 1 punto, no 2
    expect(diasDeTramo('25-60')).toBe(42.5)    // → 3 puntos, no 2
    // Y sigue entendiendo un número suelto, que es como respondió quien contestó antes.
    expect(diasDeTramo(20)).toBe(20)
    expect(puntosDias(20)).toBe(2)
    expect(diasDeTramo('')).toBeNull()
  })

  it('sin dolor ni días perdidos es grado 0, y el dolor intenso sin discapacidad es grado II', () => {
    const cero = Object.fromEntries(EGDC_ITEMS.map(([k]) => [k, 0]))
    expect(egdc({ ...cero, egdc_dias: 'ninguno' }).grado).toBe(0)
    // Intensidad 70, discapacidad 0, sin días perdidos: duele mucho pero no incapacita.
    expect(egdc({ ...cero, egdc_ahora: 7, egdc_peor: 7, egdc_medio: 7, egdc_dias: 'ninguno' }).grado).toBe(2)
    // Lo mismo pero con intensidad baja: grado I.
    expect(egdc({ ...cero, egdc_ahora: 3, egdc_peor: 4, egdc_medio: 2, egdc_dias: 'ninguno' }).grado).toBe(1)
  })

  it('si falta cualquier ítem no inventa un grado', () => {
    expect(egdc({ ...DOLOR, egdc_trabajo: '' }).completo).toBe(false)
    expect(egdc({ ...DOLOR, egdc_dias: null }).grado).toBeNull()
    expect(egdc({ ...DOLOR, egdc_dias: 'tramo-que-no-existe' }).completo).toBe(false)
    expect(egdc({}).completo).toBe(false)
  })
})

describe('PHQ-9', () => {
  const todo = (n) => Object.fromEntries(PHQ9_ITEMS.map(([k]) => [k, n]))

  it('son los nueve ítems del instrumento y el total va de 0 a 27', () => {
    expect(PHQ9_ITEMS.length).toBe(9)
    expect(phq9(todo(0)).total).toBe(0)
    expect(phq9(todo(3)).total).toBe(27)
  })

  it('reparte las franjas de gravedad de Kroenke 2001', () => {
    expect([0, 4, 5, 9, 10, 14, 15, 19, 20, 27].map(gravedadPhq9))
      .toEqual(['mínima o ninguna', 'mínima o ninguna', 'leve', 'leve', 'moderada', 'moderada',
                'moderadamente grave', 'moderadamente grave', 'grave', 'grave'])
  })

  it('el corte de decisión del cribado es 10, no la franja', () => {
    const nueve = { ...todo(1), phq9_animo: 2 }        // 8 × 1 + 2 = 10
    expect(phq9({ ...todo(1), phq9_animo: 1 }).total).toBe(9)
    expect(phq9({ ...todo(1), phq9_animo: 1 }).positivo).toBe(false)
    expect(phq9(nueve).total).toBe(10)
    expect(phq9(nueve).positivo).toBe(true)
  })

  it('un cero es una respuesta, no un hueco', () => {
    expect(phq9(todo(0)).completo).toBe(true)
    expect(phq9({ ...todo(0), phq9_lentitud: '' }).completo).toBe(false)
    expect(phq9({}).total).toBeNull()
  })

  it('el ítem 9 se señala aparte, y ya con el cuestionario a medias', () => {
    // Es lo que dispara los recursos de ayuda en pantalla: no puede esperar a que termine.
    expect(phq9({ [PHQ9_ITEM_RIESGO]: 1 }).completo).toBe(false)
    expect(phq9({ [PHQ9_ITEM_RIESGO]: 1 }).riesgo).toBe(true)
    expect(phq9({ ...todo(0) }).riesgo).toBe(false)
    expect(phq9({ ...todo(0), [PHQ9_ITEM_RIESGO]: 3 }).riesgo).toBe(true)
    // Y marcar el ítem 9 no basta para dar positivo el cribado: son cosas distintas.
    expect(phq9({ ...todo(0), [PHQ9_ITEM_RIESGO]: 3 }).positivo).toBe(false)
  })

  it('el ítem funcional acompaña pero no suma al total', () => {
    expect(phq9({ ...todo(1), [PHQ9_FUNCIONAL]: 3 }).total).toBe(9)
    expect(phq9({ ...todo(1), [PHQ9_FUNCIONAL]: 3 }).funcional).toBe(3)
  })

  it('los recursos de ayuda incluyen los teléfonos atendidos y dicen que aquí no lee nadie', () => {
    expect(AYUDA_RIESGO.recursos.map(([n]) => n)).toContain('024')
    expect(AYUDA_RIESGO.recursos.map(([n]) => n)).toContain('112')
    expect(AYUDA_RIESGO.aviso).toMatch(/nadie lee tus respuestas en el momento/)
  })
})

describe('GAD-7', () => {
  const todo = (n) => Object.fromEntries(GAD7_ITEMS.map(([k]) => [k, n]))

  it('son siete ítems y el total va de 0 a 21', () => {
    expect(GAD7_ITEMS.length).toBe(7)
    expect(gad7(todo(0)).total).toBe(0)
    expect(gad7(todo(3)).total).toBe(21)
  })

  it('reparte las franjas de Spitzer 2006 y corta la decisión en 10', () => {
    expect([0, 4, 5, 9, 10, 14, 15, 21].map(gravedadGad7))
      .toEqual(['mínima o ninguna', 'mínima o ninguna', 'leve', 'leve', 'moderada', 'moderada', 'grave', 'grave'])
    expect(gad7({ ...todo(1), gad7_miedo: 2 }).total).toBe(8)
    expect(gad7({ ...todo(1), gad7_miedo: 2 }).positivo).toBe(false)
    expect(gad7({ ...todo(1), gad7_miedo: 4 }).positivo).toBe(true)     // 6 + 4 = 10
  })

  it('un cero es una respuesta, no un hueco', () => {
    expect(gad7(todo(0)).completo).toBe(true)
    expect(gad7({ ...todo(0), gad7_irritable: '' }).completo).toBe(false)
    expect(gad7({}).total).toBeNull()
  })

  it('comparte con el PHQ-9 las cuatro respuestas, que es lo que deja contestarlos de corrido', () => {
    expect(GAD7_OPCIONES).toBe(PHQ9_OPCIONES)
  })

  it('mide otra cosa que el PHQ-9: contestar uno no rellena el otro', () => {
    const soloAnsiedad = todo(3)
    expect(gad7(soloAnsiedad).completo).toBe(true)
    expect(phq9(soloAnsiedad).completo).toBe(false)
  })
})

describe('resumen para la dirección', () => {
  it('une en una línea lo que esté contestado', () => {
    const conAnimo = Object.fromEntries(PHQ9_ITEMS.map(([k]) => [k, 2]))
    const conAnsiedad = Object.fromEntries(GAD7_ITEMS.map(([k]) => [k, 1]))
    const linea = resumenInstrumentos({ ...DOLOR, ...conAnimo, ...conAnsiedad })
    expect(linea).toMatch(/EGDC Grado III \(intensidad 60\/100, discapacidad 50\/100\)/)
    expect(linea).toMatch(/PHQ-9 18\/27 · depresión moderadamente grave \(\+\)/)
    expect(linea).toMatch(/GAD-7 7\/21 · ansiedad leve(?! \(\+\))/)
  })

  it('el ítem 9 marcado se le enseña a la dirección, aunque el resto esté a medias', () => {
    expect(resumenInstrumentos({ ...DOLOR, [PHQ9_ITEM_RIESGO]: 2 })).toMatch(/ítem 9 marcado/)
    expect(resumenInstrumentos({ ...DOLOR })).not.toMatch(/ítem 9/)
  })

  it('un perfil vacío no dice nada', () => {
    expect(resumenInstrumentos({})).toBe('')
  })
})
