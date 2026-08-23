// @vitest-environment jsdom
import { webcrypto } from 'node:crypto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App.jsx'
import { createPinRecord, verifyPin } from '../src/lib/parentPin.js'

// PR 13b: one device, more than one child.
//
// These drive the real app the way tests/verifySplit.walk.test.jsx and
// tests/parentGate.test.jsx do — mount App, click the real controls, type into
// the real fields — because the profile split is a storage change whose whole
// point is what the child on screen sees. The store is a context, so there is
// no other honest way in.
//
// Same jsdom stubs as tests/smoke.test.jsx, plus Node's Web Crypto: jsdom has
// getRandomValues but not crypto.subtle, and both the passcode and the child id
// reach for it.

function stubCanvas() {
  const noop = () => {}
  const context = {
    measureText: () => ({ width: 0 }),
    getImageData: (_x, _y, w, h) => ({
      data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4),
      width: w,
      height: h,
    }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    getLineDash: () => [],
  }
  const ctx = new Proxy(context, {
    get: (target, prop) => (typeof prop === 'symbol' ? undefined : (target[prop] ?? noop)),
    set: () => true,
  })
  HTMLCanvasElement.prototype.getContext = () => ctx
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,'
}

class NoopResizeObserver { observe() {} unobserve() {} disconnect() {} }

function stubMatchMedia() {
  window.matchMedia = (media) => ({
    media,
    matches: false,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

let root = null
let container = null

async function mountApp() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root.render(<App />))
}

async function unmountApp() {
  if (root) await act(async () => root.unmount())
  root = null
  container = null
  document.body.innerHTML = ''
}

const text = () => container.textContent || ''

function button(label) {
  const wanted = label.toLowerCase()
  const all = [...container.querySelectorAll('button')]
  const found = all.find((b) => (b.textContent || '').trim().toLowerCase() === wanted)
    ?? all.find((b) => (b.getAttribute('aria-label') || '').toLowerCase() === wanted)
    ?? all.find((b) => `${b.textContent || ''} ${b.getAttribute('aria-label') || ''}`.toLowerCase().includes(wanted))
  expect(found, `button "${label}"`).toBeTruthy()
  return found
}

// Hashing is a real async job; let the queue drain before asserting.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function click(label) {
  const el = button(label)
  await act(async () => el.click())
  await settle()
}

// The Children panel's Reset and the Danger Zone button at the foot of the page
// both name the same child, so the panel row is addressed by its exact
// aria-label rather than by any substring.
async function clickLabelled(ariaLabel) {
  const found = [...container.querySelectorAll('button')]
    .find((b) => b.getAttribute('aria-label') === ariaLabel)
  expect(found, `button labelled "${ariaLabel}"`).toBeTruthy()
  await act(async () => found.click())
  await settle()
}

// React installs its own value setter on the input, so assigning `.value` is
// invisible to it. Go through the prototype setter and fire the input event.
function fill(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  return input
}

function fieldByLabel(label) {
  const wanted = label.toLowerCase()
  const labels = [...container.querySelectorAll('label')]
  const found = labels.find((l) => (l.textContent || '').trim().toLowerCase() === wanted)
    ?? labels.find((l) => (l.textContent || '').toLowerCase().includes(wanted))
  expect(found, `field "${label}"`).toBeTruthy()
  const input = found.querySelector('input')
  expect(input, `input under "${label}"`).toBeTruthy()
  return input
}

const alerts = () => [...container.querySelectorAll('[role="alert"]')].map((el) => el.textContent).join(' ')

const read = (key) => localStorage.getItem(key)
const readJson = (key) => {
  const raw = read(key)
  return raw === null ? null : JSON.parse(raw)
}

// Every key in the store, as one comparable object.
function dump() {
  return Object.fromEntries(
    Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)])
  )
}

// Exactly what a pre-13b install looked like: every value device-wide. The
// three child-scoped ones carry values a child earned, and the rest are the
// device settings that must not move.
const LEGACY_STORE = {
  'guj:version': '2',
  'guj:points': '250',
  'guj:progress': '{"tracedCount":12,"quizScore":4,"completedLessons":["ka","kha"]}',
  'guj:stickers': '["st1","st6"]',
  'guj:brush_color': '"#4f46e5"',
  'guj:brush_width': '24',
  'guj:sound_enabled': 'false',
  'guj:editor_mode': 'true',
  'guj:install_dismissed': 'true',
  'guj:gate_type': '"math"',
  'guj:parent_unlock_all': 'true',
  'guj:custom_waypoints_ka': '[{"x":26.32,"y":31.25,"label":"1"},{"x":52.63,"y":62.5,"label":"2"}]',
}

const seed = (store) => {
  for (const [key, value] of Object.entries(store)) localStorage.setItem(key, value)
}

beforeEach(() => {
  document.body.innerHTML = ''
  stubCanvas()
  stubMatchMedia()
  globalThis.ResizeObserver = NoopResizeObserver
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('crypto', webcrypto)
  localStorage.clear()
})

afterEach(async () => {
  await unmountApp()
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('the legacy global store becomes one child', () => {
  it('moves what a child earned and leaves what the device owns', async () => {
    seed(LEGACY_STORE)
    await mountApp()

    // One implicit child, and it is the active one.
    const children = readJson('guj:children')
    expect(children).toHaveLength(1)
    expect(children[0].id).toBe('c1')
    expect(children[0].name).toBe('Child 1')
    expect(readJson('guj:active_child')).toBe('c1')

    // Lossless: every value arrives under the child, byte for byte.
    expect(read('guj:child:c1:points')).toBe('250')
    expect(readJson('guj:child:c1:progress')).toEqual({
      tracedCount: 12,
      quizScore: 4,
      completedLessons: ['ka', 'kha'],
    })
    expect(readJson('guj:child:c1:stickers')).toEqual(['st1', 'st6'])

    // ...and the keys they came from are gone, so nothing can read them back.
    expect(read('guj:points')).toBeNull()
    expect(read('guj:progress')).toBeNull()
    expect(read('guj:stickers')).toBeNull()

    // The device keys did not move: one gate, one set of preferences, one
    // corrected letterform for every child.
    expect(read('guj:brush_color')).toBe(LEGACY_STORE['guj:brush_color'])
    expect(read('guj:brush_width')).toBe('24')
    expect(read('guj:sound_enabled')).toBe('false')
    expect(read('guj:editor_mode')).toBe('true')
    expect(read('guj:install_dismissed')).toBe('true')
    expect(read('guj:gate_type')).toBe('"math"')
    expect(read('guj:parent_unlock_all')).toBe('true')
    expect(read('guj:custom_waypoints_ka')).toBe(LEGACY_STORE['guj:custom_waypoints_ka'])
    expect(read('guj:version')).toBe('3')

    // And the child sees the points they earned.
    expect(text()).toContain('250 Pts')
  })

  it('is a no-op the second time it runs', async () => {
    seed(LEGACY_STORE)
    await mountApp()
    const afterFirstRun = dump()
    await unmountApp()

    // A second boot on the store the first one produced.
    await mountApp()

    expect(dump()).toEqual(afterFirstRun)
    expect(text()).toContain('250 Pts')
  })

  it('adopts a v0 un-namespaced store in the same boot', async () => {
    // Two hops at once: `guj_points` is adopted as `guj:points` by the v0 path
    // and then moved under the child, with v0's parse-or-string rule applied
    // exactly once.
    localStorage.setItem('guj_points', '250')
    localStorage.setItem('guj_stickers', '["st1"]')

    await mountApp()

    expect(read('guj:child:c1:points')).toBe('250')
    expect(readJson('guj:child:c1:stickers')).toEqual(['st1'])
    expect(read('guj_points')).toBeNull()
    expect(read('guj:points')).toBeNull()
    expect(text()).toContain('250 Pts')
  })

  it('creates the first child on a fresh install and moves nothing', async () => {
    await mountApp()

    expect(readJson('guj:children')).toHaveLength(1)
    expect(readJson('guj:active_child')).toBe('c1')
    expect(read('guj:child:c1:points')).toBe('0')
    expect(text()).toContain('0 Pts')
  })
})

describe('two children on one device', () => {
  it('hold independent points, stickers and progress', async () => {
    seed(LEGACY_STORE)
    await mountApp()

    // Add the second child through the switcher in the header.
    await click('switch child')
    await click('New child')
    fill(fieldByLabel("New child's name"), 'Meera')
    await click('Add child')

    const children = readJson('guj:children')
    expect(children.map((child) => child.name)).toEqual(['Child 1', 'Meera'])
    const meera = children[1].id
    expect(meera).not.toBe('c1')

    // Adding a child switches to them, and they start from nothing — the
    // migrated ledger did not follow the key change.
    expect(readJson('guj:active_child')).toBe(meera)
    expect(text()).toContain('0 Pts')
    expect(read(`guj:child:${meera}:points`)).toBe('0')
    expect(readJson(`guj:child:${meera}:stickers`)).toEqual([])
    expect(readJson(`guj:child:${meera}:progress`)).toEqual({
      tracedCount: 0,
      quizScore: 0,
      completedLessons: [],
    })

    // And the first child's are untouched by the visit.
    expect(read('guj:child:c1:points')).toBe('250')
    expect(readJson('guj:child:c1:stickers')).toEqual(['st1', 'st6'])

    // The parents' room reads whoever is playing. Meera has traced nothing...
    expect(text()).toContain('Meera')

    // ...and switching back brings the other ledger straight back.
    await click('switch child')
    await click('Child 1')
    expect(text()).toContain('250 Pts')
    expect(readJson('guj:active_child')).toBe('c1')

    // Still two children, still two separate ledgers.
    expect(read(`guj:child:${meera}:points`)).toBe('0')
    expect(read('guj:child:c1:points')).toBe('250')
  })

  it('refuses a second child with the same name, and says why', async () => {
    await mountApp()

    await click('switch child')
    await click('New child')
    fill(fieldByLabel("New child's name"), 'child 1')
    await click('Add child')

    expect(alerts()).toContain('already a child 1')
    expect(readJson('guj:children')).toHaveLength(1)
  })
})

describe('switching child and the parent gate', () => {
  it('leaves the passcode alone and the gate shut', async () => {
    const record = await createPinRecord('4821')
    seed({
      ...LEGACY_STORE,
      'guj:gate_type': '"pin"',
      'guj:parent_pin_hash': JSON.stringify(record),
    })

    await mountApp()

    await click('switch child')
    await click('New child')
    fill(fieldByLabel("New child's name"), 'Meera')
    await click('Add child')

    await click('switch child')
    await click('Child 1')

    // The digest is a device key: not moved under a child, not rewritten, not
    // cleared. The passcode the parent set still opens the gate.
    expect(readJson('guj:parent_pin_hash')).toEqual(record)
    expect(read('guj:child:c1:parent_pin_hash')).toBeNull()
    expect(await verifyPin('4821', readJson('guj:parent_pin_hash'))).toBe(true)

    // And switching is not a way in: the parents' room still challenges.
    await click('Parent Settings')
    expect(text()).toContain('Parents Section')
    expect(text()).not.toContain('Parents Room')
    expect(container.querySelector('input[placeholder="Enter PIN"]')).toBeTruthy()
  })
})

describe('the per-child reset in the parents’ room', () => {
  // Two children with something to lose, a passcode on the device, and the PIN
  // gate so the test can walk in the way a parent does.
  const TWO_CHILDREN = [
    { id: 'c1', name: 'Child 1', avatar: '🦚', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'c2', name: 'Meera', avatar: '🐘', createdAt: '2026-02-01T00:00:00.000Z' },
  ]

  const seedTwoChildren = async () => {
    const record = await createPinRecord('4821')
    seed({
      'guj:version': '3',
      'guj:gate_type': '"pin"',
      'guj:parent_pin_hash': JSON.stringify(record),
      'guj:children': JSON.stringify(TWO_CHILDREN),
      'guj:active_child': '"c1"',
      'guj:child:c1:points': '250',
      'guj:child:c1:stickers': '["st1","st6"]',
      'guj:child:c1:progress': '{"tracedCount":12,"quizScore":4,"completedLessons":["ka","kha"]}',
      'guj:child:c2:points': '80',
      'guj:child:c2:stickers': '["st1"]',
      'guj:child:c2:progress': '{"tracedCount":3,"quizScore":1,"completedLessons":["ka"]}',
    })
    return record
  }

  const enterDashboard = async () => {
    await click('Parent Settings')
    fill(container.querySelector('input[placeholder="Enter PIN"]'), '4821')
    await click('Verify')
    expect(text()).toContain('Parents Room')
  }

  it('clears one child and nothing else', async () => {
    const record = await seedTwoChildren()
    await mountApp()
    await enterDashboard()

    // Meera is not the child on screen; the panel is the only way to reach her.
    await clickLabelled("Reset Meera's progress")

    // The wrong passcode refuses, by name, and destroys nothing.
    fill(fieldByLabel('Enter the passcode to reset Meera'), '1111')
    await click('Reset progress')
    expect(alerts()).toContain("Meera's progress is untouched")
    expect(read('guj:child:c2:points')).toBe('80')

    // The right one goes through.
    fill(fieldByLabel('Enter the passcode to reset Meera'), '4821')
    await click('Reset progress')
    expect(alerts()).toContain('Meera is back to 0 points')

    // Meera's three keys are gone, which is what a child who has earned
    // nothing reads as.
    expect(read('guj:child:c2:points')).toBeNull()
    expect(read('guj:child:c2:stickers')).toBeNull()
    expect(read('guj:child:c2:progress')).toBeNull()

    // Nothing else moved: not the other child, not the passcode, not the gate.
    expect(read('guj:child:c1:points')).toBe('250')
    expect(readJson('guj:child:c1:stickers')).toEqual(['st1', 'st6'])
    expect(readJson('guj:child:c1:progress').completedLessons).toEqual(['ka', 'kha'])
    expect(readJson('guj:parent_pin_hash')).toEqual(record)
    expect(read('guj:gate_type')).toBe('"pin"')
    expect(readJson('guj:children')).toEqual(TWO_CHILDREN)

    // The child on screen still has her points, and Meera reads as new.
    expect(text()).toContain('250 Pts')
  })

  it('clears the child on screen without touching the other', async () => {
    await seedTwoChildren()
    await mountApp()
    await enterDashboard()

    await clickLabelled("Reset Child 1's progress")
    fill(fieldByLabel('Enter the passcode to reset Child 1'), '4821')
    await click('Reset progress')

    // The active child's keys are rewritten rather than removed, because the
    // live state comes back to the defaults and the write effect persists them.
    expect(read('guj:child:c1:points')).toBe('0')
    expect(readJson('guj:child:c1:stickers')).toEqual([])
    expect(readJson('guj:child:c1:progress')).toEqual({
      tracedCount: 0,
      quizScore: 0,
      completedLessons: [],
    })
    expect(text()).toContain('0 Pts')

    // Meera kept everything.
    expect(read('guj:child:c2:points')).toBe('80')
    expect(readJson('guj:child:c2:stickers')).toEqual(['st1'])
    expect(readJson('guj:child:c2:progress').completedLessons).toEqual(['ka'])
  })
})
