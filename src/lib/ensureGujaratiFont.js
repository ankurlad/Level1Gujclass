// Single-source font gate for every path that draws the guide glyph (the
// visible trace canvas, the centerline snap probe, and the auto-center
// rasterizer). Everything else in the app already makes Noto Sans Gujarati
// available — woff2 in /public/fonts, @font-face in index.css, <link
// rel="preload"> in index.html, woff2 in workbox's precache glob — but none of
// that guaranteed "the browser actually ATTACHED the font before we put ink
// on canvas". That missing guarantee is exactly what lets a device silently
// fall back to a system Gujarati font: the glyph then lands WIDER and
// differently shaped, and every committed dot sits off the centerline — the
// precise defect the iPhone showed in the production screenshot (Round 9).
//
// This module awaits that guarantee once per session, with a hard timeout, so
// a slow or failing font load blocks the first paint long enough for Noto to
// land (index.html's preload makes that well under a second on a good
// network), yet a device that truly cannot attach the font still ends up
// drawing instead of hanging a classroom forever. The service worker serves
// the woff2 cache-first, so once the first load has happened this gate
// resolves in ~0 ms and is invisible.
//
// Why we gate hard rather than "draw with whatever and hope": no shipping
// device (iPhone, iPad, Kindle Fire, Android phone or tablet) carries a
// bundled Gujarati font whose glyph metrics match the calibrated set, so the
// fallback is never "close enough" — either we get Noto, or the dots are
// wrong.
//
// WebKit quirk (documented, still current): WebKit's canvas text rendering
// historically did not pick up @font-face web fonts until a re-draw forced
// after the font attached. Gate-then-redraw handles that — see how
// TraceView repaints the guide once this promise resolves.

const GUJARATI_SPEC = '400 220px "Noto Sans Gujarati"';

// 15 s is generous for a 112 KB woff2 even on a weak signal, short enough
// that a genuinely dead font URL fails fast instead of hanging the app. A
// font that never attaches is not recoverable client-side, so the honest end
// state is "draw with the fallback" — we just need the app to keep working.
const TIMEOUT_MS = 15000;

/**
 * Resolve once the Gujarati guide font has attached to document.fonts, or
 * (if the timeout fires first) resolve anyway so the caller can draw. Never
 * rejects, never hangs.
 *
 * Stateless on purpose: the state of document.fonts can change between calls
 * (a face attaches late after a first paint, HMR swaps the page), so every
 * call re-checks. Cost is nil — document.fonts.load() is a no-op when the
 * face is already available, which is the state after the first successful
 * call (and after a warm cache).
 *
 * @param {number} [timeoutMs] override for tests; defaults to TIMEOUT_MS
 * @returns {Promise<void>}
 */
export function ensureGujaratiFont(timeoutMs = TIMEOUT_MS) {
  return gateOnce(timeoutMs);
}

async function gateOnce(timeoutMs) {
  // No FontFaceSet (very old WebView, or a jsdom test): nothing to wait for.
  // A real browser either attaches the font in time or not; jsdom is a test
  // harness and should never block, so resolve immediately and let the
  // caller draw with whatever the environment provides.
  if (typeof document === 'undefined' || !document.fonts) return;
  const fonts = document.fonts;
  if (typeof fonts.load !== 'function' || typeof fonts.check !== 'function') return;

  let loadSettles;
  try {
    loadSettles = fonts.load(GUJARATI_SPEC);
  } catch {
    // A FontFaceSet that throws synchronously is broken in a way we cannot
    // diagnose here (and cannot diagnose meaningfully — it is the engine
    // itself). The contract is "the app must draw", so fall through.
    return;
  }

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });

  try {
    // loadSettles is a Promise<FontFace[]> that resolves when the face is
    // usable. It resolves with [] rather than reject if nothing matches, so
    // an unmet font degrades to "proceed" — the fallback stack then renders.
    // Race it against the hard timeout so a hung load cannot block forever.
    await Promise.race([
      Promise.resolve(loadSettles).catch(() => []),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export const __test = { GUJARATI_SPEC, TIMEOUT_MS };
