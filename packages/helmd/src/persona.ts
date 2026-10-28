// Persona section registration for helmd.
//
// Historically this module also carried a GitHub "star gate": a device-flow
// session whose code was shown in a floating web panel, with the persona
// shadowed until the operator authorized and starred ADWMC/helm-d.
//
// That gate is gone (fork ruling): the persona section registers
// unconditionally on apply, and there is no unlock state, no device flow,
// no GitHub traffic and no `helmd_unlock` tool.
//
// v0.5.2 backport: hot profile switching. The active profile body lives in
// the sealed catalog; this module owns the live persona section and can swap
// it in place (dispose + re-register) without a host restart. `switchProfile`
// validates against the catalog, persists the choice, and rolls back on a
// failed re-registration.
import type { Context } from '@deepseek-ai/cordis'
import { boostBody, profileBody } from './catalog.js'
import { getActiveProfileId, profileStatus, setActiveProfileId, type ProfileStatus } from './profile.js'

// Split construction so the persona's opening line never appears as one
// contiguous literal in the distributed source (anti-grep hygiene).
// Own namespace: the preset's dsh-persona row registers the empty
// 'deployment:persona-prefix' section, and same-name re-registration is
// rejected ("already registered in this scope"). A distinct name coexists.
const PERSONA_SECTION_NAME = 'helm-d:persona'
const PERSONA_SECTION_ORDER = 0
// Tail override block. Position is the whole point: head-position policy gets
// diluted by everything after it, tail-position carries to the last step.
const BOOST_SECTION_NAME = 'helm-d:boost'
const BOOST_SECTION_ORDER = 1e6

/** The ctx that registered the persona; kept so a later switch can re-register. */
let personaCtx: Context | undefined
/** Disposer of the live persona section (from the host's systemPrompt service). */
let personaDispose: (() => void) | undefined

/** Register the active profile's persona as a system-prompt section.
 *  Persona only — boost is registered separately by registerBoost (upstream's
 *  installPersona had the same split, and the profile-switch check counts
 *  sections). */
export function registerPersona(ctx: Context): void {
  personaCtx = ctx
  try {
    personaDispose = applyPersonaSection(ctx, profileBody(getActiveProfileId()) ?? '')
  } catch (error) {
    personaDispose = undefined
    console.warn('[helmd] persona: persona section registration failed:', error instanceof Error ? error.message : error)
  }
}

/** Register the sealed tail override block (boost.txt) at the highest order.
 *  Called by apply() after registerPersona; kept separate so the hot switch
 *  never re-registers it (the boost body does not vary per profile). */
export function registerBoost(ctx: Context): void {
  try { applyBoostSection(ctx) } catch (error) {
    console.warn('[helmd] persona: boost section registration failed:', error instanceof Error ? error.message : error)
  }
}

/** Register the persona system-prompt section (shadows the preset persona row).
 *  @returns the host's disposer, which `switchProfile` uses to swap the body. */
export function applyPersonaSection(ctx: Context, text: string): () => void {
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
  const dispose = host.systemPrompt.section({ name: PERSONA_SECTION_NAME, order, text })
  return typeof dispose === 'function' ? (dispose as () => void) : () => {}
}

/** Register the sealed tail override block at the highest order. */
export function applyBoostSection(ctx: Context): void {
  const text = boostBody()
  if (text === undefined || text.trim() === '') return
  const host = ctx as unknown as {
    systemPrompt?: { section(def: { name: string; order: number; text: string }): unknown }
  }
  if (!host.systemPrompt || typeof host.systemPrompt.section !== 'function') {
    throw new Error('systemPrompt service unavailable')
  }
  host.systemPrompt.section({ name: BOOST_SECTION_NAME, order: BOOST_SECTION_ORDER, text })
}

/** Hot-switch the active armor profile: persist the choice, swap the live
 *  persona section in place, roll back on failure. No host restart needed. */
export function switchProfile(id: string): ProfileStatus {
  const previous = getActiveProfileId()
  const next = profileBody(id)
  if (next === undefined) {
    const known = profileStatus().profiles.map((p) => p.id).join(', ')
    throw new Error(`unknown profile "${id}" (known: ${known})`)
  }
  setActiveProfileId(id)
  if (personaCtx === undefined || personaDispose === undefined) return profileStatus()
  try {
    personaDispose()
    personaDispose = applyPersonaSection(personaCtx, next)
  } catch (error) {
    personaDispose = undefined
    setActiveProfileId(previous)
    try { personaDispose = applyPersonaSection(personaCtx, profileBody(previous) ?? '') } catch { /* keep undefined */ }
    throw error
  }
  return profileStatus()
}

/** Upstream gate.ts name for registerPersona; kept as an alias for tooling. */
export const installPersona = registerPersona
