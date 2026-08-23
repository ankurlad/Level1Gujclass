import { readFileSync } from "node:fs";

const read = (u) => readFileSync(new URL(u, import.meta.url), "utf8");
const cur = read("../../src/curriculum.js");

// Extract waypoints directly with a regex — avoids the JS->JSON quoting fight.
const pick = (id) => {
  const i = cur.indexOf(`id: '${id}'`);
  const j = cur.indexOf("waypoints:", i);
  const k = cur.indexOf("]", j);
  const body = cur.slice(j, k);
  const wp = [];
  const re = /\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+),\s*label:\s*'(\d+)'(?:,\s*moveTo:\s*true)?\s*\}/g;
  let m;
  while ((m = re.exec(body))) wp.push({ x: +m[1], y: +m[2], label: +m[3], moveTo: /moveTo:\s*true/.test(m[0]) });
  return wp;
};

for (const t of ["jha", "dha", "ja"]) {
  const wp = pick(t);
  const ink = JSON.parse(read(`./ink/${t}.json`));
  const { width, height } = ink;
  const inkSet = new Set();
  ink.rows.forEach((run, y) => { for (let i = 0; i + 1 < run.length; i += 2) { for (let x = run[i]; x <= run[i + 1]; x++) inkSet.add(x + "," + y); } });
  const onInk = (px, py, tol = 8) => { for (let dy = -tol; dy <= tol; dy++) for (let dx = -tol; dx <= tol; dx++) if (inkSet.has((px + dx) + "," + (py + dy))) return true; return false; };
  const nearest = (px, py) => { let b = Infinity, bp = null; for (const s of inkSet) { const [a, c] = s.split(",").map(Number); const d = Math.hypot(a - px, c - py); if (d < b) { b = d; bp = [a, c]; } } return [b, bp]; };

  const strokes = [];
  let curS = [];
  for (const w of wp) { if (w.moveTo && curS.length) { strokes.push(curS); curS = []; } curS.push(w.label); }
  if (curS.length) strokes.push(curS);

  console.log(`\n${t}: ${wp.length} waypoints in ${strokes.length} strokes: ${strokes.map((s, i) => `S${i + 1}[${s.join(",")}]`).join("  ")}`);
  for (const w of wp) {
    const px = Math.round((w.x / 100) * width);
    const py = Math.round((w.y / 100) * height);
    if (!onInk(px, py)) {
      const [d, bp] = nearest(px, py);
      console.log(`  OFF-INK dot ${w.label} at px ${px},${py} | nearest ink ${bp[0]},${bp[1]} (${d.toFixed(1)}px away)`);
    }
  }
  const first = wp[0];
  const fpx = Math.round((first.x / 100) * width), fpy = Math.round((first.y / 100) * height);
  console.log(`  dot 1 = px ${fpx},${fpy}  onInk=${onInk(fpx, fpy)}`);
}
