// Tip extension — lands stroke-end waypoints on the visible ink tip.
//
// Root cause (measured on the live phone + committed ink): thinning's medial
// axis of a rounded cap terminates at the CAP CENTRE, roughly a half-stroke
// width (~9-12px at 220px font) inside the visible tip. Every stroke end
// the pipeline emits — auto-derived, and the hand anchors that were picked
// off the same skeleton dump — therefore sits that far short of where a
// child's pen actually starts or ends the stroke. On screen: waypoint 1's
// ring never reaches the centreline start.
//
// tipExtend(mask, w, h, points, { start, end })
//   Replaces the stroke's first/last point with the farthest ink pixel
//   within `capRadius` of it, on the side OPPOSITE the stroke body, but only
//   if the cap is open (background within a few pixels beyond that pixel) —
//   i.e. the ink genuinely terminates there. At a junction (pen-up at a
//   crossing) the ink continues on both sides, so the open check fails and
//   the endpoint is left alone. Both `start` and `end` are opt-ins chosen by
//   the caller:
//     - auto strokes: the caller passes the skeleton's degree-1 end nodes,
//     - hand strokes: the caller passes anchors flagged [x, y, 'tip'] in
//       overrides.js, where the author deliberately marks a visible cap.
//   This keeps the correction honest: it moves a point only where a cap
//   exists, and it never invents a stroke end that is really a junction.

const inMask = (mask, w, h, x, y) =>
  x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;

const farthestOpenTip = (mask, w, h, p, bodyDir, capRadius) => {
  const bl = Math.hypot(bodyDir[0], bodyDir[1]);
  if (bl < 1e-6) return null;
  const tx = -bodyDir[0] / bl;
  const ty = -bodyDir[1] / bl;
  let best = null;
  let bestD = 0;
  for (let y = Math.max(0, p[1] - capRadius); y <= Math.min(h - 1, p[1] + capRadius); y++) {
    for (let x = Math.max(0, p[0] - capRadius); x <= Math.min(w - 1, p[0] + capRadius); x++) {
      if (!inMask(mask, w, h, x, y)) continue;
      const ex = x - p[0];
      const ey = y - p[1];
      const d = Math.hypot(ex, ey);
      if (d < 1 || d > capRadius) continue;
      if (ex * tx + ey * ty < 0.5 * d) continue;
      let open = true;
      for (let s = 3; s <= 10 && open; s += 2) {
        if (inMask(mask, w, h, Math.round(x + tx * s), Math.round(y + ty * s))) open = false;
      }
      if (!open) continue;
      if (d > bestD) {
        bestD = d;
        best = [x, y];
      }
    }
  }
  return best ? { tip: best, shift: bestD } : null;
};

export const tipExtend = (
  mask,
  w,
  h,
  points,
  { start = false, end = false, capRadius = 16 } = {}
) => {
  if (points.length < 2) return { points: points.slice(), moved: [] };
  const copy = points.slice();
  const moved = [];
  if (start) {
    const fix = farthestOpenTip(mask, w, h, copy[0], [copy[1][0] - copy[0][0], copy[1][1] - copy[0][1]], capRadius);
    if (fix) {
      copy[0] = fix.tip;
      moved.push(`start+${fix.shift.toFixed(1)}`);
    }
  }
  if (end) {
    const n = copy.length - 1;
    const fix = farthestOpenTip(mask, w, h, copy[n], [copy[n - 1][0] - copy[n][0], copy[n - 1][1] - copy[n][1]], capRadius);
    if (fix) {
      copy[n] = fix.tip;
      moved.push(`end+${fix.shift.toFixed(1)}`);
    }
  }
  return { points: copy, moved };
};
