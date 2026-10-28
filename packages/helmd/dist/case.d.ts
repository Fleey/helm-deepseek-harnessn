export interface CaseInfo {
    dir: string;
    name: string;
    goal: string;
    mode: string;
    route: string;
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
export declare function saveEvidence(caseDir: string, toolLabel: string, content: string, summary: string): Promise<{
    id: string;
    path: string;
    sha256: string;
    dedup?: string;
}>;
export declare function appendTimeline(caseDir: string, line: string): Promise<void>;
export declare function loadCaseMd(caseDir: string): Promise<string>;
export declare function validateEvidenceIds(caseDir: string, ids: string[]): Promise<{
    ok: boolean;
    missing: string[];
    known: string[];
}>;
export declare function appendFinding(caseDir: string, title: string, detail: string, ids: string[], reproCmd?: string): Promise<void>;
export interface Finding {
    title: string;
    detail: string;
    evidence: string;
    repro?: string;
}
/** Parse findings.md into structured entries for case_status and the WebUI. */
export declare function loadFindings(caseDir: string): Promise<Finding[]>;
export declare function closeCase(caseDir: string, summary?: string): Promise<void>;
export interface CaseSummary {
    name: string;
    dir: string;
    status: 'open' | 'completed' | 'unknown';
    goal: string;
    mode: string;
    route: string;
    evidenceCount: number;
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
    status: 'open' | 'confirmed' | 'refuted' | 'blocked';
    observation?: string;
    evidenceIds: string[];
    createdAt: string;
    updatedAt: string;
}
export declare function recordHypothesis(caseDir: string, statement: string, expected: string, testCmd: string, evidenceIds?: string[]): Promise<Hypothesis>;
export declare function updateHypothesis(caseDir: string, id: string, status: Hypothesis['status'], observation: string, evidenceIds?: string[]): Promise<Hypothesis | undefined>;
export declare function loadHypotheses(caseDir: string): Promise<Hypothesis[]>;
export declare function getOpenHypothesisCount(caseDir: string): Promise<number>;
