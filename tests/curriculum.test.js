import { describe, expect, it } from 'vitest'
import { CURRICULUM } from '../src/curriculum.js'

// The logical drawing space every waypoint is expressed in. Mirrors CANVAS_W /
// CANVAS_H in src/App.jsx; PR 5 replaces both with a normalised 0-100 path
// space, at which point these two constants become 100/100.
const CANVAS_W = 380
const CANVAS_H = 320

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
        // ids are used as localStorage key suffixes (guj_custom_waypoints_<id>)
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

      it('has waypoints inside the canvas', () => {
        lesson.waypoints.forEach((wp, i) => {
          const at = `${id}[${i}]`
          expect(typeof wp.x, `${at}.x`).toBe('number')
          expect(typeof wp.y, `${at}.y`).toBe('number')
          expect(Number.isFinite(wp.x), `${at}.x`).toBe(true)
          expect(Number.isFinite(wp.y), `${at}.y`).toBe(true)
          expect(wp.x, `${at}.x`).toBeGreaterThanOrEqual(0)
          expect(wp.x, `${at}.x`).toBeLessThanOrEqual(CANVAS_W)
          expect(wp.y, `${at}.y`).toBeGreaterThanOrEqual(0)
          expect(wp.y, `${at}.y`).toBeLessThanOrEqual(CANVAS_H)
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
