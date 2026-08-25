// @vitest-environment node
// The dots a child chases are evenly spread along the letter.
//
// They were not. tools/glyph/generate.js had two resampling modes and shipped
// the wrong one: corner mode keeps whatever Ramer-Douglas-Peucker calls a
// corner, fills gaps over 52px and squeezes out gaps under 15px, which on a
// Gujarati letterform means a clump of dots inside every tight curl and a
// desert across every long sweep. Measured on the data that shipped before
// this test, no letter had its dots within 33% of its own mean gap and ઌ was
// out by 83% — a 15.8px gap and a 46.6px gap on the same letter.
//
// Two things go wrong when they are uneven:
//
//   1. A child tracks progress by counting dots. An even count-up reads as
//      "I am on 7 of 16"; a clump followed by a desert reads as neither.
//   2. src/lib/tracingEngine.js scores a stroke by how far the child's ink
//      strays from the CHORD between consecutive waypoints. A 15px chord is
//      nearly the dot itself, so it demands near-exact ink; a 46px chord
//      across a curve forgives a line drawn straight through it. Same letter,
//      same child, two different standards.
//
// So the invariant is on the shipped numbers, not on the generator: whatever
// route a letter takes and whoever hand-authored it, its dots come out evenly
// spaced or this fails.
import { describe, expect, it } from 'vitest'

import { CURRICULUM } from '../src/curriculum.js'
import { CANVAS_H, CANVAS_W, PATH_MAX } from '../src/lib/waypoints.js'

// Render pixels on the 380x320 logical canvas, which is the space the glyph
// generator, the proof sheets and the trace surface all measure in.
const at = (wp) => [(wp.x / PATH_MAX) * CANVAS_W, (wp.y / PATH_MAX) * CANVAS_H]

/**
 * The distance between consecutive dots, in render pixels, per stroke.
 *
 * The jump across a pen-up is not a gap anybody traces, so it is not a gap.
 * Counting it would report every multi-stroke letter as badly spaced and
 * quietly make this test meaningless.
 */
const gapsOf = (lesson) => {
  const gaps = []
  lesson.waypoints.forEach((wp, i) => {
    if (i === 0 || wp.moveTo) return
    const [x, y] = at(wp)
    const [px, py] = at(lesson.waypoints[i - 1])
    gaps.push({ index: i, distance: Math.hypot(x - px, y - py) })
  })
  return gaps
}

// A stroke has to hold a whole number of gaps and a letter's strokes are not
// all the same length, so its gaps cannot all be identical — ખ's centre curl
// is 20px of ink between two corners and there is nowhere for a second dot in
// it to go. What CAN hold is that no dot is a third off its letter's own
// pace. The data this landed with is inside 30%.
const SPREAD = 0.35
// And two absolute rails, because a letter whose dots are uniformly too close
// together would satisfy the spread on its own. A stroke width is about 22px:
// under that, two dots sit inside one fingertip and read as one; over about
// 48px a child on a phone loses the next one.
const MIN_GAP = 18
const MAX_GAP = 48

describe('every letter is dotted at an even pace', () => {
  it.each(CURRICULUM.map((lesson) => [lesson.id, lesson]))('%s', (id, lesson) => {
    const gaps = gapsOf(lesson)
    expect(gaps.length, `${id} has no traceable gap`).toBeGreaterThan(0)

    const mean = gaps.reduce((sum, gap) => sum + gap.distance, 0) / gaps.length
    expect(mean, `${id} mean gap`).toBeGreaterThanOrEqual(MIN_GAP)
    expect(mean, `${id} mean gap`).toBeLessThanOrEqual(MAX_GAP)

    for (const { index, distance } of gaps) {
      const where = `${id}[${index}] gap ${distance.toFixed(2)}px vs mean ${mean.toFixed(2)}px`
      expect(distance, where).toBeGreaterThanOrEqual(MIN_GAP)
      expect(distance, where).toBeLessThanOrEqual(MAX_GAP)
      expect(Math.abs(distance - mean) / mean, where).toBeLessThanOrEqual(SPREAD)
    }
  })
})
