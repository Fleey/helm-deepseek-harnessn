import type { Context } from '@deepseek-ai/cordis';
import { type ReportState, type TeamReport, type TeamRole } from './team.js';
export interface WorkerReport {
    state: ReportState;
    summary: string;
    evidenceIds: string[];
    repro?: string;
    stopReason?: string;
}
export interface TeamSubagentProvider {
    readonly name: string;
    readonly capabilities?: {
        readonly agentOptions?: boolean;
    };
}
export interface TeamActivation {
    readonly childId: string;
    readonly result: Promise<{
        output?: unknown;
        stopReason?: string;
        diagnostic?: string;
    }>;
    dispose?(): Promise<void>;
}
export interface TeamActivationSpec {
    readonly provider: string;
    readonly label: string;
    readonly request: {
        readonly parent: unknown;
        readonly prompt: Array<{
            type: 'text';
            text: string;
        }>;
        readonly cwd?: string;
        readonly agentOptions?: {
            provider?: string;
            model?: string;
            reasoningEffort?: string;
            maxTokens?: number;
        };
    };
    readonly signal: AbortSignal;
    readonly delivery: 'caller' | 'parent';
}
export interface TeamSubagentRuntime {
    getProvider(name: string): TeamSubagentProvider | undefined;
    startActivation(spec: TeamActivationSpec): Promise<TeamActivation>;
    /** Host-native mid-turn steer (dsh-subagent manager). Optional: old hosts
     *  only expose startActivation, and team_steer reports that clearly. */
    steerPrompt?(parent: unknown, childId: string, content: Array<{
        type: 'text';
        text: string;
    }>, source: unknown, signal: AbortSignal): Promise<unknown>;
}
export interface TeamAgentRegistry {
    get(id: string): unknown;
}
/** Convert a child's final output into the ticket report contract. JSON is
 *  optional; a plain text report still gets evidence ids and a state. */
export declare function extractWorkerReport(output: unknown, stopReason?: string): WorkerReport;
/** T-05 finish gate: a "ready" report with no evidence and no substantive
 *  summary is not a result; budget/stop-reason exhaustion becomes blocked,
 *  never a normal completion. Exported for the unit check. */
export declare function applyFinishGate(report: WorkerReport, elapsedMs: number, budgetMs: number): WorkerReport;
export interface StartWorkerInput {
    ctx?: Context;
    runtime?: {
        agents?: TeamAgentRegistry;
        subagents?: TeamSubagentRuntime;
    };
    ticketId: string;
    role: TeamRole;
    task?: string;
    parentAgent?: unknown;
    parentSessionId?: string;
    signal?: AbortSignal;
    /** Notify the parent model when the child settles (default) or keep the
     *  result local to the ticket reporter. */
    delivery?: 'parent' | 'caller';
}
export interface StartedWorker {
    ticketId: string;
    role: TeamRole;
    sessionId: string;
    completion: Promise<TeamReport | undefined>;
}
/** Build the worker prompt from the ticket's pinned revisions. */
export declare function renderWorkerPrompt(input: {
    ticketId: string;
    role: TeamRole;
    goal: string;
    caseDir: string;
    task?: string;
    revisions: Record<string, number>;
}): string;
/** Start one local child Agent for a ticket role. The returned completion is
 *  recorded as a report even when the child fails, so the ticket never hangs
 *  in `running` without an auditable outcome. */
export declare function startTeamWorker(input: StartWorkerInput): Promise<StartedWorker>;
