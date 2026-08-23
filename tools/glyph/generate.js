#!/usr/bin/env node
// The glyph-centric waypoint generator.
//
//   node tools/glyph/generate.js --render     re-render the ink from the font
//   node tools/glyph/generate.js              rebuild waypoints from committed ink
//   node tools/glyph/generate.js --letters=pa,pha --dry-run
//
// Render (browser, see render.js) -> thin to a centreline -> branch graph ->
// merge branches into strokes -> order them -> resample -> write
// src/curriculum.js. Every step is inspectable: the ink is committed as JSON,
// the result is committed as a proof sheet per letter, and the run prints the
// table that goes in the PR description.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CURRICULUM } from '../../src/curriculum.js';
import { canvasToPathX, canvasToPathY } from '../../src/lib/waypoints.js';
import { CANVAS_H, CANVAS_W } from './config.js';
import { drawNumber } from './digits.js';
import { OVERRIDES } from './overrides.js';
import { blankRgb, drawDisc, drawLine, encodePng, setPixel } from './png.js';
import { renderGlyphs, toMask } from './render.js';
import { bridgeGaps, indexSkeleton, routeAnchors } from './route.js';
import {
  buildGraph,
  cleanStaircases,
  contractShortJunctions,
  mergeThroughNodes,
  polylineLength,
  pruneWhiskers,
  thin,
} from './skeleton.js';
import { mergeBranches, orderStrokes, resample } from './strokes.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const INK_DIR = path.join(HERE, 'ink');
const PNG_DIR = path.join(HERE, 'png');

// Two thresholds, both in render pixels at the app's 220px font, where a stroke
// is roughly 20-24px wide.
//
// WHISKER: a dead-end branch shorter than this is a thinning artifact off a
// stroke cap, not a stroke. Half a stroke width.
// CROSSING: junction-to-junction stubs shorter than this are one crossing that
// thinning shattered. Just under a stroke width — wide enough to swallow the
// mesh a crossing makes, narrow enough to leave ફ's real pigtail alone.
const WHISKER = 12;
const CROSSING = 18;

const argOf = (name) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const hasFlag = (name) => process.argv.includes(`--${name}`);

export const loadInk = (ids) => {
  const glyphs = {};
  for (const id of ids) {
    const file = path.join(INK_DIR, `${id}.json`);
    glyphs[id] = JSON.parse(readFileSync(file, 'utf8'));
  }
  return glyphs;
};

const saveInk = (glyphs) => {
  mkdirSync(INK_DIR, { recursive: true });
  for (const [id, glyph] of Object.entries(glyphs)) {
    // Rows on their own lines: this is committed data and a font update should
    // produce a diff a person can read.
    const body = [
      '{',
      `  "letter": ${JSON.stringify(glyph.letter)},`,
      `  "width": ${glyph.width},`,
      `  "height": ${glyph.height},`,
      `  "area": ${glyph.area},`,
      `  "bbox": ${JSON.stringify(glyph.bbox)},`,
      '  "rows": [',
      glyph.rows.map((runs) => `    ${JSON.stringify(runs)}`).join(',\n'),
      '  ]',
      '}',
      '',
    ].join('\n');
    writeFileSync(path.join(INK_DIR, `${id}.json`), body, 'utf8');
  }
};

/** Nearest-ink distance for a point, in pixels. 0 = the point is on the glyph. */
const distanceToMask = (mask, width, height, x, y) => {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix >= 0 && iy >= 0 && ix < width && iy < height && mask[iy * width + ix]) return 0;
  let best = Infinity;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      if (!mask[py * width + px]) continue;
      const distance = Math.hypot(px - x, py - y);
      if (distance < best) best = distance;
    }
  }
  return best;
};

const maxDistanceToPolyline = (points, polyline) => {
  let worst = 0;
  for (const [x, y] of points) {
    let best = Infinity;
    for (let i = 1; i < polyline.length; i++) {
      const [ax, ay] = polyline[i - 1];
      const [bx, by] = polyline[i];
      const dx = bx - ax;
      const dy = by - ay;
      const lengthSq = dx * dx + dy * dy;
      let t = lengthSq < 1e-9 ? 0 : ((x - ax) * dx + (y - ay) * dy) / lengthSq;
      t = Math.max(0, Math.min(1, t));
      const distance = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
      if (distance < best) best = distance;
    }
    if (best > worst) worst = best;
  }
  return worst;
};

/** One letter: ink -> ordered strokes of dense centreline points. */
export const strokesFor = (id, glyph) => {
  const mask = toMask(glyph);
  const skel = cleanStaircases(thin(mask, glyph.width, glyph.height), glyph.width, glyph.height);
  const index = indexSkeleton(skel, glyph.width, glyph.height);

  const override = OVERRIDES[id];
  if (override) {
    const routed = override.strokes.map((anchors, i) =>
      routeAnchors(index, anchors, `${id} stroke ${i + 1}`)
    );
    return {
      mask,
      skel,
      strokes: routed.map((stroke) => stroke.points),
      keeps: routed.map((stroke) => stroke.keep),
      source: 'hand',
      note: override.note ?? '',
      snap: Math.max(0, ...routed.flatMap((stroke) => stroke.snapDistances)),
    };
  }

  let graph = buildGraph(skel, glyph.width, glyph.height);
  graph = contractShortJunctions(graph, CROSSING);
  graph = pruneWhiskers(graph, WHISKER);
  graph = mergeThroughNodes(graph);
  const strokes = orderStrokes(mergeBranches(graph)).map((points) => bridgeGaps(index, points));
  return { mask, skel, strokes, keeps: strokes.map(() => []), source: 'skeleton', note: '', snap: 0 };
};

const toWaypoints = (strokes, keeps = []) => {
  const waypoints = [];
  strokes.forEach((points, strokeIndex) => {
    const sampled = resample(points, { keep: keeps[strokeIndex] ?? [] });
    sampled.forEach(([x, y], i) => {
      const wp = { x: canvasToPathX(x), y: canvasToPathY(y), label: String(waypoints.length + 1) };
      if (strokeIndex > 0 && i === 0) wp.moveTo = true;
      waypoints.push(wp);
    });
  });
  return waypoints;
};

const proofSheet = (glyph, result, waypoints) => {
  const { width, height } = glyph;
  const rgb = blankRgb(width, height, [255, 255, 255]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (result.mask[y * width + x]) setPixel(rgb, width, height, x, y, [223, 229, 238]);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (result.skel[y * width + x]) setPixel(rgb, width, height, x, y, [176, 186, 200]);
    }
  }
  const palette = [
    [214, 40, 40],
    [23, 107, 190],
    [26, 145, 74],
    [200, 120, 0],
    [131, 56, 190],
    [0, 0, 0],
  ];
  result.strokes.forEach((points, i) => {
    const colour = palette[i % palette.length];
    for (let p = 1; p < points.length; p++) {
      drawLine(rgb, width, height, points[p - 1][0], points[p - 1][1], points[p][0], points[p][1], colour);
    }
  });
  waypoints.forEach((wp) => {
    const x = (wp.x / 100) * CANVAS_W;
    const y = (wp.y / 100) * CANVAS_H;
    drawDisc(rgb, width, height, x, y, 3, [20, 20, 20]);
    drawNumber(rgb, width, height, wp.label, x + 5, y - 5, [190, 20, 20]);
  });
  return encodePng(width, height, rgb);
};

// curriculum.js is hand-written prose plus data. Rather than regenerate it (and
// lose the comments, the example words and the instructions), find each
// lesson's waypoints array by id and swap the array body.
const rewriteCurriculum = (source, byId) => {
  let out = source;
  for (const [id, waypoints] of Object.entries(byId)) {
    const idAt = out.indexOf(`id: '${id}',`);
    if (idAt < 0) throw new Error(`curriculum.js has no lesson with id '${id}'`);
    const start = out.indexOf('waypoints: [', idAt);
    if (start < 0) throw new Error(`lesson '${id}' has no waypoints array`);
    let depth = 0;
    let end = -1;
    for (let i = out.indexOf('[', start); i < out.length; i++) {
      if (out[i] === '[') depth++;
      else if (out[i] === ']') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) throw new Error(`lesson '${id}' has an unterminated waypoints array`);
    const body = waypoints
      .map((wp) => {
        const parts = [`x: ${wp.x}`, `y: ${wp.y}`, `label: '${wp.label}'`];
        if (wp.moveTo) parts.push('moveTo: true');
        return `      { ${parts.join(', ')} }`;
      })
      .join(',\n');
    out = `${out.slice(0, start)}waypoints: [\n${body}\n    ]${out.slice(end + 1)}`;
  }
  return out;
};

// --dump=<id> prints the skeleton's landmarks in render pixels. It is the
// worksheet for writing an override: the anchors in overrides.js are chosen
// from these, so a hand fix is picked off the letter's own centreline rather
// than eyeballed off a screenshot.
const dumpLandmarks = (id, glyph) => {
  const mask = toMask(glyph);
  const skel = cleanStaircases(thin(mask, glyph.width, glyph.height), glyph.width, glyph.height);
  let graph = buildGraph(skel, glyph.width, glyph.height);
  graph = contractShortJunctions(graph, CROSSING);
  const place = ([x, y]) => `(${Math.round(x)},${Math.round(y)})`;
  console.log(`\n${id} — ${glyph.letter}  bbox ${JSON.stringify(glyph.bbox)}`);
  for (const node of graph.nodes) {
    console.log(`  node ${String(node.id).padStart(2)} ${node.kind.padEnd(8)} ${place([node.x, node.y])}`);
  }
  for (const edge of graph.edges) {
    const mid = edge.points[Math.floor(edge.points.length / 2)];
    const quarter = edge.points[Math.floor(edge.points.length / 4)];
    const threeQuarter = edge.points[Math.floor((edge.points.length * 3) / 4)];
    console.log(
      `  edge ${String(edge.id).padStart(2)} ${String(edge.a).padStart(2)}->${String(edge.b).padStart(2)} ` +
        `${polylineLength(edge.points).toFixed(0).padStart(4)}px  ` +
        `${place(edge.points[0])} ${place(quarter)} ${place(mid)} ${place(threeQuarter)} ${place(edge.points.at(-1))}`
    );
  }
};

const main = () => {
  const only = argOf('letters');
  const lessons = CURRICULUM.filter((lesson) => !only || only.split(',').includes(lesson.id));
  if (!lessons.length) throw new Error(`--letters matched nothing`);

  let glyphs;
  if (hasFlag('render')) {
    console.log(`Rendering ${lessons.length} letters in a headless browser...`);
    glyphs = renderGlyphs(
      lessons.map(({ id, letter }) => ({ id, letter })),
      REPO
    );
    saveInk(glyphs);
    console.log(`Wrote ink to ${path.relative(REPO, INK_DIR)}`);
  } else {
    const have = new Set(readdirSync(INK_DIR).map((file) => file.replace(/\.json$/, '')));
    const missing = lessons.filter((lesson) => !have.has(lesson.id));
    if (missing.length) {
      throw new Error(
        `No committed ink for ${missing.map((lesson) => lesson.id).join(', ')}. Run with --render.`
      );
    }
    glyphs = loadInk(lessons.map((lesson) => lesson.id));
  }

  if (hasFlag('dump')) {
    for (const lesson of lessons) dumpLandmarks(lesson.id, glyphs[lesson.id]);
    return;
  }

  mkdirSync(PNG_DIR, { recursive: true });
  const rows = [];
  const byId = {};

  for (const lesson of lessons) {
    const glyph = glyphs[lesson.id];
    const result = strokesFor(lesson.id, glyph);
    const waypoints = toWaypoints(result.strokes, result.keeps);
    byId[lesson.id] = waypoints;

    const pixels = waypoints.map((wp) => [(wp.x / 100) * CANVAS_W, (wp.y / 100) * CANVAS_H]);
    const inkDistance = Math.max(
      0,
      ...pixels.map(([x, y]) => distanceToMask(result.mask, glyph.width, glyph.height, x, y))
    );
    const perStroke = result.strokes.map((points, i) => ({
      centreline: points,
      waypoints: pixels.filter((_, index) => strokeIndexOf(waypoints, index) === i),
    }));
    // How far a waypoint sits from the centreline it came from.
    const centre = Math.max(
      0,
      ...perStroke.map((stroke) => maxDistanceToPolyline(stroke.waypoints, stroke.centreline))
    );
    // And the other direction: how far the centreline strays from the dashed
    // guide drawn between the waypoints. This is the number the tracing
    // engine's accuracy score feels, because it measures ink against the
    // waypoint polyline, not against the glyph.
    const sag = Math.max(
      0,
      ...perStroke.map((stroke) => maxDistanceToPolyline(stroke.centreline, stroke.waypoints))
    );

    writeFileSync(path.join(PNG_DIR, `${lesson.id}.png`), proofSheet(glyph, result, waypoints));
    rows.push({
      id: lesson.id,
      letter: lesson.letter,
      strokes: result.strokes.length,
      waypoints: waypoints.length,
      inkDistance,
      centre,
      sag,
      source: result.source,
      note: result.note,
    });
  }

  if (!hasFlag('dry-run')) {
    const file = path.join(REPO, 'src/curriculum.js');
    writeFileSync(file, rewriteCurriculum(readFileSync(file, 'utf8'), byId), 'utf8');
    console.log(`Wrote waypoints for ${rows.length} letters into src/curriculum.js`);
  }

  const px = (value) => value.toFixed(2).padStart(6);
  const toPath = (value) => ((value / CANVAS_W) * 100).toFixed(2).padStart(6);
  console.log(
    `\n${'id'.padEnd(6)} ${'ch'.padEnd(3)} ${'str'} ${'wps'} ${'ink px'} ${'ink pu'} ${'ctr px'} ${'sag px'}  source`
  );
  for (const row of rows) {
    console.log(
      `${row.id.padEnd(6)} ${row.letter.padEnd(3)} ${String(row.strokes).padStart(3)} ` +
        `${String(row.waypoints).padStart(3)} ${px(row.inkDistance)} ${toPath(row.inkDistance)} ` +
        `${px(row.centre)} ${px(row.sag)}  ${row.source}${row.note ? ` — ${row.note}` : ''}`
    );
  }
};

// Which stroke a waypoint belongs to: strokes start at index 0 and at every
// moveTo.
const strokeIndexOf = (waypoints, index) => {
  let stroke = 0;
  for (let i = 1; i <= index; i++) if (waypoints[i].moveTo) stroke++;
  return stroke;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
