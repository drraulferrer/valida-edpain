// ---------------------------------------------------------------------------
// Render mínimo y seguro del Markdown del corpus: párrafos, **negrita**, *cursiva* o
// _cursiva_, `código`, listas con «- », y dos sustituciones propias del corpus:
//
//   · las citas REF-0001 pasan a APA 7.ª con autor y año, sin paréntesis y enlazadas al DOI
//     del artículo: «(REF-0001)» → «Raja et al., 2020» y «según REF-0001» → «según
//     Raja et al. (2020)». Los grupos «(REF-0001, REF-0002)» se separan con punto y coma;
//   · los códigos de entidades (CPT-00060, ERR-0001, MET-001, D04.M09…) se sustituyen por su
//     nombre entre comillas.
//
// Las dos necesitan los mapas que viajan con el concepto (`referencias` y
// `conceptos_citados`); sin ellos, se deja el identificador. No admite HTML crudo: todo
// se escapa antes. Sin dependencias a propósito.
// ---------------------------------------------------------------------------

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export function escapar(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])
}

// Las marcas internas del corpus ([[CARENCIA DECLARADA: …]], [[CERTEZA JUSTIFICADA …]])
// se muestran como nota, no como texto corrido.
function marcas(s) {
  return s.replace(/\[\[([^\]]+)\]\]/g, (_, m) => `<span class="marca">${m}</span>`)
}

// La cita en el texto es un marcador enlazado, sin paréntesis: «Treede et al., 2019». El
// enlace va al DOI del artículo (o a su URL) para poder verificarlo en un clic; si la
// referencia no tiene ninguno, lleva a su entrada en la lista. El tooltip muestra la entrada.
function enlaceRef(id, refs, forma) {
  const r = refs?.[id]
  const texto = (r && r[forma]) || id
  const doi = (r?.doi || '').replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
  const externo = doi ? `https://doi.org/${doi}` : (r?.url || '')
  const href = externo || `#ref-${id}`
  const destino = externo ? ' target="_blank" rel="noopener noreferrer"' : ''
  const titulo = r?.apa ? ` title="${escapar(apaSinEnlace(r.apa))}"` : ''
  return `<a class="ref" href="${escapar(href)}" data-ref="${id}"${destino}${titulo}>${escapar(texto)}</a>`
}

function citas(t, refs) {
  // Una sola pasada: los grupos entre paréntesis del corpus —(REF-0001) · (REF-0001, REF-0002) ·
  // (REF-0001; REF-0002)— pierden los paréntesis y quedan como marcadores separados por punto y
  // coma; las citas sueltas en la prosa van en forma narrativa. Una pasada y no dos, para no
  // volver a leer los identificadores que el propio enlace generado lleva en sus atributos.
  return t.replace(/\((REF-\d{4}(?:\s*[,;]\s*REF-\d{4})*)\)|\b(REF-\d{4})\b/g, (_, grupo, suelta) =>
    grupo
      ? grupo.split(/\s*[,;]\s*/).map((id) => enlaceRef(id, refs, 'parentetica')).join('; ')
      : enlaceRef(suelta, refs, 'narrativa'))
}

// Todo lo que el corpus cita por código —conceptos, errores frecuentes, metáforas, objetivos,
// competencias, instrumentos, módulos y dominios— se muestra por su nombre entre comillas; el
// código y el tipo quedan en el tooltip. Lo que no viene en el mapa se deja como código.
const RE_ENTIDAD = /\b(CPT-\d{5}|ERR-\d{4}|MET-\d{3}|OBJ-\d{4}|COM-\d{3}|INS-\d{3}|CAS-\d{3,4}|PER-\d{3}|D\d{2}(?:\.M\d{2})?)\b/g

function entidadesCitadas(t, entidades) {
  return t.replace(RE_ENTIDAD, (_, id) => {
    const e = entidades?.[id]
    return e
      ? `<span class="cpt" title="${escapar(e.tipo ? `${e.tipo} · ${id}` : id)}">"${escapar(e.nombre)}"</span>`
      : `<span class="cpt codigo">${id}</span>`
  })
}

function enLinea(s, mapas = {}) {
  let t = escapar(s)
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>')
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>')
  t = t.replace(/(^|[\s(])_([^_\n]+)_(?=[\s().,;:]|$)/g, '$1<em>$2</em>')
  t = citas(t, mapas.refs)
  t = entidadesCitadas(t, mapas.entidades)
  return marcas(t)
}

export function aHtml(markdown, mapas = {}) {
  const lineas = String(markdown ?? '').replace(/\r/g, '').split('\n')
  const salida = []
  let parrafo = []
  let lista = null
  const cerrarParrafo = () => {
    if (parrafo.length) {
      salida.push(`<p>${enLinea(parrafo.join(' '), mapas)}</p>`)
      parrafo = []
    }
  }
  const cerrarLista = () => {
    if (lista) {
      salida.push(`<${lista.tipo}>${lista.items.map((i) => `<li>${enLinea(i, mapas)}</li>`).join('')}</${lista.tipo}>`)
      lista = null
    }
  }
  for (const cruda of lineas) {
    const linea = cruda.trimEnd()
    const item = /^\s*[-*•]\s+(.*)$/.exec(linea)
    const numerado = /^\s*\d+[.)]\s+(.*)$/.exec(linea)
    if (!linea.trim()) { cerrarParrafo(); cerrarLista(); continue }
    if (item || numerado) {
      cerrarParrafo()
      const tipo = item ? 'ul' : 'ol'
      if (!lista || lista.tipo !== tipo) { cerrarLista(); lista = { tipo, items: [] } }
      lista.items.push((item || numerado)[1])
      continue
    }
    const titulo = /^(#{1,4})\s+(.*)$/.exec(linea)
    if (titulo) {
      cerrarParrafo(); cerrarLista()
      const nivel = Math.min(titulo[1].length + 2, 6)
      salida.push(`<h${nivel}>${enLinea(titulo[2], mapas)}</h${nivel}>`)
      continue
    }
    cerrarLista()
    parrafo.push(linea.trim())
  }
  cerrarParrafo(); cerrarLista()
  return salida.join('')
}

// Una línea suelta (sin párrafo): para la entrada de una referencia.
export function enLineaHtml(texto, mapas = {}) {
  return enLinea(texto, mapas)
}

// Texto plano (para resúmenes cortos y aria-labels).
export function aPlano(markdown) {
  return String(markdown ?? '')
    .replace(/\[\[[^\]]+\]\]/g, '')
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Palabras ≈ minutos de lectura (a 180 palabras/min, que es lectura técnica).
export function minutosLectura(...textos) {
  const palabras = textos.map(aPlano).join(' ').split(' ').filter(Boolean).length
  return Math.max(1, Math.round(palabras / 180))
}

// Mapas que necesita aHtml, a partir del concepto tal como llega de la API.
export function mapasDe(concepto) {
  const refs = Object.fromEntries((concepto?.referencias || []).map((r) => [r.id, r]))
  const entidades = Object.fromEntries((concepto?.entidades_citadas || []).map((e) => [e.id, { nombre: e.nombre ?? e.titulo, tipo: e.tipo || 'concepto' }]))
  return { refs, entidades }
}

// La entrada de la lista de referencias sin el enlace final (el DOI va aparte, como hipervínculo).
export function apaSinEnlace(apa) {
  return String(apa ?? '')
    .replace(/,?\s*\[autoría truncada en la fuente\]/, ', et al.')
    .replace(/\s*https?:\/\/\S+\s*$/, '')
    .trim()
}
