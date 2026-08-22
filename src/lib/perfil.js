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

// ---------------------------------------------------------------------------
// PANEL DE PERSONAS CON DOLOR
//
// Al panel de paciente NO se le puntúa. Fehring mide expertise profesional; aplicárselo a
// quien participa por su experiencia vivida invertiría el sentido del panel —dejaría fuera
// justo a quien más falta hace para juzgar si un texto se entiende—. Lo que piden los
// estándares es otra cosa: **elegibilidad clara** y **descripción rica**.
//
//   · Elegibilidad: 18 años o más, dolor de 3 meses o más (definición de dolor crónico de la
//     IASP para la CIE-11, Treede et al., Pain 2019; doi:10.1097/j.pain.0000000000001384),
//     leer castellano y consentimiento. Nada más: no hay nota de corte.
//   · Descripción: el conjunto mínimo de datos sigue el modelo del NIH Task Force para dolor
//     lumbar crónico (Deyo et al., J Pain 2014; doi:10.1016/j.pain.2014.03.005) —definir con
//     dos preguntas, clasificar por impacto y describir la muestra con un mínimo común— y las
//     recomendaciones GRIPP2 de describir quién participó (Staniszewska et al., BMJ 2017).
//   · Impacto: PEG, tres ítems 0-10 (intensidad, disfrute de la vida, actividad general);
//     Krebs et al., J Gen Intern Med 2009; doi:10.1007/s11606-009-0981-1.
//   · Alfabetización en salud: los tres ítems de cribado de Chew et al., Fam Med 2004. Es la
//     covariable que más pesa en un panel de COMPRENSIBILIDAD: si el panel entero lee bien y
//     ya sabe de dolor, dirá que todo se entiende. Se mide para poder describirlo y para que
//     la dirección vigile la diversidad, no para excluir a nadie.
//
// Ninguno de estos datos identifica: el nombre y el correo van aparte, en `valida.identidades`.
// ---------------------------------------------------------------------------
export const EDAD = ['18-29', '30-44', '45-59', '60-74', '75+']
export const GENERO = [['mujer', 'Mujer'], ['hombre', 'Hombre'], ['otro', 'Otro'], ['no_digo', 'Prefiero no decirlo']]
export const ESTUDIOS = [['sin_estudios', 'Sin estudios terminados'], ['primarios', 'Primarios'], ['secundarios', 'Secundarios o bachillerato'], ['fp', 'Formación profesional'], ['universitarios', 'Universitarios']]
export const SITUACION = [
  ['trabajando', 'Trabajando'],
  ['baja', 'De baja por el dolor'],
  ['incapacidad', 'Con una incapacidad reconocida'],
  ['paro', 'En paro'],
  ['jubilado', 'Jubilado o jubilada'],
  ['estudiando', 'Estudiando'],
  ['otra', 'Otra'],
]

// TEMPORALIDAD. Menos de 3 meses no es dolor crónico (CIE-11) y no entra en el panel.
export const DURACION_DOLOR = [
  ['menos_3m', 'Menos de 3 meses'],
  ['3_6m', 'Entre 3 y 6 meses'],
  ['6_12m', 'Entre 6 meses y 1 año'],
  ['1_5a', 'Entre 1 y 5 años'],
  ['5_10a', 'Entre 5 y 10 años'],
  ['mas_10a', 'Más de 10 años'],
]
export const DURACION_MINIMA = '3_6m'   // la primera que ya es dolor crónico

export const FRECUENCIA_DOLOR = [
  ['continuo', 'Todos los días, casi sin descanso'],
  ['casi_diario', 'Casi todos los días'],
  ['semanal', 'Varios días a la semana'],
  ['mensual', 'Algunos días al mes'],
  ['crisis', 'De vez en cuando, en crisis'],
]

// LOCALIZACIÓN, por las familias de la CIE-11 pero dicho en llano.
export const ZONAS_DOLOR = [
  ['lumbar', 'Espalda baja o lumbares'],
  ['cervical', 'Cuello, hombros o espalda alta'],
  ['cabeza', 'Cabeza'],
  ['cara', 'Cara o mandíbula'],
  ['articulaciones', 'Articulaciones (rodillas, caderas, manos…)'],
  ['extremidades', 'Brazos o piernas'],
  ['abdomen', 'Barriga o zona pélvica'],
  ['generalizado', 'Por todo el cuerpo'],
  ['otra', 'Otra zona'],
]

// DIAGNÓSTICO. Mezcla dolor primario y secundario de la CIE-11, en las palabras que usa la
// gente. «No me han dado ningún diagnóstico» es una respuesta legítima y frecuente.
export const DIAGNOSTICOS = [
  ['inespecifico', 'Dolor de espalda o de cuello, sin una causa concreta'],
  ['fibromialgia', 'Fibromialgia'],
  ['artrosis', 'Artrosis o «desgaste»'],
  ['reumatica', 'Artritis reumatoide u otra enfermedad reumática'],
  ['migrana', 'Migraña o dolor de cabeza'],
  ['neuropatico', 'Dolor por un nervio dañado (ciática, neuralgia, neuropatía)'],
  ['postquirurgico', 'Dolor que empezó tras una operación o una lesión'],
  ['pelvico', 'Endometriosis u otro dolor pélvico'],
  ['visceral', 'Dolor digestivo o visceral (colon irritable, cistitis…)'],
  ['oncologico', 'Dolor relacionado con un cáncer o su tratamiento'],
  ['sin_diagnostico', 'No me han dado ningún diagnóstico'],
  ['otro', 'Otro'],
]

export const EXPLICACION_RECIBIDA = [
  ['clara', 'Sí, me lo explicaron y lo entendí'],
  ['confusa', 'Me lo explicaron, pero no lo entendí bien'],
  ['contradictoria', 'Me han dado explicaciones distintas según el profesional'],
  ['ninguna', 'Nadie me ha explicado a qué se debe'],
]

// TRATAMIENTOS.
export const TRATAMIENTOS = [
  ['sin_receta', 'Analgésicos sin receta (paracetamol, ibuprofeno…)'],
  ['con_receta', 'Analgésicos con receta'],
  ['opioides', 'Opioides (tramadol, morfina, fentanilo…)'],
  ['neuromoduladores', 'Antidepresivos o antiepilépticos para el dolor'],
  ['fisioterapia', 'Fisioterapia'],
  ['ejercicio', 'Ejercicio pautado'],
  ['psicologia', 'Psicología'],
  ['infiltraciones', 'Infiltraciones o bloqueos'],
  ['cirugia', 'Cirugía por este dolor'],
  ['complementarias', 'Terapias complementarias o naturales'],
  ['ninguno', 'Ninguno ahora mismo'],
]

export const SEGUIMIENTO = [
  ['primaria', 'Mi médica o mi fisio del centro de salud'],
  ['especialista', 'Un especialista (traumatología, reumatología, neurología…)'],
  ['unidad_dolor', 'Una unidad del dolor'],
  ['privada', 'Consulta privada'],
  ['nadie', 'Ahora mismo nadie'],
]

// EDUCACIÓN EN DOLOR PREVIA. El sesgo grande de un panel de comprensibilidad: quien ya ha
// pasado por un programa reconoce el vocabulario y puntúa más alto que quien llega de nuevas.
export const EDUCACION_PREVIA = [
  ['nunca', 'Nunca me han explicado cómo funciona el dolor'],
  ['pasada', 'Alguna vez, por encima'],
  ['consulta', 'Sí, un profesional me lo explicó con calma'],
  ['programa', 'He hecho un curso o un grupo sobre dolor'],
]

export const LECTURA_PROPIA = [
  ['nada', 'No'],
  ['poco', 'Alguna cosa suelta'],
  ['bastante', 'Sí, leo o veo bastante sobre el tema'],
]

// ALFABETIZACIÓN EN SALUD — Chew et al. (Fam Med 2004), tres ítems de cribado. Las dos escalas
// van SIEMPRE de mejor (1) a peor (5), para que la suma se lea en una sola dirección.
export const CHEW_FRECUENCIA = [
  [1, 'Nunca'], [2, 'Casi nunca'], [3, 'A veces'], [4, 'A menudo'], [5, 'Siempre'],
]
export const CHEW_SEGURIDAD = [
  [1, 'Muchísima'], [2, 'Bastante'], [3, 'Algo'], [4, 'Poca'], [5, 'Ninguna'],
]
export const CHEW = [
  ['ayuda_leer', '¿Con qué frecuencia necesitas que alguien te ayude a leer los papeles del centro de salud o del hospital?', CHEW_FRECUENCIA],
  ['seguridad_formularios', '¿Qué seguridad tienes rellenando tú solo o sola los impresos médicos?', CHEW_SEGURIDAD],
  ['cuesta_entender', '¿Con qué frecuencia te cuesta entender tu problema de salud por cómo está escrita la información?', CHEW_FRECUENCIA],
]

// Impacto del dolor (PEG, Krebs 2009): media de los tres ítems 0-10.
export function impactoPeg(p = {}) {
  const v = [p.peg_intensidad, p.peg_disfrute, p.peg_actividad].map(Number).filter((x) => Number.isFinite(x))
  return v.length === 3 ? v.reduce((s, x) => s + x, 0) / 3 : null
}

// Alfabetización en salud (Chew 2004). Suma 3-15, y el aviso de «limitada» se apoya en el ítem
// de seguridad rellenando impresos, que es el que mejor discrimina en el original (AUC 0,80):
// responder «algo», «poca» o «ninguna» (≥ 3) es la señal validada.
export function alfabetizacionChew(p = {}) {
  const items = CHEW.map(([k]) => Number(p[k])).filter((x) => Number.isFinite(x))
  if (items.length < CHEW.length) return { total: null, limitada: null, completo: false }
  return {
    total: items.reduce((s, x) => s + x, 0),
    limitada: Number(p.seguridad_formularios) >= 3,
    completo: true,
  }
}

// ¿Cumple la elegibilidad del panel de paciente? Devuelve '' si sí, o el motivo si no.
// Es la MISMA regla que `valida.elegible_paciente` en el esquema: si cambia una, cambia la otra.
export function elegibilidadPaciente(p = {}) {
  if (!p.duracion_dolor) return 'Indica cuánto tiempo llevas con dolor.'
  if (p.duracion_dolor === 'menos_3m') {
    return 'Este panel es de personas con dolor de tres meses o más. Con menos tiempo todavía no encajarías, '
      + 'pero puedes escribirnos y te avisamos si abrimos otro grupo.'
  }
  return ''
}

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
  // Quién es
  edad: '', genero: '', estudios: '', situacion: '',
  // El dolor: temporalidad, dónde, qué le han dicho
  duracion_dolor: '', frecuencia_dolor: '', zonas: [], diagnosticos: [], diagnostico_otro: '',
  explicacion_recibida: '', diagnostico: '',
  // Impacto (PEG, 0-10)
  peg_intensidad: '', peg_disfrute: '', peg_actividad: '',
  // Tratamientos
  tratamientos: [], seguimiento: '',
  // Educación en dolor previa
  educacion_previa: '', lectura_propia: '',
  // Alfabetización en salud (Chew)
  ayuda_leer: '', seguridad_formularios: '', cuesta_entender: '',
  consentimiento: false,
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

// Obligatorio solo lo que hace falta para (a) decidir la elegibilidad, (b) describir el panel
// en la publicación y (c) vigilar su diversidad. Todo lo demás se puede dejar en blanco: es un
// panel de pacientes, no un cuestionario clínico, y cada campo obligatorio de más es alguien
// que abandona el formulario.
export function validarPerfilPaciente(f) {
  if (!f.edad) return 'Indica tu franja de edad.'
  const elegible = elegibilidadPaciente(f)
  if (elegible) return elegible
  if (!f.frecuencia_dolor) return 'Indica cada cuánto te duele.'
  if (!f.zonas?.length) return 'Marca al menos una zona donde te duela.'
  if (!f.diagnosticos?.length) return 'Marca qué te han dicho que tienes; si no te han dado ningún diagnóstico, hay una opción para eso.'
  for (const [clave, etiqueta] of [['peg_intensidad', 'la intensidad de tu dolor'],
                                   ['peg_disfrute', 'cuánto te ha afectado al disfrute de la vida'],
                                   ['peg_actividad', 'cuánto te ha afectado a tu actividad']]) {
    const v = Number(f[clave])
    if (f[clave] === '' || f[clave] == null || !Number.isFinite(v) || v < 0 || v > 10) {
      return `Indica ${etiqueta} en la escala de 0 a 10.`
    }
  }
  if (!f.educacion_previa) return 'Indica si alguna vez te han explicado cómo funciona el dolor: es importante para interpretar tus respuestas.'
  for (const [clave] of CHEW) {
    if (!f[clave]) return 'Contesta las tres últimas preguntas sobre la información escrita de salud: sirven para saber a quién le resultan claros estos textos.'
  }
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
    const et = (lista, v) => lista.find(([k]) => k === v)?.[1]
    const peg = impactoPeg(p)
    const chew = alfabetizacionChew(p)
    const dx = (p.diagnosticos || []).map((d) => et(DIAGNOSTICOS, d)).filter(Boolean)
    return [
      p.edad && `${p.edad} años`,
      p.genero && p.genero !== 'no_digo' && et(GENERO, p.genero),
      p.estudios && `estudios ${et(ESTUDIOS, p.estudios)?.toLowerCase()}`,
      p.duracion_dolor && `dolor ${et(DURACION_DOLOR, p.duracion_dolor)?.toLowerCase()}`,
      p.frecuencia_dolor && et(FRECUENCIA_DOLOR, p.frecuencia_dolor)?.toLowerCase(),
      dx.length && dx.join(', '),
      peg != null && `PEG ${peg.toFixed(1)}/10`,
      (p.tratamientos || []).length && `${p.tratamientos.length} tratamientos`,
      p.educacion_previa && `educación en dolor: ${et(EDUCACION_PREVIA, p.educacion_previa)?.toLowerCase()}`,
      chew.completo && (chew.limitada ? 'alfabetización en salud limitada' : `alfabetización en salud ${chew.total}/15`),
    ].filter(Boolean).join(' · ')
  }
  const tit = TITULACIONES.find(([k]) => k === p.titulacion)?.[1]
  return [tit, p.formacion_dolor && (p.formacion_dolor_cual || 'formación específica en dolor'), p.pais,
    (p.ambitos || []).join('/'), p.entorno, p.anios_profesion && `${p.anios_profesion} años de profesión`,
    p.publicaciones_dolor && p.publicaciones_dolor !== '0' && `${p.publicaciones_dolor} publicaciones en dolor`,
    p.delphi_previo ? 'con Delphi previo' : null, p.autoexpertise && `autoexpertise ${p.autoexpertise}`].filter(Boolean).join(' · ')
}
