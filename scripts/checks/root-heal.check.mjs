// Subject: the boot-time preset health check must judge — and repair — the
// preset of the package it is actually mounted as. Since fork.7 the host-plane
// entry runs from the repo root, which a `github:` install mounts as `helmd`;
// the root preset therefore names `helmd/agent` (scripts/sync-root-shim.mjs).
// The check used to demand `@adwmc/helm-d` exactly once, so it marked that
// correct root preset STALE on every boot and the default auto-heal rewrote it
// with `@adwmc/helm-d/agent`: ERR_MODULE_NOT_FOUND, the `helmd` row never
// started, the preset mount was rejected and helmd sessions vanished on open.
// This check runs the built health module from a scratch repo-root install.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { distDir, repoRoot } from './artifacts.mjs'
import { createReporter, skip } from './reporter.mjs'

if (!existsSync(join(distDir, 'health.js')) || readFileSync(join(distDir, 'health.js'), 'utf8').includes('Sealed entry stub')) {
  skip('root-heal', 'need a built packages/helmd/dist (run pnpm build)')
}
const report = createReporter('root-heal')
const fixtureHost = join(repoRoot, 'scripts', 'checks', 'fixtures', 'host-standard.patch.yml')

/** A repo-root install: package `helmd`, host-plane entry under dist/, generator under scripts/. */
function rootInstall() {
  const dir = mkdtempSync(join(tmpdir(), 'helmd-root-heal-'))
  cpSync(distDir, join(dir, 'dist'), { recursive: true })
  cpSync(join(repoRoot, 'package.json'), join(dir, 'package.json'))
  cpSync(join(repoRoot, 'scripts', 'gen-preset.mjs'), join(dir, 'scripts', 'gen-preset.mjs'))
  cpSync(join(repoRoot, 'packages', 'helmd', 'presets'), join(dir, 'packages', 'helmd', 'presets'), { recursive: true })
  cpSync(join(repoRoot, 'packages', 'helmd', 'presets'), join(dir, 'presets'), { recursive: true })
  symlinkSync(join(repoRoot, 'packages', 'helmd', 'node_modules'), join(dir, 'node_modules'), 'dir')
  mkdirSync(join(dir, 'home'))
  return dir
}

const env = (dir) => {
  const out = { ...process.env, DSH_HOST_STANDARD_YML: fixtureHost, DSH_HOME: join(dir, 'home') }
  delete out.HELMD_AUTO_HEAL
  delete out.HELMD_PRESET_PATCH
  return out
}

/** The root copy sync-root-shim commits: gen-preset's output with the agent row renamed. */
function rootPreset(dir) {
  const sub = join(dir, 'gen-sub')
  execFileSync(process.execPath, [join(dir, 'scripts', 'gen-preset.mjs'), '--out', sub], { env: env(dir), stdio: 'pipe' })
  return readFileSync(join(sub, 'preset.generated.patch.yml'), 'utf8')
    .split("name: '@adwmc/helm-d/agent'").join("name: 'helmd/agent'")
}

/** Boot verdict, computed in a fresh process the way the host plane does once per boot. */
function boot(dir) {
  const probe = `import(${JSON.stringify(join(dir, 'dist', 'health.js'))}).then((m) => { const h = m.evaluateHealth(); process.stdout.write(JSON.stringify({ status: h.status, autoHeal: h.autoHeal ?? null, detail: h.detail })) })`
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', probe], { cwd: dir, env: env(dir), encoding: 'utf8' }))
}

const dir = rootInstall()
try {
  const presetPath = join(dir, 'preset.generated.patch.yml')
  const good = rootPreset(dir)
  assert.match(good, /^ {12}name: 'helmd\/agent'$/m)

  await report.check('a correct root preset (helmd/agent) is OK at boot and left untouched', () => {
    writeFileSync(presetPath, good, 'utf8')
    const verdict = boot(dir)
    assert.equal(verdict.status, 'OK', `unexpected verdict: ${JSON.stringify(verdict)}`)
    assert.equal(readFileSync(presetPath, 'utf8'), good, 'boot must not rewrite a correct root preset')
    assert.ok(!existsSync(`${presetPath}.bak`), 'nothing to back up')
  })

  await report.check('a drifted root preset is repaired with the root package name', () => {
    const drifted = good.replace(/^ {10}- id: tool-fs\n {12}name: '[^']+'\n/m, '')
    assert.notEqual(drifted, good, 'the fixture must lose a row')
    writeFileSync(presetPath, drifted, 'utf8')
    const verdict = boot(dir)
    assert.match(verdict.autoHeal ?? '', /^healed \(STALE → OK\)/, `unexpected verdict: ${JSON.stringify(verdict)}`)
    const healed = readFileSync(presetPath, 'utf8')
    assert.match(healed, /^ {12}name: 'helmd\/agent'$/m, 'the repaired agent row must name the root package')
    assert.doesNotMatch(healed, /@adwmc\/helm-d/, 'a root install has no @adwmc/helm-d package')
  })

  await report.check('a root preset naming the subpackage is not OK — it cannot load here', () => {
    writeFileSync(presetPath, good.split("name: 'helmd/agent'").join("name: '@adwmc/helm-d/agent'"), 'utf8')
    const verdict = boot(dir)
    assert.match(verdict.autoHeal ?? '', /^healed \(STALE → OK\)/, `unexpected verdict: ${JSON.stringify(verdict)}`)
    assert.match(readFileSync(presetPath, 'utf8'), /^ {12}name: 'helmd\/agent'$/m)
  })
} finally {
  rmSync(dir, { recursive: true, force: true })
}

report.finish()
