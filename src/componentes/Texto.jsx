import { aHtml } from '../lib/texto.js'

// El Markdown del corpus, ya escapado en aHtml (no admite HTML crudo). `mapas` trae las
// referencias (para las citas APA) y los conceptos citados (para sus títulos).
export default function Texto({ md, mapas, className = '' }) {
  if (!md) return null
  return <div className={`lectura ${className}`} dangerouslySetInnerHTML={{ __html: aHtml(md, mapas) }} />
}
