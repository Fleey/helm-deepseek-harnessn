// Helmd workbench API — HTTP routes for the client-side workbench tabs.
// Each route provides dynamic, real-time data that the client polls.
//
// Routes:
//   GET /api/helmd/health   → boot-time preset health verdict (host plane)
//   GET /api/helmd/tools    → dynamic tool list from ctx.tools registry
//   GET /api/helmd/eval     → model evaluation records + discovered models
//   GET /api/helmd/intercept → stream interception stats (count, last time, snippet)

import type { Context } from '@deepseek-ai/cordis'
import { homedir } from 'node:os'
import { join } from 'node:path'
import fs from 'node:fs'
import { discoverAvailableModels } from './model-probe.js'

const ROUTE_BASE = '/api/helmd'

/** Read model evaluation records (last N records). */
async function readProbeLedger(limit = 20): Promise<Array<Record<string, unknown>>> {
  try {
    const dshHome = process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
    const ledgerPath = join(process.env.HELMD_TOOLS_DIR || join(dshHome, 'helmd-tools'), 'model-probes.jsonl')
    const { readFile } = await import('node:fs/promises')
    const raw = await readFile(ledgerPath, 'utf8')
    const lines = raw.split('\n').filter(l => l.trim())
    return lines.slice(-limit).map(l => {
      try { return JSON.parse(l) } catch { return { parse_error: l.slice(0, 100) } }
    })
  } catch { return [] }
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

  function get(path: string, handler: () => Promise<unknown> | unknown): void {
    const routeKey = 'exact\u0000' + path
    if (seen.has(routeKey)) return
    seen.add(routeKey)
    webServer.register({
      kind: 'exact',
      path,
      handler: async (_req: any, res: any) => {
        res.statusCode = 200
        res.setHeader('content-type', 'application/json')
        try {
          const data = await handler()
          res.end(JSON.stringify({ ok: true, data }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }))
        }
      },
    })
  }

  // Boot-time health verdict, evaluated once by the host plane (health.ts).
  // Derived state rides HTTP, not the settings document: 0.1.7 settings only
  // carries Config schemas, and a read-only snapshot is not configuration.
  if (getHealth) {
    get(`${ROUTE_BASE}/health`, () => getHealth())
  }

  // Dynamic tool list from the live ctx.tools registry.
  // schemas() is ToolRuntime's public enumeration of the global view; the
  // layer fields behind it are private and hold the host's shadowing rules.
  get(`${ROUTE_BASE}/tools`, () => {
    const tools = (ctx as any).tools as { schemas(): Array<{ name: string }> }
    return tools.schemas().map((schema) => schema.name).sort()
  })

  // Model evaluation records and discovered model configuration.
  get(`${ROUTE_BASE}/eval`, async () => {
    const records = await readProbeLedger(20)
    const rounds = records.map((r, i) => ({
      round: i + 1,
      strategy: r.strategy ?? 'baseline',
      classification: r.classification ?? 'empty',
      status: r.status ?? 0,
      elapsedMs: r.elapsedMs ?? 0,
      model: r.model ?? 'unknown',
      timestamp: r.timestamp ?? null,
    }))
    let availableModels: Array<{ id: string; provider: string; hasKey: boolean }> = []
    try {
      availableModels = (await discoverAvailableModels(ctx)).map(m => ({
        id: m.id, provider: m.provider, hasKey: m.hasKey,
      }))
    } catch {}

    return {
      rounds, total: records.length,
      availableModels,
    }
  })

  // Stream interception stats
  get(`${ROUTE_BASE}/intercept`, () => {
    return getInterceptStats()
  })

}
