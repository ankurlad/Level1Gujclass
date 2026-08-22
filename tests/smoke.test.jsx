// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// jsdom ships no canvas backend, no ResizeObserver and no matchMedia, all of
// which App.jsx reaches for on its first render. Stub the minimum so that a
// crash here means a real bug in the app rather than a missing browser API.
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
  // Every other drawing call is a no-op; style properties swallow writes.
  const ctx = new Proxy(context, {
    get: (target, prop) => (typeof prop === 'symbol' ? undefined : (target[prop] ?? noop)),
    set: () => true,
  })
  HTMLCanvasElement.prototype.getContext = () => ctx
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,'
}

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Never-matching media query: the app treats that as "running in a browser
// tab", which is the plain, uninstalled case.
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

describe('entry modules', () => {
  it('curriculum.js loads standalone', async () => {
    const mod = await import('../src/curriculum.js')
    expect(Array.isArray(mod.CURRICULUM)).toBe(true)
  })

  it('App.jsx loads and default-exports a component', async () => {
    const mod = await import('../src/App.jsx')
    expect(typeof mod.default).toBe('function')
  })
})

describe('app bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    stubCanvas()
    stubMatchMedia()
    globalThis.ResizeObserver = NoopResizeObserver
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    localStorage.clear()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    globalThis.IS_REACT_ACT_ENVIRONMENT = false
    localStorage.clear()
  })

  it('main.jsx mounts the app into #root without throwing', async () => {
    // Importing main.jsx is the real entry path: it pulls in index.css, calls
    // createRoot(#root) and renders <App /> for effect. If any module-level or
    // first-render code throws, this fails. act() covers the render that the
    // import schedules and flushes the mount effects with it.
    await act(async () => {
      await import('../src/main.jsx')
    })

    const root = document.getElementById('root')
    expect(root.childElementCount).toBeGreaterThan(0)
    // The first lesson's glyph should be on screen once the app has rendered.
    expect(root.textContent).toContain('ક')
  })
})
