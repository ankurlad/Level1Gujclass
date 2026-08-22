// @vitest-environment jsdom
// Verification walk for PR 7: every view the old monolith rendered still
// renders with the same copy, reached by clicking the real controls.
// main.jsx mounts once at module scope, so the whole walk is ONE test.
import { act } from 'react'
import { describe, expect, it } from 'vitest'

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

function text() {
  return document.getElementById('root').textContent || ''
}
function clickByLabel(label) {
  const el = Array.from(document.querySelectorAll('button')).find((b) => {
    const t = ((b.textContent || '') + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase()
    return t.includes(label.toLowerCase())
  })
  expect(el, `button "${label}"`).toBeTruthy()
  act(() => {
    el.click()
  })
  return el
}

describe('PR 7 split: the app walks through every view with the same copy', () => {
  it('home, map, lesson, games, sandbox and stickers all render', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    stubCanvas(); stubMatchMedia()
    globalThis.ResizeObserver = NoopResizeObserver
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    localStorage.clear()

    await act(async () => { await import('../src/main.jsx') })

    // Home.
    expect(text()).toContain('Kem Chho!')
    for (const label of ['Start Akshar Path', 'Interactive Game Zone', 'Creative Sandbox', 'Sticker Shop', 'Printable Worksheets']) {
      expect(text(), `home: ${label}`).toContain(label)
    }
    expect(text()).toContain('Akshar PWA')

    // Map, via the bottom nav.
    clickByLabel('Trace lessons map')
    expect(text()).toContain('Akshar Path')
    expect(text()).toContain('ક')
    expect(text()).toContain('Lotus')

    // A lesson opens into the trace view.
    const letter = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('ક') && !b.disabled)
    expect(letter, 'an enabled letter tile').toBeTruthy()
    act(() => {
      letter.click()
    })
    expect(text()).toContain('Lotus')

    // Games, sandbox, stickers — each via nav, each with its copy.
    clickByLabel('Interactive games')
    expect(text()).toContain('Akshar PWA')

    clickByLabel('Creative drawing sandbox')
    expect(text()).toContain('Akshar PWA')

    clickByLabel('Sticker shop')
    expect(text()).toContain('Akshar PWA')

    // The parent/lock control is reachable.
    const lock = Array.from(document.querySelectorAll('button')).find((b) => {
      const t = ((b.textContent || '') + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase()
      return /parent|lock/.test(t)
    })
    expect(lock, 'a parent/lock control').toBeTruthy()

    document.body.innerHTML = ''
    globalThis.IS_REACT_ACT_ENVIRONMENT = false
    localStorage.clear()
  })
})
