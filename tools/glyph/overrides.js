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

  // ---- vowels (PR 13a2) ----
  //
  // The vowels fail the automatic pass in one of two ways. અ/આ/ઌ are
  // over-fragmented: a turn where the pen doubles back inside a bulb reads as
  // two strokes meeting at a junction, so the one motion that draws the whole
  // left form comes out as two or three. ઊ/ઋ are ordered backwards: the graph
  // picks a start by bounding box and ends up sweeping right-to-left across a
  // letter the child reads left-to-right, and — worse for ઊ — round the bowl
  // the opposite way from ઉ, which is the same bowl.

  a: {
    note: 'left form is one motion through the bulb; crossbar, then stem',
    strokes: [
      [
        [108, 91], // top-left tip
        [126, 86],
        [145, 89],
        [157, 100], // over the shoulder and down
        [159, 116],
        [157, 131],
        [138, 147],
        [115, 147], // the bulb — the pen turns here, it does not lift
        [129, 151],
        [133, 164], // and away down into the bowl
        [153, 178],
        [168, 179], // along the bottom
        [186, 176],
        [200, 165], // up to the junction
        [208, 146],
        [208, 124], // rising into the spur
      ],
      [
        [208, 147], // crossbar, left to right
        [232, 152],
        [256, 147],
      ],
      [
        [257, 90], // the stem, top to bottom
        [257, 118],
        [257, 147],
        [257, 170],
        [259, 192],
        [276, 201], // baseline flick
      ],
    ],
  },

  aa: {
    note: 'અ shifted 29px left, then the ા bar last — "draw અ, then the long bar"',
    strokes: [
      [
        [79, 91],
        [97, 86],
        [116, 89],
        [128, 100],
        [130, 116],
        [128, 131],
        [109, 147],
        [86, 147], // the bulb
        [100, 151],
        [104, 164],
        [124, 178],
        [139, 179],
        [157, 176],
        [171, 165],
        [179, 146],
        [179, 124],
      ],
      [
        [179, 147], // crossbar
        [203, 152],
        [227, 147],
      ],
      [
        [228, 90], // અ's own stem
        [228, 118],
        [228, 147],
        [228, 170],
        [230, 192],
        [247, 201],
      ],
      [
        [286, 90], // the ા bar, full height, and its flick
        [286, 143],
        [291, 196],
        [306, 201],
      ],
    ],
  },

  uu: {
    note: 'the bowl runs the same way round as ઉ; then ઉ’s inner loop, then the tall bar',
    strokes: [
      [
        [215, 40], // where ઉ starts, heading left along the top
        [183, 35],
        [155, 42],
        [143, 50],
        [124, 75],
        [117, 96], // down the left
        [114, 130],
        [118, 162],
        [126, 180],
        [144, 198], // round the bottom
        [167, 204],
        [188, 202],
        [206, 188],
        [208, 168], // and up the inside of the right
        [198, 146],
        [195, 139],
      ],
      [
        [155, 90], // the inner loop, exactly ઉ's
        [175, 86],
        [191, 87],
        [206, 99],
        [208, 115],
        [201, 131],
        [195, 139],
        [183, 141],
        [172, 142],
      ],
      [
        [225, 45], // the tall bar, top to bottom
        [240, 57],
        [251, 73],
        [257, 135],
        [263, 197],
        [277, 201], // baseline flick
      ],
    ],
  },

  r: {
    note: 'one left-to-right sweep through the centre; lower arm, then stem last',
    strokes: [
      [
        [111, 106], // upper-left arm, from its tip
        [135, 101],
        [156, 107],
        [172, 121],
        [180, 134], // the centre
        [190, 135],
        [209, 127], // out along the right arm
        [235, 133],
        [251, 130],
        [260, 147], // into the hook
        [261, 163],
        [259, 175],
        [250, 182],
      ],
      [
        [176, 139], // lower-left arm, centre outwards
        [163, 149],
        [150, 157],
        [132, 168],
      ],
      [
        [196, 89], // the stem, top to bottom
        [196, 110],
        [196, 130],
        [196, 165],
        [199, 193],
        [215, 202], // baseline flick
      ],
    ],
  },

  l: {
    note: 'the body is one motion up the left and out along the tail; ticks after',
    strokes: [
      [
        [150, 183], // bottom-left tip
        [144, 175],
        [134, 159], // up the left
        [134, 133],
        [148, 121],
        [166, 120], // along the top-left arm
        [185, 128],
        [197, 129],
        [205, 123],
        [221, 119], // the centre
        [235, 122],
        [244, 131],
        [247, 154], // down the right
        [232, 176],
        [222, 182],
        [215, 192],
        [217, 211],
        [229, 220], // and out along the bottom tail
        [252, 220],
        [260, 217],
      ],
      [
        [221, 89], // the tick above the centre, top down
        [221, 103],
        [221, 118],
      ],
      [
        [186, 130], // the tick that hangs inside the bowl
        [187, 142],
        [182, 150],
      ],
    ],
  },

  jha: {
    note: 'C first (left part), then the right part (tick + stem + hook) as one stroke',
    strokes: [
      // Stroke 1: the C — top-left, curving right, ending bottom-left.
      // The video shows this is drawn first (left curve, then right hook).
      [
        [133, 114], // top of the C, left
        [164, 111], // top of the C, mid
        [188, 132], // right bulge, upper
        [191, 164], // right bulge, mid
        [183, 194], // right bulge, lower
        [153, 203], // bottom of the C, right of centre
        [129, 193], // bottom-left tip of the C
      ],
      // Stroke 2: the right part — short tick on top, straight stem down the
      // middle, then a hook that arcs right and back to the tail.
      [
        [222, 90], // top tick, tip
        [222, 125], // down the stem
        [233, 134], // hook junction, where the stem bends out
        [246, 158], // right bulge of the hook
        [238, 190], // lower right of the hook
        [231, 199], // tail end (bottom of the hook)
      ],
    ],
  },

  dha: {
    note: 'top bar left-to-right, diagonal to lower-left, up the left limb, right along the base, back up into the curl',
    strokes: [
      [
        [163, 93], // dot 1 — start at the top-left of the bar (was marginal off-ink in the auto pass)
        [193, 87], // across the top
        [213, 100], // right end of the top bar
        [211, 117], // turning back down
        [195, 135], // the inner curl, lower
        [175, 148], // curl exit
        [155, 162], // left limb, upper
        [152, 175], // left limb, mid
        [155, 192], // left limb, lower
        [175, 203], // bottom of the base, left
        [205, 204], // bottom of the base, mid
        [231, 199], // base end, right
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
