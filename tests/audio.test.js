import { describe, expect, it } from 'vitest'
import { CURRICULUM } from '../src/curriculum.js'
import { resolveClip } from '../src/lib/audio.js'

// resolveClip is the whole testable surface of the recorded-audio path: it is
// pure, and everything after it is an <audio> element. What can actually break
// is the mapping — a renamed clip, a lesson line assembled differently from the
// one the generator recorded, a phrase edited in a view but not in the table.
// The Gujarati here is read from the curriculum rather than typed, so a test
// that passes cannot be passing against a copy of the same typo.
const ka = CURRICULUM.find((lesson) => lesson.id === 'ka')

describe('resolveClip', () => {
  it('maps a bare syllable to its letter clip', () => {
    const url = resolveClip(ka.letter)
    expect(url).toEqual(expect.stringContaining('letter_ka'))
    expect(url).toEqual(expect.stringContaining('.mp3'))
  })

  it('maps the lesson line to its lesson clip', () => {
    // The exact string TraceView speaks when a lesson opens, and the exact
    // string scripts/tts-generate.sh recorded.
    const url = resolveClip(`${ka.letter}. ${ka.word}.`)
    expect(url).toEqual(expect.stringContaining('lesson_ka'))
    expect(url).not.toEqual(resolveClip(ka.letter))
  })

  it('maps a spoken phrase to its phrase clip', () => {
    // "Correct answer." — GameZone says this on a right match.
    expect(resolveClip('સાચો જવાબ.')).toEqual(expect.stringContaining('phrase_correct'))
  })

  it('returns null for text nothing was recorded for', () => {
    expect(resolveClip('hello')).toBeNull()
    expect(resolveClip(`${ka.letter} ${ka.word}`)).toBeNull()
    expect(resolveClip(undefined)).toBeNull()
  })

  it('covers every letter and every lesson line in the curriculum', () => {
    for (const lesson of CURRICULUM) {
      expect(resolveClip(lesson.letter), `letter ${lesson.id}`).toBeTruthy()
      expect(resolveClip(`${lesson.letter}. ${lesson.word}.`), `lesson ${lesson.id}`).toBeTruthy()
    }
  })
})
