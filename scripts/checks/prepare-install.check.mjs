// Subject: the `prepare` hook a `github:` install runs must lay out the sealed
// artifacts at the repo root WITHOUT touching the root shim files. The root
// copies of cordis.patch.yml / preset.generated.patch.yml / client.js name the
// package `helmd` (a git install mounts it under that name); the subpackage's
// copies name `@adwmc/helm-d`. fork.7 copied the subpackage preset over the
// root one, the host could not resolve `@adwmc/helm-d/agent`
// (ERR_MODULE_NOT_FOUND), the `helmd` preset row never started, the preset
// mount was rejected and helmd sessions vanished on open. This check runs the
// real script in a scratch copy of the install tree.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { repoRoot } from './artifacts.mjs'
import { createReporter } from './reporter.mjs'

const report = createReporter('prepare-install')

const ROOT_SHIM = ['cordis.patch.yml', 'preset.generated.patch.yml', 'client.js']
const SEALED = [
  'payload.dat', 'references.dat', 'presets/preset.yml', 'presets/profiles.dat',
  'dist/health.js', 'dist/health.d.ts', 'dist/index.js', 'dist/index.d.ts',
]

/** A scratch install tree: the script, the subpackage's sealed set and the root shim. */
function scratchTree() {
  const dir = mkdtempSync(join(tmpdir(), 'helmd-prepare-'))
  cpSync(join(repoRoot, 'scripts', 'prepare-github-install.mjs'), join(dir, 'scripts', 'prepare-github-install.mjs'))
  for (const rel of [...SEALED, 'preset.generated.patch.yml', 'cordis.patch.yml', 'client.js']) {
    const src = join(repoRoot, 'packages', 'helmd', rel)
    if (existsSync(src)) cpSync(src, join(dir, 'packages', 'helmd', rel))
  }
  for (const rel of ROOT_SHIM) cpSync(join(repoRoot, rel), join(dir, rel))
  return dir
}

const dir = scratchTree()
try {
  const before = Object.fromEntries(ROOT_SHIM.map((rel) => [rel, readFileSync(join(dir, rel), 'utf8')]))
  execFileSync(process.execPath, [join(dir, 'scripts', 'prepare-github-install.mjs')], { stdio: 'pipe' })

  await report.check('the root shim files come out of prepare byte-identical', () => {
    for (const rel of ROOT_SHIM) assert.equal(readFileSync(join(dir, rel), 'utf8'), before[rel], `${rel} must not be overwritten`)
  })

  await report.check('the root preset still names the package a git install mounts', () => {
    const preset = readFileSync(join(dir, 'preset.generated.patch.yml'), 'utf8')
    assert.match(preset, /^ {12}name: 'helmd\/agent'$/m, 'the agent row must name helmd/agent')
    assert.doesNotMatch(preset, /@adwmc\/helm-d/, 'the subpackage name cannot be resolved in a git install')
  })

  await report.check('every sealed artifact lands at the root, identical to the subpackage copy', () => {
    for (const rel of SEALED) {
      const at = join(dir, rel)
      assert.ok(existsSync(at), `${rel} missing at the root`)
      assert.deepEqual(readFileSync(at), readFileSync(join(dir, 'packages', 'helmd', rel)), `${rel} differs from the subpackage`)
    }
  })
} finally {
  rmSync(dir, { recursive: true, force: true })
}

report.finish()
