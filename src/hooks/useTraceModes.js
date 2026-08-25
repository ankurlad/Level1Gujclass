import { useCallback, useEffect, useRef, useState } from 'react';
import { speak } from '../lib/audio';
import { recordAttempt } from '../lib/mastery';
import {
  dotsVisibleInMode,
  traceMode as traceModeById
} from '../lib/traceModes';
import { useAppStore } from '../store/appStore';

// The three tracing modes, as a hook.
//
// src/lib/traceModes.js is the catalogue and the rules; src/lib/mastery.js is
// the ledger. Neither knows about React, and both are unit tested without a
// browser. This file is the part that cannot be: the countdown, the live score
// polled off the engine between renders, the write to the child's record when a
// letter lands, and the one line the app says out loud about it.
//
// It exists so TraceView does not have to. That view is already the longest in
// the app and owns the canvas, the ink, the dots and the confetti; the mode work
// it does is now a dozen lines of reading this hook's return value.
//
// WHERE THE SCORE COMES FROM. Nowhere new. getAccuracy() on the PR 6 tracing
// session has always computed it — the note on PR 6 says "the three-mode UI
// reads getAccuracy(); nothing renders it yet" — and this is the thing that
// reads it. The engine is unchanged, so Guided scores exactly what Guided always
// would have scored, had anyone been looking.

// The score line is spoken 1.3 seconds after the praise clip, which is long
// enough for that recording to finish (speak() cancels whatever is playing, so
// an overlap would truncate the praise) and short enough to land while the
// finished letter is still on screen — TraceView advances at 1.5s.
const ANNOUNCE_DELAY_MS = 1300;

const roundScore = (value) => (Number.isFinite(value) ? Math.round(value) : 0);

/**
 * @param {object} [options]
 * @param {(outcome: object) => void} [options.onTimeUp] Called once, when a
 *   Challenge countdown reaches zero. TraceView uses it to put the pen down.
 */
export function useTraceModes({ onTimeUp } = {}) {
  const {
    traceMode: modeId,
    setTraceMode,
    accuracyRecords,
    setAccuracyRecords,
    unlockedStickers,
    setUnlockedStickers,
    currentLesson,
    getTraceSession
  } = useAppStore();

  const mode = traceModeById(modeId);

  // `armed` is a letter that has been started but not yet drawn on. The clock
  // deliberately does not run until the first pointer sample: a child reading
  // the pronunciation card, or one who was handed the tablet mid-sentence, has
  // not started their 90 seconds yet.
  const [secondsLeft, setSecondsLeft] = useState(mode.timerSeconds);
  const [running, setRunning] = useState(false);
  const [expired, setExpired] = useState(false);
  const [liveAccuracy, setLiveAccuracy] = useState(0);
  // The last finished attempt, as recordAttempt described it. What the result
  // banner renders, and null between letters.
  const [outcome, setOutcome] = useState(null);

  const announceRef = useRef(null);
  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => { onTimeUpRef.current = onTimeUp; });

  const cancelAnnouncement = () => {
    if (announceRef.current === null) return;
    clearTimeout(announceRef.current);
    announceRef.current = null;
  };
  useEffect(() => cancelAnnouncement, []);

  // A fresh letter: full clock, clock stopped, no score, no banner. Called from
  // TraceView's initCanvas, which is also what resets the engine — the two have
  // to happen together or the live score would carry the last letter's ink into
  // this one's average.
  const beginLetter = useCallback(() => {
    cancelAnnouncement();
    setSecondsLeft(traceModeById(modeId).timerSeconds);
    setRunning(false);
    setExpired(false);
    setLiveAccuracy(0);
    setOutcome(null);
  }, [modeId]);

  // Changing mode mid-letter re-arms rather than carrying a half-spent clock
  // into a mode that may not have one.
  useEffect(() => { beginLetter(); }, [beginLetter, currentLesson?.id]);

  // One pointer sample has just gone into the engine. Both of these are
  // idempotent by value, so React bails out of the re-render on the dozens of
  // samples a second that do not move the rounded score.
  const noteSample = useCallback(() => {
    if (expired) return;
    setRunning(true);
    if (traceModeById(modeId).liveAccuracy) {
      setLiveAccuracy(roundScore(getTraceSession().getAccuracy()));
    }
  }, [expired, modeId, getTraceSession]);

  // The countdown. A plain 1s interval rather than a wall-clock deadline: this
  // is a 90-second kid timer, a second of drift over its whole life is not a
  // thing anyone can see, and a decrement is what a test can drive.
  useEffect(() => {
    if (mode.timerSeconds === null || !running || expired) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev === null ? null : Math.max(0, prev - 1)));
    }, 1000);
    return () => clearInterval(id);
  }, [mode.timerSeconds, running, expired]);

  /**
   * Fold the finished trace into the child's record and say what it was worth.
   *
   * Called for a completed letter and for one the clock ran out on — an
   * unfinished trace is still ink that was either on the line or not, and
   * dropping it would let a child protect a streak by abandoning a bad letter.
   *
   * @param {object} [options]
   * @param {boolean} [options.complete=true] Whether the letter was finished.
   * @param {boolean} [options.announce=true] Whether to speak the result.
   */
  const finishLetter = useCallback(({ complete = true, announce = true } = {}) => {
    const letterId = currentLesson?.id;
    const accuracy = roundScore(getTraceSession().getAccuracy());
    const result = recordAttempt(accuracyRecords, {
      letterId,
      mode: modeId,
      accuracy,
      unlocked: unlockedStickers
    });

    setAccuracyRecords(result.records);
    if (result.awarded.length > 0) {
      setUnlockedStickers([...unlockedStickers, ...result.awarded]);
    }
    const finished = { ...result, complete };
    setOutcome(finished);
    setRunning(false);

    if (announce) {
      const label = traceModeById(modeId).label;
      // No recorded clip matches this sentence, so speak() falls through to the
      // synthesizer — which is the documented path and needs no new audio file.
      // A clip added later under this exact text would be picked up for free.
      const line = complete
        ? `${label}. ${result.accuracy} percent.`
        : `Time up. ${label}. ${result.accuracy} percent.`;
      cancelAnnouncement();
      if (complete) {
        announceRef.current = setTimeout(() => {
          announceRef.current = null;
          speak(line);
        }, ANNOUNCE_DELAY_MS);
      } else {
        // Nothing is playing over a timeout — there was no praise clip — so it
        // is said straight away, while the unfinished letter is still up.
        speak(line);
      }
    }

    return finished;
  }, [accuracyRecords, currentLesson?.id, getTraceSession, modeId, setAccuracyRecords, setUnlockedStickers, unlockedStickers]);

  // Running out of time is not the same event as the interval firing: it has to
  // happen exactly once, and it commits, which an interval callback must not do.
  //
  // The `expired` guard is what makes it once — the effect re-runs whenever
  // finishLetter changes identity (it changes because of the write it just
  // made) and returns immediately on every one of those. The unfinished trace
  // is still scored: ink that missed the line is evidence, and dropping it would
  // make abandoning a bad letter the way to protect a streak.
  useEffect(() => {
    if (secondsLeft !== 0 || expired) return;
    setExpired(true);
    setRunning(false);
    const finished = finishLetter({ complete: false });
    onTimeUpRef.current?.(finished);
  }, [secondsLeft, expired, finishLetter]);

  return {
    modeId,
    mode,
    setMode: setTraceMode,

    // Whether the numbered dots for this stroke are drawn at all.
    dotsVisible: (strokeIndex) => dotsVisibleInMode(modeId, strokeIndex),

    // The clock. `secondsLeft` is null in the two untimed modes, so a view can
    // render the badge on `secondsLeft !== null` alone.
    secondsLeft,
    timerRunning: running,
    expired,

    // The running score, 0-100, and whether this mode shows it.
    liveAccuracy,
    showsLiveAccuracy: mode.liveAccuracy,

    outcome,
    beginLetter,
    noteSample,
    finishLetter
  };
}
