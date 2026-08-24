// Sweep all 42 letters: for each candidate dot size, how many letters have at
// least one dot sitting on a band thinner than the dot (the overhang case),
// and how many dots are OFF the committed ink entirely (the data bug — there
// should be zero). Also reports the worst overhang ratio per dot size.
import fs from 'node:fs';
import { CURRICULUM } from '../../src/curriculum.js';

// The card is max-w-[380px]; a 375px-wide phone (iPhone 13/14/15) shows the
// canvas at 1:1, so 1 canvas px = 1 css px. Use css px == canvas px.
const SIZES = [24, 20, 18, 16, 14];

function letterStats(id) {
  let ink;
  try {
    ink = JSON.parse(fs.readFileSync(new URL(`../../tools/glyph/ink/${id}.json`, import.meta.url), 'utf8'));
  } catch { return null; }
  const L = CURRICULUM.find(l => l.id === id);
  if (!L) return null;
  const { width: W, height: H, rows } = ink;
  const inInk = (x, y) => {
    if (y < 0 || y >= H) return false;
    const r = rows[y]; if (!r) return false;
    for (let k = 0; k + 1 < r.length; k += 2) if (x >= r[k] - 1 && x <= r[k + 1] + 1) return true;
    return false;
  };
  let off = [];
  const bands = [];
  L.waypoints.forEach((wp, i) => {
    // sample a small disc; count on-ink
    let anyInk = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
      if (inInk(Math.round(wp.x / 100 * W) + dx, Math.round(wp.y / 100 * H) + dy)) anyInk = true;
    if (!anyInk) { off.push(i + 1); return; }
    // perpendicular band thickness via column scan
    const cx = Math.round(wp.x / 100 * W), cy = Math.round(wp.y / 100 * H);
    let up = 1, down = 1;
    for (let y = cy - 1; y >= 0; y--) if (inInk(cx, y)) up++; else break;
    for (let y = cy + 1; y < H; y++) if (inInk(cx, y)) down++; else break;
    bands.push(up + down - 1);
  });
  return { id, n: L.waypoints.length, off, bands };
}

const letters = CURRICULUM.map(l => l.id).map(id => letterStats(id));
for (const dot of SIZES) {
  let offLetterCount = 0, offDotTotal = 0;
  let maxRatio = 0, maxId;
  let dotOverBand = 0; // letters with at least one dot larger than the local band
  letters.forEach(r => {
    if (!r) return;
    if (r.off.length) { offLetterCount++; offDotTotal += r.off.length; }
    r.bands.forEach(t => {
      const ratio = dot / t;
      if (ratio > maxRatio) { maxRatio = ratio; maxId = r.id; }
    });
    if (r.bands.some(t => t < dot)) dotOverBand++;
  });
  const valid = letters.filter(Boolean).length;
  console.log(
    `dot=${dot}px | letters=${valid} | offInkLetters=${offLetterCount} (dots=${offDotTotal}) | lettersWithDot>Band=${dotOverBand} | worstRatio=${maxRatio.toFixed(2)} @${maxId}`
  );
}
