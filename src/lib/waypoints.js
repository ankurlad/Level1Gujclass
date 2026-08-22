// The waypoint path space.
//
// Waypoints in src/curriculum.js used to be absolute pixels in the 380x320
// logical canvas, which welded 258 hand-calibrated coordinates to one canvas
// size: every consumer hardcoded 380/320, and changing the tracing box meant
// re-deriving the whole curriculum. They are now stored as percentages of that
// box — 0..100 on both axes, independent of the pixel size — and multiplied by
// the *current* logical size at draw time.
//
// 0 is the left/top edge of the tracing box and 100 the right/bottom edge, so
// { x: 50, y: 50 } is dead centre whatever the canvas measures. The axes scale
// independently (the box is not square), so a path-space distance is not
// isotropic: hit tests and snap radii stay in logical pixels and convert the
// waypoint, never the other way round.
export const PATH_MAX = 100;

// Logical drawing space for the tracing and sandbox canvases. Ink coordinates,
// hit-test radii, brush widths and the offscreen snap probe are all in these
// units; the backing store is a devicePixelRatio-scaled multiple of it (see
// setupCanvasScaling in App.jsx). Waypoints are the one thing that is *not*
// stored here — they live in the path space above and are scaled by these two
// numbers on the way to the canvas.
export const CANVAS_W = 380;
export const CANVAS_H = 320;

// Hundredths of the box: 0.01 path units is 0.038px in x and 0.032px in y, two
// orders of magnitude below the 4px guide stroke and the 28px hit radius, so a
// canvas -> path -> canvas round trip is invisible to both the eye and the
// tracing engine. It also keeps the exported JSON readable, which the old data
// was not ("x": 124.50000000000001).
const roundPath = (value) => Math.round(value * 100) / 100;

const clampPath = (value) => Math.min(PATH_MAX, Math.max(0, value));

// Path space -> logical canvas pixels. Called per waypoint per repaint, hence
// the two scalar helpers alongside the point form: the draw loop feeds
// ctx.moveTo/lineTo directly and allocating a point per call is pure garbage.
export const pathToCanvasX = (x) => (x * CANVAS_W) / PATH_MAX;
export const pathToCanvasY = (y) => (y * CANVAS_H) / PATH_MAX;
export const pathToCanvas = ({ x, y }) => ({ x: pathToCanvasX(x), y: pathToCanvasY(y) });

// Logical canvas pixels -> path space, clamped to the box and rounded. This is
// the editor's write path: a pointer position or a snapped centreline pixel
// becomes a stored coordinate here and nowhere else.
export const canvasToPathX = (x) => roundPath(clampPath((x * PATH_MAX) / CANVAS_W));
export const canvasToPathY = (y) => roundPath(clampPath((y * PATH_MAX) / CANVAS_H));
export const canvasToPath = ({ x, y }) => ({ x: canvasToPathX(x), y: canvasToPathY(y) });

// True for a saved override still written in the pre-path-space pixel range.
//
// The two spaces overlap in 0..100, so detection leans on the letterform rather
// than on a single point: the guide glyph is set at 220px and spans most of the
// 380x320 box, so a real calibrated letter always has at least one coordinate
// past 100 in pixels and never has one past 100 in path space. The residual
// ambiguity — an override whose *every* point sits inside the top-left 100x100
// pixel corner — cannot describe a traceable letter in either space.
export const isLegacyPixelWaypoints = (waypoints) =>
  Array.isArray(waypoints) &&
  waypoints.some((wp) => wp && (wp.x > PATH_MAX || wp.y > PATH_MAX));

// Rewrites pixel waypoints into the path space, leaving labels and moveTo flags
// (and key order, for a readable export) exactly as they were. Unguarded: a
// value already in path space would be divided a second time, which is why the
// read path goes through normalizeWaypoints instead.
export const toPathSpaceWaypoints = (waypoints) =>
  waypoints.map((wp) => ({ ...wp, x: canvasToPathX(wp.x), y: canvasToPathY(wp.y) }));

// The v1 -> v2 read path. Returns the argument itself when there is nothing to
// do, so a caller can tell whether it needs to persist the result by identity.
export const normalizeWaypoints = (waypoints) =>
  isLegacyPixelWaypoints(waypoints) ? toPathSpaceWaypoints(waypoints) : waypoints;
