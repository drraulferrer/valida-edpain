import { describe, it, expect } from 'vitest'
import { puntuacionFehring, esExpertoFehring, validarPerfilExperto, validarPerfilPaciente, resumenPerfil } from '../src/lib/perfil.js'

describe('puntuación de Fehring adaptada', () => {
  it('doctorado con formación en dolor, publicaciones e investigación llega al máximo', () => {
    const p = { titulacion: 'doctorado', formacion_dolor: true, formacion_dolor_cual: 'Máster en dolor', publicaciones_dolor: '10+', investigacion_dolor: true }
    expect(puntuacionFehring(p, 12)).toBe(14)
    expect(esExpertoFehring(14)).toBe(true)
  })
  it('grado sin nada más no llega al umbral de experto', () => {
    expect(puntuacionFehring({ titulacion: 'grado' }, 0)).toBe(0)
    expect(puntuacionFehring({ titulacion: 'grado', publicaciones_dolor: '1-4' }, 3)).toBe(3)
    expect(esExpertoFehring(3)).toBe(false)
  })
  it('máster con un año de práctica en dolor es experto (5)', () => {
    expect(puntuacionFehring({ titulacion: 'master' }, 1)).toBe(5)
  })
})

describe('validación del perfil', () => {
  const base = { titulacion: 'master', ambitos: ['asistencial'], autoexpertise: 'avanzado', reparto: {}, consentimiento: true }
  it('exige disciplina, titulación, ámbito, años, autoexpertise, dominios y consentimiento', () => {
    expect(validarPerfilExperto(base, 'fisioterapia', 5, ['D01'])).toBe('')
    expect(validarPerfilExperto({ ...base, consentimiento: false }, 'fisioterapia', 5, ['D01'])).toMatch(/aceptar/)
    expect(validarPerfilExperto(base, 'fisioterapia', 5, [])).toMatch(/dominio/)
    expect(validarPerfilExperto({ ...base, reparto: { clinica: 80, docencia: 30 } }, 'fisioterapia', 5, ['D01'])).toMatch(/100/)
    expect(validarPerfilPaciente({ edad: '45-59', anios_dolor: 7, consentimiento: true })).toBe('')
    expect(validarPerfilPaciente({ edad: '', anios_dolor: 7, consentimiento: true })).toMatch(/edad/)
  })
  it('resume el perfil en una línea', () => {
    expect(resumenPerfil({ titulacion: 'doctorado', pais: 'España', ambitos: ['docencia'], publicaciones_dolor: '5-9', autoexpertise: 'experto' })).toBe('Doctorado · España · docencia · 5-9 publicaciones en dolor · autoexpertise experto')
    expect(resumenPerfil({ edad: '60-74', anios_dolor: 10 }, 'paciente')).toBe('60-74 años · 10 años con dolor')
  })
})
