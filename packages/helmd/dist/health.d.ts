import type { Context } from '@deepseek-ai/cordis';
/** Legacy settings namespace; now only the client health-card key. */
export declare const HELMD_HEALTH_NS = "helmd";
/** Health verdict served to the settings card. All fields are plain strings. */
export interface HelmdHealth {
    /** OK | HOST_UPGRADED | STALE | LEGACY_PRESET | NOT_GENERATED | UNKNOWN */
    status: string;
    /** Human-readable one-liner supporting the status. */
    detail: string;
    /** sha256 of the installed host standard, first 12 hex chars ('' if unreadable). */
    hostFingerprint: string;
    /** Fingerprint recorded inside the generated preset patch ('' if absent). */
    presetFingerprint: string;
    /** Absolute path of this package's generated preset patch ('' if not found). */
    presetPath: string;
    /** Absolute path of the host standard used ('' if not found). */
    hostPath: string;
    /** ISO timestamp of this evaluation (host boot). */
    checkedAt: string;
    /** Installed helmd package version. */
    version: string;
    /**
     * Drift-repair verdict: `healed (<from> → <to>) — …` when the preset was rewritten;
     * `<status> not repaired — …` or `off (HELMD_AUTO_HEAL=0)` when it was left alone;
     * `unavailable (…)` / `failed (…)` otherwise.
     */
    autoHeal: string;
    /** Dynamic shelf tools loaded from TOOLS.md (JSON stringified). */
    tools: string;
}
/**
 * Structural half of the MAINTENANCE §8 guardrail: everything assertable about the artifact
 * itself, with no session involved. The live half (a restarted host answers the first
 * request with exactly [pwsh, read]) stays with the operator — it cannot be produced from
 * inside the process that is being asserted.
 */
export declare function assertPresetArtifact(deployed: string, hostStandardText: string): {
    ok: boolean;
    detail: string;
};
/**
 * Evaluate the preset patch fingerprint and, when it drifted, optionally regenerate it
 * from the installed host standard (`HELMD_AUTO_HEAL=1` opts in; default is report-only).
 * @returns the health verdict, with the auto-heal outcome folded in.
 */
export declare function evaluateHealth(): HelmdHealth;
/**
 * Bundle row apply. Evaluates health once per boot and exposes it over HTTP.
 * @param ctx - the host composition context this row was plugged into.
 */
export declare function apply(ctx: Context): void;
