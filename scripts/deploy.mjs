#!/usr/bin/env node
// Publicar en GitHub Pages, a mano y a propósito:  npm run deploy
//
// Construye con el .env local (la clave anon queda en el bundle: es pública), escribe el
// CNAME del dominio y empuja `dist/` a la rama `gh-pages`. Exige árbol limpio y tests en
// verde: publicar lo que no está commiteado es la forma silenciosa de desplegar algo que
// no es lo que tienes delante.
import { execSync } from 'node:child_process'
import { writeFileSync, existsSync, rmSync, cpSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const DOMINIO = process.env.VALIDA_DOMINIO || 'valida.edpain.com'
const sh = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()

if (out('git status --porcelain')) { console.error('✖ Hay cambios sin commitear. Commitea antes de publicar.'); process.exit(1) }
sh('npm run verify')

const remoto = out('git remote get-url origin')
const commit = out('git rev-parse --short HEAD')
writeFileSync('dist/CNAME', DOMINIO + '\n')
// SPA con rutas por hash: no hace falta 404.html, pero GitHub lo sirve si existe.
cpSync('dist/index.html', 'dist/404.html')
writeFileSync('dist/.nojekyll', '')

const tmp = join(tmpdir(), `valida-gh-pages-${Date.now()}`)
mkdirSync(tmp)
sh(`git -C "${tmp}" init -q -b gh-pages`)
cpSync('dist', tmp, { recursive: true })
sh(`git -C "${tmp}" add -A`)
sh(`git -C "${tmp}" -c user.name=deploy -c user.email=deploy@valida.local commit -q -m "deploy ${commit}"`)
sh(`git -C "${tmp}" push -f "${remoto}" gh-pages`)
rmSync(tmp, { recursive: true, force: true })
if (existsSync('dist/CNAME')) console.log(`✓ Publicado ${commit} en https://${DOMINIO}/ (puede tardar 1-2 min)`)
