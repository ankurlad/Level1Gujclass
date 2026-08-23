// Step 2 of the pipeline: ink -> centreline -> branch graph.
//
// Zhang-Suen thinning, in plain JS. The algorithm is 1984 vintage and about
// forty lines: repeatedly delete boundary pixels whose removal cannot break the
// shape, in two alternating sub-iterations, until nothing changes. What is left
// is one pixel wide and runs down the middle of every stroke — which is exactly
// where a tracing waypoint belongs, and the whole reason this tool exists
// instead of a person dragging dots onto a picture of a letter.
//
// The graph on top of it is what makes the skeleton usable: pixels become
// nodes (stroke ends and junctions) and branches (the runs between them), so
// the stroke builder can talk about "the branch that leaves this junction going
// up" instead of about pixels.

// The 8-neighbourhood in Zhang-Suen's order: p2 is north, then clockwise.
const RING = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

const at = (mask, width, height, x, y) =>
  x < 0 || y < 0 || x >= width || y >= height ? 0 : mask[y * width + x];

/**
 * Zhang-Suen thinning. Returns a new mask, 1 where the centreline runs.
 *
 * @param {Uint8Array} mask 1 = ink
 */
export const thin = (mask, width, height) => {
  const image = Uint8Array.from(mask);
  const doomed = [];

  const pass = (step) => {
    doomed.length = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (!image[y * width + x]) continue;
        const p = RING.map(([dx, dy]) => at(image, width, height, x + dx, y + dy));
        // B = how many neighbours are ink. 2..6 keeps us on a boundary that is
        // not an endpoint (1) and not interior (7+).
        const b = p.reduce((sum, v) => sum + v, 0);
        if (b < 2 || b > 6) continue;
        // A = 0->1 transitions around the ring. Exactly one means deleting this
        // pixel cannot disconnect its neighbourhood.
        let a = 0;
        for (let i = 0; i < 8; i++) if (p[i] === 0 && p[(i + 1) % 8] === 1) a++;
        if (a !== 1) continue;
        const north = p[0];
        const east = p[2];
        const south = p[4];
        const west = p[6];
        // The two sub-iterations peel opposite corners, which is what keeps the
        // result centred instead of drifting toward one side.
        if (step === 0) {
          if (north * east * south !== 0) continue;
          if (east * south * west !== 0) continue;
        } else {
          if (north * east * west !== 0) continue;
          if (north * south * west !== 0) continue;
        }
        doomed.push(y * width + x);
      }
    }
    for (const index of doomed) image[index] = 0;
    return doomed.length;
  };

  let changed = 1;
  let guard = 0;
  while (changed && guard++ < 200) changed = pass(0) + pass(1);
  return image;
};

const neighbours = (skel, width, height, x, y) => {
  const found = [];
  for (const [dx, dy] of RING) {
    if (at(skel, width, height, x + dx, y + dy)) found.push([x + dx, y + dy]);
  }
  return found;
};

/**
 * Post-thinning cleanup: drop staircase corners.
 *
 * Zhang-Suen leaves L-shaped kinks on any near-horizontal or near-vertical run
 * — a pixel whose two neighbours already touch each other. Such a pixel carries
 * no connectivity (remove it and its neighbours are still adjacent) but it does
 * inflate the neighbour count of everything around it, which is enough to make
 * the classifier below read plain path pixels as ends and forks. Removing them
 * first is what lets degree be a simple neighbour count.
 *
 * Deletions are applied as they are found, so a pair of adjacent kinks cannot
 * both go and open a hole.
 */
export const cleanStaircases = (skel, width, height) => {
  const image = Uint8Array.from(skel);
  for (let round = 0; round < 8; round++) {
    let removed = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!image[y * width + x]) continue;
        const n = neighbours(image, width, height, x, y);
        if (n.length !== 2) continue;
        const [a, b] = n;
        if (Math.abs(a[0] - b[0]) > 1 || Math.abs(a[1] - b[1]) > 1) continue;
        image[y * width + x] = 0;
        removed++;
      }
    }
    if (!removed) break;
  }
  return image;
};

const key = (x, y) => `${x},${y}`;

/**
 * Turn a thinned mask into { nodes, edges }.
 *
 * nodes: { id, x, y, pixels: Set<string>, kind: 'end' | 'junction' | 'seed' }
 * edges: { id, a, b, points: [[x, y], ...] } — points run a -> b and include
 *        the node pixels at both ends, so an edge is a drawable polyline.
 */
export const buildGraph = (rawSkel, width, height) => {
  // Done here rather than left to the caller: every classification below
  // assumes a staircase-free skeleton.
  const skel = cleanStaircases(rawSkel, width, height);
  const inkPixels = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) if (skel[y * width + x]) inkPixels.push([x, y]);
  }

  const degree = new Map();
  for (const [x, y] of inkPixels) {
    degree.set(key(x, y), neighbours(skel, width, height, x, y).length);
  }

  // Junction pixels come in clumps (a Y meets in two or three pixels); one
  // clump is one node, or the stroke builder sees phantom stubs between them.
  const nodePixel = new Map(); // "x,y" -> node id
  const nodes = [];
  const isJunction = ([x, y]) => (degree.get(key(x, y)) ?? 0) >= 3;
  const isEnd = ([x, y]) => (degree.get(key(x, y)) ?? 0) === 1;

  for (const pixel of inkPixels) {
    if (!isJunction(pixel) || nodePixel.has(key(...pixel))) continue;
    const id = nodes.length;
    const cluster = [];
    const queue = [pixel];
    nodePixel.set(key(...pixel), id);
    while (queue.length) {
      const [x, y] = queue.pop();
      cluster.push([x, y]);
      for (const n of neighbours(skel, width, height, x, y)) {
        if (isJunction(n) && !nodePixel.has(key(...n))) {
          nodePixel.set(key(...n), id);
          queue.push(n);
        }
      }
    }
    const cx = cluster.reduce((sum, [x]) => sum + x, 0) / cluster.length;
    const cy = cluster.reduce((sum, [, y]) => sum + y, 0) / cluster.length;
    nodes.push({ id, x: cx, y: cy, pixels: new Set(cluster.map(([x, y]) => key(x, y))), kind: 'junction' });
  }

  for (const pixel of inkPixels) {
    if (!isEnd(pixel) || nodePixel.has(key(...pixel))) continue;
    const id = nodes.length;
    nodePixel.set(key(...pixel), id);
    nodes.push({ id, x: pixel[0], y: pixel[1], pixels: new Set([key(...pixel)]), kind: 'end' });
  }

  const edges = [];
  const usedInterior = new Set();
  const usedPairs = new Set();
  const walk = (fromNode, first, entry) => {
    const points = [[entry[0], entry[1]]];
    let prev = entry;
    let current = first;
    for (;;) {
      points.push([current[0], current[1]]);
      const nodeId = nodePixel.get(key(...current));
      if (nodeId !== undefined) return { to: nodeId, points };
      usedInterior.add(key(...current));
      const options = neighbours(skel, width, height, ...current).filter(
        (n) => key(...n) !== key(...prev)
      );
      // A staircase corner offers the pixel we came from *and* its diagonal
      // twin. Drop anything still touching the previous pixel: it is the same
      // step, not a fork.
      const forward = options.filter(
        (n) => Math.abs(n[0] - prev[0]) > 1 || Math.abs(n[1] - prev[1]) > 1
      );
      const pool = options.length > 1 && forward.length ? forward : options;
      const next = pool.find((n) => !usedInterior.has(key(...n)) || nodePixel.has(key(...n)));
      if (!next) return { to: null, points };
      prev = current;
      current = next;
    }
  };

  for (const node of nodes) {
    for (const pixelKey of node.pixels) {
      const [x, y] = pixelKey.split(',').map(Number);
      for (const n of neighbours(skel, width, height, x, y)) {
        const nk = key(...n);
        if (node.pixels.has(nk)) continue;
        // Two nodes touching directly: a one-step edge, deduped by node pair.
        const otherNode = nodePixel.get(nk);
        if (otherNode !== undefined) {
          const pairKey = `${Math.min(node.id, otherNode)}-${Math.max(node.id, otherNode)}`;
          if (usedPairs.has(pairKey)) continue;
          usedPairs.add(pairKey);
          edges.push({ id: edges.length, a: node.id, b: otherNode, points: [[x, y], n] });
          continue;
        }
        if (usedInterior.has(nk)) continue;
        const { to, points } = walk(node.id, n, [x, y]);
        if (to === null) continue;
        edges.push({ id: edges.length, a: node.id, b: to, points });
      }
    }
  }

  // Closed loops (ઠ is a plain circle) have no ends and no junctions, so the
  // sweep above never starts. Seed one node per leftover component and walk it
  // back to itself.
  for (const [x, y] of inkPixels) {
    const k = key(x, y);
    if (nodePixel.has(k) || usedInterior.has(k)) continue;
    const id = nodes.length;
    nodePixel.set(k, id);
    nodes.push({ id, x, y, pixels: new Set([k]), kind: 'seed' });
    const start = neighbours(skel, width, height, x, y)[0];
    if (!start) continue;
    const { to, points } = walk(id, start, [x, y]);
    if (to !== null) edges.push({ id: edges.length, a: id, b: to, points });
  }

  return { nodes, edges };
};

/** Polyline length in pixels. */
export const polylineLength = (points) => {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return total;
};

/**
 * Drop thinning whiskers: short branches that dead-end, which a thinner grows
 * wherever a stroke terminates in a wide, flat or rounded cap. They are not
 * strokes, and left in they turn one clean stroke end into a fork.
 *
 * Runs to a fixed point, because removing one whisker can turn its junction
 * into a plain pixel and expose another.
 */
export const pruneWhiskers = (graph, minLength) => {
  let { nodes, edges } = graph;
  for (let round = 0; round < 8; round++) {
    const degrees = new Map();
    for (const edge of edges) {
      degrees.set(edge.a, (degrees.get(edge.a) ?? 0) + 1);
      degrees.set(edge.b, (degrees.get(edge.b) ?? 0) + 1);
    }
    const doomed = new Set();
    for (const edge of edges) {
      if (edge.a === edge.b) continue;
      const leaf =
        (degrees.get(edge.a) === 1 && nodes[edge.a].kind === 'end') ||
        (degrees.get(edge.b) === 1 && nodes[edge.b].kind === 'end');
      if (leaf && polylineLength(edge.points) < minLength) doomed.add(edge.id);
    }
    if (!doomed.size) break;
    edges = edges.filter((edge) => !doomed.has(edge.id));
  }

  // Re-key so ids stay dense and usable as array indices.
  const keptNodeIds = new Set(edges.flatMap((edge) => [edge.a, edge.b]));
  const remap = new Map();
  const keptNodes = [];
  for (const node of nodes) {
    if (!keptNodeIds.has(node.id)) continue;
    remap.set(node.id, keptNodes.length);
    keptNodes.push({ ...node, id: keptNodes.length });
  }
  return {
    nodes: keptNodes,
    edges: edges.map((edge, index) => ({
      ...edge,
      id: index,
      a: remap.get(edge.a),
      b: remap.get(edge.b),
    })),
  };
};

/**
 * Contract short junction-to-junction edges into a single node.
 *
 * Where two thick strokes cross, thinning does not produce one clean X. It
 * produces a small mesh: a handful of junctions a few pixels apart joined by
 * stubs, because the ink in the middle of the crossing is wide in every
 * direction. Left alone that mesh is what shatters ક into six strokes — each
 * stub is a "branch" and the continuity test has nothing long enough to read a
 * direction from. Collapsing the mesh back to one node restores the crossing
 * the letter actually has, and then a four-way node with two straight-through
 * pairs merges into the two strokes a person writes.
 */
export const contractShortJunctions = (graph, maxLength) => {
  const nodes = graph.nodes.map((node) => ({ ...node }));
  let edges = graph.edges.map((edge) => ({ ...edge }));
  const alias = new Map();
  const members = new Map(nodes.map((node) => [node.id, [[node.x, node.y]]]));
  const resolve = (id) => {
    let current = id;
    while (alias.has(current)) current = alias.get(current);
    return current;
  };
  // A crossing is about one stroke wide. Merging is capped by the *diameter* of
  // the resulting cluster, not just by the length of the edge being swallowed,
  // because short stubs chain: without the cap, ક's crossing walks along the
  // curve it crosses and eats half the letter.
  const spread = (a, b) => {
    const all = [...members.get(a), ...members.get(b)];
    let worst = 0;
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        worst = Math.max(worst, Math.hypot(all[i][0] - all[j][0], all[i][1] - all[j][1]));
      }
    }
    return worst;
  };

  for (let guard = 0; guard < 200; guard++) {
    const target = edges.find((edge) => {
      const a = resolve(edge.a);
      const b = resolve(edge.b);
      return (
        a !== b &&
        nodes[a].kind === 'junction' &&
        nodes[b].kind === 'junction' &&
        polylineLength(edge.points) < maxLength &&
        spread(a, b) <= maxLength
      );
    });
    if (!target) break;
    const a = resolve(target.a);
    const b = resolve(target.b);
    members.set(a, [...members.get(a), ...members.get(b)]);
    const cluster = members.get(a);
    nodes[a] = {
      ...nodes[a],
      x: cluster.reduce((sum, [x]) => sum + x, 0) / cluster.length,
      y: cluster.reduce((sum, [, y]) => sum + y, 0) / cluster.length,
    };
    alias.set(b, a);
    edges = edges.filter((edge) => edge !== target);
  }

  const remapped = edges.map((edge) => ({ ...edge, a: resolve(edge.a), b: resolve(edge.b) }));
  const kept = new Set(remapped.flatMap((edge) => [edge.a, edge.b]));
  const index = new Map();
  const keptNodes = [];
  for (const node of nodes) {
    if (!kept.has(node.id)) continue;
    index.set(node.id, keptNodes.length);
    keptNodes.push({ ...node, id: keptNodes.length });
  }
  return {
    nodes: keptNodes,
    edges: remapped.map((edge, i) => ({ ...edge, id: i, a: index.get(edge.a), b: index.get(edge.b) })),
  };
};

/**
 * Collapse degree-2 nodes. A junction clump that only has two ways out is not a
 * fork, it is a bend that the crossing-number test over-reported; merging its
 * two branches into one is the difference between ક being two strokes and ક
 * being six.
 */
export const mergeThroughNodes = (graph) => {
  const nodes = graph.nodes.map((node) => ({ ...node }));
  let edges = graph.edges.map((edge) => ({ ...edge }));

  for (;;) {
    const incident = new Map();
    for (const edge of edges) {
      if (!incident.has(edge.a)) incident.set(edge.a, []);
      if (!incident.has(edge.b)) incident.set(edge.b, []);
      incident.get(edge.a).push(edge);
      incident.get(edge.b).push(edge);
    }
    const target = [...incident.entries()].find(
      ([id, list]) => list.length === 2 && list[0] !== list[1] && nodes[id].kind === 'junction'
    );
    if (!target) break;
    const [nodeId, [first, second]] = target;
    const orient = (edge) => (edge.b === nodeId ? edge.points : [...edge.points].reverse());
    const head = orient(first); // ends at nodeId
    const tail = orient(second); // also ends at nodeId -> reverse to leave it
    const merged = {
      id: first.id,
      a: first.b === nodeId ? first.a : first.b,
      b: second.b === nodeId ? second.a : second.b,
      points: [...head, ...[...tail].reverse().slice(1)],
    };
    edges = edges.filter((edge) => edge !== first && edge !== second);
    edges.push(merged);
  }

  return { nodes, edges: edges.map((edge, index) => ({ ...edge, id: index })) };
};
