import { MASTERY_SHELF, masteryStickerId, STREAK_SHELF, streakStickerId } from './stickers';
import { TRACE_MODE_IDS } from './traceModes';
import { describeValue, toBoundedNumber } from './validate';

// What a trace was worth, and what it earned.
//
// The tracing engine says how neatly one letter was traced (getAccuracy(), 0-100
// — see src/lib/tracingEngine.js). Nothing kept those numbers: a child finished a
// letter, got their confetti and their points, and the score evaporated. This
// module is the ledger that keeps them and the two rules that read it.
//
//   MASTERY  A letter is mastered when its best Challenge accuracy is at or
//            above MASTERY_ACCURACY. Challenge and not Guided, because Guided
//            draws the whole path under the child's finger — a 90 there says the
//            dots were followed, not that the letter is known. It earns the
//            letter's own sticker, once.
//   STREAK   Consecutive lessons — in any mode — traced at or above the same
//            threshold. Crossing 5 and crossing 12 each earn a milestone
//            sticker. One untidy letter puts it back to zero.
//
// POINTS ARE NOT TOUCHED. handleSuccess in TraceView still awards its 25 + speed
// bonus for finishing a letter and nothing here changes that number, in either
// direction: mastery adds stickers to the shelf, it does not add or withhold
// currency. A child who traces messily still earns, still buys, still plays.
//
// MASTERY IS DERIVED, NOT STORED. There is no `mastered: [...]` list on disk —
// it is `best.challenge >= MASTERY_ACCURACY`, computed on read by isMastered().
// A second copy of a fact is a second copy to keep in step, and this one would
// go out of step the first time a record was corrected by the validator below.
//
// THE RECORD, per child, at `guj:child:<id>:accuracy`:
//
//   {
//     letters: {
//       ka: {
//         guided:    { best: 72, attempts: 9, history: [60, 71, 72] },
//         challenge: { best: 88, attempts: 2, history: [80, 88] }
//       }
//     },
//     streak: { current: 3, longest: 7 }
//   }
//
// `history` is the last TREND_WINDOW scores for that letter in that mode, oldest
// first — exactly the window the parent dashboard averages, so the dashboard
// does no trimming of its own and the key cannot grow without bound (42 letters
// x 3 modes x 7 small integers is a few kilobytes at its absolute largest).

// The bar. 85 of a possible 100, where 100 is every pointer sample sitting on
// the centreline and 0 is a mean deviation of a full hit radius — see the
// getAccuracy comment in src/lib/tracingEngine.js for what the scale spans.
export const MASTERY_ACCURACY = 85;

// The mode a letter can be mastered in. Named rather than inlined because two
// other modules ask the question and both have to ask it the same way.
export const MASTERY_MODE = 'challenge';

// How many past sessions the trend reads, and therefore how many are kept.
export const TREND_WINDOW = 7;

// 5 and 12, read off the catalogue rather than repeated here: the milestone that
// awards a sticker and the sticker it awards must not be able to disagree.
export const STREAK_MILESTONES = STREAK_SHELF.map((sticker) => sticker.streak).sort((a, b) => a - b);

const LETTER_IDS = new Set(MASTERY_SHELF.map((sticker) => sticker.letterId));

export const isLetterId = (value) => typeof value === 'string' && LETTER_IDS.has(value);
export const isTraceModeId = (value) => typeof value === 'string' && TRACE_MODE_IDS.includes(value);

const warn = (message, detail) => {
  if (detail === undefined) console.warn(`Rejected a stored value: ${message}`);
  else console.warn(`Rejected a stored value: ${message}`, detail);
};

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// One score, as the ledger holds it: a whole number from 0 to 100.
//
// Rounded on the way IN, not on the way out to a screen, so that the number the
// dashboard prints and the number the mastery rule tested are the same number.
// A trace that scores 84.6 shows as 85 either way; if the rounding happened at
// the display it would show 85 and not be mastered, which is the one thing a
// parent looking at this table cannot be asked to explain to a 6-year-old.
export const toAccuracy = (value) =>
  Math.round(toBoundedNumber(value, { min: 0, max: 100, fallback: 0, name: 'accuracy' }));

const toCount = (value) =>
  Math.round(toBoundedNumber(value, { min: 0, max: 999999, fallback: 0, name: 'attempt count' }));

export const emptyAccuracyRecords = () => ({ letters: {}, streak: { current: 0, longest: 0 } });

// The PR 12 boundary for `guj:child:<id>:accuracy`.
//
// Same three rules as src/lib/validate.js: say what failed, drop or clamp rather
// than accept silently, never throw. A letter whose entry is junk costs that
// letter's history and nothing else — the other 41 are scores the child actually
// earned. The value is returned by identity when nothing was corrected, so the
// store does not see a new object on every read.
export function sanitizeAccuracyRecords(value) {
  if (value === null || value === undefined) return emptyAccuracyRecords();
  if (!isPlainObject(value)) {
    warn(`the accuracy record must be an object — starting empty instead of ${describeValue(value)}.`);
    return emptyAccuracyRecords();
  }

  let changed = false;
  const letters = {};

  if (value.letters !== undefined && !isPlainObject(value.letters)) {
    warn(`the accuracy record's letters must be an object — starting empty instead of ${describeValue(value.letters)}.`);
    changed = true;
  } else {
    for (const [letterId, byMode] of Object.entries(value.letters ?? {})) {
      if (!isLetterId(letterId)) {
        warn(`dropping an accuracy record for something that is not a letter: ${describeValue(letterId)}.`);
        changed = true;
        continue;
      }
      if (!isPlainObject(byMode)) {
        warn(`dropping the accuracy record for ${letterId}: it is ${describeValue(byMode)}, not an object.`);
        changed = true;
        continue;
      }

      const kept = {};
      for (const [modeId, entry] of Object.entries(byMode)) {
        if (!isTraceModeId(modeId)) {
          warn(`dropping ${letterId}'s accuracy under an unknown tracing mode: ${describeValue(modeId)}.`);
          changed = true;
          continue;
        }
        if (!isPlainObject(entry)) {
          warn(`dropping ${letterId}'s ${modeId} accuracy: it is ${describeValue(entry)}, not an object.`);
          changed = true;
          continue;
        }

        if (entry.history !== undefined && !Array.isArray(entry.history)) {
          warn(`${letterId}'s ${modeId} history must be an array — emptying it instead of ${describeValue(entry.history)}.`);
          changed = true;
        }
        // The tail, because the window is the newest TREND_WINDOW sessions: a
        // longer stored array is a record written before the cap, and the
        // scores worth keeping out of it are the recent ones.
        const tail = (Array.isArray(entry.history) ? entry.history : []).slice(-TREND_WINDOW);
        const history = tail.map(toAccuracy);

        const best = toAccuracy(entry.best);
        const attempts = toCount(entry.attempts);
        if (
          best !== entry.best ||
          attempts !== entry.attempts ||
          history.length !== (entry.history?.length ?? 0) ||
          history.some((score, index) => score !== tail[index])
        ) {
          changed = true;
        }

        kept[modeId] = { best, attempts, history };
      }

      if (Object.keys(kept).length > 0) letters[letterId] = kept;
      else changed = true;
    }
  }

  const rawStreak = isPlainObject(value.streak) ? value.streak : {};
  if (value.streak !== undefined && !isPlainObject(value.streak)) {
    warn(`the streak must be an object — starting it at zero instead of ${describeValue(value.streak)}.`);
    changed = true;
  }
  const current = toCount(rawStreak.current);
  // A longest that is shorter than the run in progress is not a record anyone
  // set; it is a hand-edited key. The run on screen is the more trustworthy of
  // the two, so the record follows it up rather than the streak being cut down.
  const longest = Math.max(current, toCount(rawStreak.longest));
  if (current !== rawStreak.current || longest !== rawStreak.longest) changed = true;

  // Identity only when the value is provably already in the canonical shape:
  // both halves present, both objects, nothing dropped, nothing clamped. A
  // record missing `streak` altogether is a correction like any other, or the
  // store would hold a value whose `streak.current` read as undefined.
  const sameShape =
    !changed &&
    isPlainObject(value.letters) &&
    isPlainObject(value.streak) &&
    Object.keys(letters).length === Object.keys(value.letters).length;
  if (sameShape) return value;
  return { letters, streak: { current, longest } };
}

const modeEntry = (records, letterId, mode) => records?.letters?.[letterId]?.[mode] ?? null;

/** Best score for one letter in one mode, 0 when it has never been traced there. */
export const bestAccuracy = (records, letterId, mode = MASTERY_MODE) =>
  modeEntry(records, letterId, mode)?.best ?? 0;

/** The derived mastery fact: best Challenge accuracy at or above the bar. */
export const isMastered = (records, letterId) =>
  bestAccuracy(records, letterId, MASTERY_MODE) >= MASTERY_ACCURACY;

/** Every mastered letter id, in curriculum order. */
export const masteredLetters = (records) =>
  MASTERY_SHELF.map((sticker) => sticker.letterId).filter((letterId) => isMastered(records, letterId));

/**
 * What the parent dashboard prints for one letter.
 *
 * `average` is the mean of the stored window (up to TREND_WINDOW sessions).
 * `delta` is the newest session measured against the average of the ones before
 * it inside that window — "is this getting better than it has been" — and is
 * null until there are two sessions to compare, because one session has nothing
 * to be a trend against. A child with no records in this mode comes back
 * hasRecords: false and every number null, which is what the dashboard renders
 * as an em dash.
 */
export function letterTrend(records, letterId, mode = MASTERY_MODE) {
  const entry = modeEntry(records, letterId, mode);
  const history = entry?.history ?? [];
  if (!entry || history.length === 0) {
    return { hasRecords: false, best: null, average: null, latest: null, delta: null, sessions: 0, attempts: entry?.attempts ?? 0 };
  }

  const mean = (list) => list.reduce((sum, score) => sum + score, 0) / list.length;
  const latest = history[history.length - 1];
  const earlier = history.slice(0, -1);

  return {
    hasRecords: true,
    best: entry.best,
    average: Math.round(mean(history)),
    latest,
    delta: earlier.length === 0 ? null : Math.round(latest - mean(earlier)),
    sessions: history.length,
    attempts: entry.attempts
  };
}

/**
 * Fold one finished trace into the ledger.
 *
 * Pure: it takes the records and returns the next records plus what the trace
 * earned. Nothing here writes to storage or speaks — the caller
 * (src/hooks/useTraceModes.js) does both, which is what makes the rules testable
 * without a browser.
 *
 * @param {object} records The child's current accuracy record.
 * @param {object} attempt
 * @param {string} attempt.letterId A curriculum lesson id.
 * @param {string} attempt.mode A tracing mode id.
 * @param {number} attempt.accuracy 0-100, as getAccuracy() reports it.
 * @param {string[]} [attempt.unlocked] Sticker ids the child already has, so an
 *   award is only announced the first time.
 * @returns {{records: object, accuracy: number, neat: boolean, mastered: boolean,
 *   newlyMastered: boolean, streak: {current: number, longest: number},
 *   milestone: number|null, awarded: string[]}}
 */
export function recordAttempt(records, attempt = {}) {
  const { letterId, mode, accuracy, unlocked = [] } = attempt;
  const base = sanitizeAccuracyRecords(records);

  const unchanged = (extra) => ({
    records: base,
    accuracy: 0,
    neat: false,
    mastered: isMastered(base, letterId),
    newlyMastered: false,
    streak: base.streak,
    milestone: null,
    awarded: [],
    ...extra
  });

  // An attempt against a letter or a mode this build does not have is a caller
  // bug, not a stored value, so it is logged and dropped rather than corrected
  // into some other letter's history.
  if (!isLetterId(letterId)) {
    console.warn(`Ignoring a trace scored against an unknown letter: ${describeValue(letterId)}.`);
    return unchanged({ mastered: false });
  }
  if (!isTraceModeId(mode)) {
    console.warn(`Ignoring a trace scored in an unknown tracing mode: ${describeValue(mode)}.`);
    return unchanged();
  }

  const score = toAccuracy(accuracy);
  const previous = modeEntry(base, letterId, mode) ?? { best: 0, attempts: 0, history: [] };
  const wasMastered = isMastered(base, letterId);

  const nextEntry = {
    best: Math.max(previous.best, score),
    attempts: toCount(previous.attempts + 1),
    history: [...previous.history, score].slice(-TREND_WINDOW)
  };

  const neat = score >= MASTERY_ACCURACY;
  const current = neat ? base.streak.current + 1 : 0;
  const streak = { current, longest: Math.max(base.streak.longest, current) };

  const next = {
    letters: {
      ...base.letters,
      [letterId]: { ...base.letters[letterId], [mode]: nextEntry }
    },
    streak
  };

  const mastered = isMastered(next, letterId);
  // Every milestone the run has reached, not only the one just crossed: a child
  // whose streak sticker was somehow never awarded (a storage write that failed,
  // a profile restored from an older export) collects it on the next neat
  // letter instead of having to break the run and build it again.
  const earned = [
    ...(mastered ? [masteryStickerId(letterId)] : []),
    ...STREAK_MILESTONES.filter((milestone) => current >= milestone).map(streakStickerId)
  ];
  const already = new Set(Array.isArray(unlocked) ? unlocked : []);

  return {
    records: next,
    accuracy: score,
    neat,
    mastered,
    newlyMastered: mastered && !wasMastered,
    streak,
    // The milestone crossed by THIS letter, for the line that gets spoken. A
    // run of 6 crossed nothing; a run of exactly 5 crossed 5.
    milestone: STREAK_MILESTONES.find((milestone) => current === milestone) ?? null,
    awarded: earned.filter((id) => !already.has(id))
  };
}
