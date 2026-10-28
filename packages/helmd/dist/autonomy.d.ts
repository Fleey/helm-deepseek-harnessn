export interface HypothesisView {
    id: string;
    statement: string;
    expected: string;
    testCmd: string;
    status: string;
    observation?: string;
    evidenceIds: string[];
}
export interface FindingView {
    title: string;
    evidence: string;
    repro?: string;
}
export interface EvidenceView {
    id: string;
    file: string;
}
export interface AutonomyInput {
    mode: string;
    goal?: string;
    hypotheses: HypothesisView[];
    findings: FindingView[];
    evidence: EvidenceView[];
    deadEnds?: string;
}
/** Pick the playbook that fits the case goal. Discovery only — no phase gate. */
export declare function playbookFor(goal: string): string;
/** One line the model can act on now. Never a gate; end_case remains the hard stop. */
export declare function deriveNextAction(input: AutonomyInput): string;
/** Problems the model should fix before claiming the case is complete. */
export declare function warningsFor(input: AutonomyInput): string[];
/** Compact packet appended to case_status. The model reads this instead of disk. */
export declare function renderAutonomyPacket(input: AutonomyInput): string;
