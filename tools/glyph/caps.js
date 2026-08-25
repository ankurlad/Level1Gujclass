// Tip extension — lands a stroke-end waypoint on the *start of the centreline*.
//
// ROOT CAUSE. Zhang-Suen thinning builds a medial axis, and a medial axis
// stops short of a cap: the ridge of the distance transform ends where the
// bisectors of the terminal's two corners meet, which is roughly a half stroke
// width (9-13px at the app's 220px font) inside the visible end of the ink.
// So every stroke end the pipeline emits — auto-derived, and the hand anchors
// picked off the same skeleton dump — sits that far behind where a child's pen
// actually starts or ends the stroke. On screen, waypoint 1's ring never
// reaches the place the stroke visibly begins.
//
// The correction is one point: the centreline does not really end where
// thinning left it, it ends where it meets the ink boundary. So walk the
// centreline's own tangent outwards from the endpoint until the ray leaves the
// ink, and put the waypoint on that exit. By construction the result is on the
// centreline (it is on the tangent ray) *and* on the visible tip (it is on the
// boundary) — which is exactly "the centre of the dot sits on the start of the
// stroke", with the dot then straddling the terminal the way it straddles the
// band everywhere else.
//
// The first attempt at this took the farthest ink pixel inside a 60-degree
// cone instead, which is a different point: on any obliquely-cut terminal —
// and every Gujarati terminal in this font is obliquely cut — the farthest ink
// pixel is the terminal's outer CORNER. That put the dot's centre on the edge
// of the letter with half the ring hanging off the band, while still landing
// short along the stroke's own axis. It also read its direction from
// `points[1] - points[0]`, one skeleton pixel, which is quantised to multiples
// of 45 degrees: on ક's top-right terminal the true tangent is (1, 0) and that
// one step said (0.71, -0.71), so the cone was aimed 45 degrees off the stroke
// to begin with.
//
// JUNCTIONS. A stroke that ends at a crossing is not a cap: there the ink
// carries on, so the ray never leaves it within `capReach` and the endpoint is
// returned untouched. The second test — the ray must stay clear of ink for
// `CLEAR` px past the exit — rejects the other shape that can fool the first,
// a ray that slips out through a notch and straight back into the letter.
// Both `start` and `end` are opt-ins chosen by the caller:
//   - auto strokes: the caller passes the skeleton's chain ends,
//   - hand strokes: anchors flagged [x, y, 'tip'] in overrides.js, where the
//     author has deliberately marked a visible cap.

const inMask = (mask, w, h, x, y) => {
  const ix = Math.round(x);
  const iy = Math.round(y);
  return ix >= 0 && iy >= 0 && ix < w && iy < h && mask[iy * w + ix] === 1;
};

// Baseline for the tangent, in px. The same LOOK strokes.js measures a branch
// direction over, and for the same reason: consecutive centreline pixels are
// one apart, so a single step carries 45 degrees of quantisation noise and is
// not a direction.
const LOOK = 10;

// March resolution, and the run of background past the exit that has to be
// there for the exit to be a terminal. Its job is the acute crotch: where two
// strokes leave a node a few degrees apart, a ray can slip out between them
// and straight back into the other one, and that sliver is not a stroke end.
// Kept small (3px) because a real terminal often has a neighbour close by —
// છ's inner arm ends 4.5px from the bowl and does end there.
const STEP = 0.25;
const CLEAR = 3;

// How far past the endpoint a cap may be, in px: one stroke width at the app's
// 220px font — the same physical quantity as CROSSING in generate.js, rounded
// up rather than down. The medial axis of a cap stops between a half and a
// whole stroke width inside the terminal (a taper is the deep end of that
// range), so a face further out than one width is not this stroke's cap: the
// ray is inside other ink. Measured over all 42 letters the two populations do
// not overlap — every cap exits by 21.3px, every crossing runs past 23.5px.
// Like WHISKER and CROSSING it is tied to the font size, not to a letter.
const CAP_REACH = 22;

/** Unit vector pointing out of the polyline at the chosen end. */
const outwardUnit = (points, fromStart) => {
  const ordered = fromStart ? points : [...points].reverse();
  const anchor = ordered[0];
  let probe = ordered[ordered.length - 1];
  for (const point of ordered) {
    if (Math.hypot(point[0] - anchor[0], point[1] - anchor[1]) >= LOOK) {
      probe = point;
      break;
    }
  }
  const dx = anchor[0] - probe[0];
  const dy = anchor[1] - probe[1];
  const length = Math.hypot(dx, dy);
  return length < 1e-6 ? null : [dx / length, dy / length];
};

/**
 * Where the centreline's tangent ray leaves the ink, or null if it does not.
 *
 * @returns {{ tip: [number, number], shift: number } | null}
 */
const axialTip = (mask, w, h, points, fromStart, capReach) => {
  const direction = outwardUnit(points, fromStart);
  if (!direction) return null;
  const from = fromStart ? points[0] : points[points.length - 1];
  const at = (distance) => [from[0] + direction[0] * distance, from[1] + direction[1] * distance];
  if (!inMask(mask, w, h, from[0], from[1])) return null;

  let reach = 0;
  let exited = false;
  for (let s = STEP; s <= capReach + STEP / 2; s += STEP) {
    if (inMask(mask, w, h, ...at(s))) {
      reach = s;
      continue;
    }
    exited = true;
    break;
  }
  // Still inside the letter a whole stroke width out: the ink continues, so
  // this end is a junction and the pen does not start here.
  if (!exited || reach <= 0) return null;
  for (let s = reach + STEP; s <= reach + CLEAR; s += STEP) {
    if (inMask(mask, w, h, ...at(s))) return null;
  }
  // The last ink pixel the ray passed through, as a pixel. The mask has
  // one-pixel resolution, so a sub-pixel exit is false precision — and a
  // coordinate sitting exactly on a pixel boundary is the one thing the
  // hundredths rounding in canvasToPathX/Y can push back off the ink.
  const exit = at(reach);
  const tip = [Math.round(exit[0]), Math.round(exit[1])];
  return { tip, shift: Math.hypot(tip[0] - from[0], tip[1] - from[1]) };
};

export const tipExtend = (
  mask,
  w,
  h,
  points,
  { start = false, end = false, capReach = CAP_REACH } = {}
) => {
  if (points.length < 2) return { points: points.slice(), moved: [] };
  const copy = points.slice();
  const moved = [];
  if (start) {
    const fix = axialTip(mask, w, h, copy, true, capReach);
    if (fix) {
      copy[0] = fix.tip;
      moved.push(`start+${fix.shift.toFixed(1)}`);
    }
  }
  if (end) {
    const fix = axialTip(mask, w, h, copy, false, capReach);
    if (fix) {
      copy[copy.length - 1] = fix.tip;
      moved.push(`end+${fix.shift.toFixed(1)}`);
    }
  }
  return { points: copy, moved };
};
