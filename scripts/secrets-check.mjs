#!/usr/bin/env node
// Comprueba que ni el bundle ni el repositorio llevan secretos. La clave anon de
// Supabase es pública por diseño y SÍ va en el bundle; lo que no puede ir es una clave
// de servicio, una clave de dirección/panelista o el .env.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const PATRONES = [
  [/sb_secret_[A-Za-z0-9_-]{16,}/, 'clave secreta de Supabase (sb_secret_…)'],
  [/eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]*cm9sZSI6InNlcnZpY2Vfcm9sZSI[A-Za-z0-9_-]*/, 'JWT service_role'],
  [/\b[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}\b/g, 'clave de panelista (xxxx-xxxx-xxxx)', (m) => !/^(demo|xxxx|zzzz|nuev|aaaa)-/.test(m)],
]

function ficheros(dir, acc = []) {
  for (const n of readdirSync(dir)) {
    if (['node_modules', '.git', 'panel'].includes(n)) continue
    const p = join(dir, n)
    if (statSync(p).isDirectory()) ficheros(p, acc)
    else if (/\.(js|jsx|mjs|json|html|css|py|sql|md|txt)$/.test(n)) acc.push(p)
  }
  return acc
}

let fallos = 0
for (const f of ficheros(process.cwd())) {
  const texto = readFileSync(f, 'utf8')
  if (/secrets-check|tests\//.test(f)) continue
  for (const [re, nombre, filtro] of PATRONES) {
    const coincidencias = (texto.match(re) || []).filter((m) => !filtro || filtro(m))
    if (coincidencias.length) {
      console.error(`✖ ${f}: parece contener ${nombre} (${coincidencias[0].slice(0, 6)}…)`)
      fallos += 1
    }
  }
}
if (existsSync('.git')) {
  const seguidos = execSync('git ls-files', { encoding: 'utf8' }).split('\n')
  for (const s of seguidos) if (/^\.env$|^panel\//.test(s)) { console.error(`✖ ${s} está en Git y no debería`); fallos += 1 }
}
if (fallos) process.exit(1)
console.log('✓ sin secretos en el repositorio ni en el bundle')
