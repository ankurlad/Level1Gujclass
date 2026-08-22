import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BRUSH_WIDTH_MAX,
  POINTS_MAX,
  isPasscode,
  parseWaypointsJson,
  parseWholeNumber,
  passcodeDigits,
  sanitizeStickerIds,
  toBrushWidth,
  toPoints,
  validateWaypointsValue,
} from '../src/lib/validate.js'

// PR 12, the unit half: the boundary itself. Every one of these used to be an
// idiom at a read site that could not fail — Number(stored) || 0,
// Array.isArray(saved), parseInt(answer, 10) — so the interesting assertion in
// most of them is not the value that comes back but that something *said* the
// input was wrong.

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('bounded numbers', () => {
  it('clamps a points ledger past the cap and says so', () => {
    expect(toPoints(100000000)).toBe(POINTS_MAX)
    expect(console.warn).toHaveBeenCalledOnce()
    expect(console.warn.mock.calls[0][0]).toContain('999999')
  })

  it('refuses a negative ledger', () => {
    expect(toPoints(-40)).toBe(0)
  })

  it('coerces the v0 string form, which is what Number(...) || 0 was for', () => {
    expect(toPoints('250')).toBe(250)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('falls back for anything that is not a number', () => {
    for (const bad of ['', 'lots', null, undefined, NaN, Infinity, {}, ['12']]) {
      expect(toPoints(bad)).toBe(0)
    }
    expect(console.warn).toHaveBeenCalledTimes(8)
  })

  it('bounds the brush width, which reaches ctx.lineWidth directly', () => {
    expect(toBrushWidth('24')).toBe(24)
    expect(toBrushWidth(0)).toBe(1)
    expect(toBrushWidth(5000)).toBe(BRUSH_WIDTH_MAX)
    expect(toBrushWidth('thick')).toBe(16)
  })
})

describe('unlocked stickers', () => {
  it('keeps the good entries and drops the bad ones', () => {
    expect(sanitizeStickerIds(['st1', 'not-a-sticker', 'st6'])).toEqual(['st1', 'st6'])
    expect(console.warn).toHaveBeenCalledOnce()
    expect(console.warn.mock.calls[0][0]).toContain('not-a-sticker')
  })

  it('drops non-strings and repeats', () => {
    expect(sanitizeStickerIds(['st1', null, 'st1', 42, { id: 'st2' }])).toEqual(['st1'])
    expect(console.warn).toHaveBeenCalledTimes(4)
  })

  it('returns the same array when there is nothing to drop', () => {
    const clean = ['st1', 'st2']
    expect(sanitizeStickerIds(clean)).toBe(clean)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('starts empty when the stored value is not a list at all', () => {
    expect(sanitizeStickerIds('st1,st2')).toEqual([])
    expect(sanitizeStickerIds(null)).toEqual([])
  })
})

describe('the parent gate fields', () => {
  it('accepts exactly four digits as a passcode', () => {
    expect(isPasscode('4821')).toBe(true)
    expect(isPasscode('482')).toBe(false)
    expect(isPasscode('48210')).toBe(false)
    expect(isPasscode('48a1')).toBe(false)
    expect(isPasscode(4821)).toBe(false)
  })

  it('lets a passcode field hold nothing but four digits', () => {
    expect(passcodeDigits('4a8b2c1d5')).toBe('4821')
    expect(passcodeDigits('')).toBe('')
    expect(passcodeDigits(null)).toBe('')
  })

  it('separates "not a number" from "wrong answer" on the math gate', () => {
    expect(parseWholeNumber('17')).toBe(17)
    expect(parseWholeNumber('  17 ')).toBe(17)
    // parseInt read both of these as an answer. They are not answers.
    expect(parseWholeNumber('12abc')).toBe(null)
    expect(parseWholeNumber('')).toBe(null)
    expect(parseWholeNumber('17.5')).toBe(null)
  })
})

describe('waypoint arrays', () => {
  const PATH_SPACE = [
    { x: 52.89, y: 27.19, label: '1' },
    { x: 61.84, y: 42.81, label: '2', moveTo: true },
  ]

  it('accepts a path-space array unchanged, by identity', () => {
    const result = validateWaypointsValue(PATH_SPACE)
    expect(result.ok).toBe(true)
    expect(result.waypoints).toBe(PATH_SPACE)
    expect(result.converted).toBe(false)
  })

  // The PR 12 rule the spec is most explicit about: a coordinate past 100 is
  // not out of range, it is the pre-v2 pixel format.
  it('accepts the old 0-380 pixel format and normalises it', () => {
    const pixels = [
      { x: 201, y: 87, label: '1' },
      { x: 235, y: 137, label: '2', moveTo: true },
    ]
    const result = validateWaypointsValue(pixels)

    expect(result.ok).toBe(true)
    expect(result.converted).toBe(true)
    expect(result.waypoints).toEqual(PATH_SPACE)
    // Not clamped to the box edge, which is what a naive 0-100 range check
    // would have done to every point in the file.
    expect(result.waypoints.every((wp) => wp.x < 100 && wp.y < 100)).toBe(true)
  })

  it('names the entry index of a coordinate outside the range of its own format', () => {
    const result = validateWaypointsValue([
      { x: 10, y: 10, label: '1' },
      { x: 4000, y: 20, label: '2' },
    ])

    expect(result.ok).toBe(false)
    expect(result.message).toContain('index 1')
    expect(result.message).toContain('4000')
    expect(result.message).toContain('380')
  })

  it('rejects a negative coordinate in the path space, with its index', () => {
    const result = validateWaypointsValue([
      { x: 10, y: 10, label: '1' },
      { x: 20, y: -5, label: '2' },
    ])

    expect(result.ok).toBe(false)
    expect(result.message).toContain('index 1')
    expect(result.message).toContain('0-100')
  })

  it('rejects a coordinate that is not a finite number', () => {
    for (const y of ['30', null, undefined, Number.NaN, Infinity]) {
      const result = validateWaypointsValue([{ x: 10, y, label: '1' }])
      expect(result.ok).toBe(false)
      expect(result.message).toContain('index 0')
      expect(result.message).toContain('y must be a finite number')
    }
  })

  it('rejects an entry that is not an object', () => {
    expect(validateWaypointsValue([[10, 20]]).message).toContain('index 0 is not an object')
    expect(validateWaypointsValue([{ x: 1, y: 1 }, null]).message).toContain('index 1')
  })

  it('takes a label as a number or a digit string, and rejects anything else', () => {
    expect(validateWaypointsValue([{ x: 1, y: 1, label: 3 }]).ok).toBe(true)
    expect(validateWaypointsValue([{ x: 1, y: 1, label: '3' }]).ok).toBe(true)
    expect(validateWaypointsValue([{ x: 1, y: 1 }]).ok).toBe(true)
    expect(validateWaypointsValue([{ x: 1, y: 1, label: '0' }]).message).toContain('label')
    expect(validateWaypointsValue([{ x: 1, y: 1, label: 'first' }]).message).toContain('label')
    expect(validateWaypointsValue([{ x: 1, y: 1, label: -2 }]).message).toContain('label')
  })

  it('takes moveTo as a boolean or not at all', () => {
    expect(validateWaypointsValue([{ x: 1, y: 1, moveTo: true }]).ok).toBe(true)
    expect(validateWaypointsValue([{ x: 1, y: 1, moveTo: false }]).ok).toBe(true)
    expect(validateWaypointsValue([{ x: 1, y: 1, moveTo: 'yes' }]).message).toContain('moveTo')
  })

  it('rejects a value that is not an array', () => {
    expect(validateWaypointsValue({ x: 1, y: 1 }).message).toContain('must be a JSON array')
    expect(validateWaypointsValue(null).message).toContain('must be a JSON array')
  })

  it('holds a paste to the two-point minimum but lets a saved empty override through', () => {
    expect(validateWaypointsValue([{ x: 1, y: 1 }], { minPoints: 2 }).message).toContain('at least 2')
    expect(validateWaypointsValue([]).ok).toBe(true)
  })
})

describe('the editor paste path', () => {
  it('parses and validates in one step', () => {
    const result = parseWaypointsJson('[{"x":10,"y":10,"label":"1"},{"x":20,"y":20,"label":"2"}]')
    expect(result.ok).toBe(true)
    expect(result.waypoints).toHaveLength(2)
  })

  it('says what is wrong with the JSON, not just that something is', () => {
    const result = parseWaypointsJson('[{"x":10,"y":10,,}]')
    expect(result.ok).toBe(false)
    expect(result.message).toContain('not valid JSON')
  })

  it('asks for a paste before complaining about its shape', () => {
    expect(parseWaypointsJson('   ').message).toContain('empty')
  })

  it('carries the schema message through, index and all', () => {
    const result = parseWaypointsJson(
      '[{"x":10,"y":10,"label":"1"},{"x":20,"y":20,"label":"two"}]'
    )
    expect(result.ok).toBe(false)
    expect(result.message).toContain('index 1')
    expect(result.message).toContain('label')
  })
})
