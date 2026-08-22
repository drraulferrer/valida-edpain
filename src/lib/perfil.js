// ---------------------------------------------------------------------------
// Perfil del panelista: qué se pregunta, cómo se valida y cómo se resume.
//
// Base: criterios de Fehring (1987) para paneles de validez de contenido —titulación,
// formación específica en el área, práctica clínica, publicaciones e investigación;
// puntuación 0–14 y experto a partir de 5—, tal como los recogen Grant & Davis (1997) y
// Polit & Beck (2006); las recomendaciones CREDES (Jünger et al., 2017) de describir el
// panel de forma reproducible; y las variables del Delphi del propio campo
// (Di-Bonaventura et al., Phys Ther 2026): profesión, país, años, dedicación
// clínica/docente/investigadora y experiencia en educación en dolor.
//
// Nada de aquí identifica a la persona: ni nombre, ni correo, ni centro.
// ---------------------------------------------------------------------------

export const DISCIPLINAS = ['fisioterapia', 'medicina de familia', 'medicina del dolor', 'rehabilitación', 'anestesiología',
  'reumatología', 'enfermería', 'psicología clínica', 'terapia ocupacional', 'farmacia', 'docencia universitaria',
  'metodología de la investigación', 'diseño instruccional', 'salud digital', 'otra']

export const TITULACIONES = [
  ['grado', 'Grado, diplomatura o licenciatura'],
  ['master', 'Máster o especialidad'],
  ['doctorado', 'Doctorado'],
]

export const AMBITOS = [
  ['asistencial', 'Asistencial'],
  ['docencia', 'Docencia'],
  ['investigacion', 'Investigación'],
  ['gestion', 'Gestión'],
  ['otro', 'Otro'],
]

export const ENTORNOS = [
  ['atencion_primaria', 'Atención primaria'],
  ['hospital', 'Hospital'],
  ['unidad_dolor', 'Unidad del dolor'],
  ['privado', 'Práctica privada'],
  ['universidad', 'Universidad o centro docente'],
  ['otro', 'Otro'],
]

export const PUBLICACIONES = [['0', 'Ninguna'], ['1-4', 'De 1 a 4'], ['5-9', 'De 5 a 9'], ['10+', '10 o más']]
export const PUBLICACIONES_EDU = [['0', 'Ninguna'], ['1-4', 'De 1 a 4'], ['5+', '5 o más']]

export const AUTOEXPERTISE = [
  ['basico', 'Básico: conozco el tema, no lo practico ni lo enseño'],
  ['intermedio', 'Intermedio: lo aplico en mi práctica'],
  ['avanzado', 'Avanzado: lo enseño o investigo sobre ello'],
  ['experto', 'Experto: referente en el tema (docencia, publicaciones, guías)'],
]

export const EDUCACION_DOLOR = [
  ['imparte_pacientes', 'Imparto educación en dolor a pacientes'],
  ['imparte_profesionales', 'Formo a profesionales en dolor'],
  ['disena_materiales', 'Diseño materiales o programas de educación en dolor'],
]

export const DOLOR_PROPIO = [['si', 'Sí'], ['no', 'No'], ['no_digo', 'Prefiero no decirlo']]

// Panel de personas con dolor: perfil breve, sin datos identificativos.
export const EDAD = ['18-29', '30-44', '45-59', '60-74', '75+']
export const GENERO = [['mujer', 'Mujer'], ['hombre', 'Hombre'], ['otro', 'Otro'], ['no_digo', 'Prefiero no decirlo']]
export const ESTUDIOS = [['primarios', 'Primarios'], ['secundarios', 'Secundarios o bachillerato'], ['fp', 'Formación profesional'], ['universitarios', 'Universitarios']]

// Identidad: va en su propia tabla (`valida.identidades`), no viaja con las valoraciones.
export const IDENTIDAD_VACIA = Object.freeze({ nombre: '', apellidos: '', email: '', filiacion: '', orcid: '', dois: '' })

export const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/
export const RE_DOI = /^10\.\d{4,9}\/\S+$/

export function partirDois(texto) {
  return String(texto || '')
    .split(/[\s,;]+/)
    .map((x) => x.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, ''))
    .filter(Boolean)
}

export const PERFIL_EXPERTO_VACIO = Object.freeze({
  titulacion: '', formacion_dolor: false, formacion_dolor_cual: '', pais: 'España', ambitos: [], entorno: '',
  anios_profesion: '', reparto: { clinica: '', docencia: '', investigacion: '' }, educacion_dolor: [],
  publicaciones_dolor: '', publicaciones_educacion: '', investigacion_dolor: false, delphi_previo: false,
  sociedades: '', autoexpertise: '', dolor_propio: '', consentimiento: false, identidad: { ...IDENTIDAD_VACIA },
})

export const PERFIL_PACIENTE_VACIO = Object.freeze({
  edad: '', genero: '', anios_dolor: '', diagnostico: '', estudios: '', educacion_previa: false, consentimiento: false,
  identidad: { ...IDENTIDAD_VACIA },
})

// Puntuación de Fehring (1987), adaptada a un panel multidisciplinar sobre dolor. Máximo 14:
//   máster o especialidad 4 · doctorado 2 · formación específica acreditada en dolor 2 ·
//   práctica ≥ 1 año en dolor 1 · publicaciones en dolor 2 · investigación en dolor 2 ·
//   tesis o formación reglada en el área (máster en dolor) 1.
// Fehring fija «experto» en ≥ 5. Se enseña en el panel de dirección, no al panelista.
export function puntuacionFehring(perfil = {}, anios = 0) {
  const p = perfil || {}
  let puntos = 0
  if (p.titulacion === 'master' || p.titulacion === 'doctorado') puntos += 4
  if (p.titulacion === 'doctorado') puntos += 2
  if (p.formacion_dolor) puntos += 2
  if (Number(anios) >= 1) puntos += 1
  if (p.publicaciones_dolor && p.publicaciones_dolor !== '0') puntos += 2
  if (p.investigacion_dolor) puntos += 2
  if (p.formacion_dolor && /m[aá]ster|doctor|tesis/i.test(p.formacion_dolor_cual || '')) puntos += 1
  return Math.min(14, puntos)
}

export function esExpertoFehring(puntos) {
  return puntos >= 5
}

export function validarIdentidad(i = {}, { exigirNombre = true } = {}) {
  if (exigirNombre && !String(i.nombre || '').trim()) return 'Indica tu nombre: es el que figurará en la autoría del grupo del estudio.'
  if (exigirNombre && !String(i.apellidos || '').trim()) return 'Indica tus apellidos.'
  if (!RE_EMAIL.test(String(i.email || '').trim())) return 'Indica un correo de contacto válido: es por donde te avisaremos de cada ronda.'
  if (i.orcid && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(String(i.orcid).trim())) return 'El ORCID tiene la forma 0000-0002-1825-0097 (o déjalo vacío).'
  const malos = partirDois(i.dois).filter((d) => !RE_DOI.test(d))
  if (malos.length) return `Este DOI no tiene el formato correcto: ${malos[0]}. Debe empezar por «10.» (por ejemplo 10.1097/j.pain.0000000000001939).`
  return ''
}

export function validarPerfilExperto(f, disciplina, anios, dominios) {
  if (!disciplina) return 'Indica tu disciplina.'
  if (!f.titulacion) return 'Indica tu titulación máxima.'
  if (!f.ambitos?.length) return 'Marca al menos un ámbito de trabajo.'
  if (anios === '' || anios == null || Number.isNaN(Number(anios))) return 'Indica tus años de experiencia en dolor (0 si ninguno).'
  if (!f.autoexpertise) return 'Indica cómo valoras tu propio nivel en educación en dolor.'
  if (!dominios?.length) return 'Marca al menos un dominio en el que te consideres competente: gobierna qué conceptos te tocan.'
  const r = f.reparto || {}
  const suma = ['clinica', 'docencia', 'investigacion'].reduce((s, k) => s + (Number(r[k]) || 0), 0)
  if (suma > 100) return 'El reparto de tu tiempo no puede sumar más de 100 %.'
  const identidad = validarIdentidad(f.identidad)
  if (identidad) return identidad
  if (f.publicaciones_educacion && f.publicaciones_educacion !== '0' && !partirDois(f.identidad?.dois).length) {
    return 'Has declarado publicaciones sobre educación en dolor: indica al menos un DOI para poder verificarlas.'
  }
  if (!f.consentimiento) return 'Para participar hace falta aceptar la información del estudio.'
  return ''
}

export function validarPerfilPaciente(f) {
  if (!f.edad) return 'Indica tu franja de edad.'
  if (f.anios_dolor === '' || f.anios_dolor == null) return 'Indica cuántos años llevas con dolor (puede ser 0).'
  const identidad = validarIdentidad(f.identidad, { exigirNombre: true })
  if (identidad) return identidad
  if (!f.consentimiento) return 'Para participar hace falta aceptar la información del estudio.'
  return ''
}

// Lo que se manda al servidor: el perfil con la identidad ya normalizada (DOI como lista).
export function prepararPerfil(f, previo = {}) {
  const i = f.identidad || {}
  return {
    ...f,
    identidad: {
      nombre: String(i.nombre || '').trim(), apellidos: String(i.apellidos || '').trim(),
      email: String(i.email || '').trim().toLowerCase(), filiacion: String(i.filiacion || '').trim(),
      orcid: String(i.orcid || '').trim(), dois: partirDois(i.dois),
    },
    consentimiento_en: previo.consentimiento_en || new Date().toISOString(),
  }
}

// Resumen de una línea para el panel de dirección.
export function resumenPerfil(p = {}, perfilPanelista = 'experto') {
  if (perfilPanelista === 'paciente') {
    return [p.edad && `${p.edad} años`, p.genero && p.genero !== 'no_digo' && p.genero, p.anios_dolor != null && p.anios_dolor !== '' && `${p.anios_dolor} años con dolor`,
      p.diagnostico, p.estudios && `estudios ${p.estudios}`, p.educacion_previa ? 'con educación en dolor previa' : null].filter(Boolean).join(' · ')
  }
  const tit = TITULACIONES.find(([k]) => k === p.titulacion)?.[1]
  return [tit, p.formacion_dolor && (p.formacion_dolor_cual || 'formación específica en dolor'), p.pais,
    (p.ambitos || []).join('/'), p.entorno, p.anios_profesion && `${p.anios_profesion} años de profesión`,
    p.publicaciones_dolor && p.publicaciones_dolor !== '0' && `${p.publicaciones_dolor} publicaciones en dolor`,
    p.delphi_previo ? 'con Delphi previo' : null, p.autoexpertise && `autoexpertise ${p.autoexpertise}`].filter(Boolean).join(' · ')
}
