// Helmd workbench API — HTTP routes for the client-side workbench tabs.
// Each route provides dynamic, real-time data that the client polls.
//
// Routes:
//   GET /api/helmd/health   → boot-time preset health verdict (host plane)
//   GET /api/helmd/tools    → dynamic tool list from ctx.tools registry
//   GET /api/helmd/intercept → stream interception stats (count, last time, snippet)
//   GET /api/helmd/profile   → armor profile catalog + active id
//   POST /api/helmd/profile  → hot-switch the active armor profile {"id":"..."}
//   GET /api/helmd/update    → installed vs latest release (GitHub → npm)
//   GET /api/helmd/case[?sessionId=…]            → the case bound to THIS session
//   GET /api/helmd/case/hypotheses[?sessionId=…] → hypothesis ledger for that case
//   GET /api/helmd/case/findings[?sessionId=…]   → structured findings
//   GET /api/helmd/case/evidence[?sessionId=…]   → evidence entries
//
// (fork: the /gate family is gone with the star gate; /eval is gone with
// model-probe — the model-evaluation subsystem was removed upstream in 0.5.2.)

import type { Context } from '@deepseek-ai/cordis'
import { homedir } from 'node:os'
import { join } from 'node:path'
import fs from 'node:fs'
import { switchProfile } from './persona.js'
import { profileStatus } from './profile.js'
import { checkForUpdate } from './update-check.js'
import { listCasesOnDisk, loadHypotheses, countEvidence, loadFindings, listEvidence, getCase } from './case.js'

const ROUTE_BASE = '/api/helmd'

/** An error carrying the HTTP status the route should answer with. */
class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

/** Read one small JSON body (localhost workbench calls; 8 KiB is generous). */
function readJsonBody(req: unknown, limit = 8192): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const stream = req as { on?: (event: string, cb: (arg: never) => void) => void } | null | undefined
    if (stream === null || stream === undefined || typeof stream.on !== 'function') {
      reject(new HttpError(400, 'request body unavailable'))
      return
    }
    let size = 0
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer | string) => {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
      size += buf.length
      if (size > limit) {
        reject(new HttpError(413, `request body exceeds ${limit} bytes`))
        return
      }
      chunks.push(buf)
    })
    stream.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text.trim() === '' ? undefined : JSON.parse(text))
      } catch {
        reject(new HttpError(400, 'body must be JSON: {"id":"<profile>"}'))
      }
    })
    stream.on('error', (error: Error) => reject(new HttpError(400, error.message)))
  })
}

/** Read one query parameter from the request URL (the workbench passes sessionId). */
function queryParam(req: unknown, name: string): string | undefined {
  const url = String((req as { url?: unknown } | null | undefined)?.url ?? '')
  const q = url.indexOf('?')
  if (q < 0) return undefined
  try {
    const value = new URLSearchParams(url.slice(q + 1)).get(name)
    return value !== null && value.trim() !== '' ? value.trim() : undefined
  } catch {
    return undefined
  }
}

/** Read stream intercept stats from the llm-stream-hook's in-memory counters. */
function getInterceptStats(): { count: number; lastTime: string | null; lastSnippet: string | null } {
  try {
    // llm-stream-hook.js exports getStreamInterceptionStats
    // But we can't import it directly (circular). Read from the log file instead.
    const dshHome = process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
    const logPath = join(dshHome, 'helmd-stream-intercept.log')
    if (!fs.existsSync(logPath)) return { count: 0, lastTime: null, lastSnippet: null }
    const lines: string[] = fs.readFileSync(logPath, 'utf8').split('\n').filter((l: string) => l.trim())
    const last = lines[lines.length - 1]
    const timeMatch = last.match(/\[([^\]]+)\]/)
    const snippetMatch = last.match(/refusal="([^"]*)"/)
    return {
      count: lines.length,
      lastTime: timeMatch ? timeMatch[1] : null,
      lastSnippet: snippetMatch ? snippetMatch[1].slice(0, 120) : null,
    }
  } catch { return { count: 0, lastTime: null, lastSnippet: null } }
}

export function registerHelmdApi(ctx: Context, getHealth?: () => unknown): void {
  const webServer = (ctx as any).webServer
  if (!webServer?.register) return

  const seen = new Set<string>()

  /** Register one exact route; the handler receives the request so a single
   *  path can branch on method (the host route table keys on path only). */
  function route(path: string, handler: (req: any) => Promise<unknown> | unknown): void {
    const routeKey = 'exact\u0000' + path
    if (seen.has(routeKey)) return
    seen.add(routeKey)
    webServer.register({
      kind: 'exact',
      path,
      handler: async (req: any, res: any) => {
        res.setHeader('content-type', 'application/json')
        try {
          const data = await handler(req)
          res.statusCode = 200
          res.end(JSON.stringify({ ok: true, data }))
        } catch (e) {
          res.statusCode = e instanceof HttpError ? e.status : 500
          res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }))
        }
      },
    })
  }

  function get(path: string, handler: (req: any) => Promise<unknown> | unknown): void {
    route(path, (req) => handler(req))
  }

  // Boot-time health verdict, evaluated once by the host plane (health.ts).
  // Derived state rides HTTP, not the settings document: 0.1.7 settings only
  // carries Config schemas, and a read-only snapshot is not configuration.
  if (getHealth) {
    get(`${ROUTE_BASE}/health`, () => getHealth())
  }

  // On-demand release check. Network failures come back in `error`, not 500,
  // so the About tab can render the reason and the Releases link.
  get(`${ROUTE_BASE}/update`, () => checkForUpdate())

  // Dynamic tool list from the live ctx.tools registry.
  // schemas() is ToolRuntime's public enumeration of the global view; the
  // layer fields behind it are private and hold the host's shadowing rules.
  get(`${ROUTE_BASE}/tools`, () => {
    const tools = (ctx as any).tools as { schemas(): Array<{ name: string }> }
    return tools.schemas().map((schema) => schema.name).sort()
  })

  // Stream interception stats
  get(`${ROUTE_BASE}/intercept`, () => {
    return getInterceptStats()
  })

  // Armor profile switch. GET enumerates the sealed catalog and marks the
  // active entry; POST swaps the live persona section (no host restart).
  route(`${ROUTE_BASE}/profile`, async (req) => {
    const method = String(req?.method ?? 'GET').toUpperCase()
    if (method !== 'POST') return profileStatus()
    // A cross-origin fetch cannot set this header without a CORS preflight we
    // never answer; a plain form cannot send JSON. That keeps a drive-by page
    // from flipping the operator's persona.
    const contentType = String(req?.headers?.['content-type'] ?? '')
    if (!/^application\/json\b/i.test(contentType)) {
      throw new HttpError(415, 'content-type must be application/json')
    }
    const body = await readJsonBody(req)
    const id = (body as { id?: unknown } | undefined)?.id
    if (typeof id !== 'string' || id.trim() === '') {
      throw new HttpError(400, 'body must be JSON: {"id":"<profile>"}')
    }
    try {
      return switchProfile(id.trim())
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : String(e))
    }
  })

  // Case status: the case bound to THIS session. There is deliberately no
  // "latest open case" fallback — that made the workbench show an unrelated
  // session's investigation. Unbound sessions get a recent-case list instead.
  get(`${ROUTE_BASE}/case`, async (req) => {
    const sessionId = queryParam(req, 'sessionId')
    const active = sessionId ? getCase(sessionId) : undefined
    if (active) {
      const hyps = await loadHypotheses(active.dir)
      const evCount = await countEvidence(active.dir)
      return {
        active: true,
        sessionId,
        name: active.name, goal: active.goal, mode: active.mode,
        evidenceCount: evCount,
        hypotheses: hyps.map((h) => ({ id: h.id, statement: h.statement.slice(0, 100), status: h.status, evidenceIds: h.evidenceIds })),
        openHypotheses: hyps.filter((h) => h.status === 'open').length,
      }
    }
    const cases = await listCasesOnDisk()
    return {
      active: false,
      sessionId: sessionId ?? null,
      cases: cases.slice(0, 5).map((c) => ({
        name: c.name, status: c.status, goal: c.goal, evidenceCount: c.evidenceCount,
      })),
    }
  })

  // Hypotheses for the session-bound case.
  get(`${ROUTE_BASE}/case/hypotheses`, async (req) => {
    const sessionId = queryParam(req, 'sessionId')
    const active = sessionId ? getCase(sessionId) : undefined
    return active ? loadHypotheses(active.dir) : []
  })

  // Findings for the session-bound case.
  get(`${ROUTE_BASE}/case/findings`, async (req) => {
    const sessionId = queryParam(req, 'sessionId')
    const active = sessionId ? getCase(sessionId) : undefined
    return active ? loadFindings(active.dir) : []
  })

  // Evidence list for the session-bound case.
  get(`${ROUTE_BASE}/case/evidence`, async (req) => {
    const sessionId = queryParam(req, 'sessionId')
    const active = sessionId ? getCase(sessionId) : undefined
    return active ? listEvidence(active.dir) : []
  })

}
