// ---------------------------------------------------------------------------
// Backend de demostración: las mismas funciones RPC que supabase/schema.sql, en memoria.
// Sirve para desarrollar (`npm run dev:demo`), para los tests de pantallas y para enseñar
// la plataforma sin tocar datos reales. Los conceptos son inventados para la demo: NO son
// texto del corpus, que no se publica.
//
// Claves de la demo:  demo-expe-rto1 (experto) · demo-paci-ent1 (paciente) · demo-dire-cci1 (dirección)
// ---------------------------------------------------------------------------

import { puntuacionFehring } from './perfil.js'

export const CLAVES_DEMO = { experto: 'demo-expe-rto1', paciente: 'demo-paci-ent1', direccion: 'demo-dire-cci1' }

const DIMENSIONES = [
  { clave: 'relevancia', orden: 1, nombre: 'Relevancia', quien: 'experto', sobre_texto: ['definicion'],
    afirmacion: 'Este concepto merece formar parte de la base de conocimiento de educación en dolor, tal y como está planteado y ubicado en este módulo.',
    ayuda: 'No se valora si el contenido es correcto, sino si merece estar aquí.' },
  { clave: 'claridad', orden: 2, nombre: 'Claridad', quien: 'experto', sobre_texto: ['definicion', 'explicacion_profesional', 'puntos_clave'],
    afirmacion: 'El texto para profesionales está redactado de forma clara e inequívoca.',
    ayuda: 'Valora la redacción, no el contenido. Si una frase admite más de una interpretación, indícalo.' },
  { clave: 'representatividad', orden: 3, nombre: 'Representatividad', quien: 'experto', sobre_texto: ['explicacion_profesional', 'referencias', 'certeza'],
    afirmacion: 'El contenido refleja fielmente la evidencia disponible y el conocimiento actual, de acuerdo con el nivel de certeza indicado.',
    ayuda: 'La exigencia dependerá del tipo de afirmación que se esté evaluando.' },
  { clave: 'comprensibilidad', orden: 4, nombre: 'Comprensibilidad', quien: 'paciente', sobre_texto: ['explicacion_paciente'],
    afirmacion: 'La explicación dirigida a pacientes se entiende sin conocimientos previos y mantiene el mismo significado que el texto profesional.',
    ayuda: 'Esta dimensión solo la evaluará el panel de personas con dolor.' },
]

const CATALOGO = {
  D01: { nombre: 'Fundamentos del dolor', tipo: 'dominio', orden: 1 },
  D02: { nombre: 'Neurobiología y mecanismos', tipo: 'dominio', orden: 2 },
  D03: { nombre: 'Evaluación y razonamiento clínico', tipo: 'dominio', orden: 3 },
  D04: { nombre: 'Educación terapéutica en dolor', tipo: 'dominio', orden: 4 },
  D05: { nombre: 'Comunicación clínica', tipo: 'dominio', orden: 5 },
  D06: { nombre: 'Cambio de comportamiento', tipo: 'dominio', orden: 6 },
  D07: { nombre: 'Factores psicológicos', tipo: 'dominio', orden: 7 },
  D08: { nombre: 'Factores sociales y contextuales', tipo: 'dominio', orden: 8 },
  D09: { nombre: 'Ejercicio terapéutico y movimiento', tipo: 'dominio', orden: 9 },
  D10: { nombre: 'Autogestión y autocuidado', tipo: 'dominio', orden: 10 },
  D11: { nombre: 'Condiciones clínicas', tipo: 'dominio', orden: 11 },
  D12: { nombre: 'Docencia y diseño instruccional', tipo: 'dominio', orden: 12 },
  D13: { nombre: 'Evidencia científica y método', tipo: 'dominio', orden: 13 },
  D14: { nombre: 'Recursos educativos y producción', tipo: 'dominio', orden: 14 },
  D15: { nombre: 'Salud digital e inteligencia artificial', tipo: 'dominio', orden: 15 },
  'D01.M01': { nombre: 'Qué es el dolor', tipo: 'modulo', orden: 101, foco: 'Definición del dolor, su distinción de la nocicepción y lo que implica para la consulta.',
    conceptos: [{ id: 'DEMO-00001', titulo: 'El dolor es una experiencia, no una medida del daño en los tejidos' }, { id: 'DEMO-00002', titulo: 'Nocicepción y dolor no son lo mismo, y pueden darse por separado' }, { id: 'DEMO-00007', titulo: 'El dolor es siempre real, tenga o no lesión visible' }, { id: 'DEMO-00008', titulo: 'Dolor y sufrimiento no son sinónimos' }] },
  'D02.M09': { nombre: 'Sensibilización central', tipo: 'modulo', orden: 209, foco: 'Qué es y qué no es la sensibilización central, y sus signos clínicos.',
    conceptos: [{ id: 'DEMO-00003', titulo: 'La sensibilización central amplifica la respuesta a estímulos normales' }, { id: 'DEMO-00004', titulo: 'Alodinia e hiperalgesia son signos clínicos, no diagnósticos' }, { id: 'DEMO-00009', titulo: 'Wind-up: la respuesta crece aunque el estímulo no cambie' }] },
  'D04.M05': { nombre: 'Educación en neurociencia del dolor', tipo: 'modulo', orden: 405 },
  'D09.M03': { nombre: 'Exposición gradual al movimiento', tipo: 'modulo', orden: 903 },
}

const REFS = (n) => [
  { id: `REF-${9000 + n}`, apa: `Autora, A., & Autor, B. (2024). Artículo de demostración nº ${n}. _Revista Demo_, _1_(${n}), 10–20. https://doi.org/10.1000/demo.${n}`,
    parentetica: 'Autora y Autor, 2024', narrativa: 'Autora y Autor (2024)', doi: `10.1000/demo.${n}`, pmid: '', url: '', nota_uso: 'Referencia inventada para la demo.' },
  { id: `REF-${9100 + n}`, apa: `Colectivo C. (2023). Guía de demostración nº ${n}. Organismo Demo.`,
    parentetica: 'Colectivo C., 2023', narrativa: 'Colectivo C. (2023)', doi: '', pmid: '', url: '', nota_uso: 'Referencia inventada para la demo.' },
]

function concepto(n, dominio, modulo, titulo, extra = {}) {
  return {
    id: `DEMO-${String(n).padStart(5, '0')}`, dominio, modulo, titulo,
    definicion: extra.definicion || `**Definición de demostración.** ${titulo}. Es un texto inventado para enseñar la plataforma; no pertenece al corpus.`,
    resumen: extra.resumen || 'Resumen breve, de dos frases, que dice lo esencial del concepto para quien va con prisa. Sirve para decidir si hace falta leer más.',
    explicacion_profesional: extra.explicacion_profesional ||
      `Explicación profesional de demostración. Describe el concepto con la precisión que se espera de un texto para clínicos y docentes, y lo apoya en las fuentes (${REFS(n)[0].id}).\n\nUn segundo párrafo matiza: qué se sabe con seguridad, qué está en discusión y qué no debería extrapolarse. La referencia ${REFS(n)[1].id} sostiene el último punto.\n\n- Una lista con dos o tres ideas operativas.\n- Otra idea, con un *matiz* en cursiva.`,
    explicacion_paciente: extra.explicacion_paciente ||
      'Esta es la explicación para ti, escrita sin palabras técnicas.\n\nEl dolor es una señal de protección, no una medida de lo que está dañado. Por eso puede doler mucho sin que haya una lesión grande, y al revés.\n\nSaber esto no quita el dolor, pero ayuda a decidir qué hacer hoy.',
    puntos_clave: extra.puntos_clave || `- Idea principal en una línea.\n- Segunda idea, con un dato concreto.\n- Tercera idea: lo que NO dice este concepto.`,
    advertencias: extra.advertencias || 'No usar este concepto para decir que «el dolor está en la cabeza». No sustituye la valoración clínica individual.',
    certeza: extra.certeza || 'moderada', tipo_afirmacion: extra.tipo_afirmacion || 'descriptivo',
    exigencia_evidencia: extra.exigencia_evidencia || 'una revisión o dos estudios primarios',
    controversia: !!extra.controversia, nota_controversia: extra.nota_controversia || null,
    referencias: REFS(n), hash: `h${n}abc`, version: 1, prn: (n * 0.137) % 1,
    estratos: extra.estratos || ['aleatorio'], senales: extra.senales || [], incluido: true, activo: true,
    cambiado_desde_valoracion: false, madurez: extra.madurez || 'M4',
    entidades_citadas: n === 2 ? [{ id: 'CPT-00001', nombre: 'El dolor es una experiencia, no una medida del daño en los tejidos', tipo: 'concepto' }, { id: 'ERR-0001', nombre: 'Creer que el dolor mide el daño', tipo: 'error frecuente' }] : [],
  }
}

const CONCEPTOS = [
  concepto(1, 'D01', 'D01.M01', 'El dolor es una experiencia, no una medida del daño en los tejidos', { certeza: 'consenso', tipo_afirmacion: 'definicional', exigencia_evidencia: 'fuente normativa (IASP, CIE-11, guía oficial)' }),
  concepto(2, 'D01', 'D01.M01', 'Nocicepción y dolor no son lo mismo, y pueden darse por separado', { definicion: '**Definición de demostración.** La nocicepción es el proceso neural; el dolor es la experiencia (CPT-00001). El error habitual es ERR-0001. No pertenece al corpus.' }),
  concepto(3, 'D02', 'D02.M09', 'La sensibilización central amplifica la respuesta a estímulos normales', { estratos: ['aleatorio', 'cribado'], senales: [{ tipo: 'G11', detalle: 'certeza declarada alta; fuentes sostienen moderada' }] }),
  concepto(4, 'D02', 'D02.M09', 'Alodinia e hiperalgesia son signos clínicos, no diagnósticos', { certeza: 'alta' }),
  concepto(5, 'D04', 'D04.M05', 'La educación en neurociencia del dolor reduce el miedo al movimiento más que el dolor', {
    controversia: true, certeza: 'baja', tipo_afirmacion: 'eficacia', exigencia_evidencia: 'revisión sistemática o guía de práctica clínica; nunca un solo ensayo',
    estratos: ['controversia'],
    nota_controversia: 'Las revisiones sistemáticas discrepan en el tamaño del efecto sobre el dolor; hay más acuerdo sobre el efecto en kinesiofobia. Se documenta sin arbitrar.' }),
  concepto(6, 'D09', 'D09.M03', 'La exposición gradual al movimiento se dosifica por tolerancia, no por dolor cero', { tipo_afirmacion: 'normativo', exigencia_evidencia: 'guía, documento de consenso o marca explícita de opinión del autor' }),
]

const ESTUDIO = {
  id: 1, nombre: 'Validez de contenido · demo', corpus_commit: 'demo', semilla: 'valida-2026', fraccion: 0.1, suelo: 8,
  k_jueces: 7, k_paciente: 3, capacidad: 80, capacidad_paciente: 25, ronda_actual: 1, abierto_en: '2026-09-01T09:00:00Z', cerrado_en: null,
  inscripcion_abierta: true, codigo_invitacion: 'DEMO', codigo_pruebas: 'PRUEBAS', tope_solicitudes_dia: 200, fehring_minimo: 5, plazo_dias: 10,
  investigador_principal: 'Dr. Raúl Ferrer-Peña', contacto_email: 'estudio@edpain.com', grupo_autoria: 'Grupo del Estudio EdPain', comite_etica: null,
  umbrales: { icvi_n_pequeno: 1.0, icvi_n_grande: 0.78, n_corte_icvi: 6, aiken: 0.70, exigir_ic: true, minimo_panel: 5, desacuerdo: 0.30,
              scvi_ave: 0.90, paciente_comprension: 0.75, minimo_paciente: 3, estable_v: 0.10, rondas_max: 3 },
  dimensiones: DIMENSIONES,
}

export function crearDemo() {
  const panelistas = [
    { id: 1, codigo: 'PAN-01', clave: CLAVES_DEMO.experto, perfil: 'experto', disciplina: null, anios: null, dominios_competencia: [], capacidad: 80, activo: true, perfil_completado: false, calibracion_hecha: false, alta_en: '2026-09-01T09:00:00Z', ultimo_acceso: null, notas: 'demo' },
    { id: 2, codigo: 'PAC-01', clave: CLAVES_DEMO.paciente, perfil: 'paciente', disciplina: null, anios: null, dominios_competencia: [], capacidad: 25, activo: true, perfil_completado: false, calibracion_hecha: false, alta_en: '2026-09-01T09:00:00Z', ultimo_acceso: null, notas: 'demo' },
    { id: 3, codigo: 'DIR-00', clave: CLAVES_DEMO.direccion, perfil: 'direccion', disciplina: 'dirección editorial', anios: null, dominios_competencia: [], capacidad: null, activo: true, perfil_completado: true, calibracion_hecha: true, alta_en: '2026-09-01T09:00:00Z', ultimo_acceso: null, notas: 'demo' },
  ]
  // Seis jueces más, ya con valoraciones, para que el panel de dirección tenga algo que enseñar.
  for (let i = 2; i <= 7; i += 1) {
    panelistas.push({ id: 10 + i, codigo: `PAN-0${i}`, clave: `zzzz-zzzz-zz0${i}`, perfil: 'experto', disciplina: ['fisioterapia', 'medicina de familia', 'psicología clínica', 'enfermería', 'medicina del dolor', 'terapia ocupacional'][i - 2],
      anios: 5 + i, dominios_competencia: i % 2 ? ['D01', 'D02'] : ['D04', 'D09'], capacidad: 80, activo: true, perfil_completado: true, calibracion_hecha: true, alta_en: '2026-09-01T09:00:00Z', ultimo_acceso: '2026-09-03T10:00:00Z', notas: null,
      perfil_datos: { titulacion: i % 3 ? 'master' : 'doctorado', formacion_dolor: i % 2 === 0, pais: 'España', ambitos: ['asistencial', 'docencia'], publicaciones_dolor: i % 3 ? '1-4' : '10+', investigacion_dolor: i % 3 === 0, delphi_previo: i % 2 === 0, autoexpertise: 'avanzado', consentimiento: true } })
  }
  const conceptos = CONCEPTOS.map((c) => ({ ...c }))
  const asignaciones = []
  const valoraciones = []
  const cobertura = []
  const eventos = []
  const propuestas_estado = []
  const solicitudes = []
  const identidades = []
  const rondas = [{ ronda: 1, abre_en: '2026-09-01T09:00:00Z', cierra_en: null, notas: null }]
  const plazos = []
  const avisosEnviados = []
  const abrirPlazo = (pid) => { if (!plazos.some((x) => x.panelista_id === pid && x.ronda === ronda_actual)) plazos.push({ panelista_id: pid, ronda: ronda_actual, inicio: new Date().toISOString(), dias: ESTUDIO.plazo_dias ?? 10, motivo: null }) }
  const plazoDe = (pid) => {
    const pl = plazos.find((x) => x.panelista_id === pid && x.ronda === ronda_actual)
    if (!pl) return null
    const fin = new Date(new Date(pl.inicio).getTime() + pl.dias * 86400000)
    const restantes = Math.ceil((fin - Date.now()) / 86400000)
    return { inicio: pl.inicio, dias: pl.dias, fin: fin.toISOString(), fin_efectivo: fin.toISOString(), dias_restantes: restantes, vencido: restantes <= 0, cierra_ronda: null }
  }
  let ronda_actual = 1
  let cerrado_en = null
  let siguienteValoracion = 1

  panelistas.filter((p) => p.perfil !== 'direccion').forEach((p) => abrirPlazo(p.id))
  // Bloque del experto demo: los seis conceptos. Paciente: los que tienen explicación.
  conceptos.forEach((c, i) => asignaciones.push({ panelista_id: 1, concepto_id: c.id, ronda: 1, orden: i + 1, estado: 'pendiente' }))
  conceptos.slice(0, 4).forEach((c, i) => asignaciones.push({ panelista_id: 2, concepto_id: c.id, ronda: 1, orden: i + 1, estado: 'pendiente' }))
  // Los otros seis jueces ya han valorado (determinista): el concepto 5 sale «revisar», el 3 «partido».
  const patron = { 'DEMO-00001': [4, 4, 4, 3, 4, 4], 'DEMO-00002': [4, 3, 4, 4, 3, 4], 'DEMO-00003': [1, 4, 1, 4, 4, 1],
                   'DEMO-00004': [4, 4, 3, 4, 4, 4], 'DEMO-00005': [2, 2, 3, 2, 4, 2], 'DEMO-00006': [4, 4, 4, 4, 4, 4] }
  for (let i = 2; i <= 7; i += 1) {
    conceptos.forEach((c, j) => {
      asignaciones.push({ panelista_id: 10 + i, concepto_id: c.id, ronda: 1, orden: j + 1, estado: 'hecha' })
      const base = patron[c.id][i - 2]
      const p = { relevancia: Math.min(4, base + (j % 2)), claridad: base, representatividad: base }
      const ajustes = base <= 2 ? [{ parte: 'explicacion_profesional', motivo: 'evidencia', redaccion: 'Propuesta de redacción alternativa del juez PAN-0' + i + ': «…con un efecto pequeño y heterogéneo sobre el dolor».' }] : []
      valoraciones.push({ id: siguienteValoracion++, panelista_id: 10 + i, concepto_id: c.id, ronda: 1, hash_concepto: c.hash, puntuaciones: p,
        abstencion: false, motivo_abstencion: null, banderas: c.id === 'DEMO-00005' && i === 3 ? { certeza: 'muy_baja' } : {},
        comentario: base <= 2 ? 'El efecto sobre el dolor está sobredimensionado respecto a las revisiones citadas.' : null,
        ajustes, paciente: null, completa: true, tiempo_ms: 90000 + i * 7000 + j * 3000, creada_en: '2026-09-03T10:00:00Z', actualizada_en: '2026-09-03T10:00:00Z' })
    })
  }

  const quien = (clave) => {
    const p = panelistas.find((x) => x.clave === clave && x.activo)
    if (!p) { const e = new Error('Esa clave no es válida. Revísala: son tres grupos de cuatro letras y números.'); e.codigo = '28000'; throw e }
    p.ultimo_acceso = new Date().toISOString()
    return p
  }
  const direccion = (clave) => { const p = quien(clave); if (p.perfil !== 'direccion') { const e = new Error('Solo la dirección editorial.'); e.codigo = '42501'; throw e } return p }
  const recorte = (c, perfil) => perfil === 'paciente'
    ? { id: c.id, dominio: c.dominio, modulo: c.modulo, titulo: c.titulo, explicacion_paciente: c.explicacion_paciente, hash: c.hash }
    : { ...c }
  const nombres = Object.fromEntries(Object.entries(CATALOGO).map(([k, v]) => [k, v.nombre]))
  const codigoDe = (id) => panelistas.find((p) => p.id === id)?.codigo
  const clon = (x) => JSON.parse(JSON.stringify(x))

  const fns = {
    valida_publico() {
      return clon({ nombre: ESTUDIO.nombre, inscripcion_abierta: ESTUDIO.inscripcion_abierta && !cerrado_en, requiere_codigo: !!ESTUDIO.codigo_invitacion,
        pruebas: !!ESTUDIO.codigo_pruebas && !cerrado_en, investigador_principal: ESTUDIO.investigador_principal,
        contacto_email: ESTUDIO.contacto_email, grupo_autoria: ESTUDIO.grupo_autoria, comite_etica: ESTUDIO.comite_etica,
        fehring_minimo: ESTUDIO.fehring_minimo, dominios: Object.entries(CATALOGO).filter(([, v]) => v.tipo === 'dominio').map(([id, v]) => ({ id, nombre: v.nombre })) })
    },
    valida_solicitar({ codigo_invitacion, disciplina, anios, dominios, perfil }) {
      const dado = (codigo_invitacion || '').trim().toLowerCase()
      let prueba = false
      if (cerrado_en) { const e = new Error('La inscripción no está abierta.'); e.codigo = '42501'; throw e }
      if (ESTUDIO.codigo_pruebas && dado === ESTUDIO.codigo_pruebas.toLowerCase()) prueba = true
      else if (!ESTUDIO.inscripcion_abierta) { const e = new Error('La inscripción no está abierta.'); e.codigo = '42501'; throw e }
      else if (ESTUDIO.codigo_invitacion && dado !== ESTUDIO.codigo_invitacion.toLowerCase()) { const e = new Error('El código de invitación no es válido.'); e.codigo = '28000'; throw e }
      if (!perfil?.consentimiento) { const e = new Error('Falta el consentimiento.'); e.codigo = '22023'; throw e }
      const puntuacion = puntuacionFehring(perfil, anios)
      const correo = String(perfil?.identidad?.email || '').trim().toLowerCase()
      const quien = `${perfil?.identidad?.nombre || ''} ${perfil?.identidad?.apellidos || ''}`.trim()
      if (solicitudes.some((x) => x.email_hash === correo && x.aceptada)) return { aceptado: false, ya_registrado: true }
      const rechazos = solicitudes.filter((x) => x.email_hash === correo && !x.aceptada).length
      if (puntuacion < ESTUDIO.fehring_minimo) {
        solicitudes.push({ creada_en: new Date().toISOString(), aceptada: false, bloqueada: false, puntuacion, disciplina, anios, email_hash: correo, nombre: quien, email: correo })
        return { aceptado: false, puntuacion, minimo: ESTUDIO.fehring_minimo }
      }
      if (rechazos > 0 && !prueba) {
        solicitudes.push({ creada_en: new Date().toISOString(), aceptada: false, bloqueada: true, puntuacion, disciplina, anios, email_hash: correo, nombre: quien, email: correo })
        return { aceptado: false, bloqueado: true }
      }
      const n = panelistas.filter((p) => /^PAN-\d+$/.test(p.codigo)).length + 1
      const codigo = `PAN-${String(n).padStart(2, '0')}`
      const clave = `nuev-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`
      const id = Math.max(...panelistas.map((p) => p.id)) + 1
      const { identidad, ...sinIdentidad } = perfil || {}
      panelistas.push({ id, codigo, clave, perfil: 'experto', disciplina, anios, dominios_competencia: dominios, capacidad: 80, activo: true, perfil_completado: true, calibracion_hecha: false, alta_en: new Date().toISOString(), ultimo_acceso: null, notas: `${prueba ? 'PRUEBA' : 'inscripción abierta'} · Fehring ${puntuacion}`, perfil_datos: sinIdentidad, es_prueba: prueba })
      if (identidad?.email) identidades.push({ panelista_id: id, codigo, ...identidad })
      let asignados = 0
      conceptos.filter((c) => c.incluido && c.activo).forEach((c, i) => { asignaciones.push({ panelista_id: id, concepto_id: c.id, ronda: ronda_actual, orden: i + 1, estado: 'pendiente' }); asignados += 1 })
      abrirPlazo(id)
      solicitudes.push({ creada_en: new Date().toISOString(), aceptada: true, bloqueada: false, puntuacion, disciplina, anios, email_hash: correo, nombre: quien, email: correo })
      return { aceptado: true, codigo, clave, puntuacion, asignados, prueba }
    },
    valida_entrar({ clave }) {
      const p = quien(clave)
      eventos.push({ panelista_id: p.id, tipo: 'entrada', en: new Date().toISOString() })
      return clon({ codigo: p.codigo, perfil: p.perfil, disciplina: p.disciplina, anios: p.anios, dominios_competencia: p.dominios_competencia,
        perfil_datos: p.perfil_datos || {}, perfil_completado: p.perfil_completado, calibracion_hecha: p.calibracion_hecha, plazo: plazoDe(p.id),
        estudio: { id: 1, nombre: ESTUDIO.nombre, ronda_actual, umbrales: ESTUDIO.umbrales, dimensiones: DIMENSIONES, cerrado: !!cerrado_en } })
    },
    valida_perfil({ clave, disciplina, anios, dominios, perfil }) {
      const p = quien(clave)
      if (!perfil?.consentimiento) { const e = new Error('Falta el consentimiento.'); e.codigo = '22023'; throw e }
      const { identidad, ...sinIdentidad } = perfil || {}
      Object.assign(p, { disciplina, anios, dominios_competencia: dominios || [], perfil_completado: true, perfil_datos: sinIdentidad })
      if (identidad?.email) {
        const i = identidades.findIndex((x) => x.panelista_id === p.id)
        const fila = { panelista_id: p.id, codigo: p.codigo, ...identidad }
        if (i >= 0) identidades[i] = fila; else identidades.push(fila)
      }
      return { ok: true }
    },
    valida_calibracion({ clave }) {
      const p = quien(clave)
      return clon([
        { orden: 1, concepto: recorte(conceptos[0], p.perfil), modelo: { relevancia: 4, claridad: 4, representatividad: 4 },
          explicacion: 'La dirección editorial da 4 en las tres: es la definición de la IASP, con fuente normativa, y el texto no afirma nada más que eso.' },
        { orden: 2, concepto: recorte(conceptos[4], p.perfil), modelo: { relevancia: 4, claridad: 3, representatividad: 2 },
          explicacion: 'Es relevante y está bien escrito, pero el título afirma más de lo que sostienen las revisiones: por eso la dirección baja representatividad a 2 y propondría otra redacción. Fíjate en que un 2 obliga a decir por qué.' },
      ])
    },
    valida_calibracion_hecha({ clave }) { quien(clave).calibracion_hecha = true; return { ok: true } },
    valida_bloque({ clave }) {
      const p = quien(clave)
      const items = asignaciones.filter((a) => a.panelista_id === p.id && a.ronda === ronda_actual).sort((a, b) => a.orden - b.orden).map((a) => {
        const c = conceptos.find((x) => x.id === a.concepto_id)
        const v = valoraciones.find((x) => x.panelista_id === p.id && x.concepto_id === a.concepto_id && x.ronda === ronda_actual)
        return { id: c.id, dominio: c.dominio, modulo: c.modulo, titulo: c.titulo, orden: a.orden, estado: a.estado, completa: !!v?.completa, abstencion: !!v?.abstencion, cambiado: false }
      })
      return clon({ ronda: ronda_actual, items, nombres, cobertura: cobertura.filter((x) => x.panelista_id === p.id && x.ronda === ronda_actual), plazo: plazoDe(p.id) })
    },
    valida_concepto({ clave, concepto_id }) {
      const p = quien(clave)
      if (!asignaciones.some((a) => a.panelista_id === p.id && a.concepto_id === concepto_id && a.ronda === ronda_actual)) { const e = new Error('Concepto no asignado.'); e.codigo = '42501'; throw e }
      const c = conceptos.find((x) => x.id === concepto_id)
      const v = valoraciones.find((x) => x.panelista_id === p.id && x.concepto_id === concepto_id && x.ronda === ronda_actual)
      let grupo = null, previa = null
      if (ronda_actual >= 2) {
        const prev = valoraciones.filter((x) => x.concepto_id === concepto_id && x.ronda === ronda_actual - 1 && x.completa && !x.abstencion)
        grupo = {}
        for (const d of DIMENSIONES) {
          const vals = prev.map((x) => x.puntuaciones[d.clave]).filter(Boolean).sort()
          grupo[d.clave] = { n: vals.length, h: { 1: vals.filter((x) => x === 1).length, 2: vals.filter((x) => x === 2).length, 3: vals.filter((x) => x === 3).length, 4: vals.filter((x) => x === 4).length }, mediana: vals.length ? vals[Math.floor((vals.length - 1) / 2)] : null }
        }
        previa = valoraciones.find((x) => x.panelista_id === p.id && x.concepto_id === concepto_id && x.ronda === ronda_actual - 1) || null
      }
      return clon({ concepto: recorte(c, p.perfil), valoracion: v || null, grupo, previa, ronda: ronda_actual })
    },
    valida_guardar({ clave, concepto_id, datos }) {
      const p = quien(clave)
      if (cerrado_en) { const e = new Error('El estudio está cerrado.'); e.codigo = '42501'; throw e }
      if (plazoDe(p.id)?.vencido) { const e = new Error('Tu plazo para esta ronda ha terminado; escribe a la dirección del estudio si necesitas una ampliación.'); e.codigo = '42501'; throw e }
      const a = asignaciones.find((x) => x.panelista_id === p.id && x.concepto_id === concepto_id && x.ronda === ronda_actual)
      if (!a) { const e = new Error('Concepto no asignado.'); e.codigo = '42501'; throw e }
      const c = conceptos.find((x) => x.id === concepto_id)
      const punt = datos.puntuaciones || {}
      for (const v of Object.values(punt)) if (![1, 2, 3, 4].includes(Number(v))) { const e = new Error('Puntuación fuera de rango.'); e.codigo = '22023'; throw e }
      const abst = !!datos.abstencion
      let completa
      if (p.perfil === 'paciente') completa = abst || (!!datos.paciente?.comprension && !!datos.paciente?.efecto)
      else completa = abst || DIMENSIONES.filter((d) => d.quien !== 'paciente').every((d) => punt[d.clave] != null)
      if (completa && !abst && p.perfil !== 'paciente' && Object.values(punt).some((x) => x <= 2) && !(datos.ajustes || []).length && !datos.comentario) completa = false
      let v = valoraciones.find((x) => x.panelista_id === p.id && x.concepto_id === concepto_id && x.ronda === ronda_actual)
      if (!v) { v = { id: siguienteValoracion++, panelista_id: p.id, concepto_id, ronda: ronda_actual, creada_en: new Date().toISOString(), tiempo_ms: 0 }; valoraciones.push(v) }
      Object.assign(v, { hash_concepto: c.hash, puntuaciones: punt, abstencion: abst, motivo_abstencion: datos.motivo_abstencion || null,
        banderas: datos.banderas || {}, comentario: datos.comentario || null, ajustes: datos.ajustes || [], paciente: datos.paciente || null,
        completa, tiempo_ms: (v.tiempo_ms || 0) + (Number(datos.tiempo_ms) || 0), actualizada_en: new Date().toISOString() })
      a.estado = abst ? 'abstenida' : completa ? 'hecha' : 'pendiente'
      return { ok: true, completa, id: v.id }
    },
    valida_cobertura({ clave, modulo, exhaustividad, falta, sobra }) {
      const p = quien(clave)
      const i = cobertura.findIndex((x) => x.panelista_id === p.id && x.modulo === modulo && x.ronda === ronda_actual)
      const fila = { panelista_id: p.id, modulo, ronda: ronda_actual, exhaustividad, falta, sobra }
      if (i >= 0) cobertura[i] = fila; else cobertura.push(fila)
      return { ok: true }
    },
    valida_modulo({ clave, modulo }) {
      const p = quien(clave)
      if (!asignaciones.some((a) => a.panelista_id === p.id && a.ronda === ronda_actual && conceptos.find((c) => c.id === a.concepto_id)?.modulo === modulo)) { const e = new Error('Módulo no asignado.'); e.codigo = '42501'; throw e }
      const k = CATALOGO[modulo] || {}
      const mios = new Set(asignaciones.filter((a) => a.panelista_id === p.id && a.ronda === ronda_actual).map((a) => a.concepto_id))
      return clon({ id: modulo, nombre: k.nombre || modulo, foco: k.foco || null, dominio: modulo.split('.')[0], dominio_nombre: CATALOGO[modulo.split('.')[0]]?.nombre,
        conceptos: (k.conceptos || []).map((c) => ({ ...c, en_tu_bloque: mios.has(c.id) })) })
    },
    valida_evento({ clave, tipo, detalle }) { const p = quien(clave); eventos.push({ panelista_id: p.id, tipo, detalle, en: new Date().toISOString() }); return null },

    valida_dir_datos({ clave }) {
      direccion(clave)
      return clon({
        estudio: { ...ESTUDIO, ronda_actual, cerrado_en },
        catalogo: CATALOGO,
        panelistas: panelistas.map((p) => ({ ...p, clave: undefined,
          asignadas: asignaciones.filter((a) => a.panelista_id === p.id && a.ronda === ronda_actual).length,
          hechas: asignaciones.filter((a) => a.panelista_id === p.id && a.ronda === ronda_actual && a.estado === 'hecha').length,
          abstenidas: asignaciones.filter((a) => a.panelista_id === p.id && a.ronda === ronda_actual && a.estado === 'abstenida').length,
          tiempo_medio_ms: (() => { const t = valoraciones.filter((v) => v.panelista_id === p.id && v.completa && v.tiempo_ms > 0); return t.length ? t.reduce((s, v) => s + v.tiempo_ms, 0) / t.length : null })() })),
        conceptos: conceptos.map((c) => ({ id: c.id, dominio: c.dominio, modulo: c.modulo, titulo: c.titulo, certeza: c.certeza, tipo_afirmacion: c.tipo_afirmacion,
          controversia: c.controversia, estratos: c.estratos, senales: c.senales, prn: c.prn, hash: c.hash, activo: c.activo, cambiado: c.cambiado_desde_valoracion,
          tiene_paciente: !!c.explicacion_paciente,
          jueces: asignaciones.filter((a) => a.concepto_id === c.id && a.ronda === ronda_actual && panelistas.find((p) => p.id === a.panelista_id)?.perfil === 'experto').length,
          pacientes: asignaciones.filter((a) => a.concepto_id === c.id && a.ronda === ronda_actual && panelistas.find((p) => p.id === a.panelista_id)?.perfil === 'paciente').length })),
        valoraciones: valoraciones.map((v) => ({ ...v, panelista: codigoDe(v.panelista_id), perfil: panelistas.find((p) => p.id === v.panelista_id)?.perfil, panelista_id: undefined })),
        asignaciones: asignaciones.map((a) => ({ panelista: codigoDe(a.panelista_id), concepto_id: a.concepto_id, ronda: a.ronda, orden: a.orden, estado: a.estado })),
        cobertura: cobertura.map((x) => ({ ...x, panelista: codigoDe(x.panelista_id), panelista_id: undefined })),
        rondas, avisos: avisosEnviados.map((a) => ({ ...a, panelista: codigoDe(a.panelista_id) })),
        plazos: plazos.map((pl) => { const d = plazoDe(pl.panelista_id) || {}; return { panelista: codigoDe(pl.panelista_id), ronda: pl.ronda, inicio: pl.inicio, dias: pl.dias, motivo: pl.motivo, fin: d.fin, dias_restantes: d.dias_restantes } }),
        propuestas_estado,
        solicitudes: { total: solicitudes.length, aceptadas: solicitudes.filter((x) => x.aceptada).length, rechazadas: solicitudes.filter((x) => !x.aceptada && !x.bloqueada).length, bloqueadas: solicitudes.filter((x) => x.bloqueada).length, hoy: solicitudes.length, ultimas: [...solicitudes].reverse().slice(0, 30) },
        eventos_recientes: eventos.slice(-200).reverse(),
      })
    },
    valida_dir_identidades({ clave }) {
      direccion(clave)
      return clon(identidades.map((i) => ({ ...i, perfil: panelistas.find((p) => p.id === i.panelista_id)?.perfil || 'experto',
        disciplina: panelistas.find((p) => p.id === i.panelista_id)?.disciplina, activo: true, rondas: [1],
        asignadas: asignaciones.filter((a) => a.panelista_id === i.panelista_id).length,
        hechas: asignaciones.filter((a) => a.panelista_id === i.panelista_id && a.estado === 'hecha').length })))
    },
    valida_dir_borrar_prueba({ clave, codigo }) {
      direccion(clave)
      const i = panelistas.findIndex((p) => p.codigo === codigo && p.es_prueba)
      if (i < 0) { const e = new Error('No hay ningún panelista de prueba con ese código.'); e.codigo = '22023'; throw e }
      const id = panelistas[i].id
      for (const lista of [asignaciones, valoraciones, cobertura]) {
        for (let j = lista.length - 1; j >= 0; j -= 1) if (lista[j].panelista_id === id) lista.splice(j, 1)
      }
      const k = identidades.findIndex((x) => x.panelista_id === id)
      if (k >= 0) identidades.splice(k, 1)
      panelistas.splice(i, 1)
      return { ok: true, codigo }
    },
    valida_dir_avisos({ clave }) {
      direccion(clave)
      const salida = []
      for (const p of panelistas.filter((x) => x.perfil !== 'direccion' && x.activo)) {
        const d = plazoDe(p.id)
        if (!d) continue
        const mias = asignaciones.filter((a) => a.panelista_id === p.id && a.ronda === ronda_actual)
        const pendientes = mias.filter((a) => a.estado === 'pendiente').length
        if (!pendientes) continue
        const r = d.dias_restantes
        const tipo = r <= 0 ? 'vencido' : r <= 1 ? 'un_dia' : r <= 3 ? 'tres_dias' : r <= d.dias / 2 ? 'mitad' : null
        if (!tipo) continue
        if (avisosEnviados.some((a) => a.panelista_id === p.id && a.ronda === ronda_actual && a.tipo === tipo)) continue
        const ide = identidades.find((i) => i.panelista_id === p.id) || {}
        salida.push({ codigo: p.codigo, nombre: ide.nombre, apellidos: ide.apellidos, email: ide.email, perfil: p.perfil,
          es_prueba: !!p.es_prueba, tipo, ronda: ronda_actual, pendientes, total: mias.length, hechas: mias.length - pendientes,
          fin: d.fin, dias_restantes: r,
          asunto: tipo === 'vencido' ? 'Tu plazo en el estudio EdPain ha terminado' : 'Aviso del estudio EdPain',
          cuerpo: `Te faltan ${pendientes} conceptos de ${mias.length}.` })
      }
      return clon(salida)
    },
    valida_dir_marcar_avisos({ clave, codigos, tipo }) {
      direccion(clave)
      for (const c of codigos) {
        const p = panelistas.find((x) => x.codigo === c)
        if (p && !avisosEnviados.some((a) => a.panelista_id === p.id && a.ronda === ronda_actual && a.tipo === tipo)) {
          avisosEnviados.push({ panelista_id: p.id, ronda: ronda_actual, tipo, enviado_en: new Date().toISOString(), pendientes: 0 })
        }
      }
      return { ok: true, marcados: codigos.length }
    },
    valida_dir_plazo({ clave, codigo, dias, motivo }) {
      direccion(clave)
      const p = panelistas.find((x) => x.codigo === codigo)
      if (!p) { const e = new Error('No existe ese panelista.'); e.codigo = '22023'; throw e }
      const i = plazos.findIndex((x) => x.panelista_id === p.id && x.ronda === ronda_actual)
      if (i >= 0) plazos[i] = { ...plazos[i], dias, motivo }
      else plazos.push({ panelista_id: p.id, ronda: ronda_actual, inicio: new Date().toISOString(), dias, motivo })
      for (let j = avisosEnviados.length - 1; j >= 0; j -= 1) if (avisosEnviados[j].panelista_id === p.id && avisosEnviados[j].ronda === ronda_actual) avisosEnviados.splice(j, 1)
      return clon(plazoDe(p.id))
    },
    valida_dir_ronda_fechas({ clave, ronda, abre_en, cierra_en, notas }) {
      direccion(clave)
      const i = rondas.findIndex((r) => r.ronda === ronda)
      const fila = { ronda, abre_en: abre_en || rondas[i]?.abre_en, cierra_en: cierra_en || null, notas: notas ?? rondas[i]?.notas ?? null }
      if (i >= 0) rondas[i] = fila; else rondas.push(fila)
      return { ok: true }
    },
    valida_dir_concepto({ clave, concepto_id }) { direccion(clave); return clon(conceptos.find((c) => c.id === concepto_id)) },
    valida_dir_alta({ clave, codigo, perfil, disciplina, dominios, capacidad, notas }) {
      direccion(clave)
      if (!/^[A-Z]{2,4}-\d{2,3}$/.test(codigo)) { const e = new Error('Código con formato PAN-17.'); e.codigo = '22023'; throw e }
      if (panelistas.some((p) => p.codigo === codigo)) { const e = new Error('Ese código ya existe.'); e.codigo = '22023'; throw e }
      const nueva = `${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`
      const id = Math.max(...panelistas.map((p) => p.id)) + 1
      panelistas.push({ id, codigo, clave: nueva, perfil, disciplina, anios: null, dominios_competencia: dominios || [], capacidad, activo: true, perfil_completado: false, calibracion_hecha: false, alta_en: new Date().toISOString(), ultimo_acceso: null, notas })
      return { id, codigo, clave: nueva }
    },
    valida_dir_reclave({ clave, codigo }) { direccion(clave); const p = panelistas.find((x) => x.codigo === codigo); if (!p) { const e = new Error('No existe.'); e.codigo = '22023'; throw e }; p.clave = `nuev-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`; return { codigo, clave: p.clave } },
    valida_dir_panelista({ clave, codigo, datos }) { direccion(clave); const p = panelistas.find((x) => x.codigo === codigo); if (!p) return { ok: false }; for (const k of ['activo', 'capacidad', 'dominios_competencia', 'disciplina', 'notas']) if (datos[k] !== undefined) p[k] = datos[k]; return { ok: true } },
    valida_dir_asignar({ clave, perfil_objetivo }) {
      direccion(clave)
      const k = perfil_objetivo === 'paciente' ? ESTUDIO.k_paciente : ESTUDIO.k_jueces
      let nuevas = 0
      for (const c of conceptos.filter((x) => x.incluido && x.activo)) {
        const ya = asignaciones.filter((a) => a.concepto_id === c.id && a.ronda === ronda_actual && panelistas.find((p) => p.id === a.panelista_id)?.perfil === perfil_objetivo)
        let faltan = k - ya.length
        const candidatos = panelistas.filter((p) => p.perfil === perfil_objetivo && p.activo && !ya.some((a) => a.panelista_id === p.id))
          .map((p) => ({ p, carga: asignaciones.filter((a) => a.panelista_id === p.id && a.ronda === ronda_actual).length, competente: p.dominios_competencia.includes(c.dominio) }))
          .filter((x) => x.carga < (x.p.capacidad || 80)).sort((a, b) => (b.competente - a.competente) || (a.carga - b.carga))
        for (const cand of candidatos) { if (faltan <= 0) break; asignaciones.push({ panelista_id: cand.p.id, concepto_id: c.id, ronda: ronda_actual, orden: asignaciones.filter((a) => a.panelista_id === cand.p.id).length + 1, estado: 'pendiente' }); abrirPlazo(cand.p.id); faltan -= 1; nuevas += 1 }
      }
      return { asignadas: nuevas, ronda: ronda_actual, sin_jueces_suficientes: 0 }
    },
    valida_dir_ronda({ clave, conceptos: ids }) {
      direccion(clave)
      let n = 0
      for (const a of asignaciones.filter((x) => x.ronda === ronda_actual && ids.includes(x.concepto_id))) { asignaciones.push({ ...a, ronda: ronda_actual + 1, estado: 'pendiente' }); n += 1 }
      ronda_actual += 1
      return { ronda: ronda_actual, asignaciones: n }
    },
    valida_dir_cerrar({ clave }) { direccion(clave); cerrado_en = new Date().toISOString(); return { ok: true } },
    valida_dir_estudio({ clave, datos }) { direccion(clave); Object.assign(ESTUDIO, Object.fromEntries(Object.entries(datos).filter(([k, v]) => k !== 'dimensiones' && v !== undefined && v !== null))); return { ok: true } },
    valida_dir_propuesta({ clave, valoracion_id, indice, estado, nota }) {
      direccion(clave)
      const i = propuestas_estado.findIndex((x) => x.valoracion_id === valoracion_id && x.indice === indice)
      const fila = { valoracion_id, indice, estado, nota, actualizado_en: new Date().toISOString() }
      if (i >= 0) propuestas_estado[i] = fila; else propuestas_estado.push(fila)
      return { ok: true }
    },
    valida_dir_calibracion({ clave }) { direccion(clave); return { ok: true } },
  }

  return {
    async rpc(nombre, params) {
      await new Promise((r) => setTimeout(r, 60)) // latencia pequeña, para que el estado «guardando…» exista
      const f = fns[nombre]
      if (!f) throw new Error(`RPC desconocida en la demo: ${nombre}`)
      return f(params || {})
    },
    _estado: { panelistas, conceptos, asignaciones, valoraciones, cobertura, eventos, identidades, solicitudes, plazos, avisosEnviados, rondas },
  }
}
