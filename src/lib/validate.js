import { STICKERS } from './stickers';
import {
  CANVAS_H,
  CANVAS_W,
  PATH_MAX,
  isLegacyPixelWaypoints,
  normalizeWaypoints
} from './waypoints';

// The boundary. Every value that enters state from somewhere the app does not
// control is checked here first: a text input, a pasted textarea, or a
// `guj:` key written by an older build, a different device or a parent with
// devtools open.
//
// Before this module those checks were a coercion idiom repeated at each read
// site — `Number(stored) || 0`, `Array.isArray(saved)`, `parseInt(answer, 10)`
// — which is a validator that cannot fail: every bad value became 0, or [], or
// NaN compared against something, and nothing anywhere said so. A points key
// holding 1e8 was accepted; a sticker list holding one junk entry made the
// dashboard count 3 and draw 2; a mistyped waypoint paste could leave a letter
// untraceable with no way back.
//
// Three rules hold everywhere below:
//   1. Say what failed. Every rejection names the field, and for an array the
//      index of the entry that broke it.
//   2. Never accept silently and never clamp a shape. Dropping a bad list entry
//      is a console.warn; a bad paste is an inline message and the previous
//      value is kept. A single number out of range is clamped to the documented
//      bound (that *is* the range rule), and that too is logged.
//   3. Never throw. A hostile store costs the child their points, never the
//      screen — the ErrorBoundary in src/components/ErrorBoundary.jsx is the
//      backstop, not the plan.

const warn = (message, detail) => {
  if (detail === undefined) console.warn(`Rejected a stored value: ${message}`);
  else console.warn(`Rejected a stored value: ${message}`, detail);
};

// Short, human phrasing for a value inside an error message. Never the value
// itself for anything big — a message is read by a parent, not parsed.
export function describeValue(value) {
  if (value === undefined) return 'nothing';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (typeof value === 'number') return Number.isNaN(value) ? 'NaN' : String(value);
  if (typeof value === 'string') return value.length > 20 ? 'a long piece of text' : `the text "${value}"`;
  if (typeof value === 'object') return 'an object';
  return String(value);
}

// The points ledger. 0 because points are never owed; 999999 because the header
// badge is six digits wide and a ledger past a million is not a score a child
// earned at +10 a letter — it is a stale or hand-edited key.
export const POINTS_MIN = 0;
export const POINTS_MAX = 999999;

// The brush. Both ends come from the width buttons in TraceView/SandboxView;
// the bound is here because the stored value reaches ctx.lineWidth directly,
// and a string or an Infinity there draws nothing at all.
export const BRUSH_WIDTH_MIN = 1;
export const BRUSH_WIDTH_MAX = 64;

// The explicit form of `Number(value) || fallback`.
//
// The difference is that this one reports. A value that is not a finite number
// falls back and says so; a finite one outside [min, max] is clamped to the
// bound and says so. `name` is only used in the log line.
export function toBoundedNumber(value, { min, max, fallback, name = 'value' }) {
  const number = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(number)) {
    warn(`${name} must be a number — using ${fallback} instead of ${describeValue(value)}.`);
    return fallback;
  }

  if (number < min) {
    warn(`${name} must be at least ${min} — using ${min} instead of ${number}.`);
    return min;
  }

  if (number > max) {
    warn(`${name} must be at most ${max} — using ${max} instead of ${number}.`);
    return max;
  }

  return number;
}

export const toPoints = (value) =>
  toBoundedNumber(value, { min: POINTS_MIN, max: POINTS_MAX, fallback: POINTS_MIN, name: 'points' });

export const toBrushWidth = (value) =>
  toBoundedNumber(value, { min: BRUSH_WIDTH_MIN, max: BRUSH_WIDTH_MAX, fallback: 16, name: 'brush width' });

// The digits a passcode field is allowed to hold, and the test the value has to
// pass before it is hashed. Both the gate's first run and the dashboard's
// passcode manager use these, so the rule is written once.
export const PASSCODE_LENGTH = 4;
const PASSCODE_PATTERN = /^\d{4}$/;
export const passcodeDigits = (value) =>
  String(value ?? '').replace(/\D/g, '').slice(0, PASSCODE_LENGTH);
export const isPasscode = (value) => typeof value === 'string' && PASSCODE_PATTERN.test(value);

// The math gate's answer field. `parseInt('12abc')` is 12 and `parseInt('')` is
// NaN, and the gate used to treat both as a wrong sum; this separates "you did
// not type a number" from "that number is not the answer".
export function parseWholeNumber(text) {
  const trimmed = String(text ?? '').trim();
  if (trimmed === '' || !/^[+-]?\d+$/.test(trimmed)) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

// The unlocked sticker list: ids from src/lib/stickers.js, each at most once.
//
// Bad entries are dropped rather than rejecting the whole list — the good ones
// are stickers the child actually bought, and refusing all of them because one
// is junk is the data loss this PR exists to stop. Every drop is logged, and
// the array is returned by identity when nothing was dropped so the store does
// not see a new value on every read.
const STICKER_IDS = new Set(STICKERS.map((sticker) => sticker.id));

export function sanitizeStickerIds(value) {
  if (!Array.isArray(value)) {
    warn(`the unlocked sticker list must be an array — starting empty instead of ${describeValue(value)}.`);
    return [];
  }

  const kept = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !STICKER_IDS.has(entry)) {
      warn(`dropping an unlocked sticker that is not a known sticker id: ${describeValue(entry)}.`);
      continue;
    }
    if (kept.includes(entry)) {
      warn(`dropping a repeated unlocked sticker id: ${describeValue(entry)}.`);
      continue;
    }
    kept.push(entry);
  }

  return kept.length === value.length ? value : kept;
}

// The waypoint schema, as of PR 5: an array of points, each { x, y, label } with
// an optional moveTo. See src/lib/waypoints.js for the path space itself.
export const WAYPOINT_MIN_POINTS = 2;

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// A label is the 1-based position, written as a string by the editor and by
// curriculum.js, so a number is accepted too. Absent is fine — the draw loop
// only labels the points that carry one.
const isWaypointLabel = (label) => {
  if (typeof label === 'number') return Number.isInteger(label) && label > 0;
  if (typeof label !== 'string') return false;
  return /^\d+$/.test(label) && Number(label) > 0;
};

const fail = (message) => ({ ok: false, message });

// Validates a waypoint array, whichever of the two coordinate spaces it is
// written in, and hands back the path-space form.
//
// The format is read off the data, exactly as the storage read path does it: a
// coordinate past PATH_MAX cannot be a path-space letterform, so the file is
// the pre-v2 pixel format and normalizeWaypoints converts it. That is why the
// range check below is against the bounds of the *detected* space and not a
// literal 100 — a stale 0-380 export is a file to convert, not a file to
// reject, and clamping it would import a letterform crushed against the right
// and bottom edges of the box, i.e. the silently untraceable letter.
//
// `minPoints` is 0 for the storage read path (a parent who cleared a letter and
// saved it stored an empty array on purpose) and WAYPOINT_MIN_POINTS for a
// paste, where a single point is a mistake with no way to notice it.
export function validateWaypointsValue(value, { minPoints = 0 } = {}) {
  if (!Array.isArray(value)) {
    return fail(`Waypoints must be a JSON array of points — this is ${describeValue(value)}.`);
  }
  if (value.length < minPoints) {
    return fail(
      `A letter needs at least ${minPoints} waypoints to trace — this has ${value.length}.`
    );
  }

  const pixelFormat = isLegacyPixelWaypoints(value);
  const maxima = pixelFormat ? { x: CANVAS_W, y: CANVAS_H } : { x: PATH_MAX, y: PATH_MAX };
  const space = pixelFormat ? 'pre-v2 pixel' : 'path-space';

  for (let index = 0; index < value.length; index += 1) {
    const point = value[index];
    const at = `Point at index ${index}`;

    if (!isPlainObject(point)) {
      return fail(`${at} is not an object — it is ${describeValue(point)}.`);
    }

    for (const axis of ['x', 'y']) {
      const coordinate = point[axis];
      if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) {
        return fail(`${at}: ${axis} must be a finite number — it is ${describeValue(coordinate)}.`);
      }
      if (coordinate < 0 || coordinate > maxima[axis]) {
        return fail(
          `${at}: ${axis} is ${coordinate}, outside the 0-${maxima[axis]} ${space} range.`
        );
      }
    }

    if ('label' in point && point.label !== undefined && !isWaypointLabel(point.label)) {
      return fail(
        `${at}: label must be a whole number above 0, or left out — it is ${describeValue(point.label)}.`
      );
    }

    if ('moveTo' in point && point.moveTo !== undefined && typeof point.moveTo !== 'boolean') {
      return fail(
        `${at}: moveTo must be true or false, or left out — it is ${describeValue(point.moveTo)}.`
      );
    }
  }

  // Identity when there was nothing to convert, which is how the storage read
  // path decides whether it has to write the value back.
  const waypoints = normalizeWaypoints(value);
  return { ok: true, waypoints, converted: waypoints !== value };
}

// The editor's paste path: text in, either a usable array or one sentence
// saying why not.
export function parseWaypointsJson(text, options) {
  if (typeof text !== 'string' || text.trim() === '') {
    return fail('Paste the waypoints JSON into the box first — it is empty.');
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return fail(`That is not valid JSON: ${e.message}`);
  }

  return validateWaypointsValue(parsed, options);
}
