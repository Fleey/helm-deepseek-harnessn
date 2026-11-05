#!/usr/bin/env node
// seal-install.check — the root seal sync must never overwrite the root shims.
//
// A `github:` install mounts this repo as `helmd`, so the root
// preset.generated.patch.yml's agent row must say `helmd/agent`. The subpackage
// copy says `@adwmc/helm-d/agent` (correct for the npm/tgz package). Running
// scripts/sync-root-seal.mjs in a fresh tree must therefore copy ONLY the
// sealed artifacts — the three shim-maintained root files must survive
// byte-identical. This reproduces the fork.8 incident where copying the
// subpackage preset over the root shim broke preset mounting (helmd sessions
// failed to open with "Cannot find package '@adwmc/helm-d'").
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReporter } from './reporter.mjs'

const report = createReporter('seal-install')

const repo = join(import.meta.dirname, '..', '..')
const SHIMS = ['cordis.patch.yml', 'preset.generated.patch.yml', 'client.js']

const tree = mkdtempSync(join(tmpdir(), 'helmd-seal-check-'))
try {
  // A fresh checkout shape: subpackage present, root shims present, root
  // sealed artifacts absent (as after clone).
  mkdirSync(join(tree, 'scripts'), { recursive: true })
  cpSync(join(repo, 'packages', 'helmd'), join(tree, 'packages', 'helmd'), { recursive: true })
  cpSync(join(repo, 'scripts', 'sync-root-seal.mjs'), join(tree, 'scripts', 'sync-root-seal.mjs'))
  for (const f of SHIMS) cpSync(join(repo, f), join(tree, f))
  // A minimal package.json so the script's assumptions hold.
  writeFileSync(join(tree, 'package.json'), JSON.stringify({ name: 'helmd', private: true }), 'utf8')

  const before = Object.fromEntries(SHIMS.map((f) => [f, readFileSync(join(tree, f))]))
  execFileSync(process.execPath, [join(tree, 'scripts', 'sync-root-seal.mjs')], { cwd: tree })

  await report.check('sync-root-seal leaves the three root shims byte-identical', () => {
    for (const f of SHIMS) {
      const after = readFileSync(join(tree, f))
      if (!after.equals(before[f])) throw new Error(`${f} was modified by sync-root-seal`)
    }
  })

  await report.check('root preset keeps the git-install agent row (helmd/agent, not @adwmc/helm-d)', () => {
    const preset = readFileSync(join(tree, 'preset.generated.patch.yml'), 'utf8')
    if (!preset.includes("name: 'helmd/agent'")) throw new Error('root preset lost the helmd/agent row')
    if (preset.includes('@adwmc/helm-d/agent')) throw new Error('root preset was overwritten with the subpackage agent row')
  })

  await report.check('every sealed artifact is copied to the root and matches the subpackage', () => {
    const artifacts = ['payload.dat', 'references.dat', 'presets/preset.yml', 'presets/profiles.dat', 'dist/health.js', 'dist/index.js']
    for (const rel of artifacts) {
      const rootCopy = readFileSync(join(tree, rel))
      const sub = readFileSync(join(tree, 'packages', 'helmd', rel))
      if (!rootCopy.equals(sub)) throw new Error(`${rel} root copy differs from the subpackage`)
    }
  })
} finally {
  rmSync(tree, { recursive: true, force: true })
}

report.finish()
