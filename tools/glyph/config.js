// The render contract: every number here is copied from the app, not chosen.
//
// If any of these drift from src/views/TraceView.jsx the regenerated waypoints
// stop sitting on the glyph the child actually sees, so they live in one file
// and tools/glyph/README.md records where each came from.
import { CANVAS_H, CANVAS_W } from '../../src/lib/waypoints.js';

export { CANVAS_H, CANVAS_W };

// TraceView.jsx drawTraceGuide, verbatim.
export const GUIDE_FONT = '220px "Noto Sans Gujarati", "Baloo Bhai 2", sans-serif';
export const GUIDE_FILL = 'rgba(226, 232, 240, 0.95)';
export const GUIDE_BACKGROUND = '#f8fafc';
export const GUIDE_TEXT_ALIGN = 'center';
export const GUIDE_TEXT_BASELINE = 'middle';

// ctx.fillText(letter, CANVAS_W / 2, CANVAS_H / 2 + 10) — the +10 is the app's
// optical nudge, kept because the ink it produces is the ink being traced.
export const GUIDE_ORIGIN_X = CANVAS_W / 2;
export const GUIDE_ORIGIN_Y = CANVAS_H / 2 + 10;

// The ink test. The background is #f8fafc = (248,250,252) and the guide glyph
// is rgba(226,232,240,0.95) composited over it, which Chromium rasterises as
// (227,233,241) at full coverage. So the red channel travels 248 -> 227 across
// a fully inked pixel and an antialiased edge lands somewhere in between:
// coverage = (248 - r) / 21, and a pixel counts as ink at half coverage or
// more. Half is the standard binarisation point for a thinning pass — it puts
// the boundary where the outline actually is, so the skeleton lands on the
// stroke's true centre.
//
// Note this is NOT the test in useWaypointEditor.js snapToCenterline, which
// asks for r < 240 && g < 240 && b < 240 and therefore rejects the glyph's own
// blue channel (241). Reproducing that here would leave the tool tracing a
// ring of antialiasing instead of the letter. The editor's snap is untouched by
// this PR.
export const BACKGROUND_RGB = [248, 250, 252];
export const INK_RGB = [227, 233, 241];
export const INK_COVERAGE = 0.5;

// The self-hosted font binary the app serves. Embedded into the render page as
// a data URL so the headless browser needs no file access and cannot silently
// substitute a system Gujarati font.
export const FONT_FILE = 'public/fonts/noto-sans-gujarati-gujarati.woff2';
export const FONT_FAMILY = 'Noto Sans Gujarati';
