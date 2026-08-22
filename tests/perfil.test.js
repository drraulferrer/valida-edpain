import { describe, it, expect } from 'vitest'
import { puntuacionFehring, esExpertoFehring, validarPerfilExperto, validarPerfilPaciente, validarIdentidad, partirDois, prepararPerfil, resumenPerfil, elegibilidadPaciente, alfabetizacionChew, edadDe, validarNacimiento } from '../src/lib/perfil.js'

// Un perfil de paciente que cumple todo lo obligatorio, para variarlo campo a campo.
const PACIENTE_OK = {
  nacimiento: '1980-05-12', sexo: 'mujer', duracion_dolor: '1_5a', frecuencia_dolor: 'casi_diario', zonas: ['lumbar'],
  diagnosticos: ['inespecifico'],
  egdc_ahora: 5, egdc_peor: 8, egdc_medio: 5, egdc_dias: 20, egdc_diaria: 5, egdc_social: 6, egdc_trabajo: 4,
  phq9_interes: 1, phq9_animo: 1, phq9_sueno: 2, phq9_energia: 2, phq9_apetito: 0,
  phq9_fracaso: 0, phq9_concentracion: 1, phq9_lentitud: 0, phq9_muerte: 0,
  educacion_previa: 'nunca', ayuda_leer: 1, seguridad_formularios: 2, cuesta_entender: 2,
  consentimiento: true,
}

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
    expect(validarPerfilPaciente({ ...PACIENTE_OK, identidad })).toBe('')
    expect(validarPerfilPaciente({ ...PACIENTE_OK, nacimiento: '', identidad })).toMatch(/fecha de nacimiento/)
  })
  it('resume el perfil en una línea', () => {
    expect(resumenPerfil({ titulacion: 'doctorado', pais: 'España', ambitos: ['docencia'], publicaciones_dolor: '5-9', autoexpertise: 'experto' })).toBe('Doctorado · España · docencia · 5-9 publicaciones en dolor · autoexpertise experto')
    expect(resumenPerfil({ nacimiento: '1960-03-01', duracion_dolor: 'mas_10a', diagnosticos: ['fibromialgia'],
      egdc_ahora: 8, egdc_peor: 8, egdc_medio: 8, egdc_dias: 40, egdc_diaria: 8, egdc_social: 8, egdc_trabajo: 8,
      educacion_previa: 'nunca' }, 'paciente'))
      .toBe(`${edadDe('1960-03-01')} años · dolor más de 10 años · Fibromialgia · EGDC Grado IV (intensidad 80/100, discapacidad 80/100) · educación en dolor: nunca me han explicado cómo funciona el dolor`)
  })
})

describe('panel de paciente', () => {
  // Del paciente solo se guarda un correo: ni nombre ni apellidos.
  const identidad = { nombre: '', apellidos: '', email: 'ana@ejemplo.org', dois: '' }

  it('elegibilidad: dolor de menos de 3 meses no es dolor crónico (CIE-11) y queda fuera', () => {
    expect(elegibilidadPaciente({ duracion_dolor: 'menos_3m' })).toMatch(/tres meses/)
    expect(elegibilidadPaciente({ duracion_dolor: '3_6m' })).toBe('')
    expect(elegibilidadPaciente({ duracion_dolor: 'mas_10a' })).toBe('')
    expect(elegibilidadPaciente({})).toMatch(/cuánto tiempo/)
  })

  it('no hay nota de corte: a un paciente NO se le puntúa como al experto', () => {
    // El mismo perfil, con y sin estudios universitarios, con y sin educación previa: válido igual.
    expect(validarPerfilPaciente({ ...PACIENTE_OK, estudios: 'sin_estudios', educacion_previa: 'nunca', identidad })).toBe('')
    expect(validarPerfilPaciente({ ...PACIENTE_OK, estudios: 'universitarios', educacion_previa: 'programa', identidad })).toBe('')
  })

  it('exige lo que describe al panel: dolor, diagnóstico, impacto, educación previa y alfabetización', () => {
    expect(validarPerfilPaciente({ ...PACIENTE_OK, frecuencia_dolor: '', identidad })).toMatch(/cada cuánto/)
    expect(validarPerfilPaciente({ ...PACIENTE_OK, zonas: [], identidad })).toMatch(/zona/)
    expect(validarPerfilPaciente({ ...PACIENTE_OK, diagnosticos: [], identidad })).toMatch(/diagnóstico/)
    expect(validarPerfilPaciente({ ...PACIENTE_OK, egdc_social: '', identidad })).toMatch(/ocio, sociales y familiares/)
    expect(validarPerfilPaciente({ ...PACIENTE_OK, egdc_ahora: 11, identidad })).toMatch(/0 a 10/)
    expect(validarPerfilPaciente({ ...PACIENTE_OK, egdc_dias: 200, identidad })).toMatch(/0 a 180/)
    expect(validarPerfilPaciente({ ...PACIENTE_OK, phq9_lentitud: '', identidad })).toMatch(/nueve preguntas/)
    expect(validarPerfilPaciente({ ...PACIENTE_OK, educacion_previa: '', identidad })).toMatch(/cómo funciona el dolor/)
    expect(validarPerfilPaciente({ ...PACIENTE_OK, cuesta_entender: '', identidad })).toMatch(/información escrita/)
  })

  it('«no me han dado ningún diagnóstico» es una respuesta válida', () => {
    expect(validarPerfilPaciente({ ...PACIENTE_OK, diagnosticos: ['sin_diagnostico'], identidad })).toBe('')
  })

  it('la edad se calcula de la fecha, y la fecha tiene que ser de una persona adulta viva', () => {
    expect(edadDe('1980-05-12', new Date('2026-05-11'))).toBe(45)
    expect(edadDe('1980-05-12', new Date('2026-05-12'))).toBe(46)   // el mismo día del cumpleaños ya cuenta
    expect(edadDe('')).toBeNull()
    expect(validarNacimiento('1980-05-12')).toBe('')
    expect(validarNacimiento('')).toMatch(/fecha de nacimiento/)
    expect(validarNacimiento('2020-01-01')).toMatch(/18/)
    expect(validarNacimiento('1850-01-01')).toMatch(/fecha de nacimiento/)
  })

  it('un cero es una respuesta válida en toda escala que empiece en cero', () => {
    const cero = { ...PACIENTE_OK, identidad, egdc_ahora: 0, egdc_diaria: 0, egdc_dias: 0, phq9_sueno: 0 }
    expect(validarPerfilPaciente(cero)).toBe('')
  })

  it('sin correo no hay forma de mandarle la clave ni de detectar duplicados', () => {
    expect(validarPerfilPaciente({ ...PACIENTE_OK, identidad: { ...identidad, email: '' } })).toMatch(/correo/i)
    // Pero el nombre no se le pide: sin él, el perfil es válido igual.
    expect(validarPerfilPaciente({ ...PACIENTE_OK, identidad: { email: 'ana@ejemplo.org' } })).toBe('')
  })

  it('Chew: la señal de alfabetización limitada es el ítem de rellenar impresos (≥ 3)', () => {
    expect(alfabetizacionChew({ ayuda_leer: 1, seguridad_formularios: 1, cuesta_entender: 1 }))
      .toEqual({ total: 3, limitada: false, completo: true })
    expect(alfabetizacionChew({ ayuda_leer: 1, seguridad_formularios: 3, cuesta_entender: 1 }).limitada).toBe(true)
    expect(alfabetizacionChew({ ayuda_leer: 5, seguridad_formularios: 5, cuesta_entender: 5 }))
      .toEqual({ total: 15, limitada: true, completo: true })
    expect(alfabetizacionChew({ ayuda_leer: 1 }).completo).toBe(false)
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
