import { type ArtifactKind, type ArtifactRevision } from './team.js';
export interface EvalRecord {
    id: string;
    role?: string;
    correct: boolean;
    expectedEvidence?: string[];
    citedEvidence?: string[];
    canaryTraps?: number;
    canaryHits?: number;
    shouldBlock?: boolean;
    blocked?: boolean;
    tokens?: number;
    wallTimeMs?: number;
}
export interface EvalMetrics {
    correctness: number;
    evidence: number;
    canaryResistance: number;
    blockedHonesty: number;
    tokens: number;
    wallTime: number;
}
/** Aggregate one run set. The six keys are exactly the gate's vocabulary. */
export declare function computeMetrics(records: readonly EvalRecord[]): EvalMetrics;
export interface EvalComparison {
    baseline: EvalMetrics;
    candidate: EvalMetrics;
    pass: boolean;
    reasons: string[];
}
/** Compare two run sets with the same gate used for activation. An optional
 *  holdout pair is evaluated independently and must pass too (T-07). */
export declare function compareRuns(baseline: readonly EvalRecord[], candidate: readonly EvalRecord[], holdout?: {
    baseline: readonly EvalRecord[];
    candidate: readonly EvalRecord[];
}): EvalComparison;
/** Evaluate an already-proposed revision from two run sets. The revision must
 *  have been proposed first; this writes the gate result into versions.json. */
export declare function evaluateRevisionFromRuns(input: {
    kind: ArtifactKind;
    id: string;
    revision: number;
    baseline: readonly EvalRecord[];
    candidate: readonly EvalRecord[];
    holdout?: {
        baseline: readonly EvalRecord[];
        candidate: readonly EvalRecord[];
    };
    maxDiffLines?: number;
}): ArtifactRevision;
