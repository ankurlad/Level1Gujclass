// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  NAMESPACE,
  SCHEMA_VERSION,
  VERSION_KEY,
  legacyStorageKey,
  readStored,
  removeStored,
  storageKey,
  storedSchemaVersion,
  useLocalStorage,
  writeStored,
} from '../src/hooks/useLocalStorage.js'

// Mounts a component that does nothing but hold the hook, and hands back a
// handle to read the value and drive the setter from the test.
function renderHook(key, initialValue, migrate) {
  const handle = {}
  function Probe() {
    const [value, setValue] = useLocalStorage(key, initialValue, migrate)
    handle.value = value
    handle.setValue = setValue
    return null
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => root.render(<Probe />))
  handle.unmount = () => act(() => root.unmount())
  return handle
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
})

afterEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('key naming', () => {
  it('namespaces new keys and derives the v0 name from the same bare key', () => {
    expect(NAMESPACE).toBe('guj:')
    expect(storageKey('points')).toBe('guj:points')
    expect(legacyStorageKey('points')).toBe('guj_points')
  })
})

describe('readStored / writeStored', () => {
  it('round-trips every value shape the app persists', () => {
    const cases = [
      ['points', 120],
      ['sound_enabled', false],
      ['brush_color', 'oklch(0.51 0.23 277)'],
      ['stickers', ['lion', 'panda']],
      ['progress', { tracedCount: 3, quizScore: 1, completedLessons: ['ka'] }],
      ['parent_pin_hash', null],
    ]
    for (const [key, value] of cases) {
      writeStored(key, value)
      expect(localStorage.getItem(storageKey(key)), key).toBe(JSON.stringify(value))
      expect(readStored(key, 'unused'), key).toEqual(value)
    }
  })

  it('falls back to the initial value for a missing or corrupt key', () => {
    expect(readStored('points', 0)).toBe(0)
    // Factories are supported, so a fresh object per read cannot be shared.
    const first = readStored('progress', () => ({ tracedCount: 0 }))
    const second = readStored('progress', () => ({ tracedCount: 0 }))
    expect(first).toEqual({ tracedCount: 0 })
    expect(first).not.toBe(second)

    localStorage.setItem(storageKey('stickers'), '{not json')
    expect(readStored('stickers', [])).toEqual([])
  })

  it('stamps the schema version on first read', () => {
    expect(storedSchemaVersion()).toBe(0)
    readStored('points', 0)
    expect(localStorage.getItem(VERSION_KEY)).toBe(String(SCHEMA_VERSION))
    expect(storedSchemaVersion()).toBe(SCHEMA_VERSION)
  })

  it('removes both spellings so a v0 key cannot resurrect', () => {
    localStorage.setItem('guj_custom_waypoints_ka', '[{"x":1,"y":2,"label":"1"}]')
    writeStored('custom_waypoints_ka', [{ x: 3, y: 4, label: '1' }])

    removeStored('custom_waypoints_ka')

    expect(localStorage.getItem('guj:custom_waypoints_ka')).toBeNull()
    expect(localStorage.getItem('guj_custom_waypoints_ka')).toBeNull()
    expect(readStored('custom_waypoints_ka', null)).toBeNull()
  })
})

describe('v0 -> v1 migration', () => {
  it('adopts an un-namespaced JSON value and deletes the old key', () => {
    const progress = { tracedCount: 7, quizScore: 2, completedLessons: ['ka', 'kha'] }
    localStorage.setItem('guj_progress', JSON.stringify(progress))

    expect(readStored('progress', null)).toEqual(progress)
    expect(localStorage.getItem('guj:progress')).toBe(JSON.stringify(progress))
    expect(localStorage.getItem('guj_progress')).toBeNull()
  })

  it('adopts an un-namespaced bare string, which v0 stored unquoted', () => {
    localStorage.setItem('guj_gate_type', 'pin')

    expect(readStored('gate_type', 'math')).toBe('pin')
    expect(localStorage.getItem('guj:gate_type')).toBe('"pin"')
    expect(localStorage.getItem('guj_gate_type')).toBeNull()
  })

  it('runs the optional migration over the adopted value', () => {
    localStorage.setItem('guj_brush_width', 'garbage')
    // v0 read this through `Number(...) || 16`, so the coercion moves with it.
    expect(readStored('brush_width', 16, (v) => Number(v) || 16)).toBe(16)
    expect(localStorage.getItem('guj:brush_width')).toBe('16')
  })

  it('prefers the namespaced key and leaves the stale v0 one alone', () => {
    localStorage.setItem('guj_points', '10')
    localStorage.setItem('guj:points', '99')

    expect(readStored('points', 0)).toBe(99)
    expect(localStorage.getItem('guj_points')).toBe('10')
  })
})

describe('useLocalStorage', () => {
  it('reads the stored value on mount and persists every update', () => {
    localStorage.setItem(storageKey('points'), '40')
    const hook = renderHook('points', 0)
    expect(hook.value).toBe(40)

    act(() => hook.setValue(50))
    expect(hook.value).toBe(50)
    expect(localStorage.getItem('guj:points')).toBe('50')

    // A second mount picks up what the first one wrote.
    hook.unmount()
    expect(renderHook('points', 0).value).toBe(50)
  })

  it('materialises the namespaced key for an untouched default', () => {
    const hook = renderHook('sound_enabled', true)
    expect(hook.value).toBe(true)
    expect(localStorage.getItem('guj:sound_enabled')).toBe('true')
  })

  it('migrates on mount', () => {
    localStorage.setItem('guj_stickers', '["lion"]')
    const hook = renderHook('stickers', () => [])

    expect(hook.value).toEqual(['lion'])
    expect(localStorage.getItem('guj:stickers')).toBe('["lion"]')
    expect(localStorage.getItem('guj_stickers')).toBeNull()
  })
})
