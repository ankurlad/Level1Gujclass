// @vitest-environment node
// Ground-truth regression for the seven quality-bar letters from
// "Canvas alphabet shapes with waypoint tracing": pa (પ), pha (ફ), ra (ર), ka (ક),
// dha2 (ધ), na (ન), kha (ખ).
//
// The generator's output for these six was visually checked — against the
// trace-video-verified pen motion — before PR 13a landed. This test is the
// guardrail that stops a later re-derivation from silently regressing them
// back to the "automatic" stroke reading:
//   pa   right limb split into a separate top-down bar, instead of stroked 1
//        RISING up it from the bottom (bottom-joined-letter model)
//   pha  the pigtail/crossbar split out of the S-body into the wrong order
//   ra   the knot split into two strokes, instead of one continuous motion
//   ka   over-fragmentation splitting the S into 3+ strokes
//   dha2 the limb read as top-down, tick and flick re-ordered
//   na   the hand-placed bowl (solid ink, no skeleton) replaced by a
//        fabricated route
//   kha  read as three strokes — bowl, a right-to-left crossbar, then the stem
//        — where the video draws two. ક has a crossbar and ખ does not: the
//        horizontal is the TAIL of the S body, drawn left to right without
//        lifting, and the stem is a single top-to-bottom motion after it.
//
// The 0-100 waypoint contract is already asserted by tests/curriculum.test.js
// for every letter; what's asserted here is *motion* — stroke count and the
// shape of the first / last stroke — which is what the visual check proved.
import { describe, expect, it } from 'vitest'

import { CURRICULUM } from '../src/curriculum.js'

const byId = Object.fromEntries(CURRICULUM.map((L) => [L.id, L]))

// Total stroke count = 1 (the first, no pen-up) + one for every waypoint
// flagged with moveTo (a stroke starting there).
const strokes = (letter) =>
  1 + letter.waypoints.reduce((n, wp, i) => n + (i > 0 && wp.moveTo ? 1 : 0), 0)

// The index of the last waypoint *before* the first (i.e. final) pen-up,
// or the end of the array if there is no pen-up.
const lastIndexOfFirstPenUp = (letter) => {
  const idx = letter.waypoints.findIndex((wp, i) => i > 0 && wp.moveTo)
  return idx === -1 ? letter.waypoints.length - 1 : idx - 1
}

describe('ground truth letterforms (quality bar)', () => {
  it('pa: two strokes; stroke 1 ends at the top of the right limb (the rise)', () => {
    expect(strokes(byId.pa)).toBe(2)
    const last = byId.pa.waypoints[lastIndexOfFirstPenUp(byId.pa)]
    // Right limb: high x (right half of the box), low y (top of the box).
    expect(last.x, 'pa rise endpoint x').toBeGreaterThan(45)
    expect(last.y, 'pa rise endpoint y').toBeLessThan(35)
  })

  it('pha: two strokes; the final stroke is the top crossbar', () => {
    expect(strokes(byId.pha)).toBe(2)
    const last = byId.pha.waypoints.at(-1)
    expect(last.y, 'pha crossbar y (upper half)').toBeLessThan(50)
  })

  it('ra: one continuous stroke (knot doubles back, no pen-up)', () => {
    expect(strokes(byId.ra)).toBe(1)
  })

  it('ka: two strokes — the S-body and its crossbar, not the 3+ fragment', () => {
    expect(strokes(byId.ka)).toBe(2)
  })

  it('dha2: three strokes — curl+bowl+rise limb, then tick, then flick', () => {
    expect(strokes(byId.dha2)).toBe(3)
  })

  it('na: two strokes — the hand-placed bowl, then the right stroke and flick', () => {
    expect(strokes(byId.na)).toBe(2)
  })

  // ખ, read off the reference video at 133-138s. The pen starts at the
  // top-left hook, runs the whole S body without lifting — down the left,
  // round the bowl, up its right side, up into the centre curl and back out
  // of it along the horizontal — and only then lifts for the stem.
  describe('kha', () => {
    const first = byId.kha.waypoints.slice(0, lastIndexOfFirstPenUp(byId.kha) + 1)
    const stem = byId.kha.waypoints.slice(lastIndexOfFirstPenUp(byId.kha) + 1)

    it('is two strokes: the S body, then the stem', () => {
      expect(strokes(byId.kha)).toBe(2)
    })

    it('starts stroke 1 at the top-left hook', () => {
      expect(first[0].x, 'hook tip x (left third)').toBeLessThan(35)
      expect(first[0].y, 'hook tip y (top)').toBeLessThan(32)
    })

    it('takes stroke 1 up into the centre curl and back down out of it', () => {
      // The curl is the one place the S body rises: a dot higher than both its
      // neighbours, in the middle of the letter, with the dot after it back
      // down the same vertical. That up-and-back is the pen looping through
      // the curl before it heads right.
      const curl = first.findIndex(
        (wp, i) =>
          i > 0 &&
          i < first.length - 1 &&
          wp.y < first[i - 1].y &&
          wp.y < first[i + 1].y &&
          wp.x > 45 &&
          wp.x < 56,
      )
      expect(curl, 'a centre curl in stroke 1').toBeGreaterThan(-1)
      expect(Math.abs(first[curl + 1].x - first[curl].x), 'the way back down the curl').toBeLessThan(2)
    })

    it('carries stroke 1 on to the stem without lifting — ખ has no crossbar', () => {
      // ક's crossbar is its own stroke drawn last. ખ's horizontal is where
      // stroke 1 ENDS, so the last dot before the pen-up is over on the right
      // of the letter, not back at the curl.
      expect(first.at(-1).x, 'end of stroke 1 (right of the letter)').toBeGreaterThan(60)
    })

    it('draws the stem in one motion, top to bottom, down the centre of the ink', () => {
      expect(stem[0].y, 'stem starts at the top').toBeLessThan(30)
      expect(stem.at(-1).y, 'stem finishes past the baseline').toBeGreaterThan(60)
      stem.forEach((wp, i) => {
        if (i > 0) expect(wp.y, `kha stem [${i}] descends`).toBeGreaterThan(stem[i - 1].y)
      })
      // The defect this replaced: the stem's dots wandered off the centreline
      // band, the last of them visibly off-centre. Every dot down the stem
      // proper — all but the foot, which flicks right — sits on one vertical.
      const xs = stem.slice(0, -1).map((wp) => wp.x)
      expect(Math.max(...xs) - Math.min(...xs), 'stem dots off one vertical').toBeLessThan(1)
    })
  })
})
