// Subject: the workbench HTTP routes registered by the bundle row (dist/health.js).
// A cordis layer may only read the services it declared in `inject`; reading another
// throws. When the tools route lost that declaration the failure surfaced as a live
// HTTP 500 that no other check covered, so this drives the real apply() twice: once
// under a context that enforces the guard, once with a tools service exposing only
// ToolRuntime's public enumeration.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { distDir } from './artifacts.mjs'
import { createReporter, skip } from './reporter.mjs'

const entry = join(distDir, 'health.js')
if (!existsSync(entry)) skip('api-routes', 'need packages/helmd/dist (run pnpm build)')

// The profile POST persists the operator choice. Keep the check off the real
// ~/.dsh state: every write goes to this throwaway home.
process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'helmd-api-home-'))
process.env.HELMD_CASES_DIR = mkdtempSync(join(tmpdir(), 'helmd-api-cases-'))
const report = createReporter('api-routes')

const ROUTE_BASE = '/api/helmd'
// fork: no gate family — the star gate is gone; /update hits the network so it is
// asserted registered but not called.
const ROUTES = ['tools', 'intercept', 'profile', 'update']

/** Registry contents, reachable only through register/schemas — no layer internals. */
const registered = []
const services = {
  tools: {
    register: (def) => {
      if (def?.name) registered.push(def.name)
      return () => {}
    },
    schemas: () => registered.map((name) => ({ name })),
  },
  settings: { register: () => {} },
  webServer: { register: () => {} },
}

const routes = new Map()
services.webServer.register = (route) => {
  routes.set(`${route.kind}\u0000${route.path}`, route)
  return () => {}
}

for (const name of ['begin_case', 'case_status', 'read', 'bash']) services.tools.register({ name })

/** Context stand-in: an undeclared service read throws like the host's injection guard. */
function makeContext(grants) {
  return new Proxy({}, {
    get(_target, prop) {
      if (prop === 'inject') return (deps, cb) => cb(makeContext([...grants, ...deps]))
      if (prop === 'on' || prop === 'emit' || prop === 'get') return () => {}
      if (typeof prop === 'string' && Object.hasOwn(services, prop)) {
        if (!grants.includes(prop)) throw new Error(`cannot get property "${prop}" without inject`)
        return services[prop]
      }
      return undefined
    },
    set: () => true,
  })
}

const { apply } = await import(pathToFileURL(entry).href)
apply(makeContext([]))

/** Call a registered handler against a stand-in response. */
async function call(path, req = {}) {
  const route = routes.get(`exact\u0000${path}`)
  assert.ok(route, `route ${path} was not registered`)
  const res = {
    statusCode: 0,
    body: '',
    setHeader() {},
    end(chunk) { this.body = chunk },
  }
  await route.handler(req, res)
  return { status: res.statusCode, payload: JSON.parse(res.body) }
}

/** Drive a POST through the same registered handler with a JSON body. */
async function post(path, body, headers = { 'content-type': 'application/json' }) {
  const route = routes.get(`exact\u0000${path}`)
  assert.ok(route, `route ${path} was not registered`)
  const listeners = new Map()
  const req = {
    method: 'POST',
    headers,
    on(event, callback) {
      const list = listeners.get(event) ?? []
      list.push(callback)
      listeners.set(event, list)
      return req
    },
  }
  const res = {
    statusCode: 0,
    body: '',
    setHeader() {},
    end(chunk) { this.body = chunk },
  }
  const pending = route.handler(req, res)
  const chunk = Buffer.from(JSON.stringify(body), 'utf8')
  for (const callback of listeners.get('data') ?? []) callback(chunk)
  for (const callback of listeners.get('end') ?? []) callback()
  await pending
  return { status: res.statusCode, payload: JSON.parse(res.body) }
}

await report.check('every workbench route is registered', () => {
  for (const name of ROUTES) {
    assert.ok(routes.has(`exact\u0000${ROUTE_BASE}/${name}`), `missing route: ${ROUTE_BASE}/${name}`)
  }
})

await report.check('GET /tools answers 200, not the injection-guard 500', async () => {
  const { status, payload } = await call(`${ROUTE_BASE}/tools`)
  assert.equal(status, 200, `got ${status}: ${payload?.error ?? ''}`)
  assert.equal(payload.ok, true)
})

await report.check('GET /tools reports the live registry through the public enumeration', async () => {
  const { payload } = await call(`${ROUTE_BASE}/tools`)
  assert.deepEqual(payload.data, [...registered].sort())
})

for (const name of ['intercept']) {
  await report.check(`GET /${name} answers 200`, async () => {
    const { status, payload } = await call(`${ROUTE_BASE}/${name}`)
    assert.equal(status, 200, `got ${status}: ${payload?.error ?? ''}`)
    assert.equal(payload.ok, true)
  })
}

await report.check('GET /profile reports the sealed catalog and its active entry', async () => {
  const { status, payload } = await call(`${ROUTE_BASE}/profile`)
  assert.equal(status, 200, `got ${status}: ${payload?.error ?? ''}`)
  assert.equal(payload.ok, true)
  assert.equal(typeof payload.data.activeId, 'string')
  assert.ok(
    payload.data.profiles.some((p) => p.id === payload.data.activeId && p.active === true),
    'the active id must name exactly one active catalog entry',
  )
})

await report.check('POST /profile persists the operator choice', async () => {
  const { status, payload } = await post(`${ROUTE_BASE}/profile`, { id: 'stealth' })
  assert.equal(status, 200, `got ${status}: ${payload?.error ?? ''}`)
  assert.equal(payload.ok, true)
  assert.equal(payload.data.activeId, 'stealth')
  assert.ok(payload.data.profiles.find((p) => p.id === 'stealth').active)
  const saved = JSON.parse(readFileSync(join(process.env.DSH_HOME, 'storages', 'helmd', 'profile.json'), 'utf8'))
  assert.equal(saved.activeId, 'stealth')
})

await report.check('POST /profile rejects an unknown id without changing the choice', async () => {
  const { status, payload } = await post(`${ROUTE_BASE}/profile`, { id: 'ghost' })
  assert.equal(status, 400, `expected 400, got ${status}`)
  assert.equal(payload.ok, false)
  assert.match(payload.error, /unknown profile/)
  const { payload: after } = await call(`${ROUTE_BASE}/profile`)
  assert.equal(after.data.activeId, 'stealth')
})

await report.check('POST /profile rejects a body without an id', async () => {
  const { status, payload } = await post(`${ROUTE_BASE}/profile`, {})
  assert.equal(status, 400, `expected 400, got ${status}`)
  assert.equal(payload.ok, false)
})

await report.check('POST /profile refuses a non-JSON content type (no drive-by form)', async () => {
  const { status, payload } = await post(
    `${ROUTE_BASE}/profile`,
    { id: 'core' },
    { 'content-type': 'text/plain' },
  )
  assert.equal(status, 415, `expected 415, got ${status}`)
  assert.equal(payload.ok, false)
})

// The workbench used to show the latest open case from disk, so a fresh session
// could display another session's investigation. The route now resolves only
// the sessionId it was given; a different or missing session gets `active:false`.
const caseDir = join(process.env.HELMD_CASES_DIR, '2026-10-27-api-case')
mkdirSync(join(caseDir, 'evidence'), { recursive: true })
writeFileSync(join(caseDir, 'CASE.md'), 'status: open\ngoal: api case\nmode: full\nroute: reverse\n')
const { bindCase } = await import(pathToFileURL(join(distDir, 'case.js')).href)
bindCase('sess-api', { dir: caseDir, name: '2026-10-27-api-case', goal: 'api case', mode: 'full', route: 'reverse' })

await report.check('GET /case is bound to the requesting session, not the latest open case', async () => {
  const bound = await call(`${ROUTE_BASE}/case`, { url: `${ROUTE_BASE}/case?sessionId=sess-api` })
  assert.equal(bound.status, 200)
  assert.equal(bound.payload.data.active, true)
  assert.equal(bound.payload.data.name, '2026-10-27-api-case')

  const other = await call(`${ROUTE_BASE}/case`, { url: `${ROUTE_BASE}/case?sessionId=sess-other` })
  assert.equal(other.payload.data.active, false)

  const none = await call(`${ROUTE_BASE}/case`)
  assert.equal(none.payload.data.active, false)
})

await report.check('GET /case/findings follows the same session binding', async () => {
  const bound = await call(`${ROUTE_BASE}/case/findings`, { url: `${ROUTE_BASE}/case/findings?sessionId=sess-api` })
  assert.equal(bound.status, 200)
  assert.ok(Array.isArray(bound.payload.data))
  const other = await call(`${ROUTE_BASE}/case/findings`, { url: `${ROUTE_BASE}/case/findings?sessionId=sess-other` })
  assert.deepEqual(other.payload.data, [])
})

report.finish()
