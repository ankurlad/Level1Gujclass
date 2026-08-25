import { describeValue } from './validate';

// The three ways to trace a letter, as data.
//
// The hook that drives them is src/hooks/useTraceModes.js; this module is the
// half of it that has no React in it — the catalogue, the visibility rule and
// the validator for the stored preference — because three other modules need
// one of those three things and none of them may pull a hook in:
//
//   src/store/appStore.js   validates `guj:trace_mode` on the way off disk
//   src/lib/mastery.js      keys a child's accuracy records by mode id
//   src/views/TraceView.jsx renders the mode bar from the catalogue
//
// WHAT A MODE CHANGES, and what it deliberately does not. A mode is a set of
// *scaffolds*: how many of the numbered dots are on screen, whether there is a
// clock, whether the running score is shown. It never changes how a trace is
// judged — the hit radius, the ordering rule and getAccuracy() in
// src/lib/tracingEngine.js are identical in all three, so an 88 in Free and an
// 88 in Challenge mean the same thing and the parent dashboard can put them on
// one axis. Guided is the behaviour the app has always had, unchanged: every
// dot shown, the engine's 28px waypoint snap tolerance, and no timer.

// Challenge shows the dots for this many strokes and then stops. One: the child
// is told where the pen goes down and where the first stroke runs, and is on
// their own for the rest of the letter. Hiding stroke 1 as well would leave a
// 6-year-old with no way in.
export const CHALLENGE_DOT_STROKES = 1;

// 90 seconds. Long enough that the four-stroke letters are comfortable at a
// 6-year-old's pace, short enough to be a reason to keep the pen moving.
export const CHALLENGE_SECONDS = 90;

export const TRACE_MODES = [
  {
    id: 'guided',
    label: 'Guided',
    hint: 'Every dot, all the way. No clock.',
    dots: 'all',
    timerSeconds: null,
    liveAccuracy: false
  },
  {
    id: 'challenge',
    label: 'Challenge',
    hint: `Dots for the first stroke only. ${CHALLENGE_SECONDS} seconds, score as you go.`,
    dots: 'first-stroke',
    timerSeconds: CHALLENGE_SECONDS,
    liveAccuracy: true
  },
  {
    id: 'free',
    label: 'Free',
    hint: 'Just the letter — no dots, no clock. Your score still counts.',
    dots: 'none',
    timerSeconds: null,
    liveAccuracy: false
  }
];

export const TRACE_MODE_IDS = TRACE_MODES.map((mode) => mode.id);

// Guided, because it is what every child saw before this existed and what a
// child who has never picked a mode should get.
export const DEFAULT_TRACE_MODE = 'guided';

const MODES_BY_ID = new Map(TRACE_MODES.map((mode) => [mode.id, mode]));

export const isTraceMode = (value) => typeof value === 'string' && MODES_BY_ID.has(value);

// The mode entry for an id, always — an unknown id resolves to Guided rather
// than to undefined, so a caller reading `.label` off this cannot crash a
// render on a value someone typed into devtools.
export const traceMode = (id) => MODES_BY_ID.get(id) ?? MODES_BY_ID.get(DEFAULT_TRACE_MODE);

// The validate guard for `guj:trace_mode`, written to the same rule as
// toBrushWidth in src/lib/validate.js: never throw, correct the value, say so.
// The corrected value is what useLocalStorage writes back, so a store holding
// `"chalenge"` is repaired on the next load instead of re-warning forever.
export function toTraceMode(value) {
  if (isTraceMode(value)) return value;
  console.warn(
    `Rejected a stored value: tracing mode must be one of ${TRACE_MODE_IDS.join(', ')} — using ${DEFAULT_TRACE_MODE} instead of ${describeValue(value)}.`
  );
  return DEFAULT_TRACE_MODE;
}

/**
 * Whether the numbered dots for a stroke are drawn in this mode.
 *
 * @param {string} modeId
 * @param {number} strokeIndex 0-based, as TraceView's strokeIndexOf reports it.
 */
export function dotsVisibleInMode(modeId, strokeIndex) {
  const mode = traceMode(modeId);
  if (mode.dots === 'none') return false;
  if (mode.dots === 'first-stroke') {
    return Number.isFinite(strokeIndex) && strokeIndex < CHALLENGE_DOT_STROKES;
  }
  return true;
}
