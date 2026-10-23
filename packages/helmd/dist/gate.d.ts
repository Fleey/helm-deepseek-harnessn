import type { Context } from '@deepseek-ai/cordis';
/** Operator chose to dismiss the star popup for THIS instance launch
 *  (memory-only). The persona is untouched; the background device-flow
 *  poll is aborted immediately — zero GitHub traffic after skip. */
export declare function skipThisLaunch(): void;
/** Whether the gate is actively gating assemblies (locked AND not skipped). */
export declare function isGating(): boolean;
/** Status snapshot for the web gate panel (GET /api/helmd/gate). */
export declare function gateStatus(): Record<string, unknown>;
/** Whether the star gate has been passed. Checked per assembly, cheap. */
export declare function isUnlocked(): boolean;
/** Register the gate on the prompt-assembly waterfall + unlock/status tools. */
/** Register the gate on the prompt-assembly waterfall + unlock/status tools.
 *  Locked: the persona section is shadowed by the gate notice; the device flow
 *  starts LAZILY on the first gated assembly (helmd mode actually used).
 *  Unlocked: the persona section carries the active profile body. */
export declare function registerGate(ctx: Context): void;
/** Register the persona system-prompt section (shadows the preset persona row). */
export declare function applyPersonaSection(ctx: Context, text: string): void;
