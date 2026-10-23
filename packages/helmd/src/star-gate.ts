// GitHub star gate (route B: device flow, zero scopes, token discarded).
// Flow: start device session → user authorizes + stars ADWMC/helm-d → poll for
// token → check star → throw the token away, keep only {starred, checkedAt, login}.
// No server, no anti-bypass (operator ruling): the gate is an honor system with a
// real GitHub-side check at unlock time.

const CLIENT_ID = 'Ov23ct3hO35wKo09MMvt'
const REPO = 'ADWMC/helm-d'
const GH = 'https://github.com'
const API = 'https://api.github.com'

export interface DeviceSession {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresAt: number
  intervalMs: number
}

export interface GateState {
  starred: boolean
  checkedAt: string
  login?: string
}

const jsonHeaders = { accept: 'application/json', 'content-type': 'application/json' }

async function ghJson(url: string, body: Record<string, string>): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  return response.json()
}

export async function startDeviceFlow(): Promise<DeviceSession> {
  const data = await ghJson(`${GH}/login/device/code`, { client_id: CLIENT_ID, scope: '' })
  if (data.error !== undefined) throw new Error(`device-flow start: ${String(data.error)}`)
  return {
    deviceCode: String(data.device_code),
    userCode: String(data.user_code),
    verificationUri: String(data.verification_uri ?? 'https://github.com/login/device'),
    expiresAt: Date.now() + Number(data.expires_in ?? 900) * 1000,
    intervalMs: Math.max(5, Number(data.interval ?? 5)) * 1000,
  }
}

export type PollResult =
  | { kind: 'pending' }
  | { kind: 'slow-down'; intervalMs: number }
  | { kind: 'expired' }
  | { kind: 'ok'; accessToken: string }

export async function pollForToken(session: DeviceSession): Promise<PollResult> {
  const data = await ghJson(`${GH}/login/oauth/access_token`, {
    client_id: CLIENT_ID,
    device_code: session.deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  })
  if (typeof data.error !== 'string') return { kind: 'ok', accessToken: String(data.access_token) }
  if (data.error === 'authorization_pending') return { kind: 'pending' }
  if (data.error === 'slow_down') return { kind: 'slow-down', intervalMs: 5000 }
  if (data.error === 'expired_token') return { kind: 'expired' }
  throw new Error(`device-flow poll: ${String(data.error)}`)
}

/** 204 = starred; 404 = not. Anything else throws. */
export async function checkStarred(accessToken: string): Promise<boolean> {
  const response = await fetch(`${API}/user/starred/${REPO}`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/vnd.github+json' },
  })
  if (response.status === 204) return true
  if (response.status === 404) return false
  throw new Error(`star check HTTP ${response.status}`)
}

export async function fetchLogin(accessToken: string): Promise<string | undefined> {
  const response = await fetch(`${API}/user`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/vnd.github+json' },
  })
  if (!response.ok) return undefined
  const data = (await response.json()) as { login?: string }
  return typeof data.login === 'string' ? data.login : undefined
}

/** Full unlock sequence: device session → poll (bounded) → token → star watch.
 *  The token lives IN MEMORY ONLY for the star-watch window. First star fires
 *  onUnlocked (the persona section swap); the token is dropped at the end. */
export async function verifyStar(
  session: DeviceSession,
  signal?: AbortSignal,
  onUnlocked?: (state: GateState) => void,
): Promise<GateState> {
  let intervalMs = session.intervalMs
  const deadline = session.expiresAt
  let accessToken: string | undefined
  let login: string | undefined
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('aborted')
    const poll = await pollForToken(session)
    if (poll.kind === 'ok') {
      accessToken = poll.accessToken
      login = await fetchLogin(accessToken)
      break
    }
    if (poll.kind === 'expired') throw new Error('device code expired — restart the flow')
    if (poll.kind === 'slow-down') intervalMs += poll.intervalMs
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  if (accessToken === undefined) throw new Error('device code expired — restart the flow')
  // Star watch: check immediately, then every 30s until the session deadline
  // plus a 15-minute grace window. First star → onUnlocked fires.
  const watchDeadline = Date.now() + 15 * 60_000
  while (Date.now() < watchDeadline) {
    if (signal?.aborted) throw new Error('aborted')
    const starred = await checkStarred(accessToken)
    const state: GateState = { starred, checkedAt: new Date().toISOString(), login }
    if (starred) {
      // Token discarded here — nothing credential-shaped is returned or stored.
      if (onUnlocked !== undefined) onUnlocked(state)
      return state
    }
    await new Promise((resolve) => setTimeout(resolve, 30_000))
  }
  return { starred: false, checkedAt: new Date().toISOString(), login }
}
