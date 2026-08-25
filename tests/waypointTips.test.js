// @vitest-environment node
// The stroke-end contract: the dot a child is told to start (or finish) a
// stroke on has its CENTRE on the place that stroke visibly starts.
//
// Two things had to be true for that and neither was:
//
//   1. The waypoint had to be the point where the stroke's centreline meets
//      the ink. Thinning's medial axis stops about a half stroke width inside
//      a terminal, so the emitted endpoint sat behind the visible tip;
//      tools/glyph/caps.js now walks the centreline's tangent out to the ink
//      boundary. The first attempt took the farthest ink pixel in a cone
//      instead, which on an obliquely cut terminal is the outer CORNER — the
//      dot's centre landed on the edge of the letter with half the ring off
//      the band. Those are the tipExtend cases below.
//   2. The dot had to be *drawn* centred on that point. It is positioned by
//      left/top plus an inline `transform: translate(-50%, -50%)`, and the
//      pulse animation on the "next" dot used to animate `transform` — which
//      replaces the inline translate rather than composing with it, dropping
//      the dot half its width right and half its height down. That is the
//      keyframes case below, and dot 1 of a fresh letter is always the "next"
//      dot, so it was the one every child saw.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { CURRICULUM } from '../src/curriculum.js'
import { CANVAS_H, CANVAS_W, PATH_MAX } from '../src/lib/waypoints.js'
import { tipExtend } from '../tools/glyph/caps.js'

// --- synthetic masks -------------------------------------------------------

const W = 64
const H = 48

/** A mask from a predicate, so each case reads as the shape it is testing. */
const maskOf = (isInk) => {
  const mask = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isInk(x, y)) mask[y * W + x] = 1
  return mask
}

// A horizontal bar 11px thick (half width 5), square ends at x = 10 and x = 40.
const squareBar = maskOf((x, y) => x >= 10 && x <= 40 && y >= 15 && y <= 25)

// The same bar with its right end cut back on a diagonal, the way every
// terminal in this font is cut: the top-right CORNER (50, 15) is further from
// the centreline's end than the point the centreline itself exits at, (45, 20).
const obliqueBar = maskOf((x, y) => x >= 10 && y >= 15 && y <= 25 && x <= 40 + (25 - y))

// A horizontal bar running into a 31px-wide vertical one. The horizontal
// stroke's right end is a junction, not a cap: the ink carries on.
const teeJunction = maskOf(
  (x, y) => (x >= 10 && x <= 40 && y >= 15 && y <= 25) || (x >= 30 && x <= 60 && y >= 5 && y <= 40),
)

// A dense centreline, one pixel per step, the way the router hands them over.
const axis = (fromX, toX, y) => {
  const step = toX > fromX ? 1 : -1
  const points = []
  for (let x = fromX; x !== toX + step; x += step) points.push([x, y])
  return points
}

describe('tipExtend', () => {
  it('carries a stroke end out to the cap face along the centreline', () => {
    const { points, moved } = tipExtend(squareBar, W, H, axis(15, 35, 20), { start: true })
    expect(moved).toEqual(['start+5.0'])
    expect(points[0]).toEqual([10, 20])
    // Everything else is untouched — this moves an endpoint, not a stroke.
    expect(points.slice(1)).toEqual(axis(16, 35, 20))
  })

  it('lands on the centreline, not on the terminal corner', () => {
    const { points } = tipExtend(obliqueBar, W, H, axis(20, 35, 20), { end: true })
    // (45, 20) is where the centreline leaves the ink. (50, 15) is the corner,
    // which is what "the farthest ink pixel in a cone" used to return.
    expect(points.at(-1)).toEqual([45, 20])
  })

  it('leaves a stroke that ends at a junction where it is', () => {
    const stroke = axis(15, 32, 20)
    const { points, moved } = tipExtend(teeJunction, W, H, stroke, { start: true, end: true })
    expect(moved).toEqual(['start+5.0'])
    expect(points.at(-1)).toEqual([32, 20])
  })

  it('reads its direction over a baseline, not off the last pixel', () => {
    // The last centreline pixel steps diagonally, as a thinned skeleton's
    // often does. One step says "up and left" (45 degrees off); ten pixels of
    // it say "left", which is where the stroke actually goes.
    const stroke = [[15, 19], ...axis(16, 35, 20)]
    const { points } = tipExtend(squareBar, W, H, stroke, { start: true })
    expect(points[0][0]).toBe(10)
    // Off the axis by at most a pixel — NOT up at the corner on row 15.
    expect(Math.abs(points[0][1] - 19)).toBeLessThanOrEqual(1)
  })

  it('refuses an end it was not offered', () => {
    const stroke = axis(15, 35, 20)
    const { points, moved } = tipExtend(squareBar, W, H, stroke, {})
    expect(moved).toEqual([])
    expect(points).toEqual(stroke)
  })
})

// --- the shipped data ------------------------------------------------------

const inkDir = fileURLToPath(new URL('../tools/glyph/ink/', import.meta.url))

/** The committed ink for a letter, as an "is this pixel inked" predicate. */
const inkTest = (id) => {
  const glyph = JSON.parse(readFileSync(`${inkDir}${id}.json`, 'utf8'))
  return (x, y) => {
    const ix = Math.round(x)
    const runs = glyph.rows[Math.round(y)] ?? []
    for (let i = 0; i < runs.length; i += 2) if (ix >= runs[i] && ix < runs[i + 1]) return true
    return false
  }
}

describe('every shipped waypoint sits on the letter it traces', () => {
  it.each(CURRICULUM.map((lesson) => [lesson.id, lesson]))('%s', (id, lesson) => {
    const onInk = inkTest(id)
    lesson.waypoints.forEach((wp, i) => {
      const x = (wp.x / PATH_MAX) * CANVAS_W
      const y = (wp.y / PATH_MAX) * CANVAS_H
      expect(onInk(x, y), `${id}[${i}] at (${x.toFixed(1)}, ${y.toFixed(1)}) is off the glyph`).toBe(
        true,
      )
    })
  })
})

// --- the dot's own geometry ------------------------------------------------

describe('the next-waypoint pulse', () => {
  const css = readFileSync(fileURLToPath(new URL('../src/index.css', import.meta.url)), 'utf8')

  it('does not animate transform, which would un-centre the dot', () => {
    const at = css.indexOf('@keyframes pulse-glow')
    expect(at, 'pulse-glow keyframes').toBeGreaterThan(-1)
    const body = css.slice(at, css.indexOf('\n}', at))
    // A running animation outranks the inline translate(-50%, -50%) that puts
    // the dot's centre on the waypoint; a transform keyframe here silently
    // moves the dot half its size down and right of the point it marks.
    expect(body).not.toMatch(/transform\s*:/)
  })
})
