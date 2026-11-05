export interface CaseInfo {
    dir: string;
    name: string;
    goal: string;
    mode: string;
    route: string;
    /** Explicit recon scope (hostnames/CIDRs); empty means recon tools refuse. */
    scope?: string[];
}
/** Read the bound case from memory, then from the session binding file. The
 *  file survives host restarts and context compaction; without it the model
 *  (and the workbench) would fall back to "latest open case on disk", which is
 *  exactly the cross-session confusion the workbench used to show. */
export declare function getCase(sessionId?: string): CaseInfo | undefined;
export declare function bindCase(sessionId: string | undefined, info: CaseInfo): void;
export declare function unbindCase(sessionId?: string): CaseInfo | undefined;
/** Root resolution: explicit arg > HELMD_CASES_DIR > process.cwd(). */
export declare function casesRoot(root?: string): string;
export declare function slugify(text: string, max?: number): string;
/** Create <root>/helmd-cases/<date>-<slug>[/] with collision suffixes. */
export declare function createCaseDir(opts: {
    goal: string;
    samples: string[];
    mode: string;
    route: string;
    root?: string;
    scope?: string[];
}): Promise<CaseInfo>;
/** Evidence files present for a case (E-xxx entries), counted from disk. */
export declare function countEvidence(caseDir: string): Promise<number>;
export interface EvidenceEntry {
    id: string;
    file: string;
}
/** Evidence entries on disk, sorted by E-number. */
export declare function listEvidence(caseDir: string): Promise<EvidenceEntry[]>;
/** Next E-number = max existing + 1; the scan happens once per case directory. */
export declare function nextEvidenceId(caseDir: string): Promise<string>;
/** Drop a case directory's counter (called when its case closes). */
export declare function resetEvidenceCounter(caseDir: string): void;
export declare function saveEvidence(caseDir: string, toolLabel: string, content: string, summary: string, options?: {
    maxBytes?: number;
}): Promise<{
    id: string;
    path: string;
    sha256: string;
    dedup?: string;
}>;
/** T-02 claim audit: hash-like tokens in a finding detail must appear verbatim
 *  in at least one cited evidence file; E-id references must be cited. */
export declare function uncitedClaims(caseDir: string, detail: string, evidenceIds: string[], negativeIds?: string[]): Promise<string[]>;
export interface EvidenceMeta {
    id: string;
    file: string;
    sha256: string;
    prevHash: string;
    tool: string;
    ts: string;
}
/** Evidence meta rows in E-number order; malformed files are ignored. */
export declare function listEvidenceMeta(caseDir: string): Promise<EvidenceMeta[]>;
/** Chain head for a set of evidence ids (latest cited sha256). */
export declare function evidenceChainHead(caseDir: string, ids?: string[]): Promise<string | undefined>;
/** Re-hash evidence and report ids whose content no longer matches its meta. */
export declare function staleEvidenceIds(caseDir: string): Promise<string[]>;
export declare function appendTimeline(caseDir: string, line: string): Promise<void>;
export declare function loadCaseMd(caseDir: string): Promise<string>;
export declare function validateEvidenceIds(caseDir: string, ids: string[]): Promise<{
    ok: boolean;
    missing: string[];
    known: string[];
}>;
export declare const FINDING_SEVERITIES: readonly ["critical", "high", "medium", "low", "info"];
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];
export declare const FINDING_STATUSES: readonly ["candidate", "verified", "rejected", "duplicate", "wontfix"];
export type FindingStatus = (typeof FINDING_STATUSES)[number];
export declare const FINDING_CONFIDENCES: readonly ["verified", "probable", "unverified"];
export type FindingConfidence = (typeof FINDING_CONFIDENCES)[number];
export declare function isSeverity(value: unknown): value is FindingSeverity;
export declare function isFindingStatus(value: unknown): value is FindingStatus;
export declare function isConfidence(value: unknown): value is FindingConfidence;
/** CVSS v3 bands (xalgorix uses the same HackerOne-aligned buckets). */
export declare function cvssToSeverity(score: number): FindingSeverity;
export interface Finding {
    id: string;
    title: string;
    detail: string;
    severity: FindingSeverity;
    status: FindingStatus;
    confidence: FindingConfidence;
    vulnClass: string;
    target?: string;
    cvss?: number;
    cvssVector?: string;
    /** Severity the model asserted before CVSS / evidence-strength rules ran. */
    assertedSeverity?: FindingSeverity;
    evidence: string;
    evidenceIds: string[];
    /** Evidence chain head at record time (T-06). */
    evidenceHash?: string;
    /** Independent negative-control evidence ids (T-02). */
    negativeEvidenceIds?: string[];
    negativeControl?: string;
    /** PoC recipe/run id linking the finding to T-15 evidence. */
    pocId?: string;
    /** Re-hash mismatch against the evidence meta chain (computed on load). */
    stale?: boolean;
    repro?: string;
    seenCount: number;
    createdAt: string;
    updatedAt: string;
}
export interface FindingInput {
    title: string;
    detail: string;
    evidenceIds: string[];
    severity: FindingSeverity;
    vulnClass?: string;
    target?: string;
    confidence?: FindingConfidence;
    cvss?: number;
    cvssVector?: string;
    status?: FindingStatus;
    repro?: string;
    negativeEvidenceIds?: string[];
    negativeControl?: string;
    pocId?: string;
}
export interface RecordedFinding {
    finding: Finding;
    merged: boolean;
    notes: string[];
}
/** Findings: findings.json is authoritative; markdown is the legacy fallback. */
export declare function loadFindings(caseDir: string): Promise<Finding[]>;
/** Record one finding with severity/status/confidence rules.
 *  - CVSS, when supplied, is authoritative; the asserted value is kept for audit.
 *  - unverified confidence caps severity at medium; critical/high need >= 2
 *    independent evidence ids, otherwise they are downgraded one band.
 *  - identical vuln class + target + normalized title merges into the existing
 *    finding (evidence union, max severity, seen_count). */
export declare function recordFinding(caseDir: string, input: FindingInput): Promise<RecordedFinding>;
/** Update one finding's triage state/severity (lifecycle: candidate → verified
 *  → rejected/duplicate/wontfix). Evidence and repro are immutable here. */
export declare function updateFinding(caseDir: string, id: string, patch: {
    status?: FindingStatus;
    severity?: FindingSeverity;
    note?: string;
}): Promise<Finding | undefined>;
export declare function severityCounts(findings: Finding[]): Record<FindingSeverity, number>;
export declare function findingStatusCounts(findings: Finding[]): Record<FindingStatus, number>;
export declare function closeCase(caseDir: string, summary?: string): Promise<void>;
export interface CaseSummary {
    name: string;
    dir: string;
    status: 'open' | 'completed' | 'unknown';
    goal: string;
    mode: string;
    route: string;
    evidenceCount: number;
    /** Finding counts for the Case list (T-13.1); omitted when unreadable. */
    findingsBySeverity?: Record<FindingSeverity, number>;
    staleFindings?: number;
    looseFiles: string[];
}
/** List all case directories under casesRoot with metadata. */
export declare function listCasesOnDisk(root?: string): Promise<CaseSummary[]>;
/** Check for non-case stray directories or files sitting directly in helmd-cases/. */
export declare function auditCasesRoot(root?: string): Promise<{
    cases: CaseSummary[];
    strays: string[];
}>;
/** Find the most recently created case marked status: open. */
export declare function findOpenCaseOnDisk(root?: string): Promise<CaseInfo | undefined>;
/** Load a specific case by directory or folder name. */
export declare function loadCaseInfoFromDisk(caseDirOrName: string, root?: string): Promise<CaseInfo | undefined>;
/** List any loose unorganized files directly in the case root. */
export declare function listLooseFilesInCase(caseDir: string): Promise<string[]>;
/** Auto-sweep unorganized files from case root into evidence/. */
export declare function sweepCaseRootFiles(caseDir: string): Promise<string[]>;
export interface Hypothesis {
    id: string;
    statement: string;
    expected: string;
    testCmd: string;
    negativeCmd?: string;
    observed?: string;
    status: 'open' | 'confirmed' | 'refuted' | 'blocked';
    observation?: string;
    evidenceIds: string[];
    createdAt: string;
    updatedAt: string;
}
export declare function recordHypothesis(caseDir: string, statement: string, expected: string, testCmd: string, evidenceIds?: string[], negativeCmd?: string): Promise<Hypothesis>;
export declare function updateHypothesis(caseDir: string, id: string, status: Hypothesis['status'], observation: string, evidenceIds?: string[]): Promise<Hypothesis | undefined>;
export declare function loadHypotheses(caseDir: string): Promise<Hypothesis[]>;
export declare function getOpenHypothesisCount(caseDir: string): Promise<number>;
/** Parse a CVSS v3.0/3.1 base vector. Returns undefined on malformed input;
 *  the score is authoritative over a caller-supplied number (T-13.3). */
export declare function parseCvssVector(vector: string): {
    score: number;
    severity: FindingSeverity;
} | undefined;
/** Deterministic SARIF 2.1.0 projection (T-13.2). Rejected findings are not
 *  promoted into the report; ordering is severity then F-id. */
export declare function renderSarif(caseName: string, findings: Finding[]): string;
/** Finding counts by creation day and severity, plus status transitions in the
 *  timeline. Deterministic order; used by the workbench trend line. */
export declare function findingTrend(findings: Finding[]): Array<{
    date: string;
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
}>;
/** Deterministic report projection (T-11/T-13.2): fixed field order, stable
 *  severity/id sort, and explicit NOT RUN for missing repro/evidence. Rejected
 *  findings are listed separately and never mixed into the verified body. */
export declare function renderCaseReport(caseName: string, findings: Finding[]): string;
