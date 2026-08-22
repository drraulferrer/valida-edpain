import { describe, it, expect } from 'vitest'
import { puntuacionFehring, esExpertoFehring, validarPerfilExperto, validarPerfilPaciente, validarIdentidad, partirDois, prepararPerfil, resumenPerfil } from '../src/lib/perfil.js'

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
  const identidad = { nombre: 'Ana', apellidos: 'Ruiz Gil', email: 'ana@ejemplo.org', dois: '' }
  const base = { titulacion: 'master', ambitos: ['asistencial'], autoexpertise: 'avanzado', reparto: {}, consentimiento: true, identidad }
  it('exige disciplina, titulación, ámbito, años, autoexpertise, dominios y consentimiento', () => {
    expect(validarPerfilExperto(base, 'fisioterapia', 5, ['D01'])).toBe('')
    expect(validarPerfilExperto({ ...base, consentimiento: false }, 'fisioterapia', 5, ['D01'])).toMatch(/aceptar/)
    expect(validarPerfilExperto(base, 'fisioterapia', 5, [])).toMatch(/dominio/)
    expect(validarPerfilExperto({ ...base, reparto: { clinica: 80, docencia: 30 } }, 'fisioterapia', 5, ['D01'])).toMatch(/100/)
    expect(validarPerfilPaciente({ edad: '45-59', anios_dolor: 7, consentimiento: true, identidad })).toBe('')
    expect(validarPerfilPaciente({ edad: '', anios_dolor: 7, consentimiento: true, identidad })).toMatch(/edad/)
  })
  it('resume el perfil en una línea', () => {
    expect(resumenPerfil({ titulacion: 'doctorado', pais: 'España', ambitos: ['docencia'], publicaciones_dolor: '5-9', autoexpertise: 'experto' })).toBe('Doctorado · España · docencia · 5-9 publicaciones en dolor · autoexpertise experto')
    expect(resumenPerfil({ edad: '60-74', anios_dolor: 10 }, 'paciente')).toBe('60-74 años · 10 años con dolor')
  })
})

describe('identidad y DOI', () => {
  const ok = { nombre: 'Ana', apellidos: 'Ruiz Gil', email: 'ana@ejemplo.org' }
  it('exige nombre, apellidos y correo válido', () => {
    expect(validarIdentidad(ok)).toBe('')
    expect(validarIdentidad({ ...ok, nombre: '' })).toMatch(/nombre/)
    expect(validarIdentidad({ ...ok, email: 'no-es-correo' })).toMatch(/correo/)
    expect(validarIdentidad({ ...ok, orcid: '1234' })).toMatch(/ORCID/)
    expect(validarIdentidad({ ...ok, orcid: '0000-0002-1825-0097' })).toBe('')
  })
  it('normaliza los DOI y rechaza los que no lo son', () => {
    expect(partirDois('https://doi.org/10.1097/j.pain.001, doi:10.1093/ptj/pzab001\n10.1000/x')).toEqual(['10.1097/j.pain.001', '10.1093/ptj/pzab001', '10.1000/x'])
    expect(validarIdentidad({ ...ok, dois: '10.1097/valido\nesto-no-es-un-doi' })).toMatch(/esto-no-es-un-doi/)
  })
  it('exige DOI si declara publicaciones sobre educación en dolor', () => {
    const f = { titulacion: 'master', ambitos: ['asistencial'], autoexpertise: 'avanzado', reparto: {}, consentimiento: true,
      publicaciones_educacion: '1-4', identidad: { ...ok, dois: '' } }
    expect(validarPerfilExperto(f, 'fisioterapia', 5, ['D01'])).toMatch(/al menos un DOI/)
    expect(validarPerfilExperto({ ...f, identidad: { ...ok, dois: '10.1097/j.pain.001' } }, 'fisioterapia', 5, ['D01'])).toBe('')
  })
  it('prepararPerfil deja la identidad lista para el servidor', () => {
    const r = prepararPerfil({ identidad: { nombre: ' Ana ', apellidos: 'Ruiz', email: ' ANA@Ejemplo.ORG ', dois: 'https://doi.org/10.1/x 10.2/y' } })
    expect(r.identidad).toEqual({ nombre: 'Ana', apellidos: 'Ruiz', email: 'ana@ejemplo.org', filiacion: '', orcid: '', dois: ['10.1/x', '10.2/y'] })
    expect(typeof r.consentimiento_en).toBe('string')
  })
})
