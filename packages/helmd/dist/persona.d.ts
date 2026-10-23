import type { Context } from '@deepseek-ai/cordis';
/** Register the active profile's persona as a system-prompt section. */
export declare function registerPersona(ctx: Context): void;
/** Register the persona system-prompt section (shadows the preset persona row). */
export declare function applyPersonaSection(ctx: Context, text: string): void;
