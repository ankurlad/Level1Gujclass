// The tracing engine, headless.
//
// Everything the app knows about "is the child tracing this letter correctly"
// lives here: which waypoint comes next, whether a pointer sample hits it, how
// far the drawn ink strays from the ideal path, and when the letter is done.
// No React, no DOM, no canvas — App.jsx owns pixels, ink and confetti; this
// module owns the geometry, so it can be unit tested without a browser and
// reused by a future guided/challenge/free mode selector.
//
// COORDINATES. Every input and output is in the 0-100 path space defined by
// src/lib/waypoints.js: a percentage of the tracing box on both axes, with no
// pixel size anywhere in this file. Callers convert their pointer samples once
// on the way in (canvasToPathXRaw/canvasToPathYRaw) and never again.
//
// DISTANCES. The path space is not isotropic — the box is 380x320, so one
// path unit is wider than it is tall — which means a plain hypot() in path
// units describes an *ellipse* on screen: more vertical tolerance than
// horizontal. Radii here are therefore in percent of the box WIDTH, and the y
// axis is multiplied by `yScale` (box height / box width) before any distance
// is taken. yScale defaults to 1, i.e. a square box, which keeps the module
// honest for a caller that has no aspect ratio to declare. This is still
// resolution independent: yScale is a property of the box's shape, not of how
// many pixels it happens to be drawn with.
//
// WHAT IS NOT HERE. snapToCenterline in App.jsx stays in App.jsx: it snaps to
// the centre of mass of the *rendered glyph* by reading pixels out of an
// offscreen canvas, which is a DOM capability, not geometry. The engine's own
// snapping (see snapRadius below) is the pure analogue — it projects onto the
// ideal polyline through the waypoints.

// Radii are percent of the box width. 7.5 is a fingertip on a phone-sized
// tracing box, near enough to the 28px/380px the app has always used that a
// caller who declines to pass one gets the familiar feel.
export const DEFAULT_HIT_RADIUS = 7.5;

// How close ink has to be to the ideal polyline to count as "on the line".
// Tighter than the hit radius: a waypoint is a target you are aiming at, the
// centreline is a rail you are meant to already be on.
export const DEFAULT_SNAP_RADIUS = 5;

// Divide-by-zero guard for degenerate (zero length) segments.
const EPSILON = 1e-9;

// Closest point on a cubic Bézier to a given query.
//
// Why: the ideal path between waypoints is a Catmull-Rom spline, which the
// trace view renders as a cubic Bézier (one per segment). To score ink
// against that visible curve we need the true distance to the curve, not to
// the chord (a chord under-scores a curve-following trace by the sag
// amount) and not a nearby sample (a 10-point grid leaves a 3px grid error).
// Newton on f(t) = (B(t)−Q)·B'(t) converges to the exact minimizer in <10
// iterations from a coarse 16-point initial guess — enough for a
// sub-0.01-precision deviation read at 380px canvas scale.
const bezPoint = (P0, P1, P2, P3, t) => {
  const u = 1 - t;
  return {
    x: u * u * u * P0.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * P3.x,
    y: u * u * u * P0.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * P3.y,
  };
};
const bezD1 = (P0, P1, P2, P3, t) => {
  const u = 1 - t;
  return {
    x: 3 * u * u * (P1.x - P0.x) + 6 * u * t * (P2.x - P1.x) + 3 * t * t * (P3.x - P2.x),
    y: 3 * u * u * (P1.y - P0.y) + 6 * u * t * (P2.y - P1.y) + 3 * t * t * (P3.y - P2.y),
  };
};
const bezD2 = (P0, P1, P2, P3, t) => {
  const u = 1 - t;
  return {
    x: 6 * u * (P2.x - 2 * P1.x + P0.x) + 6 * t * (P3.x - 2 * P2.x + P1.x),
    y: 6 * u * (P2.y - 2 * P1.y + P0.y) + 6 * t * (P3.y - 2 * P2.y + P1.y),
  };
};
// Distance from Q to the closest point on the cubic, plus that closest point.
const nearestOnBezier = (Q, P0, P1, P2, P3) => {
  // Coarse initial t: 16 samples is enough because the curve is thin and we
  // only need a t in the right basin for Newton.
  let bestT = 0;
  let bestD = Infinity;
  for (let k = 0; k <= 16; k++) {
    const t = k / 16;
    const p = bezPoint(P0, P1, P2, P3, t);
    const dx = p.x - Q.x, dy = p.y - Q.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; bestT = t; }
  }
  // Newton: minimize |B(t) − Q|². f = (B−Q)·B', f' = |B'|² + (B−Q)·B''.
  for (let iter = 0; iter < 10; iter++) {
    const t = bestT;
    const p = bezPoint(P0, P1, P2, P3, t);
    const d1 = bezD1(P0, P1, P2, P3, t);
    const d2 = bezD2(P0, P1, P2, P3, t);
    const f = (p.x - Q.x) * d1.x + (p.y - Q.y) * d1.y;
    const g = d1.x * d1.x + d1.y * d1.y + (p.x - Q.x) * d2.x + (p.y - Q.y) * d2.y;
    if (Math.abs(g) < 1e-12) break;
    let next = t - f / g;
    if (next < 0) next = 0;
    else if (next > 1) next = 1;
    if (Math.abs(next - t) < 1e-7) { bestT = next; break; }
    bestT = next;
  }
  const p = bezPoint(P0, P1, P2, P3, bestT);
  const dist = Math.hypot(p.x - Q.x, p.y - Q.y);
  // Path space is 0-100. Rounding to 10 decimals keeps us within 1e-8 of the
  // true value (1e-6 unit = 4e-5 px at 380px canvas) while avoiding the
  // 50 → 50.00000000000001 artifact that trips strict-equality assertions.
  return {
    x: Math.round(p.x * 1e10) / 1e10,
    y: Math.round(p.y * 1e10) / 1e10,
    distance: Math.round(dist * 1e10) / 1e10,
  };
};

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const isPoint = (wp) => Boolean(wp) && isFiniteNumber(wp.x) && isFiniteNumber(wp.y);

// The ideal path is a polyline through the waypoints in order, cut into
// subpaths wherever a waypoint carries moveTo: true. That flag is a pen lift —
// the dashed guide does not draw across it and neither does the child — so the
// connector between the two sides must NOT count as ideal path. Without the
// split, a child who dragged straight across the gap (instead of lifting)
// would be scored as perfectly on the line.
const buildSubpaths = (waypoints) => {
  const subpaths = [];
  let current = null;
  for (const wp of waypoints) {
    if (!current || wp.moveTo) {
      current = [];
      subpaths.push(current);
    }
    current.push(wp);
  }
  return subpaths;
};

// Nearest point on segment a->b to p, all in metric space (y pre-scaled).
// t is clamped to [0, 1] so the result is on the segment, not on its infinite
// extension: past the end of a stroke the nearest ideal point is the endpoint.
const projectOnSegment = (px, py, ax, ay, bx, by) => {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq < EPSILON) return { x: ax, y: ay };
  let t = ((px - ax) * abx + (py - ay) * aby) / lengthSq;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return { x: ax + t * abx, y: ay + t * aby };
};

/**
 * Create a tracing session for one letter.
 *
 * @param {Array<{x: number, y: number, label?: string, moveTo?: boolean}>} waypoints
 *   Ordered waypoints in the 0-100 path space. Entries that are not finite
 *   points are dropped rather than throwing: a corrupt saved override should
 *   cost the child the bad point, not the letter. (PR 12 adds the schema
 *   validation that stops one reaching this far.)
 * @param {object} [opts]
 * @param {number} [opts.hitRadius=DEFAULT_HIT_RADIUS] Percent of box width a
 *   sample must come within to claim the next waypoint.
 * @param {number} [opts.snapRadius=DEFAULT_SNAP_RADIUS] Percent of box width
 *   within which a sample counts as on the centreline (`onPath` in the
 *   addPoint result).
 * @param {number} [opts.yScale=1] Box height / box width. Corrects the metric
 *   so a radius is a circle on screen instead of an ellipse.
 * @param {number} [opts.accuracyTolerance=hitRadius] Mean deviation, in
 *   percent of box width, that scores 0. See getAccuracy.
 */
export const createTracingSession = (waypoints, opts = {}) => {
  // Copied, not referenced: the hit test reads these on every pointer sample,
  // and a caller that mutates the array it handed in (the waypoint editor does
  // exactly that, on every drag) must not move the target under the child.
  const targets = (Array.isArray(waypoints) ? waypoints : [])
    .filter(isPoint)
    .map((wp) => ({ ...wp }));
  const hitRadius = isFiniteNumber(opts.hitRadius) ? opts.hitRadius : DEFAULT_HIT_RADIUS;
  const snapRadius = isFiniteNumber(opts.snapRadius) ? opts.snapRadius : DEFAULT_SNAP_RADIUS;
  const yScale = isFiniteNumber(opts.yScale) ? opts.yScale : 1;
  const accuracyTolerance = isFiniteNumber(opts.accuracyTolerance)
    ? opts.accuracyTolerance
    : hitRadius;

  // Precomputed once: the ideal polyline in metric space. Every sample is
  // measured against it, so this is the hot data during a drag.
  const subpaths = buildSubpaths(targets).map((subpath) =>
    subpath.map((wp) => ({ x: wp.x, y: wp.y * yScale }))
  );

  let hitCount = 0;
  let strokes = [];
  let currentStroke = null;
  // Running mean of the deviation, kept as sum/count so addPoint stays O(1)
  // and a long trace does not retain a growing array just to be averaged.
  let deviationSum = 0;
  let deviationCount = 0;

  // Nearest point on the whole ideal path, in metric space, with its distance.
  // A one-waypoint subpath has no segment, so it is measured as a point.
  //
  // The segments are the SAME curves the trace view renders (Catmull-Rom
  // splines through the waypoints, reduced to cubic Béziers), NOT the raw
  // chords: the child traces what they see, so the accuracy must measure
  // against the visible guide. A chord-based ideal would quietly dock points
  // for following the curve that was drawn for them.
  const nearestOnIdeal = (mx, my) => {
    let best = null;
    let bestDist = Infinity;
    const consider = (candidate) => {
      if (candidate.distance < bestDist) {
        bestDist = candidate.distance;
        best = { x: candidate.x, y: candidate.y };
      }
    };

    for (const subpath of subpaths) {
      if (subpath.length === 1) {
        const only = subpath[0];
        consider({ x: only.x, y: only.y, distance: Math.hypot(mx - only.x, my - only.y) });
        continue;
      }
      const Q = { x: mx, y: my };
      for (let i = 0; i < subpath.length - 1; i++) {
        const a = subpath[i];
        const b = subpath[i + 1];
        if (subpath.length === 2) {
          // Two dots are rendered as a straight line.
          const candidate = projectOnSegment(mx, my, a.x, a.y, b.x, b.y);
          consider({ x: candidate.x, y: candidate.y, distance: Math.hypot(mx - candidate.x, my - candidate.y) });
          continue;
        }
        // Catmull-Rom → cubic Bézier, identical to TraceView.drawTraceGuide.
        const p0 = i === 0 ? a : subpath[i - 1];
        const c = i + 2 < subpath.length ? subpath[i + 2] : b;
        const P0 = { x: a.x, y: a.y };
        const P3 = { x: b.x, y: b.y };
        const P1 = { x: a.x + (b.x - p0.x) / 6, y: a.y + (b.y - p0.y) / 6 };
        const P2 = { x: b.x - (c.x - a.x) / 6, y: b.y - (c.y - a.y) / 6 };
        consider(nearestOnBezier(Q, P0, P1, P2, P3));
      }
    }

    if (!best) return null;
    return { x: best.x, y: best.y, distance: bestDist };
  };

  const nextWaypoint = () => {
    if (hitCount >= targets.length) return null;
    return { ...targets[hitCount], index: hitCount };
  };

  const isComplete = () => targets.length > 0 && hitCount >= targets.length;

  // Mean deviation of the drawn ink from the ideal path, in percent of box
  // width. The raw number behind getAccuracy, exposed because a parent
  // dashboard wants a trend and a percentage flattens one.
  const getMeanDeviation = () => (deviationCount === 0 ? 0 : deviationSum / deviationCount);

  // 0-100, 100 = every sample sat on the centreline.
  //
  //   accuracy = 100 * max(0, 1 - meanDeviation / accuracyTolerance)
  //
  // Mean (not max) distance, because one flinch should not erase a good trace,
  // and a 6-8 year old's hand flinches. Distance to the nearest *segment* of
  // the ideal polyline rather than to the nearest waypoint, so tracing along a
  // long straight stroke scores as well as sitting on a dot. The scale is
  // linear and ends at accuracyTolerance, which defaults to the hit radius:
  // that makes the sloppiest trace the app still accepts as complete score 0,
  // so the number spans exactly the range of traces that happen in practice
  // instead of bunching every real attempt into the top few points.
  //
  // Note the spec's phrasing has this inverted (0 = perfect); it is flipped
  // here so bigger is better, which is what a score shown to a child must do.
  //
  // An untraced letter scores 0, not 100: no ink is no evidence. And accuracy
  // deliberately says nothing about coverage — a single dot placed on the line
  // scores 100 — which is why it ships alongside getScore() rather than
  // replacing it. Accuracy is "how neatly", completion is "how much".
  const getAccuracy = () => {
    if (deviationCount === 0 || accuracyTolerance <= 0) return 0;
    const ratio = 1 - getMeanDeviation() / accuracyTolerance;
    if (ratio <= 0) return 0;
    return Math.min(100, ratio * 100);
  };

  // The completion score. Still binary at the top level (`complete`), exactly
  // as before this module existed — getAccuracy is additive, not a
  // replacement.
  const getScore = () => ({
    hitCount,
    total: targets.length,
    fraction: targets.length === 0 ? 0 : hitCount / targets.length,
    complete: isComplete(),
  });

  const endStroke = () => {
    if (!currentStroke) return null;
    const finished = currentStroke;
    currentStroke = null;
    return {
      points: finished.length,
      complete: isComplete(),
      accuracy: getAccuracy(),
    };
  };

  const startStroke = () => {
    // A pen-down without a pen-up (pointer capture lost, say) must not merge
    // two strokes into one.
    endStroke();
    currentStroke = [];
    strokes.push(currentStroke);
    return strokes.length - 1;
  };

  /**
   * Feed one pointer sample, in path space.
   *
   * Waypoints must be claimed in order: only the waypoint at nextWaypoint() can
   * be hit, so brushing past number 3 while number 2 is still pending does
   * nothing. That is the sequential rule App.jsx has always enforced by
   * comparing against completedWaypoints.length, moved here intact.
   */
  const addPoint = (x, y) => {
    if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
      return {
        point: null,
        ignored: true,
        deviation: null,
        onPath: false,
        snapped: null,
        hit: false,
        waypointIndex: null,
        next: nextWaypoint(),
        complete: isComplete(),
      };
    }

    // Tolerate a sample that arrives without a startStroke: a lost pen-down is
    // a browser event ordering problem, not a reason to drop the child's ink.
    if (!currentStroke) startStroke();
    currentStroke.push({ x, y });

    const my = y * yScale;
    const nearest = nearestOnIdeal(x, my);
    const deviation = nearest ? nearest.distance : null;
    if (deviation !== null) {
      deviationSum += deviation;
      deviationCount += 1;
    }

    let hit = false;
    let waypointIndex = null;
    const target = hitCount < targets.length ? targets[hitCount] : null;
    if (target) {
      const dx = x - target.x;
      const dy = my - target.y * yScale;
      if (Math.hypot(dx, dy) <= hitRadius) {
        hit = true;
        waypointIndex = hitCount;
        hitCount += 1;
      }
    }

    return {
      point: { x, y },
      ignored: false,
      deviation,
      onPath: deviation !== null && deviation <= snapRadius,
      // Unscaled back out of the metric space, so callers get path space in
      // and path space out.
      snapped: nearest ? { x: nearest.x, y: yScale === 0 ? y : nearest.y / yScale } : null,
      hit,
      waypointIndex,
      next: nextWaypoint(),
      complete: isComplete(),
    };
  };

  const reset = () => {
    hitCount = 0;
    strokes = [];
    currentStroke = null;
    deviationSum = 0;
    deviationCount = 0;
  };

  return {
    // The waypoints actually in play, after the bad-entry filter. Frozen so
    // the copy above cannot be undone by a caller writing through this.
    waypoints: Object.freeze(targets.map((wp) => Object.freeze({ ...wp }))),
    hitRadius,
    snapRadius,
    startStroke,
    addPoint,
    endStroke,
    nextWaypoint,
    isComplete,
    getScore,
    getAccuracy,
    getMeanDeviation,
    // Sequential completion means the hit set is always a prefix, but App.jsx
    // renders per-dot state from a list, so hand it the list.
    getCompletedWaypoints: () => Array.from({ length: hitCount }, (_, i) => i),
    getStrokes: () => strokes.map((stroke) => stroke.map((point) => ({ ...point }))),
    reset,
  };
};
