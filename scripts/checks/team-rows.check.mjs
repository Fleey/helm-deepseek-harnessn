// Subject: the two Agent Teams rows the preset adds must stand down while the
// Host root already runs the same plugin (stable names since dsh 0.2.2-rc.2,
// experimental spellings before), or while the host cannot resolve the stable
// packages at all. With the host copy on, a second `tool-agent-team` installs
// the Team tools on every team member twice; the second `team:policy` prompt
// section throws "already registered in this scope", `agent/created` fails,
// and the Agent is torn down and reopened in a loop (the session flickers).
// The conditions are evaluated here exactly the way the Loader does it:
// `with (ctx) eval(expr)`.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { repoRoot } from './artifacts.mjs'
import { createReporter } from './reporter.mjs'

const report = createReporter('team-rows')
// Stable names since dsh 0.2.2-rc.2 (dsh-base mounts both at the Host root);
// the retired experimental bundle used the experimental spellings, which the
// standdown conditions still match.
const TOOL = '@deepseek-ai/dsh-tool-agent-team'
const SERVICE = '@deepseek-ai/dsh-agent-team'
const TOOL_OLD = '@deepseek-ai/dsh-experimental-tool-agent-team'
const SERVICE_OLD = '@deepseek-ai/dsh-experimental-agent-team'

/** The Loader's own evaluator (cordis-plugin-loader `evaluate`). */
const evaluate = new Function('ctx', 'expr', 'with (ctx) { return eval(expr) }')

/** Pull a row's id, name and `!!js` disabled expression out of the patch text. */
function rowFor(text, name) {
  const lines = text.split('\n')
  const at = lines.findIndex((line) => line.trim() === `name: '${name}'`)
  assert.ok(at > 0, `${name} row missing`)
  const id = lines[at - 1].trim().replace(/^- id: /, '')
  const disabled = lines[at + 1].trim().match(/^disabled: !!js "(.*)"$/)
  assert.ok(disabled, `${name} row must carry a !!js disabled condition`)
  return { id, name, expr: disabled[1] }
}

/**
 * Evaluate both rows against a Host root that holds `hostEntries`.
 * `resolvable` models the resolve-probe half of the conditions: whether the
 * host tree can resolve the stable Team packages from its baseUrl (true on
 * dsh >= 0.2.2-rc.2, false on the older in-interval hosts).
 */
function scenario(text, hostEntries, resolvable = true) {
  const tool = rowFor(text, TOOL)
  const service = rowFor(text, SERVICE)
  const root = []
  const require = { resolve: (specifier) => {
    if (resolvable && (specifier === `${TOOL}/package.json` || specifier === `${SERVICE}/package.json`)) return '/host/' + specifier
    throw new Error('MODULE_NOT_FOUND: ' + specifier)
  } }
  const ctx = {
    baseUrl: 'file:///host/profile/cordis.yml',
    process: { getBuiltinModule: (name) => (name === 'node:module' ? { createRequire: () => require } : undefined) },
    get: (name) => (name === 'loader' ? { entries: function* () { yield* root } } : undefined),
  }
  const entry = (options, expr) => ({
    options,
    get disabled() { return expr === undefined ? Boolean(options.disabled) : Boolean(evaluate(ctx, expr)) },
  })
  for (const options of hostEntries) root.push(entry(options))
  // helmd's own service row lives in the Host root too; the preset's tool row
  // does not (a preset mounts its own tree, outside `loader.entries()`).
  root.push(entry({ id: service.id, name: SERVICE }, service.expr))
  return {
    serviceId: service.id,
    service: Boolean(evaluate(ctx, service.expr)),
    tool: Boolean(evaluate(ctx, tool.expr)),
  }
}

const OFFICIAL = [
  { id: 'agent-team', name: SERVICE },
  { id: 'tool-agent-team', name: TOOL },
]
const OFFICIAL_OLD = [
  { id: 'agent-team', name: SERVICE_OLD },
  { id: 'tool-agent-team', name: TOOL_OLD },
]

for (const file of ['packages/helmd/preset.generated.patch.yml', 'preset.generated.patch.yml']) {
  const text = readFileSync(join(repoRoot, file), 'utf8')

  await report.check(`${file}: both rows stand down while the official Agent Teams bundle runs`, () => {
    assert.deepEqual(scenario(text, OFFICIAL), { serviceId: 'helmd-agent-team', service: true, tool: true })
  })

  await report.check(`${file}: without the bundle, helmd sessions keep the team service and tools`, () => {
    assert.deepEqual(scenario(text, []), { serviceId: 'helmd-agent-team', service: false, tool: false })
  })

  await report.check(`${file}: a disabled bundle row does not count as running`, () => {
    const off = OFFICIAL.map((options) => ({ ...options, disabled: true }))
    assert.deepEqual(scenario(text, off), { serviceId: 'helmd-agent-team', service: false, tool: false })
  })

  await report.check(`${file}: the retired experimental bundle also stands both rows down`, () => {
    assert.deepEqual(scenario(text, OFFICIAL_OLD), { serviceId: 'helmd-agent-team', service: true, tool: true })
  })

  await report.check(`${file}: on a host without the stable Team packages both rows stand down`, () => {
    assert.deepEqual(scenario(text, [], false), { serviceId: 'helmd-agent-team', service: true, tool: true })
  })

  await report.check(`${file}: the service row has its own id, apart from the bundle's agent-team`, () => {
    assert.doesNotMatch(text, /^ {4}- id: agent-team$/m, 'inserts are not deduplicated; a second agent-team row would run twice')
  })

  await report.check(`${file}: the service row carries no maxMembers config (TEAM_INVALID_CONFIG on stable hosts)`, () => {
    assert.doesNotMatch(text, /maxMembers/, 'the stable team service rejects maxMembers')
  })
}

report.finish()
