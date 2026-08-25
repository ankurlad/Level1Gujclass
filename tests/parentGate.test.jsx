// @vitest-environment jsdom
import { webcrypto } from 'node:crypto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App.jsx'
import { SETUP_SUCCESS_MS } from '../src/components/ParentGate.jsx'
import { createPinRecord, verifyPin } from '../src/lib/parentPin.js'

// PR 11: the passcode is set through the UI, twice, or not at all — and it is
// changed and removed only by someone who can produce the current one. These
// drive the real app: mount App, click the header's parent button, type into
// the real fields. The store is a context + reducer, so there is no other
// honest way in.
//
// jsdom gives us crypto.getRandomValues but not crypto.subtle, and parentPin.js
// refuses to hash without it; Node's Web Crypto is the same SubtleCrypto a
// browser hands us in a secure context.

const PIN_KEY = 'guj:parent_pin_hash'

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

function text() {
  return container.textContent || ''
}

function buttons() {
  return [...container.querySelectorAll('button')]
}

// Exact label first: "Remove" is a step button sitting under "Remove
// passcode", and a substring match would find the wrong one.
function findButton(label) {
  const wanted = label.toLowerCase()
  const all = buttons()
  return all.find((b) => (b.textContent || '').trim().toLowerCase() === wanted)
    ?? all.find((b) => `${b.textContent || ''} ${b.getAttribute('aria-label') || ''}`.toLowerCase().includes(wanted))
    ?? null
}

const SETTLE_TICK_MS = 25
const WAIT_TIMEOUT_MS = 1500

// One real timer turn, drained inside act() so React applies everything the
// awaited work queued: microtasks first, then the macrotask, then effects.
async function tick(ms = SETTLE_TICK_MS) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
}

// The handlers behind these buttons are async — they await WebCrypto's
// subtle.digest before they set any state — so the alert, the stored record
// and the next step land an unknown number of turns after the click: one or
// two on a quiet desktop, more on a loaded CI runner. Counting turns is
// guesswork; poll the rendered state instead and stop as soon as it is true.
async function waitFor(predicate, description, timeoutMs = WAIT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = predicate()
    if (value) return value
    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out after ${timeoutMs}ms waiting for ${description}.\n`
        + `  alerts: ${JSON.stringify(alerts())}\n`
        + `  stored: ${JSON.stringify(storedRecord())}`
      )
    }
    await tick()
  }
}

const waitForAlert = (needle) =>
  waitFor(() => alerts().join(' ').includes(needle), `an alert containing "${needle}"`)

const waitForText = (needle) =>
  waitFor(() => text().includes(needle), `"${needle}" on screen`)

const waitForStored = (check, description) =>
  waitFor(() => check(storedRecord()), description)

const waitForButton = (label) =>
  waitFor(() => findButton(label), `button "${label}"`)

const waitForField = (label) =>
  waitFor(() => findField(label), `field "${label}"`)

// Two real timer turns after the click, which is enough for the handlers that
// resolve promptly; anything that depends on the async part having finished
// waits on the state it cares about, not on this.
async function settle() {
  await tick()
  await tick()
}

async function click(label) {
  const el = await waitForButton(label)
  await act(async () => el.click())
  await settle()
}

// React installs its own value setter on the input, so assigning `.value`
// directly is invisible to it. Go through the prototype's setter and fire the
// input event the way a keystroke would.
function fill(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  return input
}

// A step's fields only exist once the step before it has been proved, and
// that proof is async — so wait for the field rather than assume it is there.
async function type(field, value) {
  return fill(await waitForField(field), value)
}

// The fields are wrapped in their <label>, so the label's own text is what
// names them — no ids to keep in sync.
function findField(label) {
  const wanted = label.toLowerCase()
  const labels = [...container.querySelectorAll('label')]
  const found = labels.find((l) => (l.textContent || '').trim().toLowerCase() === wanted)
    ?? labels.find((l) => (l.textContent || '').toLowerCase().includes(wanted))
  return found?.querySelector('input') ?? null
}

function fieldByLabel(label) {
  const input = findField(label)
  expect(input, `field "${label}"`).toBeTruthy()
  return input
}

// The gate's single PIN field is the one input with no label around it.
function typeGatePin(value) {
  const input = container.querySelector('input[placeholder="Enter PIN"]')
  expect(input, 'the gate PIN field').toBeTruthy()
  return fill(input, value)
}

function alerts() {
  return [...container.querySelectorAll('[role="alert"]')].map((el) => el.textContent)
}

function storedRecord() {
  const raw = localStorage.getItem(PIN_KEY)
  return raw === null ? null : JSON.parse(raw)
}

beforeEach(() => {
  document.body.innerHTML = ''
  stubCanvas()
  stubMatchMedia()
  globalThis.ResizeObserver = NoopResizeObserver
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('crypto', webcrypto)
  localStorage.clear()
  // The gate defaults to the math challenge; every test here is about the PIN.
  localStorage.setItem('guj:gate_type', JSON.stringify('pin'))
})

afterEach(async () => {
  if (root) await act(async () => root.unmount())
  root = null
  container = null
  document.body.innerHTML = ''
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('the gate on its first run', () => {
  it('stores the passcode and opens once both fields agree', async () => {
    await mountApp()
    await click('Parent Settings')

    expect(text()).toContain('Choose a 4-digit passcode')
    expect(storedRecord()).toBeNull()

    await type('New passcode', '4821')
    await type('Confirm passcode', '4821')
    await click('Verify')

    // Stored the moment it is confirmed, and it is a digest, not the passcode.
    await waitForStored((r) => r !== null, 'the passcode record to be written')
    const record = storedRecord()
    expect(record).not.toBeNull()
    expect(await verifyPin('4821', record)).toBe(true)
    expect(JSON.stringify(record)).not.toContain('4821')

    // The parent is told a passcode now exists before the modal goes.
    await waitForAlert('now protects the parents')
    expect(alerts().join(' ')).toContain('now protects the parents')
    expect(text()).toContain('Parents Section')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, SETUP_SUCCESS_MS + 50))
    })

    // ...and then the gate opens onto the dashboard, as it always did.
    expect(text()).not.toContain('Parents Section')
    expect(text()).toContain('Parents Room')
  })

  it('stores nothing when the two entries disagree', async () => {
    await mountApp()
    await click('Parent Settings')

    await type('New passcode', '4821')
    await type('Confirm passcode', '4822')
    await click('Verify')

    await waitForAlert('do not match')
    expect(storedRecord()).toBeNull()
    expect(alerts().join(' ')).toContain('do not match')
    // Still on the gate, both fields cleared, focus back where the retype
    // starts.
    expect(text()).toContain('Parents Section')
    expect(text()).not.toContain('Parents Room')
    expect(fieldByLabel('New passcode').value).toBe('')
    expect(fieldByLabel('Confirm passcode').value).toBe('')
    expect(document.activeElement).toBe(fieldByLabel('New passcode'))
  })

  it('stores nothing for a short entry, however consistently it is typed', async () => {
    await mountApp()
    await click('Parent Settings')

    await type('New passcode', '482')
    await type('Confirm passcode', '482')
    await click('Verify')

    await waitForAlert('exactly 4 digits')
    expect(storedRecord()).toBeNull()
    expect(alerts().join(' ')).toContain('exactly 4 digits')
  })
})

describe('changing the passcode from the dashboard', () => {
  // Every test below starts inside the dashboard, which is only reachable by
  // passing the gate with the passcode that is already stored.
  async function enterDashboard(pin = '4821') {
    localStorage.setItem(PIN_KEY, JSON.stringify(await createPinRecord(pin)))
    await mountApp()
    await click('Parent Settings')
    typeGatePin(pin)
    await click('Verify')
    // verifyPin is a digest away, so the room arrives when it arrives.
    await waitForText('Parents Room')
    expect(text()).toContain('Parents Room')
  }

  it('rejects a wrong current passcode and stores nothing', async () => {
    await enterDashboard('4821')

    const before = storedRecord()

    await click('Change passcode')
    await type('Enter the current passcode', '9999')
    await click('Continue')

    await waitForAlert('not the current passcode')
    expect(alerts().join(' ')).toContain('not the current passcode')
    expect(storedRecord()).toEqual(before)
    // The new-passcode fields are not reachable without the current one.
    expect(text()).not.toContain('Confirm new passcode')
    expect(await verifyPin('4821', storedRecord())).toBe(true)
  })

  it('stores a new record once the current passcode checks out', async () => {
    await enterDashboard('4821')
    const before = storedRecord()

    await click('Change passcode')
    await type('Enter the current passcode', '4821')
    await click('Continue')

    // Step two exists only once step one's digest has come back.
    await type('New passcode', '1357')
    await type('Confirm new passcode', '1357')
    await click('Save passcode')

    await waitForStored(
      (r) => JSON.stringify(r) !== JSON.stringify(before),
      'the stored record to be replaced'
    )
    const after = storedRecord()
    expect(after).not.toEqual(before)
    expect(await verifyPin('1357', after)).toBe(true)
    expect(await verifyPin('4821', after)).toBe(false)
    await waitForAlert('Passcode saved')
    expect(alerts().join(' ')).toContain('Passcode saved')
  })

  it('removes the record only after the current passcode is proved', async () => {
    await enterDashboard('4821')

    await click('Remove passcode')
    await type('Enter the current passcode to remove it', '0000')
    await click('Remove')

    // A wrong entry deletes nothing — remove is management, not a way past
    // the gate.
    await waitForAlert('not the current passcode')
    expect(storedRecord()).not.toBeNull()
    expect(alerts().join(' ')).toContain('not the current passcode')

    await type('Enter the current passcode to remove it', '4821')
    await click('Remove')

    await waitForStored((r) => r === null, 'the stored record to be removed')
    await waitForAlert('Passcode removed')
    expect(storedRecord()).toBeNull()
    expect(text()).toContain('Not set yet')
    expect(alerts().join(' ')).toContain('Passcode removed')
  })
})
