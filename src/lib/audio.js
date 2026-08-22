// The two noises the app makes: synthesized sound effects and spoken Gujarati.
//
// Both were methods on App before the split and are reached from every view, so
// they live here rather than in the store — `speak` needs nothing from it, and
// `playSound` needs one boolean, which the store binds in (see useAppStore's
// playSound) so callers keep the one-argument signature they always had.
//
// `speak` prefers a recorded clip (src/assets/audio, gu-IN-DhwaniNeural) and
// keeps the Web Speech path underneath it: most devices have no gu-IN voice, so
// speechSynthesis alone was the wrong sound or no sound at all. Nothing here can
// leave a letter silent — an unmatched text, a missing file or a refused play
// all fall through to the speech synthesizer that used to be the only path.

import { CURRICULUM } from '../curriculum.js'

// Synthesize Sound Effects using Web Audio API
export const playSound = (type, soundEnabled) => {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'waypoint') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(820, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      const now = ctx.currentTime;
      const playNote = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };
      playNote(523.25, now, 0.12);
      playNote(659.25, now + 0.1, 0.12);
      playNote(783.99, now + 0.2, 0.12);
      playNote(1046.50, now + 0.3, 0.35);
    } else if (type === 'correct') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.error("Web Audio API failed to synthesize sound", e);
  }
};

// Every mp3 in src/assets/audio, keyed by basename ('letter_ka') and valued by
// the hashed build URL. Eager and at module load: this is 75 string constants
// after bundling, not 75 requests, and resolveClip has to be synchronous.
const CLIP_URLS = Object.entries(
  import.meta.glob('../assets/audio/*.mp3', { eager: true, query: '?url', import: 'default' })
).reduce((urls, [path, url]) => {
  urls[path.slice(path.lastIndexOf('/') + 1, -'.mp3'.length)] = url;
  return urls;
}, {});

// The seven fixed lines the games and the sandbox say. Recorded under these
// exact strings by scripts/tts-generate.sh, which owns the same table — change
// one and the other regenerates.
const PHRASE_CLIPS = {
  'સાચો જવાબ.': 'phrase_correct',
  'ફરીથી પ્રયાસ કરો.': 'phrase_wrong',
  'સાચો જવાબ!': 'phrase_correct_exclaim',
  'અભિનંદન.': 'phrase_congrats',
  'અદ્ભુત! સાચું છે!': 'phrase_wonderful_correct',
  'તમારું ચિત્ર સુંદર છે!': 'phrase_picture_beautiful',
  'અદ્ભુત! બધી જોડી મળી ગઈ!': 'phrase_all_pairs',
};

// Spoken text -> clip URL. Three kinds of text reach `speak`: a bare syllable
// (the letter buttons), the `<letter>. <word>.` line TraceView reads when a
// lesson opens, and one of the phrases above. Two letters sharing a syllable
// would be harmless — the recording is of the syllable, so either clip is the
// same sound — so the first one registered wins rather than being an error.
const CLIP_BY_TEXT = new Map();

for (const [phrase, clip] of Object.entries(PHRASE_CLIPS)) {
  if (CLIP_URLS[clip]) CLIP_BY_TEXT.set(phrase, CLIP_URLS[clip]);
}

for (const lesson of CURRICULUM) {
  const letter = CLIP_URLS[`letter_${lesson.id}`];
  if (letter && !CLIP_BY_TEXT.has(lesson.letter)) CLIP_BY_TEXT.set(lesson.letter, letter);
  const line = CLIP_URLS[`lesson_${lesson.id}`];
  if (line) CLIP_BY_TEXT.set(`${lesson.letter}. ${lesson.word}.`, line);
}

// Pure: the text a view would have handed to speechSynthesis in, the URL of the
// recording of that exact text out, or null when nothing was recorded for it.
export const resolveClip = (text) => {
  if (typeof text !== 'string') return null;
  return CLIP_BY_TEXT.get(text.trim()) ?? null;
};

// One element, reused. A second tap while a clip is playing should replace it,
// not layer over it, which is also what speechSynthesis.cancel() does below.
let player = null;

const playClip = (url, text) => {
  if (typeof Audio === 'undefined') return false;
  // The previous speak() may have fallen back and still be talking — a blocked
  // first tap, say. Stop it for the same reason the element below is rewound:
  // one voice at a time, whichever path produced it.
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (!player) player = new Audio();
  player.pause();
  player.currentTime = 0;
  player.src = url;
  const started = player.play();
  // play() rejects when the file will not load or the browser refuses to start
  // it without a gesture. `speak` has already returned by then, so the fallback
  // is re-entered from here rather than returned to.
  if (started && typeof started.catch === 'function') {
    started.catch(() => speakSynthesized(text));
  }
  return true;
};

// Voice Pronunciation Speech Synthesis
const speakSynthesized = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'gu-IN';
    const voices = window.speechSynthesis.getVoices();
    const guVoice = voices.find(v => v.lang.toLowerCase().includes('gu'));
    if (guVoice) {
      utterance.voice = guVoice;
    }
    utterance.rate = 0.75;
    utterance.pitch = 1.15;
    window.speechSynthesis.speak(utterance);
  }
};

// Recording first, synthesizer second. The order matters more than it looks: a
// clip that is missing, unmatched or blocked has to end in the old path, never
// in silence, so every branch that is not a started playback falls through.
export const speak = (text) => {
  const url = resolveClip(text);
  if (url) {
    try {
      if (playClip(url, text)) return;
    } catch (e) {
      console.error("Recorded clip failed, falling back to speech synthesis", e);
    }
  }
  speakSynthesized(text);
};
