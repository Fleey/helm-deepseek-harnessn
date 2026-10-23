/** How binding an advisory is. `mandatory` is never demoted and never truncated. */
export type AdvisoryTier = 'mandatory' | 'recommended' | 'hint';
/** The objectively observable behaviour that counts as "acted on it". */
export type Proof = {
    kind: 'tool_called';
    tools: string[];
    argIncludes?: string;
} | {
    kind: 'finding_recorded';
} | {
    kind: 'case_opened';
} | {
    kind: 'evidence_saved';
} | {
    kind: 'reference_read';
    pathIncludes?: string;
} | {
    kind: 'mode_set';
}
/** Adopted when NO marker appears in the assistant replies inside the window. */
 | {
    kind: 'reply_avoids';
    markers: string[];
}
/** Adopted when at least one marker appears in the assistant replies inside the window. */
 | {
    kind: 'reply_shows';
    markers: string[];
};
export interface Advisory {
    /** Dedupe key: one live advisory per key per session. */
    key: string;
    tier: AdvisoryTier;
    content: string;
    /** Adoption proof; absent means "delivered only" — never counted as ignored. */
    proof?: Proof;
    /** Assistant turns allowed before an unadopted advisory is reckoned `ignored`. */
    withinTurns?: number;
    /**
     * Track adoption only — never render into the prompt. Use when the producing
     * tool already delivered the guidance as its own result (e.g. route_task's card),
     * so re-injecting would duplicate it, and demotion would wrongly silence a
     * per-call fact. Track-only advisories are still reckoned and recorded.
     */
    trackOnly?: boolean;
    /**
     * Teach, then measure: render the reminder only while the ledger says this discipline is
     * not yet followed (see {@link shouldTeach}). Used for guidance that is worth stating a
     * few times but not forever — once the rate is good it stays a pure metric.
     */
    adaptive?: boolean;
}
export type Verdict = 'adopted' | 'ignored' | 'delivered';
export interface Reckoned {
    key: string;
    tier: AdvisoryTier;
    verdict: Verdict;
    turnsWaited: number;
}
/** Advisory ledger path; shares the tool-ledger directory so it survives with it. */
export declare function advisoryLedgerPath(): string;
/** Submit or refresh one advisory for a session. `atEventCount` anchors the proof window. */
export declare function submitAdvisory(sessionId: string, advisory: Advisory, atEventCount: number): void;
/** Whether a key already has an un-reckoned advisory in this session. */
export declare function hasPending(sessionId: string, key: string): boolean;
/** Live (not yet reckoned) advisories, tier-ordered. */
export declare function advisoryQueue(sessionId: string): Advisory[];
/** Reckon pending advisories against the session's events; persist every verdict. */
export declare function reckonAdvisories(sessionId: string, events: readonly unknown[]): Reckoned[];
/** Ignored tally per key, read from the persisted ledger. */
export declare function ignoredCounts(): Map<string, number>;
/** Adopted / ignored tally per key, for the route card. */
export declare function advisoryStats(): Map<string, {
    adopted: number;
    ignored: number;
}>;
/** A non-mandatory advisory that keeps being ignored stops being surfaced. */
export declare function isDemoted(key: string, tier: AdvisoryTier): boolean;
/**
 * Keys whose ignored tally reached the threshold and whose tier may actually be demoted.
 * Mandatory keys never are, so they must not be labelled as demoted either.
 */
export declare function demotedKeys(threshold?: number): Set<string>;
/** Compact adoption-stats block for tool output (route card, case_status, end_case). */
export declare function renderAdvisoryStats(limit?: number): string;
/**
 * Whether a teaching advisory is still worth rendering: until the recent window shows the
 * discipline is followed often enough, then never again — it stays a pure metric. Teaching
 * and measuring are the same submission; only the reminder retires.
 */
export declare function shouldTeach(key: string): boolean;
/** Render the session's surviving advisories as one prompt section body. */
export declare function renderAdvisories(sessionId: string): string;
