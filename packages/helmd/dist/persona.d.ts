import type { Context } from '@deepseek-ai/cordis';
import { type ProfileStatus } from './profile.js';
/** Register the active profile's persona as a system-prompt section.
 *  Persona only — boost is registered separately by registerBoost (upstream's
 *  installPersona had the same split, and the profile-switch check counts
 *  sections). */
export declare function registerPersona(ctx: Context): void;
/** Register the sealed tail override block (boost.txt) at the highest order.
 *  Called by apply() after registerPersona; kept separate so the hot switch
 *  never re-registers it (the boost body does not vary per profile). */
export declare function registerBoost(ctx: Context): void;
/** Register the persona system-prompt section (shadows the preset persona row).
 *  @returns the host's disposer, which `switchProfile` uses to swap the body. */
export declare function applyPersonaSection(ctx: Context, text: string): () => void;
/** Register the sealed tail override block at the highest order. */
export declare function applyBoostSection(ctx: Context): void;
/** Hot-switch the active armor profile: persist the choice, swap the live
 *  persona section in place, roll back on failure. No host restart needed. */
export declare function switchProfile(id: string): ProfileStatus;
/** Upstream gate.ts name for registerPersona; kept as an alias for tooling. */
export declare const installPersona: typeof registerPersona;
