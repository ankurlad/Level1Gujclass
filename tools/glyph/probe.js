// Scratch: inspect skeleton components and test candidate anchors for jha/dha.
// Does NOT touch curriculum.js or overrides.js.
import { readFileSync } from "node:fs";

import { CANVAS_H, CANVAS_W } from "./config.js";
import { toMask } from "./render.js";
import { indexSkeleton, routeAnchors, shortestPath } from "./route.js";
import { cleanStaircases, thin } from "./skeleton.js";
import { resample } from "./strokes.js";

const read = (u) => readFileSync(new URL(u, import.meta.url), "utf8");

const components = (mask, w, h) => {
  const seen = new Uint8Array(w * h);
  const out = [];
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || seen[i]) continue;
    const q = [i];
    seen[i] = 1;
    let minX = 9e9, minY = 9e9, maxX = -9e9, maxY = -9e9, n = 0, sumX = 0, sumY = 0;
    while (q.length) {
      const p = q.pop();
      const x = p % w, y = (p - x) / w;
      n++; sumX += x; sumY += y;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx;
        if (mask[np] && !seen[np]) { seen[np] = 1; q.push(np); }
      }
    }
    out.push({ n, minX, minY, maxX, maxY, cx: Math.round(sumX / n), cy: Math.round(sumY / n) });
  }
  return out.sort((a, b) => b.n - a.n);
};

const inspect = (id, candidates) => {
  const glyph = JSON.parse(read(`./ink/${id}.json`));
  const { width, height } = glyph;
  const mask = toMask(glyph);
  const skel = cleanStaircases(thin(mask, width, height), width, height);

  // components of the SKEL (the routing surface)
  const comps = components(skel, width, height);
  console.log(`\n=== ${id} (${glyph.letter}) skeleton components ===`);
  for (const c of comps) {
    console.log(`  ${c.n.toString().padStart(4)}px  bbox x[${c.minX}..${c.maxX}] y[${c.minY}..${c.maxY}]  centre ~(${c.cx},${c.cy})`);
  }

  const index = indexSkeleton(skel, width, height);
  for (const [label, anchors] of candidates) {
    try {
      const routed = routeAnchors(index, anchors, label);
      const snaps = routed.snapDistances.map((d) => d.toFixed(1)).join(",");
      console.log(`  [OK] ${label}: ${(routed.points.length)} skel px, snaps=${snaps}`);
    } catch (e) {
      console.log(`  [FAIL] ${label}: ${e.message}`);
    }
  }
};

// ---- candidate anchors (380x320 render space) --------------------------
//
// jha (ઝ): three visible parts in the rendered glyph:
//   C     — big curve, top ~y90..100, bottom ~y190, left x~125
//   top   — short piece top-centre x~222
//   hook  — right "3"-like stroke x~190..250
//
// Video: C first, then the right part. Try: C alone = 1 stroke; top+hook = 2nd.
// If top and hook are the same component, anchors must walk between them.
inspect("jha", [
  ["jha-C", [[133, 114], [164, 111], [187, 132], [191, 164], [183, 194], [153, 203], [127, 187]]],
  ["jha-hookFromTop", [[222, 90], [222, 117], [222, 137], [192, 132], [223, 130], [246, 150], [244, 182]]],
  ["jha-hookDirect", [[192, 132], [223, 130], [246, 150], [244, 182]]],
  ["jha-topOnly", [[222, 90], [222, 107]]],
  ["jha-topToHook", [[222, 90], [192, 132]]],
]);

// dha (ઢ): single stroke. Find the true start (top of headbar) and route the
// whole loop from there. Headbar is the top run; the loop follows.
inspect("dha", [
  ["dha-v1", [[166, 100], [199, 87], [211, 96], [204, 125], [166, 146], [154, 159], [156, 190], [175, 203], [214, 203], [231, 190], [231, 168], [217, 159]]],
  ["dha-v2", [[211, 96], [199, 87], [166, 100], [166, 146], [154, 159], [156, 190], [175, 203], [214, 203], [231, 190], [231, 168], [217, 159]]],
]);
