// ---------------------------------------------------------------------------
// Números aleatorios permanentes (PRN) — Ohlsson 1995.
//
// Cada concepto recibe un número fijo en [0, 1) derivado de SHA-256(semilla ‖ '|' ‖ id).
// Está en la muestra si su número es menor que la fracción dentro de su estrato (dominio).
// Como el número no depende de qué otros conceptos existan, la muestra de hoy es
// subconjunto de la de mañana: los conceptos nuevos entran o no por su propio número y
// los ya valorados no se mueven. Ampliar un dominio es subir la fracción.
//
// pipeline/prn.py implementa EXACTAMENTE lo mismo; tests/prn.test.js comprueba que los
// dos dan los mismos números sobre vectores fijos.
// ---------------------------------------------------------------------------

const HEX = 13 // 13 hex = 52 bits, lo que cabe exacto en un double

export async function prn(semilla, id) {
  const datos = new TextEncoder().encode(`${semilla}|${id}`)
  const hash = await crypto.subtle.digest('SHA-256', datos)
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return parseInt(hex.slice(0, HEX), 16) / Math.pow(16, HEX)
}

// Selección estratificada proporcional con suelo. `conceptos`: [{id, dominio, prn}].
// Devuelve el conjunto de ids incluidos por el estrato aleatorio.
export function muestrear(conceptos, fraccion, suelo) {
  const porDominio = new Map()
  for (const c of conceptos) {
    if (!porDominio.has(c.dominio)) porDominio.set(c.dominio, [])
    porDominio.get(c.dominio).push(c)
  }
  const incluidos = new Set()
  for (const [, lista] of porDominio) {
    const ordenada = [...lista].sort((a, b) => a.prn - b.prn || (a.id < b.id ? -1 : 1))
    const porFraccion = ordenada.filter((c) => c.prn < fraccion)
    const elegidos = porFraccion.length >= suelo ? porFraccion : ordenada.slice(0, Math.min(suelo, ordenada.length))
    for (const c of elegidos) incluidos.add(c.id)
  }
  return incluidos
}
