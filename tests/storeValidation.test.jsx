// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POINTS_MAX } from '../src/lib/validate.js'
import { AppStoreProvider, useAppStore } from '../src/store/appStore.js'

// PR 12, the store half: a `guj:` key is a text file on someone else's device.
// These seed the store the way a stale build, another tab or devtools would
// have left it, mount the real provider on top and check what state ends up
// holding — the provider is the only honest way in, since the read happens in
// the hook's initialiser.

// The provider itself needs no canvas: it reads localStorage, resolves the
// brush colour off the document and builds the reducer. Everything below the
// provider is a probe, so none of the views' browser APIs are involved.
function mountStore() {
  const handle = {}
  function Probe() {
    handle.store = useAppStore()
    return null
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => root.render(
    <AppStoreProvider>
      <Probe />
    </AppStoreProvider>
  ))
  handle.unmount = () => act(() => root.unmount())
  return handle
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
  vi.restoreAllMocks()
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('a points ledger stored out of range', () => {
  it('reads back at the cap, keeps working, and is corrected on disk', () => {
    localStorage.setItem('guj:points', '100000000')

    const store = mountStore()

    expect(store.store.points).toBe(POINTS_MAX)
    expect(console.warn).toHaveBeenCalled()
    // Corrected where it was wrong, not just where it was read: the write
    // effect persists what state actually holds.
    expect(localStorage.getItem('guj:points')).toBe(String(POINTS_MAX))

    // And the store still works. A ledger at the cap does not go past it...
    act(() => store.store.setPoints((p) => p + 10))
    expect(store.store.points).toBe(POINTS_MAX)
    // ...and everything else about it behaves as it always did.
    act(() => store.store.setPoints(120))
    expect(store.store.points).toBe(120)
    act(() => store.store.setPoints((p) => p + 10))
    expect(store.store.points).toBe(130)
    expect(localStorage.getItem('guj:points')).toBe('130')

    store.unmount()
  })

  it('starts a ledger that is not a number at zero', () => {
    localStorage.setItem('guj:points', '"heaps"')

    const store = mountStore()

    expect(store.store.points).toBe(0)
    expect(localStorage.getItem('guj:points')).toBe('0')

    store.unmount()
  })
})

describe('a sticker list with one bad entry', () => {
  it('keeps the two the child bought and drops the third', () => {
    localStorage.setItem('guj:stickers', '["st1","st99","st6"]')

    const store = mountStore()

    expect(store.store.unlockedStickers).toEqual(['st1', 'st6'])
    // The count in the dashboard is the length of this array, so dropping the
    // entry is what stops it claiming three stickers and drawing two.
    expect(store.store.unlockedStickers).toHaveLength(2)
    expect(console.warn.mock.calls.flat().join(' ')).toContain('st99')
    expect(JSON.parse(localStorage.getItem('guj:stickers'))).toEqual(['st1', 'st6'])

    store.unmount()
  })

  it('survives a stored value that is not a list, and can still buy', () => {
    localStorage.setItem('guj:stickers', '"st1,st6"')

    const store = mountStore()

    expect(store.store.unlockedStickers).toEqual([])

    act(() => store.store.setUnlockedStickers(['st1']))
    expect(store.store.unlockedStickers).toEqual(['st1'])

    // The setter is the same boundary: an id the catalogue does not have does
    // not get in this way either.
    act(() => store.store.setUnlockedStickers((prev) => [...prev, 'st404']))
    expect(store.store.unlockedStickers).toEqual(['st1'])

    store.unmount()
  })
})

describe('a saved waypoint override that is not usable', () => {
  it('is ignored with a reason, and the letter keeps its calibrated default', () => {
    localStorage.setItem(
      'guj:custom_waypoints_ka',
      JSON.stringify([{ x: 10, y: 10, label: '1' }, { x: 'left', y: 20, label: '2' }])
    )

    const store = mountStore()
    const ka = store.store.sessionCurriculum.find((lesson) => lesson.id === 'ka')

    expect(ka.waypoints.length).toBeGreaterThan(2)
    expect(ka.waypoints.every((wp) => typeof wp.x === 'number')).toBe(true)
    expect(console.warn.mock.calls.flat().join(' ')).toContain('index 1')
    // The parent's recording is the only copy there is; a read does not delete it.
    expect(localStorage.getItem('guj:custom_waypoints_ka')).not.toBeNull()

    store.unmount()
  })
})
