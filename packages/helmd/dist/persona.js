import { profileBody } from './catalog.js';
// Split construction so the persona's opening line never appears as one
// contiguous literal in the distributed source (anti-grep hygiene).
// Own namespace: the preset's dsh-persona row registers the empty
// 'deployment:persona-prefix' section, and same-name re-registration is
// rejected ("already registered in this scope"). A distinct name coexists.
const PERSONA_SECTION_NAME = 'helm-d:persona';
const PERSONA_SECTION_ORDER = 0;
/** Register the active profile's persona as a system-prompt section. */
export function registerPersona(ctx) {
    applyPersonaSection(ctx, profileBody() ?? '');
}
/** Register the persona system-prompt section (shadows the preset persona row). */
export function applyPersonaSection(ctx, text) {
    const host = ctx;
    if (!host.systemPrompt || typeof host.systemPrompt.section !== 'function') {
        throw new Error('systemPrompt service unavailable');
    }
    const order = typeof host.systemPrompt.getSectionOrder === 'function'
        ? host.systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX')
        : PERSONA_SECTION_ORDER;
    host.systemPrompt.section({ name: PERSONA_SECTION_NAME, order, text });
}
//# sourceMappingURL=persona.js.map