import {
  childScopedKey,
  readStored,
  removeStored,
  storageKey,
  writeStored
} from '../hooks/useLocalStorage';
import { CHILD_LIMIT, childName, sanitizeChildren } from './validate';

// One device, more than one child.
//
// Every persisted value used to be device-wide, so two children on the same
// tablet shared one points ledger, one sticker shelf and one set of completed
// letters — the second child started at the first one's score and could not
// earn anything the first one had already bought. This module is the split: it
// says which keys belong to a child and which belong to the device, it owns the
// list of profiles, and it moves a pre-13b store under an implicit first child
// without losing anything.
//
// What it does NOT touch is the gate. The parent passcode is one gate for the
// whole device, so switching child is not an unlock: see DEVICE_SCOPED_KEYS.

// The device keys that hold the profile list itself.
export const CHILDREN_KEY = 'children';
export const ACTIVE_CHILD_KEY = 'active_child';

// The keys that move under `child:<id>:`.
//
// Everything a child *earned*: the points ledger, the progress log (traced
// count, quiz score, completed letters) and the unlocked stickers. These are
// the three values that made a shared device unusable.
export const CHILD_SCOPED_KEYS = ['points', 'progress', 'stickers'];

// Everything else stays device-wide, and each one is a deliberate call:
//
//   parent_pin_hash   One gate for the device. Per-child passcodes would mean
//                     the parents' room asks a different question depending on
//                     which child last used the tablet, and switching child
//                     would be a way past whichever passcode was in force.
//   gate_type         Same gate, so the same kind of challenge.
//   parent_unlock_all A parental control, not a child's earning: it says how
//                     this household wants the letter map to behave.
//   brush_color       Device defaults for v1, and worth saying why: a child
//   brush_width       does pick these, so there is an argument for scoping
//   sound_enabled     them. They are preferences and not progress, nothing is
//                     lost when the other child changes one, and per-child
//                     sound in particular is a setting a parent expects to set
//                     once for the room. If a child overriding the device
//                     default turns out to matter, moving these three later is
//                     a two-line change to the list above plus a migration —
//                     they are only ever read through the store.
//   editor_mode       A developer/teacher tool.
//   install_dismissed A fact about the browser, not about a child.
//   custom_waypoints_<id>
//                     A corrected letterform is a curriculum improvement: the
//                     parent who fixes ક's stroke order fixes it for every
//                     child on the device, and scoping it per child would ask
//                     them to do the work again for the second one.
//   version           The store's own schema stamp.
export const DEVICE_SCOPED_KEYS = [
  CHILDREN_KEY,
  ACTIVE_CHILD_KEY,
  'brush_color',
  'brush_width',
  'sound_enabled',
  'editor_mode',
  'install_dismissed',
  'gate_type',
  'parent_pin_hash',
  'parent_unlock_all'
];

// The implicit child the pre-13b store is adopted into. A constant, not a
// generated id: there is only ever one of these per device, it is legible in
// devtools next to the keys it owns, and it makes the migration deterministic
// to test.
export const FIRST_CHILD_ID = 'c1';
export const FIRST_CHILD_NAME = 'Child 1';

// The switcher draws a name and one of these. Round-robin by position rather
// than random, so the second child on a device always gets the same one and the
// popover does not reshuffle itself.
export const CHILD_AVATARS = ['🦚', '🐘', '🦋', '🐬', '🦉', '🐢', '🦊', '🐨'];

export const childAvatar = (index) => CHILD_AVATARS[index % CHILD_AVATARS.length];

// crypto.randomUUID needs a secure context, which the app has wherever the
// passcode works; the fallback keeps a profile creatable on plain http, where
// the only requirement is not colliding with the handful of ids on one device.
const newChildId = () => {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return `c-${uuid.slice(0, 8)}`;
  } catch {
    // Fall through to the counter below.
  }
  return `c-${Date.now().toString(36)}`;
};

// A profile as stored. `name` goes through the same validator that reads it back
// off disk, so a name that could not survive a reload cannot be created either.
export function makeChild({ id, name, avatar, createdAt } = {}) {
  return {
    id: id ?? newChildId(),
    name: childName(name, FIRST_CHILD_NAME),
    avatar: avatar ?? childAvatar(0),
    createdAt: createdAt ?? new Date().toISOString()
  };
}

// Appends a child to a list read off disk, refusing a name that is already
// taken so the switcher never draws two identical buttons. Returns the list
// unchanged when it cannot add, with the reason — the caller shows it.
export function addChildTo(children, name) {
  const list = sanitizeChildren(children);
  const wanted = childName(name, '');
  if (wanted === '') {
    return { ok: false, children: list, message: 'Give this child a name first.' };
  }
  if (list.some((child) => child.name.toLowerCase() === wanted.toLowerCase())) {
    return { ok: false, children: list, message: `There is already a ${wanted} on this device.` };
  }
  // Refused here rather than truncated on the next read: sanitizeChildren drops
  // the overflow, and dropping it after the child has earned points would
  // orphan the keys they earned them into.
  if (list.length >= CHILD_LIMIT) {
    return {
      ok: false,
      children: list,
      message: `This device already holds ${CHILD_LIMIT} children, which is the most it keeps.`
    };
  }

  const child = makeChild({ name: wanted, avatar: childAvatar(list.length) });
  return { ok: true, children: [...list, child], child };
}

// A sentinel readStored cannot mistake for a stored value: `null` is a value
// the parent passcode key legitimately holds, and `undefined` does not survive
// JSON, so neither can stand for "there is nothing here".
const MISSING = Symbol('missing');

// Moves the pre-13b device-wide keys under one child.
//
// The decode rules are not re-implemented: readStored is what reads them, so a
// v0 `guj_points` holding the bare string `250` is adopted, parsed and its old
// key deleted by exactly the code that has always done that, and only then does
// the value move under the child. Two hops in one boot, once ever.
//
// Lossless: the value is written under the child key *before* the old key is
// removed, and it is the value readStored returned, not a re-parse.
//
// Idempotent: after a complete run there is no legacy key left to find, so a
// second run reads three absent keys and writes nothing. A run interrupted
// half way resumes on the next boot — the child id is a constant, so the
// remaining keys land beside the ones that already moved.
//
// A legacy key that survives alongside a child key that already exists (an old
// tab, a downgrade, devtools) is dropped rather than moved: the child's own
// value is the newer one, and the alternative is silently overwriting what they
// earned since. It is logged, because nothing here disappears quietly.
export function adoptLegacyChildKeys(childId) {
  const moved = [];
  for (const key of CHILD_SCOPED_KEYS) {
    const legacy = readStored(key, MISSING);
    if (legacy === MISSING) continue;

    const scoped = childScopedKey(childId, key);
    if (readStored(scoped, MISSING) !== MISSING) {
      console.warn(
        `Ignoring the device-wide ${storageKey(key)}: ${storageKey(scoped)} already has a value, which is the newer one.`
      );
      removeStored(key);
      continue;
    }

    writeStored(scoped, legacy);
    removeStored(key);
    moved.push(key);
  }
  return moved;
}

// The boot step, and the only one: it runs before anything reads a scoped key,
// because it is what guarantees there is a child to scope one to.
//
// On a fresh install it creates one child and moves nothing (there is nothing
// to move). On a pre-13b install it creates the same implicit child and the
// legacy points, progress and stickers become that child's. On every boot after
// that both halves are no-ops.
export function ensureChildProfiles() {
  let children = sanitizeChildren(readStored(CHILDREN_KEY, null));
  const created = children.length === 0;

  if (created) {
    // Written before the sweep below, so the id the keys move under is on disk
    // even if the sweep does not finish.
    children = [makeChild({ id: FIRST_CHILD_ID, name: FIRST_CHILD_NAME })];
    writeStored(CHILDREN_KEY, children);
  }

  let activeChildId = readStored(ACTIVE_CHILD_KEY, null);
  if (!children.some((child) => child.id === activeChildId)) {
    // Covers the first run, a hand-edited key, and a list whose active child
    // was dropped by the validator: the switcher must always have an answer to
    // "who is playing".
    activeChildId = children[0].id;
    writeStored(ACTIVE_CHILD_KEY, activeChildId);
  }

  // Not gated on `created`: an interrupted first run leaves the list written
  // and some keys unmoved, and this is what finishes it.
  const moved = adoptLegacyChildKeys(children[0].id);

  return { children, activeChildId, created, moved };
}

// Everything one child earned, and nothing else. The parent passcode, the gate
// type, the shared preferences and every other child's keys are not in
// CHILD_SCOPED_KEYS, so this cannot reach them.
export function resetChildKeys(childId) {
  for (const key of CHILD_SCOPED_KEYS) removeStored(childScopedKey(childId, key));
}
