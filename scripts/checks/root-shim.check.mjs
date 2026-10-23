// Root plugin shim must stay a pure function of packages/helmd.
//
// A bare-repository git install mounts the ROOT package (`helmd`), and DSH names
// a Loader row / client module id after the package it actually mounted — so the
// root needs its own cordis.patch.yml / preset.generated.patch.yml / client.js
// whose names read `helmd`. Those files are generated, not hand-maintained:
// drifting them silently produces a plugin that installs but never mounts.
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const repoRoot = join(import.meta.dirname, '..', '..')
const result = spawnSync(process.execPath, [join(repoRoot, 'scripts', 'sync-root-shim.mjs'), '--check'], {
  cwd: repoRoot,
  encoding: 'utf8',
})

if (result.status === 0) {
  console.log('root-shim: PASS (root shim matches packages/helmd)')
  process.exit(0)
}
process.stderr.write(result.stdout ?? '')
process.stderr.write(result.stderr ?? '')
console.error('root-shim: FAIL — regenerate with: node scripts/sync-root-shim.mjs')
process.exit(1)
