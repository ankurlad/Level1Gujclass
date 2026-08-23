import { useCallback, useEffect, useState } from 'react';

// The one place this app talks to localStorage.
//
// Before this module every persisted value was a hand-rolled pair — a useState
// initialiser that read a key and a useEffect that wrote it back — each with
// its own idea of how to encode the value and what to do when the read failed.
// Ten of those pairs plus the per-letter waypoint overrides now go through
// `useLocalStorage` / `readStored` / `writeStored`, which fixes three things:
//
//   1. Keys live under one `guj:` namespace instead of a flat `guj_` soup, so
//      the whole install can be enumerated, exported or wiped by prefix (that
//      is what the multi-child profiles of Phase 5 need).
//   2. Every value is JSON, so the encode and decode rules are one pair of
//      functions rather than eleven ad-hoc ones.
//   3. `guj:version` stamps the schema, giving later shape changes somewhere
//      to hang a migration off.
export const NAMESPACE = 'guj:';

// Bump when the *shape* of a stored value changes and add the transform to the
// notes below. History:
//   0 — no version key: un-namespaced `guj_*` keys, values stored as raw
//       strings or JSON depending on the site, parent PIN in cleartext.
//   1 — `guj:*` keys, every value JSON-encoded, parent PIN replaced by a
//       salted SHA-256 record (see src/lib/parentPin.js).
//   2 — `custom_waypoints_<id>` overrides hold 0-100 path-space coordinates
//       instead of absolute canvas pixels. Converted on read by
//       readWaypointOverride in src/App.jsx, which detects the old range
//       rather than reading this key: the value's own shape is the more
//       reliable signal, and it makes the conversion idempotent.
//   3 — the per-child values (points, progress, stickers) moved out of the
//       device-wide key and under `child:<id>:` — see src/lib/childProfiles.js,
//       which owns the list of which keys those are and the move itself. The
//       migration keys off the absence of `guj:children` rather than off this
//       number, for the same reason as v2: the store's own shape is the more
//       reliable signal, and it makes the move idempotent.
export const SCHEMA_VERSION = 3;
export const VERSION_KEY = `${NAMESPACE}version`;

// `guj:points`, from the bare key `points`.
export const storageKey = (key) => `${NAMESPACE}${key}`;

// The bare key of a value that belongs to one child rather than to the device:
// `child:c1:points`, which lands on disk as `guj:child:c1:points`. It goes
// through the same namespace, the same JSON encoding, the same version stamp
// and the same validate guard as every other key — the only thing the profile
// split changes is the name.
export const CHILD_PREFIX = 'child:';
export const childScopedKey = (childId, key) => `${CHILD_PREFIX}${childId}:${key}`;

// The v0 name of the same value: every pre-namespace key was `guj_` + this
// module's bare key, so the mapping needs no per-key table.
export const legacyStorageKey = (key) => `guj_${key}`;

// localStorage is not always reachable — Safari's private mode and an iframe
// with third-party storage blocked both throw on property access, not just on
// setItem. Every access funnels through here so a hostile environment costs
// persistence, not a blank screen.
const store = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const resolve = (initialValue) => (typeof initialValue === 'function' ? initialValue() : initialValue);

// Stamped on the first read of any key. Written eagerly rather than after the
// v0 sweep finishes because the sweep is lazy (see readStored) — the version
// records which *writer* produced the store, and from here on that is v1.
const stampSchemaVersion = (ls) => {
  const stamped = String(SCHEMA_VERSION);
  try {
    if (ls.getItem(VERSION_KEY) !== stamped) ls.setItem(VERSION_KEY, stamped);
  } catch (e) {
    console.error('Could not stamp the storage schema version', e);
  }
};

// Reads the current value of `key`, adopting the v0 un-namespaced key if that
// is all there is.
//
// The v0 -> v1 migration runs lazily, one key at a time, instead of as a single
// sweep at boot: a key nobody reads is never touched, and because adoption
// deletes the old key and writes the new one in the same call, a first run
// interrupted half way resumes exactly where it stopped.
//
// `initialValue` may be a factory, like useState's. `migrate` receives the
// decoded v0 value and returns what to store under the new key — use it where
// v0's read path coerced the raw string (`Number(...) || 0`, `=== 'true'`) and
// that coercion has to survive the move.
//
// `validate` is the PR 12 boundary and runs on *every* value this function
// returns, not just a migrated one: the key is a text file on someone else's
// device, so a value written by an older build, a different browser or devtools
// is exactly as untrusted as a v0 one. It takes the decoded value and returns
// what state is allowed to hold — see src/lib/validate.js, whose helpers clamp
// or drop and log, and never throw.
export function readStored(key, initialValue, migrate, validate) {
  const guard = (value) => (validate ? validate(value) : value);

  const ls = store();
  if (!ls) return guard(resolve(initialValue));

  stampSchemaVersion(ls);

  const raw = ls.getItem(storageKey(key));
  if (raw !== null) {
    try {
      return guard(JSON.parse(raw));
    } catch (e) {
      console.error(`Discarding unreadable value at ${storageKey(key)}`, e);
      return guard(resolve(initialValue));
    }
  }

  const legacyRaw = ls.getItem(legacyStorageKey(key));
  if (legacyRaw === null) return guard(resolve(initialValue));

  // v0 stored some values as JSON and some as bare strings; try the former and
  // fall back to the latter, which is exactly what the old read sites did.
  let value;
  try {
    value = JSON.parse(legacyRaw);
  } catch {
    value = legacyRaw;
  }
  if (migrate) value = migrate(value);
  value = guard(value);

  try {
    ls.removeItem(legacyStorageKey(key));
  } catch (e) {
    console.error(`Could not remove the migrated key ${legacyStorageKey(key)}`, e);
  }
  writeStored(key, value);
  return value;
}

export function writeStored(key, value) {
  const ls = store();
  if (!ls) return;
  try {
    ls.setItem(storageKey(key), JSON.stringify(value));
  } catch (e) {
    // A full or read-only quota must not take the app down mid-lesson.
    console.error(`Could not persist ${storageKey(key)}`, e);
  }
}

// Removes both spellings. Dropping only the namespaced key would leave an
// un-adopted v0 key behind for readStored to resurrect on the next load, which
// would quietly undo "revert to default" for a letter whose override predates
// the migration.
export function removeStored(key) {
  const ls = store();
  if (!ls) return;
  try {
    ls.removeItem(storageKey(key));
    ls.removeItem(legacyStorageKey(key));
  } catch (e) {
    console.error(`Could not remove ${storageKey(key)}`, e);
  }
}

// The schema version the store was last written by; 0 means "pre-namespace",
// which is also what an empty store reports.
export function storedSchemaVersion() {
  const ls = store();
  if (!ls) return SCHEMA_VERSION;
  const raw = ls.getItem(VERSION_KEY);
  if (raw === null) return 0;
  const version = Number(raw);
  return Number.isFinite(version) ? version : 0;
}

// useState, with the value read from and mirrored to `guj:<key>`.
//
// `initialValue`, `migrate` and `validate` are consulted on the first render
// only, the same contract useState gives its initialiser. The write effect also
// fires on mount, which re-persists what was just read — harmless, and it is
// what materialises the namespaced key for a value the parent has never
// changed. With a `validate` guard it does one more thing: the corrected value
// replaces the bad one on disk, so a clamped or pruned key is fixed rather than
// re-corrected on every load.
//
// The key may change between renders, which is what switching child profiles
// does (PR 13b): `child:c1:points` becomes `child:c2:points`. The state is
// therefore held together with the key it was read for, and a mismatch re-reads
// during the render rather than in an effect. Both halves matter:
//
//   - reading in an effect would put one render on screen showing the outgoing
//     child's points under the incoming child's name;
//   - and the write effect below would fire first, persisting the outgoing
//     value under the incoming key — the switch would overwrite the other
//     child's points with this one's before anything read them back.
//
// A render-phase setValue on this same component is React's documented way to
// adjust state when an input changes: the render is discarded and re-run
// immediately, before the browser paints and before any effect commits.
export function useLocalStorage(key, initialValue, migrate, validate) {
  const [state, setState] = useState(() => ({
    key,
    value: readStored(key, initialValue, migrate, validate)
  }));

  let value = state.value;
  if (state.key !== key) {
    value = readStored(key, initialValue, migrate, validate);
    setState({ key, value });
  }

  // Stable, and it updates the value without touching the key: a setter called
  // from a stale closure must not resurrect the key it was created under.
  const setValue = useCallback((next) => {
    setState((prev) => ({
      key: prev.key,
      value: typeof next === 'function' ? next(prev.value) : next
    }));
  }, []);

  useEffect(() => {
    writeStored(key, value);
  }, [key, value]);

  return [value, setValue];
}
