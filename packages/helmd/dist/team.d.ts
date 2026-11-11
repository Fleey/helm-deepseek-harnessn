export declare const TEAM_ROLES: readonly ["orchestrator", "triage", "static", "dynamic", "decoy-audit", "critic", "reporter"];
export type TeamRole = (typeof TEAM_ROLES)[number];
export type TicketState = 'open' | 'working' | 'review' | 'blocked' | 'done' | 'dropped';
export type ReportState = 'progress' | 'ready' | 'blocked' | 'failed' | 'dropped';
export interface TeamReport {
    id: string;
    role: TeamRole;
    state: ReportState;
    summary: string;
    evidenceIds: string[];
    repro?: string;
    budget?: number;
    tokens?: number;
    wallTimeMs?: number;
    source?: 'worker' | 'manual';
    stopReason?: string;
    at: string;
}
export interface TeamHandoff {
    id: string;
    from: TeamRole;
    to: TeamRole;
    question: string;
    at: string;
}
export interface RoleAssignment {
    role: TeamRole;
    sessionId?: string;
    state: 'idle' | 'running' | 'done';
    startedAt?: string;
    endedAt?: string;
}
export type TaskState = 'ready' | 'blocked' | 'claimed' | 'done' | 'failed';
export interface TeamTask {
    id: string;
    role: TeamRole;
    /** Task ids that must be done before this task is claimable. */
    blockedBy: string[];
    state: TaskState;
    owner?: TeamRole;
    /** ISO timestamp; an expired lease can be reclaimed by another worker. */
    leaseUntil?: string;
    createdAt: string;
    updatedAt: string;
}
export interface TeamBudget {
    wallTimeMs?: number;
    maxToolCalls?: number;
}
export interface TeamSteer {
    id: string;
    role: TeamRole;
    message: string;
    at: string;
}
export interface TeamTicket {
    id: string;
    goal: string;
    caseDir: string;
    state: TicketState;
    revision: number;
    /** Active artifact revisions captured when the first worker starts. */
    artifactRevisions: Record<string, number>;
    /** Role dependencies: a role may only start once every listed role is done. */
    roleDeps?: Partial<Record<TeamRole, TeamRole[]>>;
    /** Per-ticket budget; inherited by workers (T-05). */
    budget?: TeamBudget;
    /** Optional task DAG (T-03); legacy tickets without tasks keep the roleDeps gate. */
    tasks?: TeamTask[];
    roles: RoleAssignment[];
    reports: TeamReport[];
    handoffs: TeamHandoff[];
    steers?: TeamSteer[];
    createdAt: string;
    updatedAt: string;
}
export interface TeamState {
    tickets: TeamTicket[];
}
export type ArtifactKind = 'role-prompt' | 'playbook' | 'skill' | 'model-profile' | 'budget-policy' | 'tool-policy';
export interface EvalResult {
    baseline: Record<string, number>;
    candidate: Record<string, number>;
    pass: boolean;
    reasons: string[];
    holdout?: {
        baseline: Record<string, number>;
        candidate: Record<string, number>;
        pass: boolean;
        reasons: string[];
    };
    at: string;
}
export interface ArtifactRevision {
    kind: ArtifactKind;
    id: string;
    revision: number;
    parent: number;
    value: string;
    source: string;
    at: string;
    /** Added+removed lines relative to the active revision (edit budget). */
    diffLines?: number;
    eval?: EvalResult;
}
export interface TeamVersions {
    artifacts: ArtifactRevision[];
    active: Record<string, number>;
}
export declare function listTickets(): TeamTicket[];
export declare function getTicket(id: string): TeamTicket | undefined;
/** Resolve the role a worker session was assigned to. Used by the tool-policy
 *  guard so a child cannot start more children or close the parent case. */
export declare function sessionRole(sessionId?: string): TeamRole | undefined;
/** Freeze the active artifact revisions into the ticket at first dispatch. */
export declare function pinArtifactRevisions(ticketId: string, revisions: Record<string, number>): TeamTicket;
export declare function createTicket(input: {
    goal: string;
    caseDir: string;
    roles?: TeamRole[];
    revision?: number;
    artifactRevisions?: Record<string, number>;
    roleDeps?: Partial<Record<TeamRole, TeamRole[]>>;
    budget?: TeamBudget;
    tasks?: Array<{
        id?: string;
        role: TeamRole;
        blockedBy?: string[];
    }>;
}): TeamTicket;
export declare function assignRole(ticketId: string, role: TeamRole, sessionId: string): TeamTicket;
/** Claim the role's next ready DAG task with a lease. Idempotent while the
 *  caller still owns an unexpired lease; a different live owner is rejected. */
export declare function claimTask(ticketId: string, role: TeamRole, leaseMs?: number): TeamTask;
/** Finish a claimed task. `done` unblocks dependents; `blocked`/`failed`
 *  release the lease so another attempt can claim it. */
export declare function completeTask(ticketId: string, role: TeamRole, outcome: 'done' | 'blocked' | 'failed'): TeamTask;
/** Audit a steer instruction; delivery itself is performed by the caller. */
export declare function recordSteer(ticketId: string, role: TeamRole, message: string): TeamSteer;
export declare function recordReport(input: {
    ticketId: string;
    role: TeamRole;
    state: ReportState;
    summary: string;
    evidenceIds?: string[];
    repro?: string;
    budget?: number;
    tokens?: number;
    wallTimeMs?: number;
    source?: 'worker' | 'manual';
    stopReason?: string;
}): TeamTicket;
export declare function recordHandoff(input: {
    ticketId: string;
    from: TeamRole;
    to: TeamRole;
    question: string;
}): TeamTicket;
export declare function closeTicket(ticketId: string, outcome: 'done' | 'dropped'): TeamTicket;
export declare function listRevisions(kind?: ArtifactKind, id?: string): ArtifactRevision[];
export declare function activeRevision(kind: ArtifactKind, id: string): ArtifactRevision | undefined;
export declare function proposeRevision(input: {
    kind: ArtifactKind;
    id: string;
    value: string;
    source: string;
    maxDiffLines?: number;
}): ArtifactRevision;
export interface GateOptions {
    /** Scores within this band are treated as noise, not regression. */
    noise?: number;
    /** Minimum improvement required on at least one metric. */
    minImprovement?: number;
    holdout?: {
        baseline: Record<string, number>;
        candidate: Record<string, number>;
    };
    diffLines?: number;
    maxDiffLines?: number;
}
/** Gate: higher-is-better metrics may not regress beyond the noise band,
 *  lower-is-better may not grow by more than 10%, at least one metric must
 *  improve by minImprovement, a holdout set must also pass, and edits must fit
 *  the review budget. */
export declare function canActivate(baseline: Record<string, number>, candidate: Record<string, number>, options?: GateOptions): {
    pass: boolean;
    reasons: string[];
};
/** Parent selection from dgm: score × 1/(1+children) keeps one lineage from
 *  monopolising the archive while still preferring stronger candidates. */
export declare function selectParent<T extends {
    score: number;
    children: number;
}>(candidates: T[]): T | undefined;
export declare function evaluateRevision(input: {
    kind: ArtifactKind;
    id: string;
    revision: number;
    baseline: Record<string, number>;
    candidate: Record<string, number>;
    holdout?: {
        baseline: Record<string, number>;
        candidate: Record<string, number>;
    };
    maxDiffLines?: number;
}): ArtifactRevision;
export declare function activateRevision(kind: ArtifactKind, id: string, revision: number): ArtifactRevision;
export declare function rollbackRevision(kind: ArtifactKind, id: string): ArtifactRevision;
export declare function teamStatus(): {
    tickets: TeamTicket[];
    artifacts: ArtifactRevision[];
    active: Record<string, number>;
};
