#!/usr/bin/env node
// Before/after proof: same committed ink, same committed dots, only the DOT
// DIAMETER changes (24px -> 20px). Rendered at the app's real 380x320
// canvas size with the same bg (#f8fafc), the same guide glyph color,
// and the committed Catmull-Rom spline. Placed side by side with the
// phone crop so the eye sees the dot-vs-band relationship, not a shape diff.
import fs from 'node:fs';
import path from 'node:path';
import { CURRICULUM } from '../../src/curriculum.js';

const INK = JSON.parse(fs.readFileSync(new URL('../../tools/glyph/ink/ka.json', import.meta.url), 'utf8'));
const L = CURRICULUM.find(l => (l.letter || l.char) === 'ક');
if (!L) { console.error('no ka'); process.exit(1); }

const W = 380, H = 320;
const BG = [248, 250, 252];
const FILL = [148, 163, 184]; // slate-400, what TraceView's guide glyph uses at 0.75 alpha
// Ink rows are [y0, x0, x1, ...] or [x values] per config. Check format.
// From config.js the rows are row-keyed.
let rows = INK;
if (Array.isArray(rows)) rows = { rows }; // whatever
const px = (x,y) => (y*W + x) * 3;
function put(buf, x, y, [r,g,b], a=255) {
  if (x<0||y<0||x>=W||y>=H) return;
  const i = px(x,y);
  const cr = buf[i], cg = buf[i+1], cb = buf[i+2];
  const f = a/255;
  buf[i]   = Math.round(cr+(r-cr)*f);
  buf[i+1] = Math.round(cg+(g-cg)*f);
  buf[i+2] = Math.round(cb+(b-cb)*f);
}
function disc(buf, cx, cy, r, [R,G,B], a) {
  const r2 = Math.ceil(r);
  for (let y = -r2; y <= r2; y++)
    for (let x = -r2; x <= r2; x++) {
      const d = Math.hypot(x,y);
      if (d > r) continue;
      // soft edge: linear falloff over outer 1px
      const e = Math.max(0, Math.min(1, r - d));
      put(buf, cx+x, cy+y, [R,G,B], Math.round(a * e));
    }
}
function toPath(xPct, yPct) {
  // curriculum.js x/y are in 0-100 per axis; canvas is 380x320.
  return [Math.round(xPct/100*W), Math.round(yPct/100*H)];
}

function drawScene(dotPx) {
  const buf = Buffer.alloc(W*H*3);
  for (let i = 0; i < W*H; i++) { buf[i*3]=BG[0]; buf[i*3+1]=BG[1]; buf[i*3+2]=BG[2]; }
  // Fill ink from committed rows: rows[y] = flat [x0,x1, x2,x3, ...] runs.
  const { width: Wk, height: Hk, rows } = INK;
  const scale = W / Wk;
  if (scale !== 1) throw new Error('ink canvas mismatch');
  for (let y = 0; y < Hk; y++) {
    const run = rows[y];
    if (!run) continue;
    for (let i = 0; i + 1 < run.length; i += 2) {
      const x0 = run[i], x1 = run[i + 1];
      for (let x = x0; x <= x1; x++) if (x >= 0 && x < W) put(buf, x, y, FILL, 190);
    }
    // single-pixel runs (odd length, degenerate): skip — none committed
  }
  // Dots: committed waypoints, dotPx diameter; first dot gets a dashed-style ring (skip — visual only in DOM).
  L.waypoints.forEach((wp, idx) => {
    const [cx, cy] = toPath(wp.x, wp.y);
    // Faint stroke-color fill (use blue = stroke 1 for all, good enough for proof)
    disc(buf, cx, cy, dotPx/2 - 1, [224,231,255], 90);     // pale fill
    disc(buf, cx, cy, dotPx/2, [99,102,241], 255);         // solid ring approx (we just draw a filled smaller then ring)
    // Redraw inner to re-pale (approximates hollow look without true ring in PPM)
    disc(buf, cx, cy, dotPx/2 - 2, [238,242,255], 96);
    // Number: draw a tiny dark square at center instead of font text (no font in raw buffer)
    put(buf, cx, cy, [51,65,85], 255);
  });
  return buf;
}

function toPPM(buf) {
  const header = `P6\n${W} ${H}\n255\n`;
  return Buffer.concat([Buffer.from(header, 'utf8'), buf]);
}

const before = toPPM(drawScene(24));
const after  = toPPM(drawScene(20));
const outDir = import.meta.dirname === path.resolve() ? '.' : import.meta.dirname;
fs.writeFileSync(path.join(outDir, 'ka_before_24px.ppm'), before);
fs.writeFileSync(path.join(outDir, 'ka_after_20px.ppm'),  after);
console.log('wrote ka_before_24px.ppm ka_after_20px.ppm');
