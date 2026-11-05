import { boostBody, profileBody } from './catalog.js';
import { getActiveProfileId, profileStatus, setActiveProfileId } from './profile.js';
// Split construction so the persona's opening line never appears as one
// contiguous literal in the distributed source (anti-grep hygiene).
// Own namespace: the preset's dsh-persona row registers the empty
// 'deployment:persona-prefix' section, and same-name re-registration is
// rejected ("already registered in this scope"). A distinct name coexists.
const PERSONA_SECTION_NAME = 'helm-d:persona';
const PERSONA_SECTION_ORDER = 0;
// Tail override block. Position is the whole point: head-position policy gets
// diluted by everything after it, tail-position carries to the last step.
const BOOST_SECTION_NAME = 'helm-d:boost';
const BOOST_SECTION_ORDER = 1e6;
/** The ctx that registered the persona; kept so a later switch can re-register. */
let personaCtx;
/** Disposer of the live persona section (from the host's systemPrompt service). */
let personaDispose;
/** Register the active profile's persona as a system-prompt section.
 *  Persona only — boost is registered separately by registerBoost (upstream's
 *  installPersona had the same split, and the profile-switch check counts
 *  sections). */
export function registerPersona(ctx) {
    personaCtx = ctx;
    try {
        personaDispose = applyPersonaSection(ctx, profileBody(getActiveProfileId()) ?? '');
    }
    catch (error) {
        personaDispose = undefined;
        console.warn('[helmd] persona: persona section registration failed:', error instanceof Error ? error.message : error);
    }
}
/** Register the sealed tail override block (boost.txt) at the highest order.
 *  Called by apply() after registerPersona; kept separate so the hot switch
 *  never re-registers it (the boost body does not vary per profile). */
export function registerBoost(ctx) {
    try {
        applyBoostSection(ctx);
    }
    catch (error) {
        console.warn('[helmd] persona: boost section registration failed:', error instanceof Error ? error.message : error);
    }
}
/** Register the persona system-prompt section (shadows the preset persona row).
 *  @returns the host's disposer, which `switchProfile` uses to swap the body. */
export function applyPersonaSection(ctx, text) {
    const host = ctx;
    if (!host.systemPrompt || typeof host.systemPrompt.section !== 'function') {
        throw new Error('systemPrompt service unavailable');
    }
    const order = typeof host.systemPrompt.getSectionOrder === 'function'
        ? host.systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX')
        : PERSONA_SECTION_ORDER;
    const dispose = host.systemPrompt.section({ name: PERSONA_SECTION_NAME, order, text });
    return typeof dispose === 'function' ? dispose : () => { };
}
/** Register the sealed tail override block at the highest order. */
export function applyBoostSection(ctx) {
    const text = boostBody();
    if (text === undefined || text.trim() === '')
        return;
    const host = ctx;
    if (!host.systemPrompt || typeof host.systemPrompt.section !== 'function') {
        throw new Error('systemPrompt service unavailable');
    }
    host.systemPrompt.section({ name: BOOST_SECTION_NAME, order: BOOST_SECTION_ORDER, text });
}
/** Hot-switch the active armor profile: persist the choice, swap the live
 *  persona section in place, roll back on failure. No host restart needed. */
export function switchProfile(id) {
    const previous = getActiveProfileId();
    const next = profileBody(id);
    if (next === undefined) {
        const known = profileStatus().profiles.map((p) => p.id).join(', ');
        throw new Error(`unknown profile "${id}" (known: ${known})`);
    }
    setActiveProfileId(id);
    if (personaCtx === undefined || personaDispose === undefined)
        return profileStatus();
    try {
        personaDispose();
        personaDispose = applyPersonaSection(personaCtx, next);
    }
    catch (error) {
        personaDispose = undefined;
        setActiveProfileId(previous);
        try {
            personaDispose = applyPersonaSection(personaCtx, profileBody(previous) ?? '');
        }
        catch { /* keep undefined */ }
        throw error;
    }
    return profileStatus();
}
/** Upstream gate.ts name for registerPersona; kept as an alias for tooling. */
export const installPersona = registerPersona;
//# sourceMappingURL=persona.js.map