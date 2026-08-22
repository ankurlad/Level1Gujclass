import { describe, expect, it } from 'vitest'
import { CURRICULUM } from '../src/curriculum.js'
import {
  CANVAS_H,
  CANVAS_W,
  PATH_MAX,
  canvasToPathX,
  canvasToPathY,
  isLegacyPixelWaypoints,
  normalizeWaypoints,
  pathToCanvasX,
  pathToCanvasY,
  toPathSpaceWaypoints,
} from '../src/lib/waypoints.js'

// Gujarati block, including the virama used by conjuncts such as જ્ઞ.
const GUJARATI = /[઀-૿]/

const TEXT_FIELDS = ['id', 'letter', 'english', 'word', 'wordEnglish', 'emoji', 'instructions']

describe('CURRICULUM', () => {
  it('teaches all 34 consonants', () => {
    expect(Array.isArray(CURRICULUM)).toBe(true)
    expect(CURRICULUM).toHaveLength(34)
  })

  it('has unique ids', () => {
    const ids = CURRICULUM.map((lesson) => lesson.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has unique letters', () => {
    const letters = CURRICULUM.map((lesson) => lesson.letter)
    expect(new Set(letters).size).toBe(letters.length)
  })

  describe.each(CURRICULUM.map((lesson, index) => [index, lesson.id, lesson]))(
    '[%i] %s',
    (index, id, lesson) => {
      it('has every required field as a non-empty string', () => {
        for (const field of TEXT_FIELDS) {
          expect(typeof lesson[field], field).toBe('string')
          expect(lesson[field].trim(), field).not.toBe('')
        }
      })

      it('has a slug id and a latin transliteration', () => {
        // ids are used as storage key suffixes (guj:custom_waypoints_<id>)
        // and as React keys, so they must stay url/storage safe.
        expect(lesson.id).toMatch(/^[a-z][a-z0-9]*$/)
        expect(lesson.english).toMatch(/^[A-Za-z]+$/)
      })

      it('has Gujarati script for the glyph and the example word', () => {
        expect(lesson.letter).toMatch(GUJARATI)
        expect(lesson.word).toMatch(GUJARATI)
      })

      it('has a traceable waypoint path', () => {
        expect(Array.isArray(lesson.waypoints)).toBe(true)
        // Two points is the minimum that describes a stroke.
        expect(lesson.waypoints.length).toBeGreaterThanOrEqual(2)
      })

      it('has waypoints inside the 0-100 path space', () => {
        lesson.waypoints.forEach((wp, i) => {
          const at = `${id}[${i}]`
          expect(typeof wp.x, `${at}.x`).toBe('number')
          expect(typeof wp.y, `${at}.y`).toBe('number')
          expect(Number.isFinite(wp.x), `${at}.x`).toBe(true)
          expect(Number.isFinite(wp.y), `${at}.y`).toBe(true)
          expect(wp.x, `${at}.x`).toBeGreaterThanOrEqual(0)
          expect(wp.x, `${at}.x`).toBeLessThanOrEqual(PATH_MAX)
          expect(wp.y, `${at}.y`).toBeGreaterThanOrEqual(0)
          expect(wp.y, `${at}.y`).toBeLessThanOrEqual(PATH_MAX)
        })
      })

      it('keeps its coordinates at hundredth precision', () => {
        // Anything finer is noise the old pixel data carried in
        // ("x": 124.50000000000001) and makes the exported JSON unreadable.
        lesson.waypoints.forEach((wp, i) => {
          expect(Math.round(wp.x * 100), `${id}[${i}].x`).toBeCloseTo(wp.x * 100, 9)
          expect(Math.round(wp.y * 100), `${id}[${i}].y`).toBeCloseTo(wp.y * 100, 9)
        })
      })

      it('numbers its waypoints 1..n in order', () => {
        // The tracing engine validates strokes sequentially and the UI prints
        // these labels in the guide bubbles, so order and labels must agree.
        const labels = lesson.waypoints.map((wp) => wp.label)
        expect(labels).toEqual(lesson.waypoints.map((_, i) => String(i + 1)))
      })

      it('only lifts the pen between strokes', () => {
        lesson.waypoints.forEach((wp, i) => {
          if ('moveTo' in wp) {
            expect(wp.moveTo, `${id}[${i}].moveTo`).toBe(true)
          }
        })
        // A pen-up before the first point would draw nothing.
        expect(lesson.waypoints[0].moveTo).toBeUndefined()
      })
    },
  )
})

describe('path space', () => {
  it('puts 0 at the top-left corner and 100 at the bottom-right', () => {
    expect(pathToCanvasX(0)).toBe(0)
    expect(pathToCanvasY(0)).toBe(0)
    expect(pathToCanvasX(PATH_MAX)).toBe(CANVAS_W)
    expect(pathToCanvasY(PATH_MAX)).toBe(CANVAS_H)
    expect(pathToCanvasX(50)).toBe(CANVAS_W / 2)
    expect(pathToCanvasY(50)).toBe(CANVAS_H / 2)
  })

  it('round-trips a pixel through the path space to within a hundredth', () => {
    for (const px of [0, 1, 137, 199, 379, 380]) {
      expect(pathToCanvasX(canvasToPathX(px))).toBeCloseTo(px, 1)
    }
    for (const py of [0, 1, 137, 199, 319, 320]) {
      expect(pathToCanvasY(canvasToPathY(py))).toBeCloseTo(py, 1)
    }
  })

  it('clamps a pixel outside the box onto its edge', () => {
    expect(canvasToPathX(-40)).toBe(0)
    expect(canvasToPathY(-40)).toBe(0)
    expect(canvasToPathX(CANVAS_W + 40)).toBe(PATH_MAX)
    expect(canvasToPathY(CANVAS_H + 40)).toBe(PATH_MAX)
  })
})

describe('v1 -> v2 coordinate migration', () => {
  // The detector's premise: a letterform in path space never reaches 100, so
  // "something is past 100" can only mean pixels. If a future letter is
  // calibrated out to the edge this is the test that catches it.
  it('reads no shipped letter as legacy pixels', () => {
    for (const lesson of CURRICULUM) {
      expect(isLegacyPixelWaypoints(lesson.waypoints), lesson.id).toBe(false)
    }
  })

  it('flags a v1 override, in either axis', () => {
    expect(isLegacyPixelWaypoints([{ x: 201, y: 87, label: '1' }])).toBe(true)
    expect(isLegacyPixelWaypoints([{ x: 52.89, y: 187, label: '1' }])).toBe(true)
    // One point past 100 condemns the whole array — the strokes of one letter
    // were saved together and are always in the same space.
    expect(
      isLegacyPixelWaypoints([
        { x: 40, y: 30, label: '1' },
        { x: 227, y: 185, label: '2' },
      ]),
    ).toBe(true)
  })

  it('leaves a v2 override alone', () => {
    expect(isLegacyPixelWaypoints([{ x: 52.89, y: 27.19, label: '1' }])).toBe(false)
    expect(isLegacyPixelWaypoints([{ x: 100, y: 100, label: '1' }])).toBe(false)
    expect(isLegacyPixelWaypoints([])).toBe(false)
    expect(isLegacyPixelWaypoints(null)).toBe(false)
  })

  it('converts a v1 override to the position it used to draw at', () => {
    const v1 = [
      { x: 201, y: 87, label: '1' },
      { x: 235, y: 137, label: '2', moveTo: true },
    ]
    const v2 = toPathSpaceWaypoints(v1)

    expect(v2).toEqual([
      { x: 52.89, y: 27.19, label: '1' },
      { x: 61.84, y: 42.81, label: '2', moveTo: true },
    ])
    // The whole point: the migrated waypoint lands where the old one drew.
    v2.forEach((wp, i) => {
      expect(pathToCanvasX(wp.x)).toBeCloseTo(v1[i].x, 1)
      expect(pathToCanvasY(wp.y)).toBeCloseTo(v1[i].y, 1)
    })
  })

  it('is idempotent, so a re-read cannot shrink an override twice', () => {
    const v1 = [{ x: 201, y: 87, label: '1' }]
    const once = normalizeWaypoints(v1)
    expect(once).not.toBe(v1)
    expect(once).toEqual([{ x: 52.89, y: 27.19, label: '1' }])
    // Same array back, which is also how the caller knows not to rewrite it.
    expect(normalizeWaypoints(once)).toBe(once)
  })
})
