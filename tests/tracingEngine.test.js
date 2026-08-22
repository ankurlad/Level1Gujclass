import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HIT_RADIUS,
  DEFAULT_SNAP_RADIUS,
  createTracingSession,
} from '../src/lib/tracingEngine.js'
import { CANVAS_H, CANVAS_W, canvasToPathXRaw } from '../src/lib/waypoints.js'

// A straight horizontal run across the middle of the box. Simple enough that
// every expected distance below can be read off by hand.
const LINE = [
  { x: 10, y: 50, label: '1' },
  { x: 50, y: 50, label: '2' },
  { x: 90, y: 50, label: '3' },
]

// Two horizontal runs with a pen lift between them. The connector from (90,20)
// to (10,80) passes exactly through (50,50), which is what makes this shape
// worth testing: if the engine treated the gap as ideal path, a sample at
// (50,50) would score as perfect instead of 30 units off.
const SPLIT = [
  { x: 10, y: 20, label: '1' },
  { x: 90, y: 20, label: '2' },
  { x: 10, y: 80, label: '3', moveTo: true },
  { x: 90, y: 80, label: '4' },
]

// Walk a session along a list of points as one stroke.
const trace = (session, points) => {
  session.startStroke()
  const results = points.map(([x, y]) => session.addPoint(x, y))
  session.endStroke()
  return results
}

// Every waypoint, dead centre, in order — the trace that must score 100.
const exactly = (waypoints) => waypoints.map((wp) => [wp.x, wp.y])

describe('sequential waypoint validation', () => {
  it('only accepts the next waypoint in order', () => {
    const session = createTracingSession(LINE)
    session.startStroke()

    // Waypoint 3 first: right on the dot, but out of turn.
    const skipped = session.addPoint(90, 50)
    expect(skipped.hit).toBe(false)
    expect(session.nextWaypoint()).toMatchObject({ index: 0, label: '1' })

    // Waypoint 2 next: still out of turn while 1 is pending.
    expect(session.addPoint(50, 50).hit).toBe(false)
    expect(session.getScore().hitCount).toBe(0)

    // In order, they all land.
    expect(session.addPoint(10, 50)).toMatchObject({ hit: true, waypointIndex: 0 })
    expect(session.addPoint(50, 50)).toMatchObject({ hit: true, waypointIndex: 1 })
    expect(session.addPoint(90, 50)).toMatchObject({ hit: true, waypointIndex: 2, complete: true })
    expect(session.isComplete()).toBe(true)
  })

  it('claims a waypoint once, not once per sample sitting on it', () => {
    const session = createTracingSession(LINE)
    trace(session, [
      [10, 50],
      [10, 50],
      [10.5, 50],
    ])

    expect(session.getScore()).toMatchObject({ hitCount: 1, total: 3, complete: false })
    expect(session.getCompletedWaypoints()).toEqual([0])
  })

  it('reports the next waypoint and nothing after the last one', () => {
    const session = createTracingSession(LINE)
    expect(session.nextWaypoint()).toMatchObject({ index: 0, x: 10, y: 50 })

    trace(session, exactly(LINE))
    expect(session.nextWaypoint()).toBeNull()
  })

  it('has nothing to complete without waypoints', () => {
    const session = createTracingSession([])
    expect(session.nextWaypoint()).toBeNull()
    expect(session.isComplete()).toBe(false)
    expect(session.getScore()).toMatchObject({ total: 0, fraction: 0, complete: false })
    // A sample against an empty path is off no ideal line in particular.
    expect(session.addPoint(50, 50)).toMatchObject({ hit: false, deviation: null })
  })
})

describe('hit radius', () => {
  it('is a radius, in percent of the box, not a pixel count', () => {
    const session = createTracingSession(LINE, { hitRadius: 5 })

    session.startStroke()
    expect(session.addPoint(15.5, 50).hit).toBe(false) // 5.5 away
    expect(session.addPoint(10, 44).hit).toBe(false) // 6 away, on the other axis
    expect(session.addPoint(13.1, 46).hit).toBe(false) // 5.06 on the diagonal
    expect(session.addPoint(13, 46).hit).toBe(true) // 5 exactly: the radius is inclusive
  })

  it('is a circle on screen, not an ellipse, once yScale is declared', () => {
    // App.jsx's numbers: the 28px radius the app has always used, in a
    // 380x320 box. 28px is 7.37% of the box width but 8.75% of its height, so
    // an uncorrected path-space radius is an ellipse: the same 7.37 units
    // vertically is only 23.6px, and the child is held to a stricter standard
    // for going up than for going sideways.
    const opts = { hitRadius: canvasToPathXRaw(28), yScale: CANVAS_H / CANVAS_W }
    const target = { x: 50, y: 50, label: '1' }
    const belowBy = (px) => 50 + (px * 100) / CANVAS_H

    // 25px below the waypoint: inside a 28px circle.
    expect(createTracingSession([target], opts).addPoint(50, belowBy(25)).hit).toBe(true)
    // 29px below: outside it.
    expect(createTracingSession([target], opts).addPoint(50, belowBy(29)).hit).toBe(false)

    // Same 25px, no yScale: rejected, because 25px is 7.81 path-y units and
    // the uncorrected metric compares that straight against 7.37.
    const uncorrected = createTracingSession([target], { hitRadius: opts.hitRadius })
    expect(uncorrected.addPoint(50, belowBy(25)).hit).toBe(false)
  })

  it('defaults to a fingertip-sized radius', () => {
    const session = createTracingSession(LINE)
    expect(session.hitRadius).toBe(DEFAULT_HIT_RADIUS)
    expect(session.snapRadius).toBe(DEFAULT_SNAP_RADIUS)
  })
})

describe('accuracy', () => {
  it('scores a perfect trace 100', () => {
    const session = createTracingSession(LINE)
    trace(session, [
      [10, 50],
      [20, 50],
      [30, 50],
      [50, 50],
      [70, 50],
      [90, 50],
    ])

    expect(session.getMeanDeviation()).toBeCloseTo(0, 10)
    expect(session.getAccuracy()).toBeCloseTo(100, 10)
    expect(session.isComplete()).toBe(true)
  })

  it('scores a badly off trace low', () => {
    const session = createTracingSession(LINE)
    // The same left-to-right sweep, but 20 units below the line — nearly three
    // hit radii of drift, sustained the whole way.
    trace(session, [
      [10, 70],
      [30, 70],
      [50, 70],
      [70, 70],
      [90, 70],
    ])

    expect(session.getMeanDeviation()).toBeCloseTo(20, 10)
    expect(session.getAccuracy()).toBe(0)
    // ...and it never touched a waypoint, so it is not complete either.
    expect(session.isComplete()).toBe(false)
  })

  it('puts a wobbly-but-honest trace in between', () => {
    const session = createTracingSession(LINE, { accuracyTolerance: 10 })
    trace(session, [
      [10, 52],
      [30, 48],
      [50, 53],
      [70, 47],
      [90, 50],
    ])

    // Mean |deviation| = (2 + 2 + 3 + 3 + 0) / 5 = 2 of a 10 tolerance.
    expect(session.getMeanDeviation()).toBeCloseTo(2, 10)
    expect(session.getAccuracy()).toBeCloseTo(80, 10)
  })

  it('is a mean, so one flinch does not erase a good trace', () => {
    const steady = createTracingSession(LINE, { accuracyTolerance: 10 })
    trace(steady, Array.from({ length: 20 }, (_, i) => [10 + i * 4, 50]))

    const flinched = createTracingSession(LINE, { accuracyTolerance: 10 })
    trace(flinched, [
      ...Array.from({ length: 19 }, (_, i) => [10 + i * 4, 50]),
      [86, 70], // one wild sample
    ])

    expect(steady.getAccuracy()).toBeCloseTo(100, 10)
    expect(flinched.getAccuracy()).toBeGreaterThan(85)
  })

  it('measures distance to the nearest segment, not the nearest waypoint', () => {
    // Halfway between waypoints 1 and 2 and exactly on the line. Nearest
    // waypoint is 20 units away; nearest segment is 0.
    const session = createTracingSession(LINE)
    session.startStroke()
    expect(session.addPoint(30, 50).deviation).toBeCloseTo(0, 10)
    expect(session.getAccuracy()).toBeCloseTo(100, 10)
  })

  it('scores an untraced letter 0, not 100', () => {
    // No ink is no evidence. 100 here would hand a perfect score to a child
    // who never touched the screen.
    expect(createTracingSession(LINE).getAccuracy()).toBe(0)
  })

  it('does not depend on where the strokes were broken', () => {
    const points = [
      [10, 51],
      [30, 49],
      [50, 52],
      [70, 48],
      [90, 50],
    ]

    const single = createTracingSession(LINE)
    trace(single, points)

    const split = createTracingSession(LINE)
    trace(split, points.slice(0, 2))
    trace(split, points.slice(2))

    expect(split.getAccuracy()).toBeCloseTo(single.getAccuracy(), 10)
    expect(split.getStrokes()).toHaveLength(2)
    expect(single.getStrokes()).toHaveLength(1)
  })
})

describe('a moveTo in the middle of the path', () => {
  it('breaks the ideal path so the pen-lift gap is not traceable', () => {
    const session = createTracingSession(SPLIT)
    session.startStroke()

    // Dead centre of the box: on the connector between the two subpaths, and
    // 30 units from either real one.
    expect(session.addPoint(50, 50).deviation).toBeCloseTo(30, 10)
    // Sitting on either actual run is perfect.
    expect(session.addPoint(50, 20).deviation).toBeCloseTo(0, 10)
    expect(session.addPoint(50, 80).deviation).toBeCloseTo(0, 10)
  })

  it('still counts the moveTo waypoint in sequence', () => {
    // A pen lift changes the geometry, not the order: waypoint 3 is claimed
    // after 2 exactly like any other.
    const session = createTracingSession(SPLIT)

    trace(session, exactly(SPLIT.slice(0, 2)))
    expect(session.nextWaypoint()).toMatchObject({ index: 2, moveTo: true })

    trace(session, exactly(SPLIT.slice(2)))
    expect(session.isComplete()).toBe(true)
    expect(session.getCompletedWaypoints()).toEqual([0, 1, 2, 3])
  })

  it('scores a trace that drags across the gap below one that lifts', () => {
    const lifted = createTracingSession(SPLIT)
    trace(lifted, [
      [10, 20],
      [50, 20],
      [90, 20],
    ])
    trace(lifted, [
      [10, 80],
      [50, 80],
      [90, 80],
    ])

    const dragged = createTracingSession(SPLIT)
    trace(dragged, [
      [10, 20],
      [50, 20],
      [90, 20],
      [50, 50], // straight across the gap instead of lifting
      [10, 80],
      [50, 80],
      [90, 80],
    ])

    expect(lifted.getAccuracy()).toBeCloseTo(100, 10)
    expect(dragged.getAccuracy()).toBeLessThan(lifted.getAccuracy())
  })
})

describe('snapping to the centreline', () => {
  it('projects onto the nearest segment and reports whether it is on the line', () => {
    const session = createTracingSession(LINE, { snapRadius: 5 })
    session.startStroke()

    const near = session.addPoint(30, 53)
    expect(near.onPath).toBe(true)
    expect(near.snapped).toEqual({ x: 30, y: 50 })

    const far = session.addPoint(30, 60)
    expect(far.onPath).toBe(false)
    expect(far.snapped).toEqual({ x: 30, y: 50 })
  })

  it('clamps the projection to the ends of the path', () => {
    // Past the end of the last segment the nearest ideal point is the final
    // waypoint, not a point on the segment's infinite extension.
    const session = createTracingSession(LINE)
    const result = session.addPoint(200, 50)

    expect(result.snapped).toEqual({ x: 90, y: 50 })
    expect(result.deviation).toBeCloseTo(110, 10)
  })

  it('undoes the yScale correction so the snap comes back in path space', () => {
    const session = createTracingSession(LINE, { yScale: CANVAS_H / CANVAS_W })
    expect(session.addPoint(30, 60).snapped.y).toBeCloseTo(50, 10)
  })
})

describe('stroke bookkeeping', () => {
  it('accepts a sample that arrives without a startStroke', () => {
    // Pointer capture can be lost and a move can outrun its down event; the
    // child's ink is still ink.
    const session = createTracingSession(LINE)
    expect(session.addPoint(10, 50).hit).toBe(true)
    expect(session.getStrokes()).toEqual([[{ x: 10, y: 50 }]])
  })

  it('does not merge two strokes when the pen-up is missed', () => {
    const session = createTracingSession(LINE)
    session.startStroke()
    session.addPoint(10, 50)
    session.startStroke() // no endStroke in between
    session.addPoint(50, 50)

    expect(session.getStrokes()).toHaveLength(2)
  })

  it('summarises the stroke on endStroke', () => {
    const session = createTracingSession(LINE)
    session.startStroke()
    session.addPoint(10, 50)
    session.addPoint(50, 50)
    session.addPoint(90, 50)

    expect(session.endStroke()).toMatchObject({ points: 3, complete: true, accuracy: 100 })
    // Closing a stroke that was never opened is a no-op, not a crash.
    expect(session.endStroke()).toBeNull()
  })

  it('ignores samples that are not finite numbers', () => {
    const session = createTracingSession(LINE)
    trace(session, [
      [10, 50],
      [Number.NaN, 50],
      [undefined, undefined],
      [50, Infinity],
    ])

    expect(session.getStrokes()).toEqual([[{ x: 10, y: 50 }]])
    expect(session.getAccuracy()).toBeCloseTo(100, 10)
  })
})

describe('reset', () => {
  it('starts clean', () => {
    const session = createTracingSession(LINE)
    trace(session, [
      [10, 70],
      [10, 50],
      [50, 50],
      [90, 50],
    ])
    expect(session.isComplete()).toBe(true)

    session.reset()

    expect(session.isComplete()).toBe(false)
    expect(session.nextWaypoint()).toMatchObject({ index: 0 })
    expect(session.getCompletedWaypoints()).toEqual([])
    expect(session.getStrokes()).toEqual([])
    expect(session.getAccuracy()).toBe(0)
    expect(session.getMeanDeviation()).toBe(0)
    expect(session.getScore()).toMatchObject({ hitCount: 0, total: 3, complete: false })
  })

  it('drops a half-open stroke, so the next pen-down is the next stroke', () => {
    const session = createTracingSession(LINE)
    session.startStroke()
    session.addPoint(10, 50)

    session.reset()
    session.addPoint(10, 50)

    expect(session.getStrokes()).toHaveLength(1)
    expect(session.getCompletedWaypoints()).toEqual([0])
  })
})

describe('the waypoints a session is holding', () => {
  it('drops entries that are not points instead of throwing', () => {
    const session = createTracingSession([
      { x: 10, y: 50, label: '1' },
      null,
      { x: 'nope', y: 50, label: '2' },
      { x: 90, y: 50, label: '3' },
    ])

    expect(session.waypoints).toHaveLength(2)
    expect(session.getScore().total).toBe(2)
  })

  it('is frozen, so a caller cannot desynchronise the hit test', () => {
    const source = [{ x: 10, y: 50, label: '1' }]
    const session = createTracingSession(source)

    expect(Object.isFrozen(session.waypoints)).toBe(true)
    source[0].x = 90
    // The session kept its own copy: the original coordinate still hits.
    expect(session.addPoint(10, 50).hit).toBe(true)
  })
})

describe('the app’s own configuration', () => {
  it('reproduces the 28px hit radius App.jsx has always used', () => {
    // Guards the migration: the child's tolerance must not have moved when
    // the hit test left App.jsx.
    const opts = { hitRadius: canvasToPathXRaw(28), yScale: CANVAS_H / CANVAS_W }
    const session = createTracingSession([{ x: 50, y: 50, label: '1' }], opts)

    const pixelDistanceOf = (dxPx, dyPx) =>
      createTracingSession([{ x: 50, y: 50, label: '1' }], opts).addPoint(
        50 + (dxPx * 100) / CANVAS_W,
        50 + (dyPx * 100) / CANVAS_H
      ).hit

    expect(session.hitRadius).toBeCloseTo(7.368, 3)
    expect(pixelDistanceOf(27, 0)).toBe(true)
    expect(pixelDistanceOf(0, 27)).toBe(true)
    expect(pixelDistanceOf(20, 19)).toBe(true) // 27.6px
    expect(pixelDistanceOf(29, 0)).toBe(false)
    expect(pixelDistanceOf(0, 29)).toBe(false)
    expect(pixelDistanceOf(20, 20)).toBe(false) // 28.3px
  })
})
