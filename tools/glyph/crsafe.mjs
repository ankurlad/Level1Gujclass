// Safety check: the Catmull-Rom curve must never leave the ink band.
// For every letter, sample the Bezier segments that TraceView will draw and
// measure the max distance to the committed ink mask.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRICULUM } from '../../src/curriculum.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const canvasToPx = (v, size) => (v / 100) * size;

const makeMask = (ink) => {
  const W = ink.width, H = ink.height;
  const mask = new Uint8Array(W * H);
  ink.rows.forEach((row, y) => {
    if (!row) return;
    for (let i = 0; i + 1 < row.length; i += 2)
      for (let x = row[i]; x <= row[i + 1]; x++) if (x >= 0 && x < W) mask[y * W + x] = 1;
  });
  return { mask, W, H };
};
// distance to nearest ink pixel, full search (slow but exact, small glyphs)
const distToInk = (mask, W, H, x, y) => {
  const cx = Math.round(x), cy = Math.round(y);
  let best = Infinity;
  for (let yy = Math.max(0, cy - 12); yy <= Math.min(H - 1, cy + 12); yy++)
    for (let xx = Math.max(0, cx - 12); xx <= Math.min(W - 1, cx + 12); xx++) {
      if (!mask[yy * W + xx]) continue;
      const d = Math.hypot(xx - cx, yy - cy);
      if (d < best) best = d;
    }
  if (best === Infinity) {
    // fallback full scan
    outer: for (let yy = 0; yy < H; yy++)
      for (let xx = 0; xx < W; xx++) {
        if (!mask[yy * W + xx]) continue;
        const d = Math.hypot(xx - cx, yy - cy);
        if (d < best) { best = d; }
      }
  }
  return best;
};
const bez = (p0, c1, c2, p1, t) => {
  const u = 1 - t;
  return [
    u*u*u*p0[0] + 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t*t*t*p1[0],
    u*u*u*p0[1] + 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t*t*t*p1[1],
  ];
};

let failures = 0;
for (const L of CURRICULUM) {
  const ink = JSON.parse(readFileSync(path.join(HERE, 'ink', `${L.id}.json`), 'utf8'));
  const { mask, W, H } = makeMask(ink);
  // build strokes
  const strokes = [];
  let cur = [L.waypoints[0]];
  for (let i = 1; i < L.waypoints.length; i++) {
    if (L.waypoints[i].moveTo) { strokes.push(cur); cur = [L.waypoints[i]]; }
    else cur.push(L.waypoints[i]);
  }
  strokes.push(cur);
  let worst = 0;
  for (const seg of strokes) {
    if (seg.length < 3) {
      // straight line — check it
      if (seg.length === 2) {
        const a = [(seg[0].x/100)*W, (seg[0].y/100)*H];
        const b = [(seg[1].x/100)*W, (seg[1].y/100)*H];
        for (let t = 0; t <= 1.0001; t += 0.05) {
          const p = [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
          const d = distToInk(mask, W, H, p[0], p[1]);
          if (d > worst) worst = d;
        }
      }
      continue;
    }
    const pts = seg.map(w => [(w.x/100)*W, (w.y/100)*H]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i === 0 ? pts[0] : pts[i-1];
      const a = pts[i], b = pts[i+1];
      const c = i+2 < pts.length ? pts[i+2] : pts[pts.length-1];
      const c1 = [a[0]+(b[0]-p0[0])/6, a[1]+(b[1]-p0[1])/6];
      const c2 = [b[0]-(c[0]-a[0])/6, b[1]-(c[1]-a[1])/6];
      for (let k = 1; k <= 12; k++) {
        const p = bez(a, c1, c2, b, k/12);
        const d = distToInk(mask, W, H, p[0], p[1]);
        if (d > worst) worst = d;
      }
    }
  }
  if (worst > 3.5) {
    failures++;
    console.log(`${L.id.padEnd(6)} curve leaves ink by worst ${worst.toFixed(1)}px  <<< CHECK`);
  }
}
if (!failures) console.log(`All ${CURRICULUM.length} letters: Catmull-Rom curve within ${3.5}px of ink.`);
else process.exit(1);
