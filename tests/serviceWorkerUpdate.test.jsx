// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useServiceWorkerUpdate } from '../src/hooks/useServiceWorkerUpdate.js'

// The three service worker objects the hook touches, small enough to drive by
// hand: a worker that records what it was posted, a registration that can be
// told a new worker turned up, and the container that owns both.
function makeWorker(state = 'installing') {
  const listeners = {}
  return {
    state,
    posted: [],
    postMessage(message) {
      this.posted.push(message)
    },
    addEventListener(type, fn) {
      ;(listeners[type] = listeners[type] || []).push(fn)
    },
    removeEventListener() {},
    // Move the worker along and tell anyone who asked.
    settle(next) {
      this.state = next
      ;(listeners.statechange || []).forEach((fn) => fn())
    },
  }
}

function makeEnvironment({ controller = {}, waiting = null } = {}) {
  const regListeners = {}
  const containerListeners = {}

  const registration = {
    installing: null,
    waiting,
    update: vi.fn(() => Promise.resolve()),
    addEventListener(type, fn) {
      ;(regListeners[type] = regListeners[type] || []).push(fn)
    },
    removeEventListener() {},
    // What the browser does when it finds a new sw.js on the server.
    findUpdate(worker) {
      this.installing = worker
      ;(regListeners.updatefound || []).forEach((fn) => fn())
      return worker
    },
  }

  const container = {
    controller,
    ready: Promise.resolve(registration),
    getRegistration: () => Promise.resolve(registration),
    addEventListener(type, fn) {
      ;(containerListeners[type] = containerListeners[type] || []).push(fn)
    },
    removeEventListener() {},
    fireControllerChange() {
      ;(containerListeners.controllerchange || []).forEach((fn) => fn())
    },
  }

  Object.defineProperty(navigator, 'serviceWorker', {
    value: container,
    configurable: true,
    writable: true,
  })
  return { container, registration }
}

// Mounts a component that does nothing but hold the hook, and hands back a
// handle to read what it is reporting.
function renderHook() {
  const handle = {}
  function Probe() {
    Object.assign(handle, useServiceWorkerUpdate())
    return null
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => root.render(<Probe />))
  handle.unmount = () => act(() => root.unmount())
  return handle
}

// The hook attaches through a promise, so a tick has to pass before the
// registration is in hand.
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve() })

let reload

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  reload = vi.fn()
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload },
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
  document.body.innerHTML = ''
  delete navigator.serviceWorker
  vi.restoreAllMocks()
})

describe('useServiceWorkerUpdate', () => {
  it('reports no update on a browser without service workers', async () => {
    delete navigator.serviceWorker
    const handle = renderHook()
    await flush()
    expect(handle.updateReady).toBe(false)
    handle.unmount()
  })

  it('stays quiet until a new worker finishes installing', async () => {
    const { registration } = makeEnvironment()
    const handle = renderHook()
    await flush()
    expect(handle.updateReady).toBe(false)

    const worker = registration.findUpdate(makeWorker())
    await flush()
    // Installing is not installed — nothing to offer yet.
    expect(handle.updateReady).toBe(false)

    await act(async () => worker.settle('installed'))
    expect(handle.updateReady).toBe(true)
    handle.unmount()
  })

  it('treats a first install as an install, not an update', async () => {
    // No controller means no old shell is on screen to replace.
    const { registration } = makeEnvironment({ controller: null })
    const handle = renderHook()
    await flush()

    const worker = registration.findUpdate(makeWorker())
    await act(async () => worker.settle('installed'))
    expect(handle.updateReady).toBe(false)
    handle.unmount()
  })

  it('finds a worker that was already waiting from an earlier load', async () => {
    // updatefound fired on the previous page view and will not fire again.
    makeEnvironment({ waiting: makeWorker('installed') })
    const handle = renderHook()
    await flush()
    expect(handle.updateReady).toBe(true)
    handle.unmount()
  })

  it('sends SKIP_WAITING and reloads only once the worker takes over', async () => {
    const waiting = makeWorker('installed')
    const { container } = makeEnvironment({ waiting })
    const handle = renderHook()
    await flush()

    await act(async () => handle.applyUpdate())
    expect(waiting.posted).toEqual([{ type: 'SKIP_WAITING' }])
    // The card goes away on the tap; the reload waits for the handover.
    expect(handle.updateReady).toBe(false)
    expect(reload).not.toHaveBeenCalled()

    await act(async () => container.fireControllerChange())
    expect(reload).toHaveBeenCalledTimes(1)
    handle.unmount()
  })

  it('never reloads on a controller change it did not ask for', async () => {
    const { container } = makeEnvironment({ waiting: makeWorker('installed') })
    const handle = renderHook()
    await flush()

    await act(async () => container.fireControllerChange())
    expect(reload).not.toHaveBeenCalled()
    handle.unmount()
  })

  it('dismissing hides the card without touching the waiting worker', async () => {
    const waiting = makeWorker('installed')
    makeEnvironment({ waiting })
    const handle = renderHook()
    await flush()
    expect(handle.updateReady).toBe(true)

    await act(async () => handle.dismissUpdate())
    expect(handle.updateReady).toBe(false)
    expect(waiting.posted).toEqual([])
    handle.unmount()
  })

  it('re-checks for a new worker when the app comes back to the foreground', async () => {
    const { registration } = makeEnvironment()
    const handle = renderHook()
    await flush()
    expect(registration.update).not.toHaveBeenCalled()

    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    // jsdom reports 'visible' by default.
    expect(registration.update).toHaveBeenCalledTimes(1)

    handle.unmount()
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    expect(registration.update).toHaveBeenCalledTimes(1)
  })
})
