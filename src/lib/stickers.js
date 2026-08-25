import { CURRICULUM } from '../curriculum';

// The reward catalogue. Read by four views — the shop sells them, the sandbox
// stamps the unlocked ones, the parent dashboard lists them, and the trace view
// awards them — so it sits beside the curriculum rather than inside any one of
// them.
//
// There are two economies in here and one schema.
//
//   'points'   The shop. Bought with the points a child earns for finishing a
//              letter, at the cost on the entry. Unchanged since v1 — the eight
//              entries below, their ids, their emoji and their prices are
//              exactly what they always were, because a child who saved 400
//              points for the balloon has to still be able to buy the balloon.
//   'mastery'  Earned, never bought. One per letter, awarded the first time the
//              child traces that letter at or above MASTERY_ACCURACY in
//              Challenge mode (see src/lib/mastery.js).
//   'streak'   Earned, never bought. Two milestones, at 5 and 12 consecutive
//              lessons traced at or above MASTERY_ACCURACY.
//
// EVERY entry, in either economy, carries { id, emoji, label, kind }. `cost` is
// what separates them: a points sticker has one and an earned sticker does not,
// which is also the test the shop's two shelves split on. Nothing anywhere
// compares points against a missing cost — the shop only ever prices the
// 'points' shelf.
//
// The ids are the values that land in `guj:child:<id>:stickers`, so they are
// stable strings and not positions: sanitizeStickerIds in src/lib/validate.js
// checks a stored list against the ids below and drops anything it does not
// recognise.

// The shop. Ids st1..st8 are v1's and are load-bearing — they are on disk.
const POINTS_STICKERS = [
  { id: 'st1', emoji: '🦁', label: 'Simha (Lion)', cost: 50 },
  { id: 'st2', emoji: '🐵', label: 'Vanara (Monkey)', cost: 100 },
  { id: 'st3', emoji: '🦄', label: 'Unicorn', cost: 150 },
  { id: 'st4', emoji: '🚀', label: 'Yana (Rocket)', cost: 200 },
  { id: 'st5', emoji: '🦖', label: 'Dinosaur', cost: 250 },
  { id: 'st6', emoji: '🐼', label: 'Panda', cost: 300 },
  { id: 'st7', emoji: '🍉', label: 'Tarbuch (Watermelon)', cost: 350 },
  { id: 'st8', emoji: '🎈', label: 'Fuggo (Balloon)', cost: 400 }
].map((sticker) => ({ ...sticker, kind: 'points' }));

// One mastery sticker per letter, id `mastery_<lessonId>`.
//
// Generated from the curriculum rather than written out 42 times, for the same
// reason the phonics table is not: the letter set is the curriculum's to define,
// and a hand-copied list is a list that goes stale the day a letter is added.
// The emoji is the lesson's own word picture (ક -> 🪷 for કમળ, lotus), so the
// award a child earns for ક is the picture they have been looking at all the way
// through the lesson instead of a generic star.
export const masteryStickerId = (letterId) => `mastery_${letterId}`;

const MASTERY_STICKERS = CURRICULUM.map((lesson) => ({
  id: masteryStickerId(lesson.id),
  emoji: lesson.emoji,
  label: `${lesson.letter} (${lesson.english}) mastered`,
  kind: 'mastery',
  letterId: lesson.id
}));

// The streak milestones. Two, deliberately: one a child reaches in a good
// session and one that takes several.
export const streakStickerId = (length) => `streak_${length}`;

const STREAK_STICKERS = [
  { length: 5, emoji: '🔥', label: '5 neat letters in a row' },
  { length: 12, emoji: '🏆', label: '12 neat letters in a row' }
].map((milestone) => ({
  id: streakStickerId(milestone.length),
  emoji: milestone.emoji,
  label: milestone.label,
  kind: 'streak',
  streak: milestone.length
}));

export const STICKERS = [...POINTS_STICKERS, ...MASTERY_STICKERS, ...STREAK_STICKERS];

// The three shelves, each already filtered. `POINTS_SHELF` is what the shop
// prices and sells; the other two are what it displays as earned.
export const POINTS_SHELF = POINTS_STICKERS;
export const MASTERY_SHELF = MASTERY_STICKERS;
export const STREAK_SHELF = STREAK_STICKERS;

const BY_ID = new Map(STICKERS.map((sticker) => [sticker.id, sticker]));

export const stickerById = (id) => BY_ID.get(id) ?? null;

// True for a sticker the shop may sell. Everything else is earned, and offering
// it for points would be a second way to get a reward that is meant to say the
// child traced the letter well.
export const isPurchasable = (sticker) => sticker?.kind === 'points';
