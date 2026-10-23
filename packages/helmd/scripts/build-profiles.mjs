// Build-time: seal presets/profiles/*.md into presets/profiles.dat (AES-256-GCM,
// built-in key per operator ruling). Run AFTER tsc (imports dist/crypt.js).
// Usage: node scripts/build-profiles.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkg = join(here, '..')
const profilesDir = join(pkg, 'presets', 'profiles')
const outPath = join(pkg, 'presets', 'profiles.dat')

const { seal } = await import(pathToFileURL(join(pkg, 'dist', 'crypt.js')).href)

const NAMES = { core: '全能主档（v9 全量）', stealth: '轻量隐匿版', 'redteam-max': '渗透加厚版' }

const files = readdirSync(profilesDir).filter((f) => f.endsWith('.md'))
if (files.length === 0) throw new Error(`no profiles found in ${profilesDir}`)

const catalog = {
  version: 1,
  activeId: 'core',
  profiles: files.map((f) => {
    const id = f.replace(/\.md$/, '')
    const body = readFileSync(join(profilesDir, f), 'utf8')
    if (id === 'core' && !body.includes('helmd ' + 'online')) {
      throw new Error('profiles/core.md lost the activation line (helmd ' + 'online) — persona source is stale or wrong')
    }
    if (!body.trim()) throw new Error(`profiles/${f} is empty`)
    return { id, name: NAMES[id] ?? id, sealed: seal(body) }
  }),
}

writeFileSync(outPath, JSON.stringify({ version: catalog.version, activeId: catalog.activeId, profiles: catalog.profiles.map(({ id, name, sealed }) => ({ id, name, sealed })) }, null, 2), 'utf8')
console.log(`profiles.dat: ${catalog.profiles.length} profile(s) → ${outPath}`)
