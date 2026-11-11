// Candidate mining (T-16): deterministic extraction from local artifacts.
// No network, no SAST engine, no symbol execution. Candidates are proposals,
// not findings; the PoC runner (T-15) must prove them.
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const CLASS_RANK = {
    'auth-bypass': 5,
    idor: 5,
    sqli: 5,
    rce: 5,
    ssrf: 4,
    xss: 4,
    'path-traversal': 4,
    'file-upload': 4,
    api: 2,
    unknown: 1,
};
function classifyEndpoint(endpoint) {
    const value = endpoint.toLowerCase();
    if (/\/(?:user|account|order|invoice|file|download|upload|admin|api\/v\d+\/)/.test(value))
        return 'idor';
    if (/(?:id|q|search|query|filter|sort)=/.test(value))
        return 'sqli';
    if (/(?:url|next|redirect|callback|webhook)=/.test(value))
        return 'ssrf';
    if (/(?:path|file|template|page|view)=/.test(value))
        return 'path-traversal';
    return 'api';
}
function key(candidate) {
    return `${candidate.class}|${candidate.target}|${candidate.endpoint}|${candidate.param ?? ''}`;
}
export function dedupeCandidates(candidates) {
    const seen = new Map();
    for (const candidate of candidates) {
        const id = key(candidate);
        const prior = seen.get(id);
        if (prior === undefined || candidate.confidence > prior.confidence)
            seen.set(id, candidate);
    }
    return [...seen.values()].sort((a, b) => (CLASS_RANK[b.class] ?? 0) - (CLASS_RANK[a.class] ?? 0)
        || b.confidence - a.confidence
        || a.endpoint.localeCompare(b.endpoint));
}
function candidateFromUrl(target, rawUrl, source, confidence) {
    let url;
    try {
        url = new URL(rawUrl, target);
    }
    catch {
        return null;
    }
    if (!['http:', 'https:'].includes(url.protocol))
        return null;
    return {
        class: classifyEndpoint(url.pathname + url.search),
        target,
        endpoint: url.pathname + url.search,
        ...(url.searchParams.keys().next().done === false ? { param: [...url.searchParams.keys()][0] } : {}),
        source,
        confidence,
    };
}
/** HAR 1.2: every request URL, with query parameters preserved. */
export function extractHar(text, target) {
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        return [];
    }
    const entries = parsed?.log?.entries;
    if (!Array.isArray(entries))
        return [];
    const rows = [];
    for (const entry of entries) {
        const raw = entry?.request?.url;
        if (typeof raw !== 'string')
            continue;
        const candidate = candidateFromUrl(target, raw, 'har', 0.7);
        if (candidate !== null)
            rows.push(candidate);
    }
    return dedupeCandidates(rows);
}
/** OpenAPI 3 / Swagger 2 paths + parameters. */
export function extractOpenApi(text, target) {
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        return [];
    }
    const paths = parsed?.paths;
    if (paths === null || typeof paths !== 'object')
        return [];
    const rows = [];
    for (const [endpoint, methods] of Object.entries(paths)) {
        if (methods === null || typeof methods !== 'object')
            continue;
        for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
            const operation = methods[method];
            if (operation === null || typeof operation !== 'object')
                continue;
            const params = operation.parameters ?? [];
            for (const param of params) {
                if (typeof param?.name !== 'string')
                    continue;
                rows.push({
                    class: classifyEndpoint(endpoint),
                    target,
                    endpoint,
                    param: param.name,
                    source: `openapi:${method}`,
                    confidence: 0.8,
                });
            }
            if (params.length === 0) {
                rows.push({ class: classifyEndpoint(endpoint), target, endpoint, source: `openapi:${method}`, confidence: 0.6 });
            }
        }
    }
    return dedupeCandidates(rows);
}
const URL_RE = /https?:\/\/[^\s"'`<>\\]+/g;
const PATH_RE = /["'`](\/(?:api|v\d+|rest|graphql|admin|user|account|file|upload|download)[^"'`\s]*)["'`]/g;
/** JS/HTML text: absolute URLs and quoted API paths. No evaluation. */
export function extractText(text, target) {
    const rows = [];
    for (const match of text.matchAll(URL_RE)) {
        const candidate = candidateFromUrl(target, match[0], 'text:url', 0.55);
        if (candidate !== null)
            rows.push(candidate);
    }
    for (const match of text.matchAll(PATH_RE)) {
        try {
            const candidate = candidateFromUrl(target, new URL(match[1], target).href, 'text:path', 0.5);
            if (candidate !== null)
                rows.push(candidate);
        }
        catch { /* skip malformed path */ }
    }
    return dedupeCandidates(rows);
}
/** Minimal Android binary XML string-pool reader. It does not need the full
 *  resource map: package/activity/permission/URL strings are enough to mine
 *  candidates from a compiled AndroidManifest.xml. */
export function decodeAxmlStrings(buffer) {
    const strings = [];
    let offset = 0;
    const read8 = (at) => {
        let length = buffer[at];
        let cursor = at + 1;
        if ((length & 0x80) !== 0) {
            length = ((length & 0x7f) << 8) | buffer[cursor];
            cursor += 1;
        }
        return [length, cursor];
    };
    const read16 = (at) => {
        let length = buffer.readUInt16LE(at);
        let cursor = at + 2;
        if ((length & 0x8000) !== 0) {
            length = ((length & 0x7fff) << 16) | buffer.readUInt16LE(cursor);
            cursor += 2;
        }
        return [length, cursor];
    };
    while (offset + 8 <= buffer.length) {
        const type = buffer.readUInt16LE(offset);
        const headerSize = buffer.readUInt16LE(offset + 2);
        const size = buffer.readUInt32LE(offset + 4);
        if (size <= 0 || offset + size > buffer.length)
            break;
        if (type === 0x0001 && headerSize >= 28) {
            const stringCount = buffer.readUInt32LE(offset + 8);
            const flags = buffer.readUInt32LE(offset + 16);
            const stringsStart = buffer.readUInt32LE(offset + 20);
            const utf8 = (flags & 0x100) !== 0;
            for (let index = 0; index < stringCount; index += 1) {
                const stringOffset = buffer.readUInt32LE(offset + headerSize + index * 4);
                let cursor = offset + stringsStart + stringOffset;
                if (utf8) {
                    // UTF-8 pool strings are: UTF-16 character length (1-2 bytes),
                    // UTF-8 byte length (1-2 bytes), then bytes.
                    const [, afterChars] = read8(cursor);
                    const [byteLength, start] = read8(afterChars);
                    cursor = start;
                    const raw = buffer.subarray(cursor, cursor + byteLength).toString('utf8');
                    strings.push(raw);
                }
                else {
                    const [charLength, start] = read16(cursor);
                    cursor = start;
                    const raw = buffer.subarray(cursor, cursor + charLength * 2).toString('utf16le');
                    strings.push(raw);
                }
            }
        }
        offset += size;
    }
    return strings;
}
/** Read one entry from an APK/zip without extracting the whole archive. */
export function readApkEntry(apkPath, entry = 'AndroidManifest.xml') {
    const tar = process.platform === 'win32'
        ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')
        : 'tar';
    const result = spawnSync(tar, ['-xOf', apkPath, entry], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024, timeout: 20_000 });
    if (result.status === 0 && result.stdout !== null && result.stdout.length > 0)
        return Buffer.from(result.stdout);
    return undefined;
}
/** Manifest string candidates for an APK: URLs, API paths and package-ish
 *  component names from the binary string pool. */
export function extractApk(text, target, apkPath) {
    const strings = apkPath !== undefined
        ? decodeAxmlStrings(readApkEntry(apkPath) ?? Buffer.alloc(0))
        : [];
    return extractText([...strings, text].join('\n'), target);
}
export function extractCandidates(text, target, format, apkPath) {
    if (format === 'har')
        return extractHar(text, target);
    if (format === 'openapi')
        return extractOpenApi(text, target);
    if (format === 'apk')
        return extractApk(text, target, apkPath);
    return extractText(text, target);
}
export function candidatesPath(caseDir) {
    return join(caseDir, 'mining', 'candidates.jsonl');
}
export function writeCandidates(caseDir, candidates) {
    // Replace the file rather than appending, so reruns are deterministic.
    mkdirSync(join(caseDir, 'mining'), { recursive: true });
    writeFileSync(candidatesPath(caseDir), candidates.map((candidate) => JSON.stringify(candidate)).join('\n') + '\n', 'utf8');
}
export function loadCandidates(caseDir) {
    if (!existsSync(candidatesPath(caseDir)))
        return [];
    const rows = [];
    for (const line of readFileSync(candidatesPath(caseDir), 'utf8').split('\n')) {
        if (line.trim() === '')
            continue;
        try {
            const parsed = JSON.parse(line);
            if (typeof parsed.class === 'string' && typeof parsed.endpoint === 'string') {
                rows.push({
                    class: parsed.class,
                    target: typeof parsed.target === 'string' ? parsed.target : '',
                    endpoint: parsed.endpoint,
                    ...(typeof parsed.param === 'string' ? { param: parsed.param } : {}),
                    source: typeof parsed.source === 'string' ? parsed.source : 'unknown',
                    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
                });
            }
        }
        catch { /* skip malformed line */ }
    }
    return rows;
}
export function miningLine(caseDir, assetCount) {
    const candidates = loadCandidates(caseDir);
    const tested = new Set(candidates.filter((candidate) => candidate.class === 'unknown').map((candidate) => candidate.endpoint));
    return `[mining] candidates ${candidates.length} · untested ${Math.max(0, candidates.length - tested.size)} · assets ${assetCount}`;
}
//# sourceMappingURL=mining.js.map