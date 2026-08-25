import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MASTERY_ACCURACY,
  MASTERY_MODE,
  STREAK_MILESTONES,
  TREND_WINDOW,
  bestAccuracy,
  emptyAccuracyRecords,
  isMastered,
  letterTrend,
  masteredLetters,
  recordAttempt,
  sanitizeAccuracyRecords,
  toAccuracy,
} from '../src/lib/mastery.js'
import {
  MASTERY_SHELF,
  POINTS_SHELF,
  STICKERS,
  STREAK_SHELF,
  isPurchasable,
  masteryStickerId,
  stickerById,
  streakStickerId,
} from '../src/lib/stickers.js'
import { sanitizeStickerIds } from '../src/lib/validate.js'
import { CURRICULUM } from '../src/curriculum.js'

// The rules behind the mastery stickers, the streak badges and the parent
// dashboard's trend column. All of it is pure — no React, no storage, no
// canvas — so this file drives the functions directly and the only thing it
// stubs is console.warn, which every rejection path is supposed to reach.

let warn

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  warn.mockRestore()
})

// One neat trace of `letterId` in `mode`, folded onto `records`.
const trace = (records, letterId, mode, accuracy, unlocked = []) =>
  recordAttempt(records, { letterId, mode, accuracy, unlocked })

describe('the constants the rules are written in terms of', () => {
  it('puts the bar at 85 in Challenge mode', () => {
    expect(MASTERY_ACCURACY).toBe(85)
    expect(MASTERY_MODE).toBe('challenge')
  })

  it('has two streak milestones, at 5 and 12, in ascending order', () => {
    expect(STREAK_MILESTONES).toEqual([5, 12])
  })

  it('reads the trend over seven sessions', () => {
    expect(TREND_WINDOW).toBe(7)
  })
})

describe('the sticker catalogue', () => {
  it('keeps the eight points stickers exactly as they shipped', () => {
    expect(POINTS_SHELF.map((s) => s.id)).toEqual(['st1', 'st2', 'st3', 'st4', 'st5', 'st6', 'st7', 'st8'])
    expect(POINTS_SHELF.map((s) => s.cost)).toEqual([50, 100, 150, 200, 250, 300, 350, 400])
    expect(POINTS_SHELF.every(isPurchasable)).toBe(true)
  })

  it('has one mastery sticker per curriculum letter and two streak badges', () => {
    expect(MASTERY_SHELF).toHaveLength(CURRICULUM.length)
    expect(MASTERY_SHELF.map((s) => s.letterId)).toEqual(CURRICULUM.map((lesson) => lesson.id))
    expect(STREAK_SHELF.map((s) => s.streak)).toEqual([5, 12])
  })

  it('offers nothing earned for sale', () => {
    for (const sticker of [...MASTERY_SHELF, ...STREAK_SHELF]) {
      expect(isPurchasable(sticker), sticker.id).toBe(false)
      expect(sticker.cost, sticker.id).toBeUndefined()
    }
  })

  it('gives every entry a unique id, an emoji, a label and a kind', () => {
    const ids = STICKERS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const sticker of STICKERS) {
      expect(typeof sticker.emoji, sticker.id).toBe('string')
      expect(sticker.emoji.length, sticker.id).toBeGreaterThan(0)
      expect(typeof sticker.label, sticker.id).toBe('string')
      expect(['points', 'mastery', 'streak']).toContain(sticker.kind)
      expect(stickerById(sticker.id)).toBe(sticker)
    }
  })

  it('passes the stored-sticker-list validator, which is what gates a new entry', () => {
    const everyId = STICKERS.map((s) => s.id)
    expect(sanitizeStickerIds(everyId)).toEqual(everyId)
    expect(sanitizeStickerIds(['mastery_ka', 'streak_5'])).toEqual(['mastery_ka', 'streak_5'])
    expect(sanitizeStickerIds(['mastery_not_a_letter'])).toEqual([])
  })
})

describe('toAccuracy', () => {
  it('rounds to a whole number so the award and the display cannot disagree', () => {
    expect(toAccuracy(84.4)).toBe(84)
    expect(toAccuracy(84.6)).toBe(85)
    expect(toAccuracy(85)).toBe(85)
  })

  it('clamps to 0-100 and never throws on junk', () => {
    expect(toAccuracy(-5)).toBe(0)
    expect(toAccuracy(1e9)).toBe(100)
    expect(toAccuracy('nonsense')).toBe(0)
    expect(toAccuracy(undefined)).toBe(0)
    expect(toAccuracy(Number.NaN)).toBe(0)
  })
})

describe('mastery threshold', () => {
  it('does not master a letter at 84 in Challenge', () => {
    const result = trace(emptyAccuracyRecords(), 'ka', 'challenge', 84)
    expect(result.accuracy).toBe(84)
    expect(result.mastered).toBe(false)
    expect(result.newlyMastered).toBe(false)
    expect(result.neat).toBe(false)
    expect(result.awarded).toEqual([])
    expect(isMastered(result.records, 'ka')).toBe(false)
  })

  it('masters a letter at exactly 85 and awards that letter its sticker', () => {
    const result = trace(emptyAccuracyRecords(), 'ka', 'challenge', 85)
    expect(result.mastered).toBe(true)
    expect(result.newlyMastered).toBe(true)
    expect(result.neat).toBe(true)
    expect(result.awarded).toEqual([masteryStickerId('ka')])
    expect(isMastered(result.records, 'ka')).toBe(true)
  })

  it('masters a letter at 86', () => {
    const result = trace(emptyAccuracyRecords(), 'ka', 'challenge', 86)
    expect(result.mastered).toBe(true)
    expect(result.awarded).toEqual(['mastery_ka'])
  })

  it('will not master a letter from a Guided or Free trace, however neat', () => {
    for (const mode of ['guided', 'free']) {
      const result = trace(emptyAccuracyRecords(), 'ka', mode, 100)
      expect(result.mastered, mode).toBe(false)
      expect(result.awarded, mode).toEqual([])
      // The score is still kept — it is what the mode was for.
      expect(bestAccuracy(result.records, 'ka', mode), mode).toBe(100)
      expect(bestAccuracy(result.records, 'ka', 'challenge'), mode).toBe(0)
    }
  })

  it('awards a letter its sticker once, not on every neat repeat', () => {
    const first = trace(emptyAccuracyRecords(), 'ka', 'challenge', 90)
    const second = trace(first.records, 'ka', 'challenge', 95, first.awarded)
    expect(second.mastered).toBe(true)
    expect(second.newlyMastered).toBe(false)
    expect(second.awarded).toEqual([])
  })

  it('keeps the best score and does not lose mastery to a later bad trace', () => {
    const first = trace(emptyAccuracyRecords(), 'ka', 'challenge', 92)
    const second = trace(first.records, 'ka', 'challenge', 40, ['mastery_ka'])
    expect(bestAccuracy(second.records, 'ka')).toBe(92)
    expect(isMastered(second.records, 'ka')).toBe(true)
    expect(second.neat).toBe(false)
  })

  it('lists mastered letters in curriculum order', () => {
    let records = emptyAccuracyRecords()
    for (const id of ['ga', 'ka']) records = trace(records, id, 'challenge', 90).records
    records = trace(records, 'kha', 'challenge', 50).records
    expect(masteredLetters(records)).toEqual(['ka', 'ga'])
  })

  it('ignores a trace scored against a letter or a mode this build does not have', () => {
    const base = emptyAccuracyRecords()
    expect(trace(base, 'not_a_letter', 'challenge', 99).records.letters).toEqual({})
    expect(trace(base, 'ka', 'hyperdrive', 99).records.letters).toEqual({})
    expect(warn).toHaveBeenCalled()
  })
})

describe('streak counting', () => {
  // Five neat letters in a row, whatever mode they were traced in.
  const runOf = (count, accuracy = 90, mode = 'challenge') => {
    let records = emptyAccuracyRecords()
    let unlocked = []
    let last = null
    for (let i = 0; i < count; i += 1) {
      last = recordAttempt(records, {
        letterId: CURRICULUM[i % CURRICULUM.length].id,
        mode,
        accuracy,
        unlocked,
      })
      records = last.records
      unlocked = [...unlocked, ...last.awarded]
    }
    return { last, records, unlocked }
  }

  it('counts up one neat letter at a time', () => {
    expect(runOf(1).last.streak).toEqual({ current: 1, longest: 1 })
    expect(runOf(3).last.streak).toEqual({ current: 3, longest: 3 })
  })

  it('awards the first milestone on the fifth consecutive neat letter, not the fourth', () => {
    const four = runOf(4)
    expect(four.last.milestone).toBeNull()
    expect(four.unlocked).not.toContain(streakStickerId(5))

    const five = runOf(5)
    expect(five.last.streak.current).toBe(5)
    expect(five.last.milestone).toBe(5)
    expect(five.unlocked).toContain(streakStickerId(5))
    expect(five.unlocked).not.toContain(streakStickerId(12))
  })

  it('awards the second milestone at twelve and nothing in between', () => {
    const eleven = runOf(11)
    expect(eleven.unlocked).not.toContain(streakStickerId(12))
    expect(eleven.last.milestone).toBeNull()

    const twelve = runOf(12)
    expect(twelve.last.milestone).toBe(12)
    expect(twelve.unlocked).toContain(streakStickerId(12))
    // Awarded once each, however long the run gets.
    expect(runOf(14).unlocked.filter((id) => id === streakStickerId(5))).toHaveLength(1)
  })

  it('counts neat traces in any mode, because a streak is about the hand', () => {
    expect(runOf(5, 90, 'free').last.milestone).toBe(5)
    expect(runOf(5, 90, 'guided').last.milestone).toBe(5)
  })

  it('breaks the run on one untidy letter and remembers the longest', () => {
    const four = runOf(4)
    const broken = trace(four.records, 'ma', 'challenge', 84, four.unlocked)
    expect(broken.streak).toEqual({ current: 0, longest: 4 })

    const rebuilt = trace(broken.records, 'na', 'challenge', 95, four.unlocked)
    expect(rebuilt.streak).toEqual({ current: 1, longest: 4 })
  })

  it('re-awards nothing on a second run past a milestone already collected', () => {
    const five = runOf(5)
    const broken = trace(five.records, 'ma', 'challenge', 10, five.unlocked)
    let records = broken.records
    let last = null
    for (let i = 0; i < 5; i += 1) {
      last = recordAttempt(records, {
        letterId: CURRICULUM[i].id,
        mode: 'challenge',
        accuracy: 95,
        unlocked: five.unlocked,
      })
      records = last.records
    }
    expect(last.streak.current).toBe(5)
    expect(last.milestone).toBe(5)
    // The milestone is reported so it can be said out loud; the sticker is not
    // handed out twice, because it is already on the shelf.
    expect(last.awarded).not.toContain(streakStickerId(5))
  })
})

describe('the dashboard trend read', () => {
  it('reports nothing for a child with no records at all', () => {
    const trend = letterTrend(emptyAccuracyRecords(), 'ka')
    expect(trend).toEqual({
      hasRecords: false,
      best: null,
      average: null,
      latest: null,
      delta: null,
      sessions: 0,
      attempts: 0,
    })
  })

  it('reports nothing for a letter traced only in Guided — the dash the dashboard draws', () => {
    const records = trace(emptyAccuracyRecords(), 'ka', 'guided', 95).records
    const trend = letterTrend(records, 'ka')
    expect(trend.hasRecords).toBe(false)
    expect(trend.best).toBeNull()
    expect(trend.average).toBeNull()
    expect(trend.delta).toBeNull()
    // ...while the Guided column, had the dashboard one, is populated.
    expect(letterTrend(records, 'ka', 'guided').best).toBe(95)
  })

  it('has no delta on a first session, because there is nothing to compare with', () => {
    const records = trace(emptyAccuracyRecords(), 'ka', 'challenge', 70).records
    const trend = letterTrend(records, 'ka')
    expect(trend).toMatchObject({ hasRecords: true, best: 70, average: 70, latest: 70, delta: null, sessions: 1 })
  })

  it('averages the window and measures the newest session against the rest of it', () => {
    let records = emptyAccuracyRecords()
    for (const score of [60, 70, 80]) records = trace(records, 'ka', 'challenge', score).records

    const trend = letterTrend(records, 'ka')
    expect(trend.best).toBe(80)
    expect(trend.average).toBe(70) // (60 + 70 + 80) / 3
    expect(trend.latest).toBe(80)
    expect(trend.delta).toBe(15) // 80 - mean(60, 70)
    expect(trend.sessions).toBe(3)
    expect(trend.attempts).toBe(3)
  })

  it('points the arrow down when the newest session is worse than the run', () => {
    let records = emptyAccuracyRecords()
    for (const score of [90, 90, 60]) records = trace(records, 'ka', 'challenge', score).records
    expect(letterTrend(records, 'ka').delta).toBe(-30)
  })

  it('keeps only the last seven sessions, so the window cannot grow without bound', () => {
    let records = emptyAccuracyRecords()
    for (let i = 1; i <= 10; i += 1) records = trace(records, 'ka', 'challenge', i * 10 > 100 ? 100 : i * 10).records

    const entry = records.letters.ka.challenge
    expect(entry.history).toHaveLength(TREND_WINDOW)
    expect(entry.history[entry.history.length - 1]).toBe(100)
    expect(entry.attempts).toBe(10)
    expect(entry.best).toBe(100)
    expect(letterTrend(records, 'ka').sessions).toBe(TREND_WINDOW)
  })

  it('keeps one record apart from another, because the record is per child', () => {
    const childOne = trace(emptyAccuracyRecords(), 'ka', 'challenge', 95).records
    const childTwo = trace(emptyAccuracyRecords(), 'ga', 'challenge', 40).records

    expect(letterTrend(childOne, 'ka').best).toBe(95)
    expect(letterTrend(childOne, 'ga').hasRecords).toBe(false)
    expect(letterTrend(childTwo, 'ka').hasRecords).toBe(false)
    expect(masteredLetters(childTwo)).toEqual([])
  })
})

describe('sanitizeAccuracyRecords', () => {
  it('starts empty for nothing, and for a value that is not an object', () => {
    for (const junk of [null, undefined, 'a string', 42, ['an', 'array']]) {
      expect(sanitizeAccuracyRecords(junk)).toEqual(emptyAccuracyRecords())
    }
  })

  it('returns a well-formed record by identity, so the store sees no new value', () => {
    const record = trace(emptyAccuracyRecords(), 'ka', 'challenge', 88).records
    expect(sanitizeAccuracyRecords(record)).toBe(record)
  })

  it('drops an entry for something that is not a letter and keeps the rest', () => {
    const cleaned = sanitizeAccuracyRecords({
      letters: {
        ka: { challenge: { best: 88, attempts: 1, history: [88] } },
        not_a_letter: { challenge: { best: 99, attempts: 1, history: [99] } },
      },
      streak: { current: 1, longest: 1 },
    })
    expect(Object.keys(cleaned.letters)).toEqual(['ka'])
    expect(warn).toHaveBeenCalled()
  })

  it('drops an unknown mode, and a mode entry that is not an object', () => {
    const cleaned = sanitizeAccuracyRecords({
      letters: {
        ka: {
          challenge: { best: 88, attempts: 1, history: [88] },
          hyperdrive: { best: 99, attempts: 1, history: [99] },
          guided: 'not an object',
        },
      },
      streak: { current: 0, longest: 0 },
    })
    expect(Object.keys(cleaned.letters.ka)).toEqual(['challenge'])
  })

  it('clamps a score out of range and a negative attempt count', () => {
    const cleaned = sanitizeAccuracyRecords({
      letters: { ka: { challenge: { best: 5000, attempts: -3, history: [-10, 'x', 120] } } },
      streak: { current: 2, longest: 1 },
    })
    expect(cleaned.letters.ka.challenge.best).toBe(100)
    expect(cleaned.letters.ka.challenge.attempts).toBe(0)
    expect(cleaned.letters.ka.challenge.history).toEqual([0, 0, 100])
  })

  it('cuts an over-long history back to the window, keeping the newest scores', () => {
    const cleaned = sanitizeAccuracyRecords({
      letters: { ka: { challenge: { best: 90, attempts: 20, history: [1, 2, 3, 4, 5, 6, 7, 8, 9, 90] } } },
      streak: { current: 0, longest: 0 },
    })
    expect(cleaned.letters.ka.challenge.history).toEqual([4, 5, 6, 7, 8, 9, 90])
  })

  it('never lets the longest streak be shorter than the run in progress', () => {
    expect(sanitizeAccuracyRecords({ letters: {}, streak: { current: 9, longest: 2 } }).streak).toEqual({
      current: 9,
      longest: 9,
    })
  })

  it('repairs a record with a missing or junk half rather than throwing', () => {
    expect(() => sanitizeAccuracyRecords({})).not.toThrow()
    expect(sanitizeAccuracyRecords({})).toEqual(emptyAccuracyRecords())
    expect(sanitizeAccuracyRecords({ letters: 'nope', streak: 'nope' })).toEqual(emptyAccuracyRecords())
  })

  it('scores a trace on top of a repaired record without losing the good half', () => {
    const hostile = {
      letters: { ka: { challenge: { best: 'eighty', attempts: null, history: 'not an array' } } },
      streak: null,
    }
    const result = trace(hostile, 'ka', 'challenge', 90)
    expect(result.records.letters.ka.challenge.history).toEqual([90])
    expect(result.mastered).toBe(true)
    expect(result.streak).toEqual({ current: 1, longest: 1 })
  })
})
