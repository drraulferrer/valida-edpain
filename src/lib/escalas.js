// ---------------------------------------------------------------------------
// Las dos escalas que acompañan a cada concepto, con lo que significan.
// Fuente: ~/educacion-en-dolor/ontologia/vocabularios.yaml (certeza),
// ontologia/certeza.yaml (familias graduada / no graduada) y PMD §7.3 (madurez).
// Son texto estable del corpus; si cambian allí, cambiar aquí.
// ---------------------------------------------------------------------------

export const CERTEZA_INTRO = 'Los cuatro primeros grados forman una escala graduada (al modo GRADE: confianza en una estimación). Los tres últimos no son «certezas bajas con otro nombre»: declaran que no hay estimación que graduar y de qué depende lo afirmado.'

export const CERTEZA = {
  alta: { nombre: 'alta', familia: 'graduada', descripcion: 'Confianza alta en la estimación del efecto: es improbable que nueva evidencia la cambie de forma sustancial.' },
  moderada: { nombre: 'moderada', familia: 'graduada', descripcion: 'Confianza moderada: el efecto real puede diferir del estimado.' },
  baja: { nombre: 'baja', familia: 'graduada', descripcion: 'Confianza limitada: el efecto real puede ser sustancialmente distinto del estimado.' },
  muy_baja: { nombre: 'muy baja', familia: 'graduada', descripcion: 'Confianza muy limitada: la estimación es muy incierta.' },
  consenso: { nombre: 'consenso', familia: 'no graduada', descripcion: 'Sin evidencia directa: lo sostiene el consenso de expertos, una guía o una clasificación con autoridad (IASP, CIE-11).' },
  mecanistico: { nombre: 'mecanística', familia: 'no graduada', descripcion: 'Justificación fisiológica no evaluada clínicamente: describe un mecanismo, no estima un efecto.' },
  no_aplica: { nombre: 'no aplica', familia: 'no graduada', descripcion: 'No hay estimación que graduar: concepto definicional, histórico o taxonómico.' },
}

export const MADUREZ_INTRO = 'La madurez describe cuán completo está el registro del concepto. Se calcula a partir de los campos presentes, no se declara. Ningún concepto del corpus ha pasado aún revisión externa: esa revisión es este estudio.'

export const MADUREZ = {
  M0: { nombre: 'esbozo', descripcion: 'Solo la cabecera: sin definición ni resumen.' },
  M1: { nombre: 'definido', descripcion: 'Con definición y resumen; sin explicaciones.' },
  M2: { nombre: 'explicado', descripcion: 'Con explicación profesional y explicación para pacientes.' },
  M3: { nombre: 'enriquecido', descripcion: 'Además, con objetivos de aprendizaje, metáforas o errores frecuentes, al menos dos relaciones con otros conceptos y tres etiquetas.' },
  M4: { nombre: 'evidenciado', descripcion: 'Además, con al menos dos referencias verificadas y con el tipo de afirmación y el grado de certeza declarados.' },
  M5: { nombre: 'productizado', descripcion: 'Además, con al menos tres recursos publicados (ficha, artículo, diapositivas…).' },
}

export function certeza(clave) {
  return CERTEZA[clave] || { nombre: clave || 'sin declarar', familia: '', descripcion: 'Grado de certeza no declarado en la cabecera del concepto.' }
}

export function madurez(clave) {
  return MADUREZ[clave] || { nombre: 'sin calcular', descripcion: 'El nivel de madurez no se ha calculado para este concepto.' }
}
