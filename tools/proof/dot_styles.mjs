#!/usr/bin/env node
// Dot-STYLE A/B on the SAME committed ink (ka.json) + SAME committed waypoints.
// Isolates the ONLY variable the complaint is about: dot size + center anchor.
// Four candidates, cropped to the top bar where dot 1 lives:
//   A) 24px solid  (current shipped)
//   B) 20px solid  (my w-5 patch)
//   C) 18px translucent fill + crisp 3px center dot  (proposed)
//   D) 14px translucent fill + crisp 3px center dot
import fs from 'node:fs';
import { CURRICULUM } from '../../src/curriculum.js';

const INK = JSON.parse(fs.readFileSync(new URL('../../tools/glyph/ink/ka.json', import.meta.url), 'utf8'));
const L = CURRICULUM.find(l => (l.letter || l.char) === 'ક');
const W = 380, H = 320;
const BG = [248, 250, 252];
const FILL = [148, 163, 184];
const RING = [79, 70, 229];      // indigo ring
const TINT = [199, 210, 254];    // pale indigo fill
const MARK = [51, 65, 85];       // dark center marker

function makeBuf() {
  const buf = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) { buf[i*3]=BG[0]; buf[i*3+1]=BG[1]; buf[i*3+2]=BG[2]; }
  const { width: Wk, height: Hk, rows } = INK;
  if (Wk !== W) throw new Error('ink canvas mismatch');
  for (let y = 0; y < Hk; y++) {
    const run = rows[y]; if (!run) continue;
    for (let i = 0; i + 1 < run.length; i += 2)
      for (let x = run[i]; x <= run[i+1]; x++) if (x>=0&&x<W) put(buf, x, y, FILL, 190);
  }
  return buf;
}
function put(buf, x, y, [r,g,b], a=255) {
  if (x<0||y<0||x>=W||y>=H) return;
  const i=(y*W+x)*3, f=a/255;
  buf[i]=Math.round(buf[i]+(r-buf[i])*f); buf[i+1]=Math.round(buf[i+1]+(g-buf[i+1])*f); buf[i+2]=Math.round(buf[i+2]+(b-buf[i+2])*f);
}
function disc(buf, cx, cy, rad, col, a) {
  const R = Math.ceil(rad);
  for (let y=-R; y<=R; y++) for (let x=-R; x<=R; x++) {
    const d=Math.hypot(x,y); if (d>rad) continue;
    const e=Math.max(0,Math.min(1,rad-d));
    put(buf, cx+x, cy+y, col, Math.round(a*e));
  }
}
function ring(buf, cx, cy, rad, col, a) {
  disc(buf, cx, cy, rad, col, a);
}
const toPath = (x,y)=>[Math.round(x/100*W), Math.round(y/100*H)];

function scene(kind) {
  const buf = makeBuf();
  L.waypoints.forEach((wp) => {
    const [cx,cy]=toPath(wp.x,wp.y);
    if (kind==='A') { disc(buf,cx,cy,12, TINT,150); ring(buf,cx,cy,12,RING,255); disc(buf,cx,cy,10,TINT,120); }
    if (kind==='B') { disc(buf,cx,cy,10, TINT,150); ring(buf,cx,cy,10,RING,255); disc(buf,cx,cy,8, TINT,120); }
    if (kind==='C') { disc(buf,cx,cy,9, TINT,110); ring(buf,cx,cy,9,RING,255); disc(buf,cx,cy,7,TINT,80); disc(buf,cx,cy,1.5,MARK,255); }
    if (kind==='D') { disc(buf,cx,cy,7, TINT,110); ring(buf,cx,cy,7,RING,255); disc(buf,cx,cy,5,TINT,80); disc(buf,cx,cy,1.5,MARK,255); }
  });
  return buf;
}
const toPPM = (buf)=>Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`,'utf8'),buf]);
for (const k of ['A','B','C','D']) fs.writeFileSync(`dot_${k}.ppm`, toPPM(scene(k)));
console.log('wrote dot_A/B/C/D.ppm');
