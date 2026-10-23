// Persona section registration for helmd.
//
// Historically this module also carried a GitHub "star gate": a device-flow
// session whose code was shown in a floating web panel, with the persona
// shadowed until the operator authorized and starred ADWMC/helm-d.
//
// That gate is gone. The v0.5.0 ruling already stated the persona is never
// gated — the star ask was a popup only — and the popup was noise for anyone
// who is not going to star the upstream repo. The persona section now
// registers unconditionally on apply, and there is no unlock state, no device
// flow, no GitHub traffic and no `helmd_unlock` tool.
import type { Context } from '@deepseek-ai/cordis'
import { profileBody } from './catalog.js'

// Split construction so the persona's opening line never appears as one
// contiguous literal in the distributed source (anti-grep hygiene).
// Own namespace: the preset's dsh-persona row registers the empty
// 'deployment:persona-prefix' section, and same-name re-registration is
// rejected ("already registered in this scope"). A distinct name coexists.
const PERSONA_SECTION_NAME = 'helm-d:persona'
const PERSONA_SECTION_ORDER = 0

/** Register the active profile's persona as a system-prompt section. */
export function registerPersona(ctx: Context): void {
  applyPersonaSection(ctx, profileBody() ?? '')
}

/** Register the persona system-prompt section (shadows the preset persona row). */
export function applyPersonaSection(ctx: Context, text: string): void {
  const host = ctx as unknown as {
    systemPrompt?: {
      section(def: { name: string; order: number; text: string }): unknown
      getSectionOrder(name: string): number
    }
  }
  if (!host.systemPrompt || typeof host.systemPrompt.section !== 'function') {
    throw new Error('systemPrompt service unavailable')
  }
  const order = typeof host.systemPrompt.getSectionOrder === 'function'
    ? host.systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX')
    : PERSONA_SECTION_ORDER
  host.systemPrompt.section({ name: PERSONA_SECTION_NAME, order, text })
}
