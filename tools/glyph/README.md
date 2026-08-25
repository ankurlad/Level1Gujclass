# tools/glyph — the waypoint generator

Every `waypoints` array in `src/curriculum.js` is generated from the letterform
itself. Nothing here ships to the browser; it is a dev-time tool.

```bash
node tools/glyph/generate.js --render      # re-render the ink from the font, then rebuild
node tools/glyph/generate.js               # rebuild from the committed ink (no browser needed)
node tools/glyph/generate.js --letters=pa,pha --dry-run   # one letter, don't write curriculum.js
```

`--render` is only needed when the font binary, the canvas size or the guide's
font/size/position changes. The rest of the time the committed ink in `ink/` is
the input, which keeps a regeneration reproducible byte for byte.

## Why

The hand-placed waypoints this replaces were dots dragged onto a picture of a
letter. Measured against the glyph they were tracing, only about seven of the 34
letters had waypoints that touched the ink at all, and ય's third waypoint sat 72
pixels off the letter. A child following those dots was drawing something the
guide glyph disagreed with.

Placing dots by hand cannot fix that, because the failure is not a lack of care;
it is that a person cannot see the centre of a 22px-wide stroke to the pixel.
So the shape comes from the letterform and the human effort goes where a
machine genuinely cannot help: stroke order, direction, and knots.

## The pipeline

1. **Render** (`render.js`). A headless Chrome/Edge draws each letter at the
   app's exact guide parameters — the constants in `config.js` are copied from
   `src/views/TraceView.jsx` `drawTraceGuide`, and the font is the same
   `public/fonts/noto-sans-gujarati-gujarati.woff2` the app serves, embedded as
   a data URL so no system font can stand in for it. Chromium is used rather
   than a JS font rasteriser because the app's ink is Chromium's ink: its woff2
   decoder, its shaper (ક્ષ and જ્ઞ only exist after GSUB runs), its
   antialiasing and its reading of `textBaseline = 'middle'`. Guessing any of
   those shifts every waypoint of every letter by the same invisible amount.
   The page fails loudly if the font did not load.
   Output: `ink/<id>.json`, the glyph as per-row pixel runs.
2. **Thin** (`skeleton.js`). Zhang-Suen thinning reduces the ink to a
   one-pixel-wide centreline, then a staircase-cleanup pass removes the L-kinks
   thinning leaves so that a neighbour count is a usable degree.
3. **Graph** (`skeleton.js`). Centreline pixels become nodes (stroke ends and
   junctions) and branches. Three corrections follow, each aimed at one of the
   three failure classes automation is known to have here:
   - `contractShortJunctions` — where two thick strokes cross, thinning makes a
     small mesh of junctions a few pixels apart rather than one clean X. Left
     alone, that mesh is what shattered ક into six strokes. Collapsing it
     restores the single crossing.
   - `pruneWhiskers` — short dead-end branches off a stroke cap are artifacts,
     not strokes.
   - `mergeThroughNodes` — a "junction" with only two ways out is a bend.
4. **Strokes** (`strokes.js`). Branches meeting at a node are paired by
   direction continuity (the pen carries on into whichever branch it barely has
   to turn for), which merges a crossbar and the curve it crosses back into two
   strokes instead of four stubs. The resulting strokes are then ordered by the
   Gujarati heuristics: bodies first, top to bottom, right-hand stems last, each
   stroke starting at its higher end.
5. **Land the tips** (`caps.js`). A medial axis stops short of a cap: the ridge
   of the distance transform ends where the bisectors of the terminal's two
   corners meet, roughly a half stroke width inside the visible end of the ink.
   Left alone, every stroke-end dot therefore sits behind the place the child's
   pen actually starts. `tipExtend` walks the centreline's own tangent outwards
   until the ray leaves the ink and puts the endpoint on that exit, so the dot's
   centre is on the centreline *and* on the visible tip. A stroke that ends at a
   crossing is not a cap — there the ray is still inside ink a whole stroke
   width out, and the endpoint is left where it was. The correction is opt-in:
   auto strokes offer both chain ends, hand strokes only the anchors written
   `[x, y, 'tip']`.
6. **Resample** (`strokes.js`). Ramer-Douglas-Peucker keeps the corners, a
   maximum gap keeps a long stem from being two dots a hand-span apart, and a
   minimum gap keeps two dots from landing inside one fingertip.
7. **Emit** (`generate.js`). Pixels become the 0-100 path space through
   `canvasToPathX/Y` from `src/lib/waypoints.js` — the same conversion the
   editor writes with, so the contract from PR 5 holds — labels are 1-based in
   stroke order, and every stroke after the first starts with `moveTo: true`.
   `src/curriculum.js` is rewritten in place, lesson by lesson, so the prose,
   the example words and the instructions survive.

## Hand fixes

`overrides.js` overrules step 4 for a letter whose *motion* the graph gets
wrong. An override is a list of strokes, each a list of anchors in render
pixels; the router (`route.js`) snaps each anchor to the nearest centreline
pixel and walks the skeleton between anchors. So a hand fix moves the pen
without moving the letter off its ink — the anchors decide the route, not the
coordinates, and an anchor only has to be close.

The one exception is an anchor written `[x, y, 'free']`, which is used where it
stands. That exists for a bowl the font fills in solid — the loop on the left of
ન — where there is no centreline to walk because thinning collapses a solid blob
to a stub, even though the pen that wrote the letter did go round it and the ink
is there to trace. The generator's ink metric is what proves those points landed
on the glyph.

## Reading the output

The run prints a table, and `png/<id>.png` is a proof sheet per letter: the ink
in pale grey, the centreline over it, each stroke in its own colour, and the
emitted waypoints as numbered dots. The numbers are the stroke order the child
will follow, so a wrong order is visible at a glance.

`png/proof-ka-lesson.png` and `png/proof-ka-lesson-dot1.png` are not generated:
they are screenshots of the running app's ક lesson at a phone viewport, kept as
the record that the dot the child is told to start on has its *centre* on the
stroke's start. The proof sheets above are drawn from the tool's own ink, so
only a shot of the app itself can show that.

Three numbers per letter:

- **ink** — the furthest any waypoint sits from the rendered glyph. 0.00 means
  every waypoint of that letter is *on* the ink. This is the number the old
  hand-placed data failed.
- **ctr** — the furthest any waypoint sits from the centreline it was sampled
  from. Bounded by rounding to the path space's hundredths.
- **sag** — the furthest the centreline strays from the straight dashed guide
  drawn between consecutive waypoints. This is the one the tracing engine
  feels: `getAccuracy` measures the child's ink against the waypoint polyline,
  not against the glyph, so `sag` is the error a perfect trace would still be
  charged. It is kept well inside the 5-path-unit (19px) snap radius.

## Constants worth knowing

- `WHISKER = 12px`, `CROSSING = 18px` in `generate.js`: half a stroke width and
  just under one, at the app's 220px font. Both would need revisiting at a
  different font size.
- The ink test in `config.js` binarises at half coverage of the red channel.
  Note it is deliberately *not* the test in `useWaypointEditor.js`
  `snapToCenterline`, which asks for `b < 240` and so rejects the guide glyph's
  own blue channel (241); reproducing that here would have traced a ring of
  antialiasing instead of the letter. The editor's snap is untouched by this
  work.
