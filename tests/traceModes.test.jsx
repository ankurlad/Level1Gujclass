// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTraceModes } from '../src/hooks/useTraceModes.js'
import { readStored, storageKey } from '../src/hooks/useLocalStorage.js'
import { CHILD_SCOPED_KEYS, DEVICE_SCOPED_KEYS } from '../src/lib/childProfiles.js'
import { MASTERY_ACCURACY } from '../src/lib/mastery.js'
import {
  CHALLENGE_DOT_STROKES,
  CHALLENGE_SECONDS,
  DEFAULT_TRACE_MODE,
  TRACE_MODES,
  TRACE_MODE_IDS,
  dotsVisibleInMode,
  isTraceMode,
  toTraceMode,
  traceMode,
} from '../src/lib/traceModes.js'
import { AppStoreProvider, useAppStore } from '../src/store/appStore.js'

// Guided / Challenge / Free: the catalogue, the validate guard on the stored
// preference, and the hook that turns the choice into a clock, a live score and
// a row in the child's accuracy record.
//
// The hook is exercised against the REAL store and the REAL tracing engine —
// nothing is faked but the wall clock. A trace is fed to the engine by walking
// the letter's own waypoints, which is a sample sitting exactly on the ideal
// path and therefore a 100.

function mount() {
  const handle = { timeUps: [] }
  function Probe() {
    handle.store = useAppStore()
    handle.modes = useTraceModes({ onTimeUp: (outcome) => handle.timeUps.push(outcome) })
    return null
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => root.render(<AppStoreProvider><Probe /></AppStoreProvider>))
  handle.unmount = () => act(() => root.unmount())
  return handle
}

// A perfect trace of the letter on screen: every waypoint, in order, exactly on
// the dot. Returns the accuracy the engine scored it at.
function tracePerfectly(handle) {
  act(() => {
    const session = handle.store.getTraceSession()
    session.startStroke()
    for (const wp of session.waypoints) session.addPoint(wp.x, wp.y)
    session.endStroke()
    handle.modes.noteSample()
  })
  return handle.store.getTraceSession().getAccuracy()
}

let warn

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  warn.mockRestore()
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('the mode catalogue', () => {
  it('is exactly three modes, and Guided is the default', () => {
    expect(TRACE_MODE_IDS).toEqual(['guided', 'challenge', 'free'])
    expect(DEFAULT_TRACE_MODE).toBe('guided')
  })

  it('gives every mode a label and a one-line hint a child can be read', () => {
    for (const mode of TRACE_MODES) {
      expect(typeof mode.label, mode.id).toBe('string')
      expect(mode.hint.length, mode.id).toBeGreaterThan(0)
    }
  })

  it('puts the clock on Challenge alone, at 90 seconds', () => {
    expect(traceMode('guided').timerSeconds).toBeNull()
    expect(traceMode('free').timerSeconds).toBeNull()
    expect(traceMode('challenge').timerSeconds).toBe(CHALLENGE_SECONDS)
    expect(CHALLENGE_SECONDS).toBe(90)
  })

  it('shows the running score in Challenge alone', () => {
    expect(TRACE_MODES.filter((mode) => mode.liveAccuracy).map((mode) => mode.id)).toEqual(['challenge'])
  })
})

describe('which dots each mode draws', () => {
  it('draws every stroke in Guided', () => {
    for (const stroke of [0, 1, 2, 3]) expect(dotsVisibleInMode('guided', stroke)).toBe(true)
  })

  it('draws none in Free', () => {
    for (const stroke of [0, 1, 2, 3]) expect(dotsVisibleInMode('free', stroke)).toBe(false)
  })

  it('draws the first stroke only in Challenge, so a child still knows where to start', () => {
    expect(CHALLENGE_DOT_STROKES).toBe(1)
    expect(dotsVisibleInMode('challenge', 0)).toBe(true)
    expect(dotsVisibleInMode('challenge', 1)).toBe(false)
    expect(dotsVisibleInMode('challenge', 3)).toBe(false)
  })

  it('treats an unknown mode as Guided rather than drawing nothing', () => {
    expect(dotsVisibleInMode('hyperdrive', 2)).toBe(true)
    expect(traceMode(undefined).id).toBe(DEFAULT_TRACE_MODE)
  })
})

describe('toTraceMode, the validate guard on the stored preference', () => {
  it('passes the three real modes through untouched and silently', () => {
    for (const id of TRACE_MODE_IDS) {
      expect(toTraceMode(id)).toBe(id)
      expect(isTraceMode(id)).toBe(true)
    }
    expect(warn).not.toHaveBeenCalled()
  })

  it('falls back to Guided for anything else, and says so', () => {
    for (const junk of ['chalenge', '', 'GUIDED', null, undefined, 3, {}, ['challenge']]) {
      expect(toTraceMode(junk)).toBe(DEFAULT_TRACE_MODE)
    }
    expect(warn).toHaveBeenCalled()
    expect(warn.mock.calls[0][0]).toContain('tracing mode')
  })

  it('never throws, whatever is on disk', () => {
    expect(() => toTraceMode(Symbol('x'))).not.toThrow()
  })
})

describe('the mode is a device preference, the scores it produces are not', () => {
  it('lists trace_mode as device-wide and accuracy as child-scoped', () => {
    expect(DEVICE_SCOPED_KEYS).toContain('trace_mode')
    expect(CHILD_SCOPED_KEYS).toContain('accuracy')
    expect(DEVICE_SCOPED_KEYS).not.toContain('accuracy')
    expect(CHILD_SCOPED_KEYS).not.toContain('trace_mode')
  })

  it('persists a chosen mode at guj:trace_mode, with no child in the key', () => {
    const handle = mount()
    expect(handle.modes.modeId).toBe('guided')

    act(() => handle.modes.setMode('challenge'))
    expect(handle.modes.modeId).toBe('challenge')
    expect(localStorage.getItem(storageKey('trace_mode'))).toBe('"challenge"')
    expect(Object.keys(localStorage).some((key) => key.includes('child:') && key.endsWith('trace_mode'))).toBe(false)

    // A second mount reads back what the first one chose.
    handle.unmount()
    expect(mount().modes.modeId).toBe('challenge')
  })

  it('repairs a hand-edited mode key on disk instead of rendering it', () => {
    localStorage.setItem(storageKey('trace_mode'), '"hyperdrive"')
    const handle = mount()
    expect(handle.modes.modeId).toBe('guided')
    // Corrected in place, so the bad value is not re-read on every load.
    expect(localStorage.getItem(storageKey('trace_mode'))).toBe('"guided"')
  })

  it('refuses a junk value handed to the setter, keeping the app on a real mode', () => {
    const handle = mount()
    act(() => handle.modes.setMode('hyperdrive'))
    expect(handle.modes.modeId).toBe('guided')
    expect(handle.modes.mode.label).toBe('Guided')
  })
})

describe('finishing a letter', () => {
  it('scores the trace, writes the child-scoped record and awards the letter its sticker', () => {
    const handle = mount()
    act(() => handle.modes.setMode('challenge'))

    expect(tracePerfectly(handle)).toBe(100)
    expect(handle.modes.liveAccuracy).toBe(100)

    let outcome
    act(() => { outcome = handle.modes.finishLetter() })

    expect(outcome.accuracy).toBe(100)
    expect(outcome.complete).toBe(true)
    expect(outcome.mastered).toBe(true)
    expect(outcome.awarded).toEqual(['mastery_ka'])
    expect(outcome.streak).toEqual({ current: 1, longest: 1 })

    const stored = readStored('child:c1:accuracy', null)
    expect(stored.letters.ka.challenge).toEqual({ best: 100, attempts: 1, history: [100] })
    expect(stored.streak).toEqual({ current: 1, longest: 1 })
    expect(readStored('child:c1:stickers', [])).toContain('mastery_ka')
  })

  it('records a Guided trace without mastering the letter', () => {
    const handle = mount()
    tracePerfectly(handle)

    let outcome
    act(() => { outcome = handle.modes.finishLetter() })

    expect(handle.modes.modeId).toBe('guided')
    expect(outcome.accuracy).toBe(100)
    expect(outcome.mastered).toBe(false)
    expect(outcome.awarded).toEqual([])
    expect(readStored('child:c1:accuracy', null).letters.ka.guided.best).toBe(100)
    expect(readStored('child:c1:stickers', [])).toEqual([])
  })

  it('does not touch the points ledger', () => {
    const handle = mount()
    const before = handle.store.points
    act(() => handle.modes.setMode('challenge'))
    tracePerfectly(handle)
    act(() => { handle.modes.finishLetter() })
    expect(handle.store.points).toBe(before)
  })

  it('keeps one child out of the next child record', () => {
    const handle = mount()
    act(() => handle.modes.setMode('challenge'))
    tracePerfectly(handle)
    act(() => { handle.modes.finishLetter() })
    expect(handle.store.accuracyRecords.letters.ka.challenge.best).toBe(100)

    act(() => { handle.store.addChild('Second') })
    expect(handle.store.accuracyRecords.letters).toEqual({})
    expect(handle.store.unlockedStickers).toEqual([])
    // ...and the first child's record is still on disk, untouched.
    expect(readStored('child:c1:accuracy', null).letters.ka.challenge.best).toBe(100)
    // The mode, being a device preference, followed neither child.
    expect(handle.modes.modeId).toBe('challenge')
  })

  it('clears the banner and re-arms the clock when the next letter begins', () => {
    const handle = mount()
    act(() => handle.modes.setMode('challenge'))
    tracePerfectly(handle)
    act(() => { handle.modes.finishLetter() })
    expect(handle.modes.outcome).not.toBeNull()

    act(() => handle.modes.beginLetter())
    expect(handle.modes.outcome).toBeNull()
    expect(handle.modes.secondsLeft).toBe(CHALLENGE_SECONDS)
    expect(handle.modes.liveAccuracy).toBe(0)
    expect(handle.modes.expired).toBe(false)
  })
})

describe('the Challenge clock', () => {
  it('does not start until the child puts the pen down', () => {
    vi.useFakeTimers()
    const handle = mount()
    act(() => handle.modes.setMode('challenge'))
    expect(handle.modes.secondsLeft).toBe(CHALLENGE_SECONDS)

    act(() => { vi.advanceTimersByTime(10_000) })
    expect(handle.modes.secondsLeft).toBe(CHALLENGE_SECONDS)
    expect(handle.modes.timerRunning).toBe(false)
  })

  it('counts down once tracing starts', () => {
    vi.useFakeTimers()
    const handle = mount()
    act(() => handle.modes.setMode('challenge'))
    act(() => { handle.modes.noteSample() })
    expect(handle.modes.timerRunning).toBe(true)

    act(() => { vi.advanceTimersByTime(3_000) })
    expect(handle.modes.secondsLeft).toBe(CHALLENGE_SECONDS - 3)
  })

  it('has no clock at all in Guided or Free', () => {
    vi.useFakeTimers()
    const handle = mount()
    for (const mode of ['guided', 'free']) {
      act(() => handle.modes.setMode(mode))
      act(() => { handle.modes.noteSample() })
      act(() => { vi.advanceTimersByTime(200_000) })
      expect(handle.modes.secondsLeft, mode).toBeNull()
      expect(handle.modes.expired, mode).toBe(false)
    }
  })

  it('scores the unfinished trace when time runs out, once, and stops the pen', () => {
    vi.useFakeTimers()
    const handle = mount()
    act(() => handle.modes.setMode('challenge'))
    act(() => { handle.modes.noteSample() })

    act(() => { vi.advanceTimersByTime(CHALLENGE_SECONDS * 1000) })

    expect(handle.modes.secondsLeft).toBe(0)
    expect(handle.modes.expired).toBe(true)
    expect(handle.modes.timerRunning).toBe(false)
    expect(handle.timeUps).toHaveLength(1)
    expect(handle.modes.outcome.complete).toBe(false)
    // No ink went anywhere near the line, so an abandoned letter scores 0 and
    // breaks the streak rather than protecting it.
    expect(handle.modes.outcome.accuracy).toBe(0)
    expect(handle.modes.outcome.neat).toBe(false)
    expect(handle.modes.outcome.streak.current).toBe(0)
    expect(readStored('child:c1:accuracy', null).letters.ka.challenge.attempts).toBe(1)

    // The clock is spent: it does not fire again and does not keep counting.
    act(() => { vi.advanceTimersByTime(30_000) })
    expect(handle.timeUps).toHaveLength(1)
    expect(handle.modes.secondsLeft).toBe(0)
  })
})

describe('the mastery bar, from the hook down', () => {
  it('is the same 85 the shop and the dashboard quote', () => {
    expect(MASTERY_ACCURACY).toBe(85)
  })
})
