// Subject: helm-d's browser surfaces must not leak into sessions running a
// different agent preset. The client module itself is injected globally, so
// the isolation contract lives in these choices: keep the official
// `agent-preset` seat (own id instead of shadowing), render nothing for
// non-helmd sessions, and keep the fork's conversation.view workbench
// registered only while the session runs the helmd preset.
// (fork: the star gate is gone entirely, so its isolation assertions reduce
// to "no gate code registers anywhere".)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { repoRoot } from './artifacts.mjs'
import { createReporter } from './reporter.mjs'

const source = readFileSync(join(repoRoot, 'packages', 'helmd', 'client.js'), 'utf8')
const report = createReporter('client-scope')

await report.check('the header capsule does not shadow the official agent-preset seat', () => {
  assert.ok(!/id:\s*"agent-preset"/.test(source), 'the official header label must keep its seat')
  assert.match(source, /id:\s*"helm-d:workbench"/, 'the workbench capsule needs its own id')
})

await report.check('the star gate is fully absent (fork removed it)', () => {
  assert.ok(!/name:\s*"shell\.overlay"/.test(source), 'no global shell overlay registration may exist')
  assert.ok(!/fetch\(['"`]\/api\/helmd\/gate/.test(source), 'no gate API polling may remain in the client')
  assert.ok(!/HelmdGatePanel/.test(source), 'the gate panel component must not exist')
})

await report.check('non-helmd sessions get no capsule', () => {
  assert.match(source, /if \(preset !== "helmd"\) return null/, 'non-helmd must return null')
})

await report.check('the conversation.view workbench tab is registered per-preset only', () => {
  // The fork's session tab mounts only while the capsule sees preset === "helmd";
  // the registration lives inside that effect and is disposed on change.
  assert.match(source, /if \(preset !== "helmd"\) return undefined/, 'the view registration must be gated on the helmd preset')
  assert.match(source, /name:\s*"conversation\.view"/, 'the conversation.view registration must exist')
})

report.finish()
