// Proxy-aware HTTP transport for helmd's host-plane network needs.
//
// Backported from upstream 0.5.2's star-gate.ts transport layer (the fork
// removed the star gate itself; the transport survives here because native
// fetch ignores proxy settings, and the update check must honour
// HTTPS_PROXY / ALL_PROXY / NO_PROXY — plus the Windows system proxy — or
// it breaks on machines whose only egress is a proxy.
//
// This module deliberately contains NO device-flow, NO GitHub authentication
// and NO state beyond the cached Windows proxy probe.
import { execFileSync } from 'node:child_process'
import { request as httpRequest, type IncomingMessage } from 'node:http'
import { request as httpsRequest, Agent } from 'node:https'
import type { Socket } from 'node:net'
import { connect as tlsConnect, type TLSSocket } from 'node:tls'

const REQUEST_TIMEOUT_MS = 20_000

// ── proxy resolution ──────────────────────────────────────────────────────
const PROXY_ENV_KEYS = [
  'HTTPS_PROXY', 'https_proxy',
  'ALL_PROXY', 'all_proxy',
  'HTTP_PROXY', 'http_proxy',
] as const

let cachedSystemProxy: string | null | undefined

function parseProxy(raw: string | undefined): URL | undefined {
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  try {
    return new URL(trimmed.includes('://') ? trimmed : `http://${trimmed}`)
  } catch {
    return undefined
  }
}

/** NO_PROXY entries: exact host, `.suffix`, `suffix`, optional `:port`, `*`. */
function bypassed(host: string, list: string | undefined): boolean {
  if (list === undefined || list.trim() === '') return false
  const lower = host.toLowerCase()
  for (const rawEntry of list.split(',')) {
    const entry = rawEntry.trim().toLowerCase()
    if (entry === '') continue
    if (entry === '*') return true
    const bare = entry.replace(/:\d+$/, '').replace(/^\./, '')
    if (bare === '') continue
    if (lower === bare || lower.endsWith(`.${bare}`)) return true
  }
  return false
}

/** Windows system proxy (HKCU Internet Settings). Cached — one probe per process. */
function windowsSystemProxy(): string | undefined {
  if (cachedSystemProxy !== undefined) return cachedSystemProxy ?? undefined
  cachedSystemProxy = null
  if (process.platform !== 'win32') return undefined
  const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
  try {
    const enabled = execFileSync('reg', ['query', key, '/v', 'ProxyEnable'], {
      encoding: 'utf8', windowsHide: true,
    })
    cachedSystemProxy = null
    if (!/ProxyEnable\s+REG_DWORD\s+0x1/i.test(enabled)) return undefined
    const server = execFileSync('reg', ['query', key, '/v', 'ProxyServer'], {
      encoding: 'utf8', windowsHide: true,
    })
    const value = /ProxyServer\s+REG_SZ\s+(\S+)/i.exec(server)?.[1]
    if (value === undefined) return undefined
    // "host:port" or "http=host:port;https=host:port"
    const chosen = value.includes('=')
      ? (/(?:^|;)https=([^;]+)/i.exec(value)?.[1] ?? /(?:^|;)http=([^;]+)/i.exec(value)?.[1] ?? value)
      : value
    const trimmed = chosen.trim()
    cachedSystemProxy = trimmed === '' ? null : trimmed
    return cachedSystemProxy ?? undefined
  } catch {
    return undefined
  }
}

function resolveProxy(targetHost: string): URL | undefined {
  if (bypassed(targetHost, process.env.NO_PROXY ?? process.env.no_proxy)) return undefined
  for (const key of PROXY_ENV_KEYS) {
    const proxy = parseProxy(process.env[key])
    if (proxy !== undefined) return proxy
  }
  return parseProxy(windowsSystemProxy())
}

// ── proxy-aware transport ─────────────────────────────────────────────────
export interface RawResponse {
  status: number
  text: string
}

function connectViaProxy(proxy: URL, host: string, port: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const secureProxy = proxy.protocol === 'https:'
    const requestFn = secureProxy ? httpsRequest : httpRequest
    const headers: Record<string, string> = { host: `${host}:${port}` }
    if (proxy.username !== '' || proxy.password !== '') {
      const credentials = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`
      headers['proxy-authorization'] = `Basic ${Buffer.from(credentials).toString('base64')}`
    }
    const req = requestFn({
      host: proxy.hostname,
      port: Number(proxy.port || (secureProxy ? 443 : 80)),
      method: 'CONNECT',
      path: `${host}:${port}`,
      headers,
      timeout: REQUEST_TIMEOUT_MS,
    })
    req.once('connect', (res: IncomingMessage, socket: Socket, head: Buffer) => {
      if (res.statusCode !== 200) {
        socket.destroy()
        reject(new Error(`proxy CONNECT refused: HTTP ${String(res.statusCode)}`))
        return
      }
      if (head.length > 0) socket.unshift(head)
      resolve(socket)
    })
    req.once('timeout', () => req.destroy(new Error('proxy CONNECT timed out')))
    req.once('error', reject)
    req.end()
  })
}

function wrapTls(socket: Socket, host: string): Promise<TLSSocket> {
  return new Promise((resolve, reject) => {
    const tls = tlsConnect({ socket, servername: host, ALPNProtocols: ['http/1.1'] })
    tls.once('secureConnect', () => resolve(tls))
    tls.once('error', reject)
  })
}

/** Single-use agent that hands the request the already-established tunnel. */
function tunnelAgent(socket: TLSSocket): Agent {
  const agent = new Agent({ keepAlive: false, maxSockets: 1 })
  ;(agent as unknown as { createConnection: () => TLSSocket }).createConnection = () => socket
  return agent
}

export async function requestText(
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
): Promise<RawResponse> {
  const target = new URL(url)
  const secure = target.protocol === 'https:'
  const port = Number(target.port || (secure ? 443 : 80))
  const path = `${target.pathname}${target.search}`
  // GitHub REST API rejects requests without a User-Agent (403). Native fetch
  // added one implicitly; http.request does not, so send it explicitly here.
  const headers: Record<string, string> = { 'user-agent': 'helmd', host: target.host, ...init.headers }
  const proxy = resolveProxy(target.hostname)
  let agent: Agent | undefined
  if (proxy !== undefined) {
    const raw = await connectViaProxy(proxy, target.hostname, port)
    agent = tunnelAgent(secure ? await wrapTls(raw, target.hostname) : (raw as unknown as TLSSocket))
  }
  return await new Promise<RawResponse>((resolve, reject) => {
    const requestFn = secure ? httpsRequest : httpRequest
    const req = requestFn({
      host: target.hostname,
      port,
      path,
      method: init.method,
      headers,
      timeout: REQUEST_TIMEOUT_MS,
      ...(agent !== undefined ? { agent } : {}),
    }, (res: IncomingMessage) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.once('end', () => {
        resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString('utf8') })
      })
      res.once('error', reject)
    })
    req.once('timeout', () => req.destroy(new Error(`request timed out: ${target.hostname}`)))
    req.once('error', reject)
    if (init.body !== undefined) req.write(init.body)
    req.end()
  })
}
