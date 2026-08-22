import { aHtml } from '../lib/texto.js'

// El Markdown del corpus, ya escapado en aHtml (no admite HTML crudo).
export default function Texto({ md, className = '' }) {
  if (!md) return null
  return <div className={`lectura ${className}`} dangerouslySetInnerHTML={{ __html: aHtml(md) }} />
}
