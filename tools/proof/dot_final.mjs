// Final A/B: 20px vs 16px dots, BOTH with a crisp center anchor, at phone scale
// (card width ~350 css px, scaled 0.92x from the 380 canvas). The question the
// user cares about: does the numbered dot read as "on the band" or "off it"?
import fs from 'node:fs';
import { CURRICULUM } from '../../src/curriculum.js';

const INK = JSON.parse(fs.readFileSync(new URL('../../tools/glyph/ink/ka.json', import.meta.url), 'utf8'));
const L = CURRICULUM.find(l => l.id === 'ka');
const W = 380, H = 320;
const BG = [248, 250, 252], FILL = [148, 163, 184];
const STROKE = [79, 70, 229];    // indigo stroke identity ring
const TINT = [199, 210, 254];    // pale translucent fill
const MARK = [30, 41, 59];       // dark slate-800 center anchor
const NUM = [30, 41, 59];

function makeBuf() {
  const buf = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) { buf[i*3]=BG[0]; buf[i*3+1]=BG[1]; buf[i*3+2]=BG[2]; }
  const { width: Wk, height: Hk, rows } = INK;
  if (Wk !== W) throw new Error('ink canvas mismatch');
  for (let y = 0; y < Hk; y++) {
    const run = rows[y]; if (!run) continue;
    for (let i = 0; i + 1 < run.length; i += 2)
      for (let x = run[i]; x <= run[i+1]; x++) if (x >= 0 && x < W) put(buf, x, y, FILL, 190);
  }
  return buf;
}
function put(buf, x, y, [r,g,b], a=255) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y*W+x)*3, f = a/255;
  buf[i]   = Math.round(buf[i]  +(r-buf[i]  )*f);
  buf[i+1] = Math.round(buf[i+1]+(g-buf[i+1])*f);
  buf[i+2] = Math.round(buf[i+2]+(b-buf[i+2])*f);
}
function disc(buf, cx, cy, rad, col, a) {
  const R = Math.max(1, Math.ceil(rad));
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const d = Math.hypot(x, y);
    if (d > rad) continue;
    const e = Math.max(0, Math.min(1, rad - d));
    put(buf, cx + x, cy + y, col, Math.round(a * e));
  }
}
const toPath = (x, y) => [Math.round(x/100*W), Math.round(y/100*H)];

function scene(dotRad) {
  const buf = makeBuf();
  L.waypoints.forEach((wp, idx) => {
    const [cx, cy] = toPath(wp.x, wp.y);
    // translucent fill
    disc(buf, cx, cy, dotRad, TINT, idx === 0 ? 150 : 110);
    // stroke ring (solid)
    disc(buf, cx, cy, dotRad, STROKE, 255);
    // re-fill interior pale so the ring reads as a rim, not a blob
    disc(buf, cx, cy, dotRad - 2, TINT, 120);
    // crisp center anchor
    disc(buf, cx, cy, 1.6, MARK, 255);
    // tiny numeral: a 3px dark tick at top of dot (substitute for font digit)
    put(buf, cx, cy - Math.round(dotRad*0.45), NUM, 255);
    put(buf, cx+1, cy - Math.round(dotRad*0.45), NUM, 255);
  });
  return buf;
}
const toPPM = buf => Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`, 'utf8'), buf]);
fs.writeFileSync('final_20px.ppm', toPPM(scene(10)));
fs.writeFileSync('final_16px.ppm', toPPM(scene(8)));
console.log('wrote final_20px.ppm final_16px.ppm');
