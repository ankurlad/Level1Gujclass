// @vitest-environment node
// The 8 vowels (સ્વર) added in PR 13a2.
//
// tests/curriculum.test.js already asserts the 0-100 waypoint contract — range,
// hundredth precision, 1-based labels, moveTo only between strokes — for every
// lesson in CURRICULUM, and the vowels are in CURRICULUM, so they are covered
// by it. What is asserted *here* is the three things that are specific to this
// PR and that no other test would notice going wrong:
//
//   1. the set itself: the eight ids exist, and each is pointed at the
//      codepoint it claims. The length pairs are the trap — ઇ (U+0A87) is the
//      short i and ઈ (U+0A88) the long one, and an id wired to the wrong one
//      of the pair teaches the wrong sound under a name that looks right.
//   2. the learning sequence: present, long enough, and built only out of view
//      ids the app can actually route to.
//   3. the audio: a real recorded clip on disk for every vowel, with bytes in
//      it. `letter_l.mp3` is the one that matters — the voice refuses ઌ, so
//      that clip is recorded from a `speech` override, and a regeneration that
//      quietly dropped the override would leave a zero-byte file behind.
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { CURRICULUM, VOWELS, VOWEL_LEARNING_VIEWS } from '../src/curriculum.js'
import { GAME_VIEWS } from '../src/store/appStore.js'
import { PATH_MAX } from '../src/lib/waypoints.js'

const AUDIO_DIR = path.resolve(fileURLToPath(new URL('../src/assets/audio', import.meta.url)))

// id -> the codepoint that id names, written out so this test cannot pass
// against a copy of the same mix-up. U+0A85..U+0A8C, in kakko order.
const EXPECTED = [
  ['a', 0x0a85, 'short a'],
  ['aa', 0x0a86, 'long aa'],
  ['i', 0x0a87, 'short i'],
  ['ii', 0x0a88, 'long ii'],
  ['u', 0x0a89, 'short u'],
  ['uu', 0x0a8a, 'long uu'],
  ['r', 0x0a8b, 'vocalic r'],
  ['l', 0x0a8c, 'vocalic l'],
]

// Every view the app can route to: the `view` strings App.jsx switches on.
const ROUTABLE_VIEWS = new Set([
  'home',
  'map',
  'learn',
  'sandbox',
  'stickers',
  'dashboard',
  'worksheets',
  ...GAME_VIEWS,
])

const byId = Object.fromEntries(VOWELS.map((vowel) => [vowel.id, vowel]))

describe('vowels (સ્વર)', () => {
  it('is the eight-letter set, in kakko order', () => {
    expect(VOWELS.map((vowel) => vowel.id)).toEqual(EXPECTED.map(([id]) => id))
  })

  it('is reachable through CURRICULUM, which is what the app reads', () => {
    for (const [id] of EXPECTED) {
      expect(CURRICULUM.find((lesson) => lesson.id === id), id).toBeDefined()
    }
  })

  describe.each(EXPECTED)('%s (U+0A%s)', (id, codepoint, description) => {
    const vowel = byId[id]

    it(`is the ${description}, U+${codepoint.toString(16).toUpperCase()}`, () => {
      expect(vowel).toBeDefined()
      // One codepoint, and the one claimed. `[...str]` rather than .length so a
      // stray combining mark cannot pass as a single character.
      expect([...vowel.letter]).toHaveLength(1)
      expect(vowel.letter.codePointAt(0)).toBe(codepoint)
    })

    it('has a traceable path of at least two waypoints, all inside 0-100', () => {
      expect(Array.isArray(vowel.waypoints)).toBe(true)
      expect(vowel.waypoints.length).toBeGreaterThanOrEqual(2)
      vowel.waypoints.forEach((wp, i) => {
        expect(wp.x, `${id}[${i}].x`).toBeGreaterThanOrEqual(0)
        expect(wp.x, `${id}[${i}].x`).toBeLessThanOrEqual(PATH_MAX)
        expect(wp.y, `${id}[${i}].y`).toBeGreaterThanOrEqual(0)
        expect(wp.y, `${id}[${i}].y`).toBeLessThanOrEqual(PATH_MAX)
      })
    })

    it('numbers its waypoints 1..n, in order, and lifts the pen only between strokes', () => {
      expect(vowel.waypoints.map((wp) => wp.label)).toEqual(
        vowel.waypoints.map((_, i) => String(i + 1)),
      )
      expect(vowel.waypoints[0].moveTo).toBeUndefined()
      vowel.waypoints.forEach((wp, i) => {
        if ('moveTo' in wp) expect(wp.moveTo, `${id}[${i}].moveTo`).toBe(true)
      })
    })

    it('has a learning sequence of at least three existing views', () => {
      expect(Array.isArray(vowel.learningViews)).toBe(true)
      expect(vowel.learningViews.length).toBeGreaterThanOrEqual(3)
      for (const view of vowel.learningViews) {
        expect(ROUTABLE_VIEWS, `${id}: ${view}`).toContain(view)
      }
      // It starts by tracing the letter — the other steps are practice.
      expect(vowel.learningViews[0]).toBe('learn')
    })

    it('has a recorded letter clip and lesson clip, neither of them empty', () => {
      for (const name of [`letter_${id}.mp3`, `lesson_${id}.mp3`]) {
        const file = path.join(AUDIO_DIR, name)
        expect(statSync(file).size, name).toBeGreaterThan(0)
        // An mp3, not a renamed something-else: ID3 tag or a frame sync word.
        const head = readFileSync(file).subarray(0, 3)
        const isMp3 = head.toString('latin1') === 'ID3' || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)
        expect(isMp3, `${name} does not start like an mp3`).toBe(true)
      }
    })
  })

  it('gives every vowel the same sequence, so the field has one meaning', () => {
    for (const vowel of VOWELS) expect(vowel.learningViews, vowel.id).toBe(VOWEL_LEARNING_VIEWS)
  })

  it('records the length pairs as different letters and different clips', () => {
    // The whole point of ઇ/ઈ and ઉ/ઊ is that they are the same shape held for
    // a different length. If a copy-paste ever pointed both halves of a pair at
    // one codepoint the app would look right and teach one of the two sounds.
    for (const [short, long] of [
      ['i', 'ii'],
      ['u', 'uu'],
    ]) {
      expect(byId[short].letter).not.toBe(byId[long].letter)
      const read = (id) => readFileSync(path.join(AUDIO_DIR, `letter_${id}.mp3`))
      expect(read(short).equals(read(long)), `${short}/${long} share one recording`).toBe(false)
    }
  })
})
