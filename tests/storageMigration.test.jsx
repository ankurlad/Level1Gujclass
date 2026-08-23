// @vitest-environment jsdom
import { webcrypto } from 'node:crypto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyPin } from '../src/lib/parentPin.js'

// The whole point of the PR in one test: an install that was last written by
// the pre-namespace build must come back with the same settings, under the new
// keys, with nothing left behind and no cleartext passcode.

// jsdom has no canvas backend, no ResizeObserver, no matchMedia and no
// crypto.subtle; App.jsx reaches for all four on its first render. Same stubs
// as smoke.test.jsx.
function stubBrowser() {
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
  HTMLCanvasElement.prototype.getContext = () =>
    new Proxy(context, {
      get: (target, prop) => (typeof prop === 'symbol' ? undefined : (target[prop] ?? noop)),
      set: () => true,
    })
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,'
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.matchMedia = (media) => ({
    media,
    matches: false,
    onchange: null,
    addEventListener: noop,
    removeEventListener: noop,
    addListener: noop,
    removeListener: noop,
    dispatchEvent: () => false,
  })
  vi.stubGlobal('crypto', webcrypto)
}

// Exactly what a v0 install looked like: some values JSON, some bare strings,
// the passcode in cleartext.
//
// The sticker ids are the catalogue's own (src/lib/stickers.js). They have to
// be: since PR 12 the unlocked list is checked against the catalogue on every
// read, because an id it does not contain is a sticker no view can draw — the
// dashboard counted it and then rendered nothing.
const V0_STORE = {
  guj_points: '250',
  guj_progress: '{"tracedCount":12,"quizScore":4,"completedLessons":["ka","kha"]}',
  guj_stickers: '["st1","st6"]',
  guj_brush_color: '#4f46e5',
  guj_brush_width: '24',
  guj_sound_enabled: 'false',
  guj_editor_mode: 'true',
  guj_install_dismissed: 'true',
  guj_gate_type: 'pin',
  guj_parent_pin: '4821',
  guj_parent_unlock_all: 'true',
  guj_custom_waypoints_ka: '[{"x":100,"y":100,"label":"1"},{"x":200,"y":200,"label":"2"}]',
}

async function mountApp() {
  const { default: App } = await import('../src/App.jsx')
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(<App />))
  return () => act(() => root.unmount())
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  stubBrowser()
  for (const [key, value] of Object.entries(V0_STORE)) localStorage.setItem(key, value)
})

afterEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
  vi.unstubAllGlobals()
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('v0 -> v1 storage migration, end to end', () => {
  it('rewrites every key under the guj: namespace and drops the old ones', async () => {
    const unmount = await mountApp()

    expect(localStorage.getItem('guj:version')).toBe('3')
    // The three per-child values land under the implicit first child (PR 13b);
    // tests/childProfiles.test.jsx is where that hop is pinned down in full.
    expect(localStorage.getItem('guj:child:c1:points')).toBe('250')
    expect(localStorage.getItem('guj:child:c1:progress')).toBe(V0_STORE.guj_progress)
    expect(localStorage.getItem('guj:child:c1:stickers')).toBe('["st1","st6"]')
    // And the device-wide keys they used to sit beside are still device-wide.
    expect(localStorage.getItem('guj:points')).toBeNull()
    expect(localStorage.getItem('guj:brush_color')).toBe('"#4f46e5"')
    expect(localStorage.getItem('guj:brush_width')).toBe('24')
    expect(localStorage.getItem('guj:sound_enabled')).toBe('false')
    expect(localStorage.getItem('guj:editor_mode')).toBe('true')
    expect(localStorage.getItem('guj:install_dismissed')).toBe('true')
    expect(localStorage.getItem('guj:gate_type')).toBe('"pin"')
    expect(localStorage.getItem('guj:parent_unlock_all')).toBe('true')
    // Two hops in one mount: the override is adopted under the namespaced key
    // and its pixel coordinates are converted to the 0-100 path space.
    expect(JSON.parse(localStorage.getItem('guj:custom_waypoints_ka'))).toEqual([
      { x: 26.32, y: 31.25, label: '1' },
      { x: 52.63, y: 62.5, label: '2' },
    ])

    for (const key of Object.keys(V0_STORE)) {
      expect(localStorage.getItem(key), key).toBeNull()
    }

    unmount()
  })

  it('replaces the cleartext passcode with a salted digest that still verifies', async () => {
    const unmount = await mountApp()

    expect(localStorage.getItem('guj_parent_pin')).toBeNull()

    const record = JSON.parse(localStorage.getItem('guj:parent_pin_hash'))
    expect(record.algorithm).toBe('SHA-256')
    expect(record.salt).toMatch(/^[0-9a-f]{32}$/)
    // The passcode the parent set before the update still opens the gate.
    expect(await verifyPin('4821', record)).toBe(true)
    expect(await verifyPin('1234', record)).toBe(false)
    // And it is nowhere in the store.
    const dump = Object.keys(localStorage).map((k) => localStorage.getItem(k)).join('|')
    expect(dump).not.toContain('4821')

    unmount()
  })

  it('ships no default passcode on a fresh install', async () => {
    localStorage.clear()
    const unmount = await mountApp()

    expect(localStorage.getItem('guj:parent_pin_hash')).toBe('null')
    const dump = Object.keys(localStorage).map((k) => localStorage.getItem(k)).join('|')
    expect(dump).not.toContain('1234')

    unmount()
  })
})

// A v1 install is already namespaced; the only thing that moved in v2 is what a
// waypoint coordinate means. ક here is the shipped letter's first two points as
// they were stored in pixels.
describe('v1 -> v2 waypoint coordinate migration, end to end', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('guj:version', '1')
    localStorage.setItem('guj:points', '250')
  })

  it('converts a pixel override to path space and restamps the version', async () => {
    localStorage.setItem(
      'guj:custom_waypoints_ka',
      JSON.stringify([
        { x: 201, y: 87, label: '1' },
        { x: 235, y: 137, label: '2', moveTo: true },
      ]),
    )
    const unmount = await mountApp()

    expect(localStorage.getItem('guj:version')).toBe('3')
    expect(JSON.parse(localStorage.getItem('guj:custom_waypoints_ka'))).toEqual([
      { x: 52.89, y: 27.19, label: '1' },
      { x: 61.84, y: 42.81, label: '2', moveTo: true },
    ])

    unmount()
  })

  it('leaves an override that is already path space untouched', async () => {
    const v2 = [
      { x: 52.89, y: 27.19, label: '1' },
      { x: 61.84, y: 42.81, label: '2', moveTo: true },
    ]
    localStorage.setItem('guj:custom_waypoints_ka', JSON.stringify(v2))
    const unmount = await mountApp()

    expect(JSON.parse(localStorage.getItem('guj:custom_waypoints_ka'))).toEqual(v2)

    unmount()
  })

  it('converts each customised letter independently', async () => {
    localStorage.setItem('guj:custom_waypoints_ka', JSON.stringify([{ x: 190, y: 160, label: '1' }]))
    localStorage.setItem('guj:custom_waypoints_ma', JSON.stringify([{ x: 50, y: 40, label: '1' }]))
    const unmount = await mountApp()

    expect(JSON.parse(localStorage.getItem('guj:custom_waypoints_ka'))).toEqual([
      { x: 50, y: 50, label: '1' },
    ])
    // Nothing past 100, so this one is read as path space and left alone —
    // the documented blind spot of shape-based detection, and unreachable for
    // a real letterform (the guide glyph is set at 220px).
    expect(JSON.parse(localStorage.getItem('guj:custom_waypoints_ma'))).toEqual([
      { x: 50, y: 40, label: '1' },
    ])

    unmount()
  })
})
