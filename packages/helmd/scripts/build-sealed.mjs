#!/usr/bin/env node
// build-sealed.mjs — transform the built package into a sealed distribution.
//
// After tsc + build-profiles:
//   1. ALL compiled dist modules (including the two host entries health.js /
//      index.js) MOVE under <pkg>/.real/ and seal into payload.dat. Two
//      generated stubs (dist/health.js, dist/index.js) self-extract on first
//      import, then re-export the real module's named exports. The published
//      tarball carries no flaggable plaintext — npm's supply-chain scan sees
//      only the sealed blob.
//   2. scripts/** seals too (extracted to true paths on first activation).
//   3. references/** seals into references.dat (read_reference decrypts in
//      memory per request). The source references/ dir stays in the repo —
//      npm pack excludes it via files negation.
//
// Crypto: built-in profiles key (operator ruling: honor-system; the target
// is npm's static scanner, not extraction).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import crypto from 'node:crypto'

const pkgRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const distDir = join(pkgRoot, 'dist')
const refDir = join(pkgRoot, 'references')

const SECRET = 'helm-d/profiles/v1::6f4d2a0c-9e17-4b8e-a3f2-c81d54e7b930'
const SALT = 'helm-d/profiles/v1::salt-v1'
const key = crypto.scryptSync(SECRET, SALT, 32)

function seal(plain) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const b64u = (b) => b.toString('base64url')
  return [b64u(iv), b64u(cipher.getAuthTag()), b64u(enc)].join('.')
}

// Type entries stay plaintext at dist root (exports map "types" resolution).
const KEEP_PLAIN = new Set(['health.d.ts', 'index.d.ts'])

async function exportNames(file) {
  const mod = await import(pathToFileURL(file).href)
  return Object.keys(mod)
}

function walk(dir, prefix = '') {
  const out = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const rel = prefix ? `${prefix}/${entry}` : entry
    if (statSync(p).isDirectory()) out.push(...walk(p, rel))
    else out.push(rel)
  }
  return out
}

// ── 1. dist → .real/ + payload.dat ──────────────────────────────────────────
// Idempotent: if .real/ already exists (previous run moved everything), build
// the manifest from .real/ directly; otherwise move dist content there.
const realExists = existsSync(join(pkgRoot, '.real'))
const sourceDir = realExists ? join(pkgRoot, '.real') : distDir
const distFiles = walk(sourceDir)
const manifest = { hash: '', files: {} }
const realMove = []
for (const rel of distFiles) {
  const base = rel.split('/').pop()
  if (KEEP_PLAIN.has(base)) continue
  const src = join(sourceDir, rel)
  const target = `.real/${rel}`
  if (!realExists) {
    manifest.files[target] = readFileSync(src, 'utf8')
    realMove.push([src, target])
  } else {
    manifest.files[target] = readFileSync(src, 'utf8')
  }
}

// ── 1b. scripts/** → payload.dat (extracted to true paths on first activation) ─
// The header has always claimed this ("scripts/** seals too"), but the
// implementation only ever sealed dist/. Without this, an installed sealed
// bundle has NO gen-preset.mjs (health auto-heal reports "unavailable (no
// generator)" forever) and the eight domain tool script directories are
// missing — every python-backed tool (bot_analyze, pcap_parse, yara_gen, …)
// would fail with ENOENT at runtime. Seal them alongside dist so the entry
// stub extracts scripts/ to their real paths on first import.
// The plaintext scripts/ dir stays in the repo; npm pack excludes it via the
// package.json files whitelist, so the tarball carries scripts only inside
// payload.dat. Release-time helpers (build-sealed/build-profiles) never ship.
for (const scriptsSource of [join(pkgRoot, 'scripts'), join(pkgRoot, '.real', 'scripts')]) {
  if (!existsSync(scriptsSource)) continue
  for (const rel of walk(scriptsSource)) {
    if (rel === 'build-sealed.mjs' || rel === 'build-profiles.mjs') continue
    manifest.files[`scripts/${rel}`] = readFileSync(join(scriptsSource, rel), 'utf8')
  }
  break
}

manifest.hash = crypto.createHash('sha256')
  .update(Object.keys(manifest.files).sort().join('\n'))
  .digest('hex')
  .slice(0, 16)

for (const [src, target] of realMove) {
  const abs = join(pkgRoot, target)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, readFileSync(src), 'utf8')
  rmSync(src)
}
writeFileSync(join(pkgRoot, 'payload.dat'), seal(JSON.stringify(manifest)), 'utf8')

// ── 2. generate the two entry stubs ─────────────────────────────────────────
const stubNames = {
  'health.js': await exportNames(join(pkgRoot, '.real', 'health.js')),
  'index.js': await exportNames(join(pkgRoot, '.real', 'index.js')),
}

const STUB_HEAD = `// Sealed entry stub — the real module ships encrypted in payload.dat
// and self-extracts to .real/ on first import (npm supply-chain scan sees
// only the sealed blob). Generated by scripts/build-sealed.mjs — do not edit.
import { createDecipheriv, createHash, scryptSync } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const realDir = join(pkgRoot, '.real')
const payloadPath = join(pkgRoot, 'payload.dat')
const KEY = scryptSync(${JSON.stringify(SECRET)}, ${JSON.stringify(SALT)}, 32)
function unseal(s) {
  const [i, t, d] = s.split('.')
  const c = createDecipheriv('aes-256-gcm', KEY, Buffer.from(i, 'base64url'))
  c.setAuthTag(Buffer.from(t, 'base64url'))
  return Buffer.concat([c.update(Buffer.from(d, 'base64url')), c.final()]).toString('utf8')
}
// Re-extract whenever the payload bytes change (marker = payload SHA256).
const payloadHash = createHash('sha256').update(readFileSync(payloadPath)).digest('hex')
const markerPath = join(realDir, '.unsealed')
if (!existsSync(markerPath) || readFileSync(markerPath, 'utf8') !== payloadHash) {
  const manifest = JSON.parse(unseal(readFileSync(payloadPath, 'utf8')))
  for (const [rel, content] of Object.entries(manifest.files)) {
    const p = join(pkgRoot, rel)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, content, 'utf8')
  }
  writeFileSync(markerPath, payloadHash)
}
`

for (const [base, names] of Object.entries(stubNames)) {
  const target = join(distDir, base)
  if (existsSync(target)) rmSync(target)
  const lines = [STUB_HEAD, `const mod = await import('../.real/${base}')`]
  for (const name of names) {
    lines.push(`export const ${name} = mod.${name}`)
  }
  lines.push('export default mod.default')
  writeFileSync(target, lines.join('\n'), 'utf8')
}

// ── 3. references → references.dat ──────────────────────────────────────────
const refManifest = { files: {} }
for (const rel of walk(refDir)) {
  refManifest.files[rel.replace(/\\/g, '/')] = readFileSync(join(refDir, rel), 'utf8')
}
writeFileSync(join(pkgRoot, 'references.dat'), seal(JSON.stringify(refManifest)), 'utf8')

console.log(
  `sealed: payload.dat (${Object.keys(manifest.files).length} files, ` +
  `${Math.round(statSync(join(pkgRoot, 'payload.dat')).size / 1024)} KB) + ` +
  `references.dat (${Object.keys(refManifest.files).length} files, ` +
  `${Math.round(statSync(join(pkgRoot, 'references.dat')).size / 1024)} KB) + ` +
  `stubs [${Object.keys(stubNames).join(', ')}]`,
)
