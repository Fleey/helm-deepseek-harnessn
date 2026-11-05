export type AssetKind = 'domain' | 'host' | 'port' | 'url' | 'tech' | 'path';
export interface ReconAsset {
    kind: AssetKind;
    value: string;
    parent?: string;
    source: string;
    evidenceId?: string;
    firstSeen: string;
    lastSeen: string;
}
export interface ReconCoverage {
    dns: number;
    ports: number;
    http: number;
    tech: number;
    crawl: number;
    dir: number;
    untested: number;
}
export declare function loadAssets(caseDir: string): ReconAsset[];
/** Append or refresh one asset. Identity is `kind|value|parent`, so the same
 *  host under two parents is two graph edges, not a dedup mistake. */
export declare function addAsset(caseDir: string, input: Omit<ReconAsset, 'firstSeen' | 'lastSeen'>): {
    asset: ReconAsset;
    deduped: boolean;
};
export declare function addAssets(caseDir: string, inputs: Array<Omit<ReconAsset, 'firstSeen' | 'lastSeen'>>): {
    added: number;
    deduped: number;
};
export declare function isPrivateHost(host: string): boolean;
/** Exact host or a parent-domain suffix match; CIDR is intentionally not
 *  expanded here (recon tools take hostnames, not arbitrary IP ranges). */
export declare function hostInScope(host: string, scope: readonly string[]): boolean;
export interface ScopeDecision {
    ok: boolean;
    reason?: string;
}
/** A recon target must be inside the case scope; loopback/private/metadata
 *  targets additionally require an explicit lab opt-in. */
export declare function checkReconTarget(host: string, scope: readonly string[], lab?: boolean): ScopeDecision;
/** Per-host token bucket: 1 rps with a small jitter, at most 4 in flight. */
export declare class ReconLimiter {
    private readonly rps;
    private readonly concurrency;
    private readonly nextAt;
    private active;
    constructor(rps?: number, concurrency?: number);
    acquire(host: string): Promise<void>;
    release(): void;
}
export declare function coverageFor(assets: ReconAsset[]): ReconCoverage;
export declare function coverageLine(assets: ReconAsset[]): string;
/** nmap XML `<host><address addr="..."/><port portid="80" protocol="tcp"/></host>`. */
export declare function parseNmapXml(xml: string): Array<{
    host: string;
    ports: number[];
}>;
/** httpx JSONL: `{"url":"https://x","host":"x","tech":["nginx"],"status_code":200}`. */
export declare function parseHttpxJsonl(text: string): Array<{
    url: string;
    host?: string;
    tech: string[];
    status?: number;
}>;
/** nuclei JSONL: `{"host":"...","matched-at":"...","template-id":"..."}`. */
export declare function parseNucleiJsonl(text: string): Array<{
    host: string;
    matchedAt?: string;
    template?: string;
}>;
