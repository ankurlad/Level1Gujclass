import { useEffect, useState } from 'react';

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
export const SCHEMA_VERSION = 1;
export const VERSION_KEY = `${NAMESPACE}version`;

// `guj:points`, from the bare key `points`.
export const storageKey = (key) => `${NAMESPACE}${key}`;

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
export function readStored(key, initialValue, migrate) {
  const ls = store();
  if (!ls) return resolve(initialValue);

  stampSchemaVersion(ls);

  const raw = ls.getItem(storageKey(key));
  if (raw !== null) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error(`Discarding unreadable value at ${storageKey(key)}`, e);
      return resolve(initialValue);
    }
  }

  const legacyRaw = ls.getItem(legacyStorageKey(key));
  if (legacyRaw === null) return resolve(initialValue);

  // v0 stored some values as JSON and some as bare strings; try the former and
  // fall back to the latter, which is exactly what the old read sites did.
  let value;
  try {
    value = JSON.parse(legacyRaw);
  } catch {
    value = legacyRaw;
  }
  if (migrate) value = migrate(value);

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
// `initialValue` and `migrate` are consulted on the first render only, the same
// contract useState gives its initialiser. The write effect also fires on
// mount, which re-persists what was just read — harmless, and it is what
// materialises the namespaced key for a value the parent has never changed.
export function useLocalStorage(key, initialValue, migrate) {
  const [value, setValue] = useState(() => readStored(key, initialValue, migrate));

  useEffect(() => {
    writeStored(key, value);
  }, [key, value]);

  return [value, setValue];
}
