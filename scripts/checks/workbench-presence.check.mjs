// Subject: the conversation.view workbench tab must not follow every flicker of
// a session's summary. On DSH 0.2.2 a released session leaves the session list
// for a moment and its `agentPreset` projection reads undefined; disposing the
// tab right then makes the host re-pick every session's view, which reopens the
// session and registers the tab again — a create/dispose loop the user sees as
// the session and its tabs flickering. The capsule now holds the tab and lets
// go only after a grace with no holder left. This check runs the real client
// bundle against a recording React, slot registry and clock.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'
import { repoRoot } from './artifacts.mjs'
import { createReporter } from './reporter.mjs'

const source = readFileSync(join(repoRoot, 'packages', 'helmd', 'client.js'), 'utf8')
const report = createReporter('workbench-presence')

/** A manual clock standing in for setTimeout / clearTimeout. */
function createClock() {
  let now = 0
  let seq = 0
  const timers = new Map()
  return {
    setTimeout: (fn, ms) => { const id = ++seq; timers.set(id, { at: now + ms, fn }); return id },
    clearTimeout: (id) => { timers.delete(id) },
    advance(ms) {
      now += ms
      for (const [id, timer] of [...timers].sort((a, b) => a[1].at - b[1].at)) {
        if (timer.at > now) continue
        timers.delete(id)
        timer.fn()
      }
    },
  }
}

/**
 * Mount one capsule instance and let the caller drive its preset. Refs live
 * per instance; effects re-run when the preset changes, the way React would.
 */
function mount(Capsule, React) {
  const refs = []
  let cleanup = null
  let lastPreset
  const render = (preset) => {
    let refIndex = 0
    let effectIndex = 0
    const effects = []
    const saved = { useRef: React.useRef, useEffect: React.useEffect }
    React.useRef = (initial) => { if (refs[refIndex] === undefined) refs[refIndex] = { current: initial }; return refs[refIndex++] }
    React.useEffect = (fn, deps) => { effects.push({ fn, deps, index: effectIndex++ }) }
    try {
      Capsule({ sessionId: 's1', useSessions: (select) => select({ byId: { s1: { projectionValues: preset === undefined ? {} : { agentPreset: preset } } } }) })
    } finally {
      React.useRef = saved.useRef
      React.useEffect = saved.useEffect
    }
    // The first effect is the preset-gated tab holder (deps: [preset]).
    if (preset !== lastPreset || cleanup === null) {
      if (typeof cleanup === 'function') cleanup()
      cleanup = effects[0].fn() ?? (() => {})
      lastPreset = preset
    }
  }
  return { render, unmount: () => { if (typeof cleanup === 'function') cleanup(); cleanup = null } }
}

/** The React object the bundle closes over; mount() swaps its hooks per render. */
let sharedReact

/** Load the real client bundle against recording fakes; return counters on the view tab. */
function boot() {
  const clock = createClock()
  const factories = new Map()
  sharedReact = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    Component: class {},
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useMemo: (fn) => fn(),
    useRef: (initial) => ({ current: initial }),
    useEffect: () => {},
  }
  const window = {
    __ModuleLoader__: {
      load: ({ id, factory }) => { factories.set(id, factory) },
      require: (id) => factories.get(id)?.((name) => (name === 'react' ? sharedReact : undefined)),
    },
  }
  vm.runInNewContext(source, { window, console, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout })
  const module = window.__ModuleLoader__.require('@adwmc/helm-d')
  const view = { registered: 0, disposed: 0 }
  let Capsule
  const unloads = []
  module.apply({
    slots: {
      register(options, component) {
        if (options.name === 'conversation.session.header.actions') Capsule = component
        if (options.name === 'conversation.view') view.registered += 1
        return () => { if (options.name === 'conversation.view') view.disposed += 1 }
      },
      inject(_name, generator) {
        const disposers = [...generator()]
        return () => { for (const dispose of disposers.reverse()) dispose() }
      },
    },
    effect(fn) { unloads.push(fn()) },
  })
  assert.ok(Capsule, 'the header capsule must register')
  return {
    view,
    clock,
    mount: () => mount(Capsule, sharedReact),
    unload: () => { for (const fn of unloads) if (typeof fn === 'function') fn() },
  }
}

await report.check('a session that drops out of the list and comes back keeps its tab', () => {
  const { view, clock, mount: open } = boot()
  const capsule = open()
  capsule.render('helmd')
  assert.deepEqual(view, { registered: 1, disposed: 0 })
  // The released session leaves the list: its preset reads undefined...
  capsule.render(undefined)
  clock.advance(200)
  // ...and comes back before the grace runs out.
  capsule.render('helmd')
  clock.advance(5000)
  assert.deepEqual(view, { registered: 1, disposed: 0 }, 'the tab must not be disposed and registered again')
})

await report.check('the tab follows a capsule that remounts within the grace', () => {
  const { view, clock, mount: open } = boot()
  const first = open()
  first.render('helmd')
  first.unmount()
  const second = open()
  second.render('helmd')
  clock.advance(5000)
  assert.deepEqual(view, { registered: 1, disposed: 0 })
})

await report.check('the tab goes once no capsule has held it for the whole grace', () => {
  const { view, clock, mount: open } = boot()
  const capsule = open()
  capsule.render('helmd')
  capsule.render('other-preset')
  clock.advance(1000)
  assert.equal(view.disposed, 0, 'still inside the grace')
  clock.advance(1000)
  assert.deepEqual(view, { registered: 1, disposed: 1 })
})

await report.check('two helmd capsules share one tab, and it stays while either holds it', () => {
  const { view, clock, mount: open } = boot()
  const a = open()
  const b = open()
  a.render('helmd')
  b.render('helmd')
  a.unmount()
  clock.advance(5000)
  assert.deepEqual(view, { registered: 1, disposed: 0 }, 'no duplicate list entry, no early dispose')
  b.unmount()
  clock.advance(5000)
  assert.deepEqual(view, { registered: 1, disposed: 1 })
})

await report.check('plugin unload drops the tab without waiting for the grace', () => {
  const { view, mount: open, unload } = boot()
  const capsule = open()
  capsule.render('helmd')
  unload()
  assert.deepEqual(view, { registered: 1, disposed: 1 })
})

report.finish()
