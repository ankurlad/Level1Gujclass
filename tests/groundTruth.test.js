// @vitest-environment node
// Ground-truth regression for the six quality-bar letters from
// "Canvas alphabet shapes with waypoint tracing": pa (પ), pha (ફ), ra (ર), ka (ક),
// dha2 (ધ), na (ન).
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
})
