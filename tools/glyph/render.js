// Step 1 of the pipeline: render each glyph the way the app renders it, and
// bring the ink back into Node.
//
// WHY A BROWSER. The waypoints have to sit on the ink the child sees, and that
// ink is produced by Chromium's text stack: its woff2 decoder, its shaper (two
// of the 34 letters are conjuncts — ક્ષ and જ્ઞ — that only exist after GSUB
// runs), its rasteriser, and its reading of `textBaseline = 'middle'`. A pure
// JS re-implementation would have to guess all four, and a wrong guess shifts
// every waypoint of every letter by the same invisible amount. So the render
// happens in the same engine the app runs in, at the constants in config.js,
// and Node only ever sees the resulting pixels.
//
// The ink comes back as per-row runs rather than a bitmap: it is a tenth of the
// size, it is diffable, and it is the format tools/glyph/ink/*.json is
// committed in — which is what lets `npm test` and a regeneration run without
// a browser present.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  CANVAS_H,
  CANVAS_W,
  FONT_FAMILY,
  FONT_FILE,
  GUIDE_BACKGROUND,
  GUIDE_FILL,
  GUIDE_FONT,
  GUIDE_ORIGIN_X,
  GUIDE_ORIGIN_Y,
  GUIDE_TEXT_ALIGN,
  GUIDE_TEXT_BASELINE,
  BACKGROUND_RGB,
  INK_RGB,
  INK_COVERAGE,
} from './config.js';

const BROWSER_CANDIDATES = [
  process.env.GLYPH_BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

export const findBrowser = () => BROWSER_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null;

const BEGIN = '@@GLYPH_BEGIN@@';
const END = '@@GLYPH_END@@';

// The page. Everything inside runs in Chromium; the only channel back out is
// the JSON printed between the two markers, which --dump-dom hands to Node.
const buildPage = (fontBase64, letters) => `<!doctype html>
<meta charset="utf-8">
<title>glyph render</title>
<style>
  @font-face {
    font-family: '${FONT_FAMILY}';
    font-style: normal;
    font-weight: 400 900;
    src: url(data:font/woff2;base64,${fontBase64}) format('woff2');
  }
</style>
<pre id="out">pending</pre>
<script>
const LETTERS = ${JSON.stringify(letters)};
const W = ${CANVAS_W};
const H = ${CANVAS_H};
// Red channel at exactly half ink coverage — see INK_COVERAGE in config.js.
const INK_CUTOFF = ${BACKGROUND_RGB[0]} - (${BACKGROUND_RGB[0]} - ${INK_RGB[0]}) * ${INK_COVERAGE};

const renderOne = (letter) => {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = ${JSON.stringify(GUIDE_BACKGROUND)};
  ctx.fillRect(0, 0, W, H);
  ctx.font = ${JSON.stringify(GUIDE_FONT)};
  ctx.fillStyle = ${JSON.stringify(GUIDE_FILL)};
  ctx.textAlign = ${JSON.stringify(GUIDE_TEXT_ALIGN)};
  ctx.textBaseline = ${JSON.stringify(GUIDE_TEXT_BASELINE)};
  ctx.fillText(letter, ${GUIDE_ORIGIN_X}, ${GUIDE_ORIGIN_Y});

  const data = ctx.getImageData(0, 0, W, H).data;
  const rows = [];
  let minX = W, minY = H, maxX = -1, maxY = -1, area = 0;
  for (let y = 0; y < H; y++) {
    const runs = [];
    let start = -1;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const ink = data[i] <= INK_CUTOFF;
      if (ink && start < 0) start = x;
      if (!ink && start >= 0) { runs.push(start, x); start = -1; }
    }
    if (start >= 0) runs.push(start, W);
    rows.push(runs);
    for (let r = 0; r < runs.length; r += 2) {
      area += runs[r + 1] - runs[r];
      if (runs[r] < minX) minX = runs[r];
      if (runs[r + 1] - 1 > maxX) maxX = runs[r + 1] - 1;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return {
    width: W,
    height: H,
    rows,
    area,
    bbox: area === 0 ? null : { minX, minY, maxX, maxY },
    advance: ctx.measureText(letter).width,
  };
};

const main = async () => {
  const out = document.getElementById('out');
  try {
    await document.fonts.load('220px "${FONT_FAMILY}"', LETTERS.map((l) => l.letter).join(''));
    await document.fonts.ready;
    // A missing font would fall through to sans-serif and produce 34 letters of
    // plausible-looking, wrong ink. Refuse instead.
    const loaded = document.fonts.check('220px "${FONT_FAMILY}"', LETTERS[0].letter);
    const glyphs = {};
    for (const entry of LETTERS) glyphs[entry.id] = { letter: entry.letter, ...renderOne(entry.letter) };
    out.textContent = '${BEGIN}' + JSON.stringify({ ok: loaded, fontLoaded: loaded, glyphs }) + '${END}';
  } catch (error) {
    out.textContent = '${BEGIN}' + JSON.stringify({ ok: false, error: String(error) }) + '${END}';
  }
};
main();
</script>
`;

/**
 * Render every letter and return { id: { letter, width, height, rows, ... } }.
 *
 * @param {Array<{id: string, letter: string}>} letters
 * @param {string} repoRoot
 */
export const renderGlyphs = (letters, repoRoot) => {
  const browser = findBrowser();
  if (!browser) {
    throw new Error(
      `No Chrome/Edge found. Set GLYPH_BROWSER to a Chromium binary, or run with the committed ink in tools/glyph/ink.`
    );
  }

  const fontBase64 = readFileSync(path.join(repoRoot, FONT_FILE)).toString('base64');
  const workDir = path.join(tmpdir(), 'guj-glyph-render');
  mkdirSync(workDir, { recursive: true });
  const pageFile = path.join(workDir, 'render.html');
  writeFileSync(pageFile, buildPage(fontBase64, letters), 'utf8');

  // --virtual-time-budget is what makes --dump-dom wait: it fast-forwards the
  // page's timers and pending work (the font load, above) and only then
  // serialises. Without it the dump can land on "pending".
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--disable-lcd-text',
    '--force-device-scale-factor=1',
    '--virtual-time-budget=30000',
    '--dump-dom',
    `file:///${pageFile.replace(/\\/g, '/')}`,
  ];
  const dom = execFileSync(browser, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

  const begin = dom.indexOf(BEGIN);
  const end = dom.indexOf(END);
  if (begin < 0 || end < 0) {
    throw new Error(`The render page produced no output. First 500 chars of the DOM:\n${dom.slice(0, 500)}`);
  }
  // --dump-dom serialises text content as HTML, so & < > come back escaped.
  const json = dom
    .slice(begin + BEGIN.length, end)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  const payload = JSON.parse(json);
  if (!payload.ok) {
    throw new Error(
      payload.error
        ? `Render failed inside the browser: ${payload.error}`
        : `${FONT_FAMILY} did not load in the headless browser; refusing to trace fallback ink.`
    );
  }
  return payload.glyphs;
};

/** Row runs -> a Uint8Array mask, 1 = ink. The form every later step wants. */
export const toMask = (glyph) => {
  const { width, height, rows } = glyph;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const runs = rows[y] ?? [];
    for (let i = 0; i < runs.length; i += 2) {
      for (let x = runs[i]; x < runs[i + 1]; x++) mask[y * width + x] = 1;
    }
  }
  return mask;
};
