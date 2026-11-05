// Recon asset ledger + scope/coverage primitives (T-14).
//
// Pure/local: no scanner binaries, no external service. Tools in tools/recon.ts
// perform the network calls; this module owns the append-only ledger, target
// fences and coverage math so they can be tested without a network.
import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { join } from 'node:path';
function ledgerPath(caseDir) {
    return join(caseDir, 'recon', 'assets.jsonl');
}
export function loadAssets(caseDir) {
    if (!existsSync(ledgerPath(caseDir)))
        return [];
    const rows = [];
    for (const line of readFileSync(ledgerPath(caseDir), 'utf8').split('\n')) {
        if (line.trim() === '')
            continue;
        try {
            const parsed = JSON.parse(line);
            if (typeof parsed.kind === 'string' && typeof parsed.value === 'string') {
                rows.push({
                    kind: parsed.kind,
                    value: parsed.value,
                    ...(typeof parsed.parent === 'string' ? { parent: parsed.parent } : {}),
                    source: typeof parsed.source === 'string' ? parsed.source : 'unknown',
                    ...(typeof parsed.evidenceId === 'string' ? { evidenceId: parsed.evidenceId } : {}),
                    firstSeen: typeof parsed.firstSeen === 'string' ? parsed.firstSeen : '',
                    lastSeen: typeof parsed.lastSeen === 'string' ? parsed.lastSeen : '',
                });
            }
        }
        catch { /* keep the rest of the ledger */ }
    }
    return rows;
}
/** Append or refresh one asset. Identity is `kind|value|parent`, so the same
 *  host under two parents is two graph edges, not a dedup mistake. */
export function addAsset(caseDir, input) {
    mkdirSync(join(caseDir, 'recon'), { recursive: true });
    const now = new Date().toISOString();
    const rows = loadAssets(caseDir);
    const key = (asset) => `${asset.kind}|${asset.value}|${asset.parent ?? ''}`;
    const existing = rows.find((asset) => key(asset) === key(input));
    if (existing !== undefined) {
        existing.lastSeen = now;
        existing.source = input.source;
        if (input.evidenceId !== undefined)
            existing.evidenceId = input.evidenceId;
        // Rewrite the ledger deterministically rather than appending a duplicate.
        writeFileSync(ledgerPath(caseDir), rows.map((asset) => JSON.stringify(asset)).join('\n') + '\n', 'utf8');
        return { asset: existing, deduped: true };
    }
    const asset = { ...input, firstSeen: now, lastSeen: now };
    appendFileSync(ledgerPath(caseDir), JSON.stringify(asset) + '\n', 'utf8');
    return { asset, deduped: false };
}
export function addAssets(caseDir, inputs) {
    let added = 0;
    let deduped = 0;
    for (const input of inputs) {
        const result = addAsset(caseDir, input);
        if (result.deduped)
            deduped += 1;
        else
            added += 1;
    }
    return { added, deduped };
}
const PRIVATE_PREFIXES = ['10.', '127.', '169.254.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.', '::1', 'fc', 'fd', 'fe80'];
export function isPrivateHost(host) {
    const value = host.toLowerCase().replace(/^\[|\]$/g, '');
    if (value === 'localhost' || value.endsWith('.localhost') || value === 'metadata.google.internal')
        return true;
    if (isIP(value) === 0)
        return false;
    return PRIVATE_PREFIXES.some((prefix) => value.startsWith(prefix));
}
/** Exact host or a parent-domain suffix match; CIDR is intentionally not
 *  expanded here (recon tools take hostnames, not arbitrary IP ranges). */
export function hostInScope(host, scope) {
    const value = host.toLowerCase().replace(/^\[|\]$/g, '');
    return scope.some((entry) => {
        const allowed = entry.toLowerCase().trim();
        if (allowed === '')
            return false;
        if (allowed.includes('/'))
            return false;
        return value === allowed || value.endsWith(`.${allowed}`);
    });
}
/** A recon target must be inside the case scope; loopback/private/metadata
 *  targets additionally require an explicit lab opt-in. */
export function checkReconTarget(host, scope, lab = false) {
    if (host.trim() === '')
        return { ok: false, reason: 'empty target' };
    if (scope.length === 0)
        return { ok: false, reason: 'case has no scope; call begin_case(scope=[...]) first' };
    if (!hostInScope(host, scope))
        return { ok: false, reason: `target ${host} is outside case scope` };
    if (isPrivateHost(host) && !lab)
        return { ok: false, reason: `target ${host} is private/loopback; pass lab=true only for an authorized lab` };
    return { ok: true };
}
/** Per-host token bucket: 1 rps with a small jitter, at most 4 in flight. */
export class ReconLimiter {
    rps;
    concurrency;
    nextAt = new Map();
    active = 0;
    constructor(rps = 1, concurrency = 4) {
        this.rps = rps;
        this.concurrency = concurrency;
    }
    async acquire(host) {
        const wait = (this.nextAt.get(host) ?? 0) - Date.now();
        if (wait > 0)
            await new Promise((resolve) => setTimeout(resolve, wait));
        const jitter = Math.floor(Math.random() * 120);
        this.nextAt.set(host, Date.now() + Math.max(0, 1000 / Math.max(0.1, this.rps)) + jitter);
        while (this.active >= this.concurrency)
            await new Promise((resolve) => setTimeout(resolve, 25));
        this.active += 1;
    }
    release() {
        this.active = Math.max(0, this.active - 1);
    }
}
export function coverageFor(assets) {
    const count = (kind) => assets.filter((asset) => asset.kind === kind).length;
    return {
        dns: count('domain') + count('host'),
        ports: count('port'),
        http: count('url'),
        tech: count('tech'),
        crawl: count('url'),
        dir: count('path'),
        untested: assets.filter((asset) => (asset.kind === 'host' || asset.kind === 'url') && asset.evidenceId === undefined).length,
    };
}
export function coverageLine(assets) {
    const coverage = coverageFor(assets);
    const dimensions = ['dns', 'ports', 'http', 'tech', 'crawl', 'dir'].filter((key) => coverage[key] > 0);
    return `[recon] assets ${assets.length} · covered ${dimensions.join(',') || 'none'} · untested ${coverage.untested}`;
}
/** nmap XML `<host><address addr="..."/><port portid="80" protocol="tcp"/></host>`. */
export function parseNmapXml(xml) {
    const rows = [];
    for (const block of xml.matchAll(/<host\b[\s\S]*?<\/host>/gi)) {
        const addr = /<address[^>]*addr="([^"]+)"/i.exec(block[0])?.[1];
        if (addr === undefined)
            continue;
        const ports = [...block[0].matchAll(/<port[^>]*portid="(\d+)"/gi)].map((match) => Number(match[1]));
        rows.push({ host: addr, ports });
    }
    return rows;
}
/** httpx JSONL: `{"url":"https://x","host":"x","tech":["nginx"],"status_code":200}`. */
export function parseHttpxJsonl(text) {
    const rows = [];
    for (const line of text.split('\n')) {
        if (line.trim() === '')
            continue;
        try {
            const parsed = JSON.parse(line);
            const url = typeof parsed.url === 'string' ? parsed.url : '';
            if (url === '')
                continue;
            rows.push({
                url,
                ...(typeof parsed.host === 'string' ? { host: parsed.host } : {}),
                tech: Array.isArray(parsed.tech) ? parsed.tech.map(String) : [],
                ...(typeof parsed.status_code === 'number' ? { status: parsed.status_code } : {}),
            });
        }
        catch { /* skip malformed line */ }
    }
    return rows;
}
/** nuclei JSONL: `{"host":"...","matched-at":"...","template-id":"..."}`. */
export function parseNucleiJsonl(text) {
    const rows = [];
    for (const line of text.split('\n')) {
        if (line.trim() === '')
            continue;
        try {
            const parsed = JSON.parse(line);
            const host = typeof parsed.host === 'string' ? parsed.host : '';
            if (host === '')
                continue;
            rows.push({
                host,
                ...(typeof parsed['matched-at'] === 'string' ? { matchedAt: parsed['matched-at'] } : {}),
                ...(typeof parsed['template-id'] === 'string' ? { template: parsed['template-id'] } : {}),
            });
        }
        catch { /* skip malformed line */ }
    }
    return rows;
}
//# sourceMappingURL=recon.js.map