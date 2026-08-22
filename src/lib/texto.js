// ---------------------------------------------------------------------------
// Render mínimo y seguro del Markdown del corpus: párrafos, **negrita**, *cursiva*,
// `código`, listas con «- », y las citas (REF-0001) como enlaces internos. No admite
// HTML crudo: todo se escapa antes. Sin dependencias a propósito.
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

function enLinea(s) {
  let t = escapar(s)
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>')
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  t = t.replace(/\b(REF-\d{4})\b/g, '<a class="ref" href="#ref-$1" data-ref="$1">$1</a>')
  t = t.replace(/\b(CPT-\d{5})\b/g, '<span class="cpt">$1</span>')
  return marcas(t)
}

export function aHtml(markdown) {
  const lineas = String(markdown ?? '').replace(/\r/g, '').split('\n')
  const salida = []
  let parrafo = []
  let lista = null
  const cerrarParrafo = () => {
    if (parrafo.length) {
      salida.push(`<p>${enLinea(parrafo.join(' '))}</p>`)
      parrafo = []
    }
  }
  const cerrarLista = () => {
    if (lista) {
      salida.push(`<${lista.tipo}>${lista.items.map((i) => `<li>${enLinea(i)}</li>`).join('')}</${lista.tipo}>`)
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
      salida.push(`<h${nivel}>${enLinea(titulo[2])}</h${nivel}>`)
      continue
    }
    cerrarLista()
    parrafo.push(linea.trim())
  }
  cerrarParrafo(); cerrarLista()
  return salida.join('')
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
