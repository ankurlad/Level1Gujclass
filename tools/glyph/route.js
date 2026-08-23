// Hand-authored motion, machine-accurate geometry.
//
// A hand fix here is not a list of coordinates typed off a screenshot — those
// are exactly the misaligned waypoints this PR is replacing. It is a list of
// *anchors*: rough waypoints that say where the pen goes and in what order. The
// router snaps each anchor onto the nearest centreline pixel and walks the
// skeleton between consecutive anchors, so the resulting path is on the ink by
// construction. A person supplies the two things automation cannot know
// (order and knots) and the skeleton supplies the one thing a person is bad at
// (staying on a 20-pixel-wide stroke).
//
// Anchors are in render pixels — the 380x320 logical canvas — because that is
// what the proof sheets in tools/glyph/png are drawn in and what a person reads
// coordinates off.

const NEIGHBOURS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

/** A searchable view of a thinned skeleton. */
export const indexSkeleton = (skel, width, height) => {
  const pixels = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) if (skel[y * width + x]) pixels.push([x, y]);
  }
  return { skel, width, height, pixels };
};

export const nearestSkeletonPixel = (index, x, y) => {
  let best = null;
  let bestDistance = Infinity;
  for (const [px, py] of index.pixels) {
    const distance = Math.hypot(px - x, py - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = [px, py];
    }
  }
  return { pixel: best, distance: bestDistance };
};

/**
 * Shortest walk along the skeleton from one pixel to another.
 *
 * Dijkstra over the 8-neighbourhood. A few hundred pixels per letter, so the
 * naive scan for the next node is not worth a heap.
 */
export const shortestPath = (index, from, to) => {
  const { skel, width, height } = index;
  const key = (x, y) => y * width + x;
  const distance = new Float64Array(width * height).fill(Infinity);
  const previous = new Int32Array(width * height).fill(-1);
  const visited = new Uint8Array(width * height);
  const frontier = new Set([key(...from)]);
  distance[key(...from)] = 0;
  const target = key(...to);

  while (frontier.size) {
    let current = -1;
    let best = Infinity;
    for (const candidate of frontier) {
      if (distance[candidate] < best) {
        best = distance[candidate];
        current = candidate;
      }
    }
    if (current < 0) break;
    frontier.delete(current);
    if (current === target) break;
    visited[current] = 1;
    const cx = current % width;
    const cy = (current - cx) / width;
    for (const [dx, dy, cost] of NEIGHBOURS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = key(nx, ny);
      if (!skel[next] || visited[next]) continue;
      const candidate = distance[current] + cost;
      if (candidate < distance[next]) {
        distance[next] = candidate;
        previous[next] = current;
        frontier.add(next);
      }
    }
  }

  if (!Number.isFinite(distance[target])) return null;
  const path = [];
  for (let node = target; node !== -1; node = previous[node]) {
    const x = node % width;
    path.push([x, (node - x) / width]);
    if (node === key(...from)) break;
  }
  return path.reverse();
};

/**
 * Close the gaps a contracted crossing leaves behind.
 *
 * Merging two branches across a collapsed junction joins them end to end, and
 * those two ends are up to a stroke width apart. Jumping the gap in a straight
 * line can clip a corner of the letter; walking it along the skeleton cannot.
 */
export const bridgeGaps = (index, points) => {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const previous = out[out.length - 1];
    const gap = Math.hypot(points[i][0] - previous[0], points[i][1] - previous[1]);
    if (gap > 1.5) {
      const round = ([x, y]) => [Math.round(x), Math.round(y)];
      const leg = shortestPath(index, round(previous), round(points[i]));
      if (leg) {
        out.push(...leg.slice(1));
        continue;
      }
    }
    out.push(points[i]);
  }
  return out;
};

/**
 * Route a stroke through its anchors, along the skeleton.
 *
 * An anchor is [x, y] — snapped to the centreline, and the leg to the next
 * anchor walks the skeleton. An anchor written [x, y, 'free'] is used where it
 * stands, and its legs are straight lines.
 *
 * Free anchors exist for one situation: a bowl the font fills in solid, such as
 * the loop on the left of ન. There is no centreline inside a solid blob —
 * thinning collapses it to a stub — but the pen that wrote the letter did go
 * round it, and the ink is there to be traced. So the loop is placed by hand
 * and the generator's ink metric proves the points landed on the glyph.
 *
 * @returns {{ points: Array<[number, number]>, snapDistances: number[] }}
 * @throws when two consecutive snapped anchors are on different pieces of the
 *   letter, which means the stroke as written lifts the pen and is two strokes.
 */
export const routeAnchors = (index, anchors, label = 'stroke') => {
  const placed = anchors.map((anchor) => {
    const [x, y, mode] = anchor;
    if (mode === 'free') return { pixel: [x, y], distance: 0, free: true };
    return { ...nearestSkeletonPixel(index, x, y), free: false };
  });
  const snapDistances = placed.filter((entry) => !entry.free).map((entry) => entry.distance);
  const points = [];
  // Where each free anchor ended up along the routed line, so the resampler can
  // be told not to throw it away.
  const keep = [];
  for (let i = 0; i < placed.length; i++) {
    if (i > 0) {
      const from = placed[i - 1];
      const to = placed[i];
      const leg =
        from.free || to.free ? [from.pixel, to.pixel] : shortestPath(index, from.pixel, to.pixel);
      if (!leg) {
        throw new Error(
          `${label}: no path along the centreline from anchor ${i} to ${i + 1} ` +
            `(${anchors[i - 1]} -> ${anchors[i]}). They are on different components.`
        );
      }
      points.push(...(points.length ? leg.slice(1) : leg));
    }
    if (placed[i].free) keep.push(Math.max(0, points.length - 1));
  }
  if (!points.length && placed.length === 1) points.push(placed[0].pixel);
  return { points, snapDistances, keep };
};
