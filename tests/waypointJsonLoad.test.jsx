// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App.jsx'

// PR 12, the paste path, driven through the real app: switch the editor on the
// way a parent does (the dashboard toggle writes guj:editor_mode), open a
// letter, type into the box and press the button.
//
// The two things being proved are the ones a unit test cannot: the reason a
// paste was refused reaches the screen, and the letter that was already there
// survives the refusal.

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
}

let container = null
let root = null

function text() {
  return container.textContent || ''
}

function click(match) {
  const element = [...container.querySelectorAll('button')].find((button) => {
    const label = `${button.textContent || ''} ${button.getAttribute('aria-label') || ''}`
    return label.toLowerCase().includes(match.toLowerCase())
  })
  expect(element, `button "${match}"`).toBeTruthy()
  act(() => element.click())
}

// React installs its own value setter on the element, so assigning .value
// directly leaves its change tracker thinking nothing happened. The prototype
// setter is what a real keystroke ends up calling.
function type(element, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value'
  ).set
  act(() => {
    nativeSetter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function pasteBox() {
  return container.querySelector('#waypoint-json-paste')
}

function liveJson() {
  return container.querySelector('textarea[readonly]').value
}

function notice() {
  return container.querySelector('[role="alert"]')?.textContent ?? ''
}

// Home -> the letter map -> ક, which is the first lesson and never locked.
function openTheFirstLetterInTheEditor() {
  click('Trace lessons map')
  const tile = [...container.querySelectorAll('button')].find(
    (button) => (button.textContent || '').includes('ક') && !button.disabled
  )
  expect(tile, 'the ક tile').toBeTruthy()
  act(() => tile.click())
  expect(text()).toContain('Waypoint Builder Tool')
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  localStorage.setItem('guj:editor_mode', 'true')
  stubBrowser()
  vi.spyOn(console, 'warn').mockImplementation(() => {})

  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root.render(<App />))
})

afterEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
  vi.restoreAllMocks()
  act(() => root?.unmount())
  localStorage.clear()
  document.body.innerHTML = ''
  root = null
  container = null
})

describe('loading waypoints from a pasted block', () => {
  it('refuses a bad entry by name and keeps the letter that was there', () => {
    openTheFirstLetterInTheEditor()
    const before = liveJson()
    expect(before).toContain('"label": "1"')

    type(pasteBox(), '[{"x":10,"y":10,"label":"1"},{"x":4000,"y":20,"label":"2"}]')
    click('Load JSON')

    expect(notice()).toContain('index 1')
    expect(notice()).toContain('4000')
    // Nothing was applied, and the paste is still there to be corrected.
    expect(liveJson()).toBe(before)
    expect(pasteBox().value).toContain('4000')
  })

  it('says which entry, for each kind of malformed entry', () => {
    openTheFirstLetterInTheEditor()
    const before = liveJson()

    for (const [paste, expected] of [
      ['not json at all', 'not valid JSON'],
      ['{"x":1,"y":1}', 'must be a JSON array'],
      ['[{"x":1,"y":1,"label":"1"}]', 'at least 2'],
      ['[{"x":1,"y":1},{"y":2}]', 'x must be a finite number'],
      ['[{"x":1,"y":1},{"x":2,"y":2,"label":"two"}]', 'label'],
      ['[{"x":1,"y":1},{"x":2,"y":2,"moveTo":"yes"}]', 'moveTo'],
    ]) {
      type(pasteBox(), paste)
      click('Load JSON')
      expect(notice(), paste).toContain(expected)
      expect(liveJson(), paste).toBe(before)
    }
  })

  it('accepts a valid path-space block and puts it on the letter', () => {
    openTheFirstLetterInTheEditor()

    type(
      pasteBox(),
      '[{"x":10,"y":20,"label":"1"},{"x":30,"y":40,"label":"2","moveTo":true}]'
    )
    click('Load JSON')

    expect(notice()).toContain('Loaded 2 points')
    expect(notice()).not.toContain('Converted')
    expect(JSON.parse(liveJson())).toEqual([
      { x: 10, y: 20, label: '1' },
      { x: 30, y: 40, label: '2', moveTo: true },
    ])
  })

  // The one the PR exists for: a stale export is not out of range, it is the
  // pre-v2 pixel format, and clamping it would import a crushed letterform.
  it('accepts a block in the old 0-380 pixel format and converts it', () => {
    openTheFirstLetterInTheEditor()

    type(
      pasteBox(),
      '[{"x":201,"y":87,"label":"1"},{"x":235,"y":137,"label":"2","moveTo":true}]'
    )
    click('Load JSON')

    expect(notice()).toContain('Loaded 2 points')
    expect(notice()).toContain('Converted from the older pixel format')
    expect(JSON.parse(liveJson())).toEqual([
      { x: 52.89, y: 27.19, label: '1' },
      { x: 61.84, y: 42.81, label: '2', moveTo: true },
    ])
  })

  it('loads for the session only — the device keeps what was saved', () => {
    openTheFirstLetterInTheEditor()

    type(pasteBox(), '[{"x":10,"y":20,"label":"1"},{"x":30,"y":40,"label":"2"}]')
    click('Load JSON')
    expect(localStorage.getItem('guj:custom_waypoints_ka')).toBeNull()

    click('Save Waypoints')
    expect(JSON.parse(localStorage.getItem('guj:custom_waypoints_ka'))).toEqual([
      { x: 10, y: 20, label: '1' },
      { x: 30, y: 40, label: '2' },
    ])
  })
})
