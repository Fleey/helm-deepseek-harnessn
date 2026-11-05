import type { Context } from '@deepseek-ai/cordis';
/** Commands that need an explicit decision even inside the case workspace. */
declare const RISKY_COMMANDS: RegExp[];
/** T-09: worker role boundaries + dynamic high-risk command approval. */
export declare function registerTeamPolicy(ctx: Context): void;
export { RISKY_COMMANDS };
