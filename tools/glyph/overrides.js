// Hand-authored stroke order, for the letters the skeleton cannot resolve.
//
// Each entry is a list of strokes; each stroke is a list of anchors in render
// pixels (the 380x320 logical canvas, same space as the proof sheets in
// tools/glyph/png and the `--dump` landmarks). The generator snaps each anchor
// to the nearest centreline pixel and walks the skeleton between them, so an
// anchor only has to be close — it decides the route, not the coordinates.
// An anchor written [x, y, 'free'] is used where it stands; see route.js for
// why that exists.
//
// A letter belongs here when the automatic pass gets its *motion* wrong, which
// is one of the three things automation cannot know: over-fragmentation, knots,
// and stroke order/direction. `note` says what was wrong; it prints in the
// regeneration report.
//
// THE MODEL FOR A BOTTOM-JOINED LETTER (પ, ધ, and their relatives). The right
// limb is not an independent full-height bar drawn top to bottom. The pen draws
// the body — hook, down the left, along the bottom — and at the junction it
// RISES up the right limb all the way to the top, as the last part of that same
// stroke. Only then does a second stroke leave the junction for the baseline
// flick. This is Ankur's own pen, verified against a trace video, and it is the
// single correction that most of these overrides exist to make: the automatic
// pass reads the limb as a separate top-down stem every time, because a bounding
// box cannot tell a stem that was reached from one that was started.
export const OVERRIDES = {
  pa: {
    note: 'right limb rises as the end of stroke 1; flick is stroke 2',
    strokes: [
      [
        [133, 92], // hook tip, top left
        [152, 95],
        [156, 119], // down the left limb
        [159, 151],
        [172, 165], // bottom left of the bowl
        [197, 165], // along the bottom
        [222, 158], // the junction
        [222, 123], // rising
        [222, 89], // top of the right limb
      ],
      [
        [222, 158], // back at the junction
        [227, 196],
        [242, 201], // baseline flick
      ],
    ],
  },

  ka: {
    note: 'S and crossbar share 16px of centreline; automation split it into three',
    strokes: [
      [
        [210, 86], // top right tip
        [187, 87],
        [167, 103], // down the left of the upper curl
        [170, 122],
        [181, 138],
        [198, 139], // through the crossing
        [203, 149],
        [219, 164],
        [222, 180],
        [203, 203], // along the bottom
        [174, 202],
        [149, 193], // bottom left tip
      ],
      [
        [150, 159], // crossbar, left to right
        [164, 149],
        [182, 139],
        [198, 139],
        [219, 129],
        [231, 125],
      ],
    ],
  },

  pha: {
    note: 'S through the crossing, then the pigtail; crossbar last, left to right',
    strokes: [
      [
        [210, 86], // top right tip
        [187, 87],
        [167, 103],
        [170, 122],
        [181, 138],
        [198, 139], // through the crossing
        [203, 149],
        [218, 162],
        [222, 180],
        [208, 202], // bottom sweep
        [176, 205],
        [156, 195], // arrive left
        [178, 219], // back across itself — the pigtail crossing
        [190, 232],
        [212, 240], // tail exits right
      ],
      [
        [150, 159], // crossbar, left to right
        [164, 149],
        [182, 139],
        [198, 139],
        [219, 129],
        [231, 125],
      ],
    ],
  },

  ra: {
    note: 'one stroke, not two: the knot doubles back rather than lifting',
    strokes: [
      [
        [154, 97], // top left tip
        [170, 87],
        [192, 87],
        [211, 97],
        [218, 119], // down the right of the arch
        [211, 141],
        [198, 152],
        [182, 158],
        [161, 156], // into the knot
        [181, 164], // and back out of it
        [196, 186],
        [228, 201], // bottom right
      ],
    ],
  },

  na: {
    note: 'the left bowl is solid ink with no centreline; loop placed by hand',
    strokes: [
      [
        [166, 130, 'free'], // top of the loop
        [145, 128, 'free'],
        [140, 145, 'free'], // round the left
        [156, 159, 'free'],
        [168, 148, 'free'], // and back up to where it started
        [172, 132],
        [190, 130], // the bar, left to right
        [219, 130],
      ],
      [
        [220, 90], // the stem, top to bottom
        [220, 130],
        [220, 170],
        [227, 196],
        [239, 201],
      ],
    ],
  },

  dha2: {
    note: 'curl and bowl are one stroke that rises up the stem; tick and flick after',
    strokes: [
      [
        [164, 79], // top of the curl
        [152, 87],
        [143, 101], // round the left
        [147, 120],
        [154, 129],
        [153, 141], // straight on down, past the tick
        [154, 166],
        [168, 177], // along the bottom
        [188, 178],
        [208, 173],
        [226, 150], // the junction, then rising
        [226, 110],
        [226, 89], // top of the stem
      ],
      [
        [157, 131], // the tick, left to right
        [171, 129],
        [184, 128],
      ],
      [
        [226, 169], // back at the junction
        [229, 193],
        [246, 201], // baseline flick
      ],
    ],
  },
};
