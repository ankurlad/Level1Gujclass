// Hand-authored stroke order, for the letters the skeleton cannot resolve.
//
// Each entry is a list of strokes; each stroke is a list of anchors in render
// pixels (the 380x320 logical canvas, same space as the proof sheets in
// tools/glyph/png). The generator snaps each anchor to the nearest centreline
// pixel and walks the skeleton between them, so an anchor only has to be close
// — it decides the route, not the coordinates. Anchors are read off the proof
// sheet for that letter.
//
// A letter belongs here when the automatic pass gets its *motion* wrong, which
// is one of the three things the ground truth says automation cannot know:
// over-fragmentation, knots, and stroke order/direction. `note` is what was
// wrong; it ends up in the regeneration report.
export const OVERRIDES = {};
