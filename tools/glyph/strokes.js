// Step 3 of the pipeline: branches -> strokes -> waypoints.
//
// The skeleton knows the shape and nothing else. A branch graph has no idea
// which end of a curve the pen starts at, that ક's crossbar is one stroke that
// happens to cross another rather than four stubs, or that a Gujarati letter's
// right-hand stem is written last. This file is where those three things get
// decided: continuity merging (shape -> motion), the ordering heuristics, and
// the resampling that turns a 300-pixel centreline into a dozen dots a
// six-year-old can chase.
//
// It is also the file that is *allowed to be wrong*. Automation cannot know
// stroke order or a knot; where it guesses badly, overrides.js overrules it
// with a hand-authored route — and the route is still pinned to the skeleton,
// so a hand fix moves the motion without moving the letter off its ink.

import { polylineLength } from './skeleton.js';

const angleOf = (from, to) => Math.atan2(to[1] - from[1], to[0] - from[0]);

// Direction the edge heads in as it leaves the given end, measured over a short
// run so a single staircase pixel cannot swing it.
const LOOK = 10;
const tangentAt = (points, fromStart) => {
  const ordered = fromStart ? points : [...points].reverse();
  const anchor = ordered[0];
  let probe = ordered[ordered.length - 1];
  for (const point of ordered) {
    if (Math.hypot(point[0] - anchor[0], point[1] - anchor[1]) >= LOOK) {
      probe = point;
      break;
    }
  }
  return angleOf(anchor, probe);
};

const angleDelta = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
};

// Two branch-ends meeting at a node continue each other when the pen would
// barely turn. 75 degrees is generous on purpose: Gujarati curves meet their
// stems at a real angle, and the alternative failure (splitting one stroke into
// two) is the one the ground truth calls out by name.
const MAX_TURN = (75 * Math.PI) / 180;

/**
 * Merge branches into strokes by direction continuity.
 *
 * @returns {Array<Array<[number, number]>>} each stroke as a dense polyline
 */
export const mergeBranches = (graph) => {
  const ends = [];
  graph.edges.forEach((edge) => {
    ends.push({ edge: edge.id, node: edge.a, fromStart: true, angle: tangentAt(edge.points, true) });
    ends.push({ edge: edge.id, node: edge.b, fromStart: false, angle: tangentAt(edge.points, false) });
  });

  const byNode = new Map();
  for (const end of ends) {
    if (!byNode.has(end.node)) byNode.set(end.node, []);
    byNode.get(end.node).push(end);
  }

  // partner[edgeId][end] = the edge-end the pen carries on into.
  const partner = new Map();
  const endKey = (end) => `${end.edge}:${end.fromStart ? 'a' : 'b'}`;

  for (const [, list] of byNode) {
    if (list.length < 2) continue;
    const candidates = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].edge === list[j].edge) continue;
        // Straight through means one leaves at the reverse of the other's
        // heading, so the turn is measured against angle + PI.
        const turn = angleDelta(list[i].angle + Math.PI, list[j].angle);
        if (turn > MAX_TURN) continue;
        candidates.push({ turn, a: list[i], b: list[j] });
      }
    }
    candidates.sort((x, y) => x.turn - y.turn);
    const taken = new Set();
    for (const candidate of candidates) {
      const ka = endKey(candidate.a);
      const kb = endKey(candidate.b);
      if (taken.has(ka) || taken.has(kb)) continue;
      taken.add(ka);
      taken.add(kb);
      partner.set(ka, candidate.b);
      partner.set(kb, candidate.a);
    }
  }

  const edgeById = new Map(graph.edges.map((edge) => [edge.id, edge]));
  const consumed = new Set();
  const strokes = [];

  const chainFrom = (start) => {
    // Walk forward from an edge-end, appending whatever it continues into.
    const points = [];
    let current = start;
    for (;;) {
      const edge = edgeById.get(current.edge);
      if (!edge || consumed.has(edge.id)) break;
      consumed.add(edge.id);
      const run = current.fromStart ? edge.points : [...edge.points].reverse();
      points.push(...(points.length ? run.slice(1) : run));
      const exitKey = `${edge.id}:${current.fromStart ? 'b' : 'a'}`;
      const next = partner.get(exitKey);
      if (!next) break;
      // The partner is recorded as the end that *touches* this node, so the pen
      // travels away from it.
      current = { edge: next.edge, fromStart: next.fromStart };
    }
    return points;
  };

  // Start chains at free ends first, so a stroke is walked from a real stroke
  // end rather than from the middle.
  const freeEnds = ends.filter((end) => !partner.has(endKey(end)));
  for (const end of freeEnds) {
    if (consumed.has(end.edge)) continue;
    const points = chainFrom(end);
    if (points.length > 1) strokes.push(points);
  }
  // Whatever is left is a closed ring (ઠ) — start it anywhere.
  for (const edge of graph.edges) {
    if (consumed.has(edge.id)) continue;
    const points = chainFrom({ edge: edge.id, fromStart: true });
    if (points.length > 1) strokes.push(points);
  }

  return strokes;
};

const bboxOf = (strokes) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stroke of strokes) {
    for (const [x, y] of stroke) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

// A Gujarati letter's right-hand stem is the tall near-vertical run down the
// right of the glyph. It is written last, after the body, which is the one
// ordering rule the script has that a bounding box can actually detect.
const isRightStem = (stroke, box) => {
  const ys = stroke.map(([, y]) => y);
  const xs = stroke.map(([x]) => x);
  const span = Math.max(...ys) - Math.min(...ys);
  const drift = Math.max(...xs) - Math.min(...xs);
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  return (
    span > box.height * 0.55 &&
    drift < span * 0.45 &&
    meanX > box.minX + box.width * 0.55
  );
};

/**
 * Put the strokes in writing order and point each one the way the pen goes.
 *
 * Bodies first, top to bottom; right-hand stems last; every stroke starts at
 * its higher end (a tie goes to the right, which is where Gujarati curves such
 * as ક and ર begin).
 */
export const orderStrokes = (strokes) => {
  const box = bboxOf(strokes);
  const directed = strokes.map((points) => {
    const head = points[0];
    const tail = points[points.length - 1];
    const flip = tail[1] < head[1] - 2 || (Math.abs(tail[1] - head[1]) <= 2 && tail[0] > head[0]);
    return flip ? [...points].reverse() : points;
  });
  const scored = directed.map((points) => ({
    points,
    stem: isRightStem(points, box),
    top: Math.min(...points.map(([, y]) => y)),
    left: Math.min(...points.map(([x]) => x)),
    length: polylineLength(points),
  }));
  scored.sort((a, b) => {
    if (a.stem !== b.stem) return a.stem ? 1 : -1;
    if (Math.abs(a.top - b.top) > 6) return a.top - b.top;
    return a.left - b.left;
  });
  return scored.map((entry) => entry.points);
};

// --- resampling ------------------------------------------------------------

const perpendicularDistance = (point, a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-9) return Math.hypot(point[0] - a[0], point[1] - a[1]);
  let t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(point[0] - (a[0] + t * dx), point[1] - (a[1] + t * dy));
};

// Ramer-Douglas-Peucker. Keeps the points that carry the shape and throws away
// the ones a straight line already covers.
const simplify = (points, epsilon) => {
  if (points.length < 3) return [...points];
  let worst = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > worst) {
      worst = distance;
      index = i;
    }
  }
  if (worst <= epsilon) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, index + 1), epsilon).slice(0, -1),
    ...simplify(points.slice(index), epsilon),
  ];
};

const cumulative = (points) => {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  return lengths;
};

const pointAtDistance = (points, lengths, distance) => {
  for (let i = 1; i < points.length; i++) {
    if (lengths[i] >= distance) {
      const span = lengths[i] - lengths[i - 1];
      const t = span < 1e-9 ? 0 : (distance - lengths[i - 1]) / span;
      return [
        points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t,
        points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t,
      ];
    }
  }
  return points[points.length - 1];
};

/**
 * Dense centreline -> the handful of dots the child chases.
 *
 * Three rules, in order: keep the corners (RDP), never leave a gap longer than
 * `maxGap` (a long straight stem still needs something to aim at, and the
 * engine measures deviation from the chord between waypoints, so a long chord
 * across a curve would score a correct trace as sloppy), and never place two
 * closer than `minGap` (two dots inside one fingertip are one dot).
 */
export const resample = (points, { epsilon = 3.5, maxGap = 52, minGap = 15, keep = [] } = {}) => {
  const lengths = cumulative(points);
  const total = lengths[lengths.length - 1];
  if (total < 1) return [points[0]];

  const kept = simplify(points, epsilon);
  // Re-express the kept points as distances along the dense line so gaps can be
  // filled from the real curve rather than from the chord.
  const marks = [0];
  for (const point of kept.slice(1, -1)) {
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < points.length; i++) {
      const distance = Math.hypot(points[i][0] - point[0], points[i][1] - point[1]);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    marks.push(lengths[best]);
  }
  marks.push(total);
  // Hand-placed points are not suggestions. A free anchor (the loop on ન) is a
  // corner of a shape that has no centreline to rediscover it from, so it
  // survives the thinning below even if it lands inside minGap.
  const required = new Set(keep.map((index) => lengths[Math.min(index, lengths.length - 1)]));
  for (const mark of required) marks.push(mark);
  marks.sort((a, b) => a - b);
  // A required mark that RDP also chose would otherwise be emitted twice.
  const unique = marks.filter((mark, i) => i === 0 || mark - marks[i - 1] > 1e-6);

  const filled = [unique[0]];
  for (let i = 1; i < unique.length; i++) {
    const gap = unique[i] - filled[filled.length - 1];
    if (gap > maxGap) {
      const steps = Math.ceil(gap / maxGap);
      for (let s = 1; s < steps; s++) filled.push(filled[filled.length - 1] + gap / steps);
    }
    filled.push(unique[i]);
  }

  const trimmed = [filled[0]];
  for (const mark of filled.slice(1)) {
    const previous = trimmed[trimmed.length - 1];
    if (mark - previous >= minGap) {
      trimmed.push(mark);
    } else if (required.has(mark)) {
      // Too close to keep both: the required one wins, unless the one already
      // there is required too.
      if (!required.has(previous) && trimmed.length > 1) trimmed.pop();
      trimmed.push(mark);
    }
  }
  // The end of the stroke is not optional: drop the point before it instead.
  if (trimmed[trimmed.length - 1] !== total) {
    if (total - trimmed[trimmed.length - 1] < minGap && trimmed.length > 1) trimmed.pop();
    trimmed.push(total);
  }

  return trimmed.map((distance) => pointAtDistance(points, lengths, distance));
};
