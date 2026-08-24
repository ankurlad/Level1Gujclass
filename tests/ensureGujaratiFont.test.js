import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ensureGujaratiFont,
  __test
} from '../src/lib/ensureGujaratiFont.js'

// The gate is the cross-device guarantee that the guide glyph renders in the
// calibrated font (Noto Sans Gujarati) before the first canvas paint — the
// failure mode behind the Round 9 "dot off the centerline" defect, in which
// a phone silently painted the glyph in a system font whose metrics differ.
// These tests pin the gate's behaviour: fast path (font attaches), fallback
// path (no fonts API), the hard timeout (dead font — the app must not hang a
// classroom), and that every call re-asks the FontFaceSet.
//
// Environment note: vitest's default env in this repo provides a jsdom-style
// global document on the happy path and an undefined document elsewhere. In
// both cases the guard inside gateOnce — `if (typeof document === 'undefined'
// || !document.fonts) return` — is what the tests are actually exercising,
// so a test that wants to drive the load path builds its own document.
const REAL_DOCUMENT = globalThis.document

afterEach(() => {
  if (REAL_DOCUMENT === undefined) {
    delete globalThis.document
  } else {
    globalThis.document = REAL_DOCUMENT
  }
})

describe('ensureGujaratiFont', () => {
  it('fast-paths when document is absent (bare Node env)', async () => {
    // The module's guard: `typeof document === 'undefined'` → return.
    globalThis.document = undefined
    await expect(ensureGujaratiFont()).resolves.toBeUndefined()
  })

  it('fast-paths when document exists but has no fonts API (jsdom / old WebView)', async () => {
    // The module's guard: `!document.fonts` → return. A device that cannot
    // attach web fonts must not hang — resolve and let the caller draw with
    // whatever fallback the device has.
    globalThis.document = { fonts: undefined }
    await expect(ensureGujaratiFont()).resolves.toBeUndefined()
  })

  it('resolves when the font attaches through a healthy FontFaceSet', async () => {
    const loads = []
    // document.fonts.load(spec) returns a Promise<FontFace[]> that
    // resolves when the face is usable. A healthy browser does this in
    // well under a second. The gate races that against its hard timeout;
    // a face that has attached wins the race.
    globalThis.document = {
      fonts: {
        load: vi.fn((spec) => {
          loads.push(spec)
          return Promise.resolve([{ status: 'loaded' }])
        }),
        check: vi.fn(() => true)
      }
    }
    await ensureGujaratiFont()
    expect(loads).toEqual([__test.GUJARATI_SPEC])
  })

  it('resolves (not rejects) when document.fonts.load throws', async () => {
    // A defensive case: even if the FontFaceSet is broken in a way that
    // throws synchronously, the gate must resolve so the app can draw with
    // whatever fallback it has.
    globalThis.document = {
      fonts: {
        load: vi.fn(() => { throw new Error('FontFaceSet blew up') }),
        check: vi.fn(() => false)
      }
    }
    await expect(ensureGujaratiFont()).resolves.toBeUndefined()
  })

  it('resolves (not hangs) at the hard timeout when the font never attaches', async () => {
    // A dead font URL / blocked font request: load() returns a Promise that
    // will never settle. The gate must give up shortly after and resolve
    // anyway, so the app ends up drawing instead of hanging a classroom.
    // (Timeout is 20 ms here via the injectable override — the production
    // default is 15000 ms.)
    globalThis.document = {
      fonts: {
        load: vi.fn(() => new Promise(() => {})),
        check: vi.fn(() => false)
      }
    }
    const started = performance.now()
    await ensureGujaratiFont(20)
    const elapsed = performance.now() - started
    expect(elapsed).toBeLessThan(2000)
  })

  it('re-asks the FontFaceSet on every call (no stale cache)', async () => {
    // The state of document.fonts can change between calls (a face attaches
    // late after a first paint, HMR swaps the page). The gate must therefore
    // re-ask on every call rather than remember a previous answer.
    const load = vi.fn(() => Promise.resolve([{ status: 'loaded' }]))
    globalThis.document = { fonts: { load, check: vi.fn(() => true) } }
    await ensureGujaratiFont()
    await ensureGujaratiFont()
    await ensureGujaratiFont()
    expect(load).toHaveBeenCalledTimes(3)
  })
})
