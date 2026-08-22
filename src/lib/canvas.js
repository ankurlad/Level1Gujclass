import { CANVAS_H, CANVAS_W } from './waypoints';

// The two DOM-canvas chores both drawing surfaces share: sizing the backing
// store, and turning a pointer event into a coordinate in the logical space.
// The tracing canvas and the sandbox canvas each used to call these off App.

// Size a canvas' backing store to its rendered size times the device pixel
// ratio, then map the 2D context back onto the CANVAS_W x CANVAS_H logical
// space. Without this the fixed 380x320 backing store is stretched by CSS on
// every 2x/3x phone and the trace guide renders blurry. Returns the context.
//
// This transform is why the path space works: everything downstream draws in
// logical units at any DPR, so scaling a 0-100 waypoint by CANVAS_W/CANVAS_H is
// the only conversion the draw path needs.
export const setupCanvasScaling = (canvas) => {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  // Before layout has run the rect is 0x0; fall back to the logical size.
  const backingW = Math.max(1, Math.round((rect.width || CANVAS_W) * dpr));
  const backingH = Math.max(1, Math.round((rect.height || CANVAS_H) * dpr));

  // Assigning width/height resets all context state, so only touch it on change.
  if (canvas.width !== backingW || canvas.height !== backingH) {
    canvas.width = backingW;
    canvas.height = backingH;
  }

  const ctx = canvas.getContext('2d');
  // setTransform is absolute, so re-running this never compounds the scale.
  ctx.setTransform(backingW / CANVAS_W, 0, 0, backingH / CANVAS_H, 0, 0);
  return ctx;
};

// Pointer/touch position in the logical canvas space, independent of both the
// CSS size the canvas was laid out at and the backing store resolution.
export const eventToCanvasCoords = (canvas, e) => {
  const rect = canvas.getBoundingClientRect();

  let clientX = e.clientX;
  let clientY = e.clientY;

  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  }

  return {
    x: ((clientX - rect.left) / rect.width) * CANVAS_W,
    y: ((clientY - rect.top) / rect.height) * CANVAS_H
  };
};

// The same thing off a ref, for the handlers that run before the canvas is
// mounted (or after it is gone) and have always read 0,0 in that case.
export const canvasRefCoords = (ref, e) => {
  const canvas = ref.current;
  if (!canvas) return { x: 0, y: 0 };
  return eventToCanvasCoords(canvas, e);
};
