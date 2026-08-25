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
        [133, 92, 'tip'], // hook tip, top left
        [152, 95],
        [156, 119], // down the left limb
        [159, 151],
        [172, 165], // bottom left of the bowl
        [197, 165], // along the bottom
        [222, 158], // the junction
        [222, 123], // rising
        [222, 89, 'tip'], // top of the right limb
      ],
      [
        [222, 158], // back at the junction
        [227, 196],
        [242, 201, 'tip'], // baseline flick
      ],
    ],
  },

  ka: {
    note: 'S and crossbar share 16px of centreline; automation split it into three',
    strokes: [
      [
        [210, 86, 'tip'], // top right tip
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
        [149, 193, 'tip'], // bottom left tip
      ],
      [
        [150, 159, 'tip'], // crossbar, left to right
        [164, 149],
        [182, 139],
        [198, 139],
        [219, 129],
        [231, 125, 'tip'],
      ],
    ],
  },

  kha: {
    note: 'NOTE (video 133-138s): ખ is TWO strokes, not the three the skeleton read. One motion draws the whole S body — top-left hook, down the left, across the bowl bottom, up the right of the bowl, through the centre curl and straight on out along the connector to the stem. Only then does the pen lift; the stem is one top-to-bottom motion past the baseline. The committed data had the connector as its own right-to-left crossbar (ક has a crossbar, ખ does not) and the stem as a third stroke, and its stem dots sat off the centreline.',
    strokes: [
      [
        [116, 89, 'tip'], // node 7: the hook tip, top left
        [127, 91], // round the hook
        [134, 105],
        [136, 123], // down the left limb
        [139, 151],
        [147, 161], // into the bottom-left of the bowl
        [157, 166],
        [169, 166], // along the bowl bottom
        [182, 162],
        [189, 154], // up the right of the bowl
        [193, 141], // node 2: the centre junction
        [193, 116], // node 9: up into the centre curl — in the video the pen
        //            loops here; the font draws the loop as a stub, so the one
        //            centreline is walked up and back rather than round
        [193, 141], // back at the junction
        [217, 144], // out along the connector, left to right
        [241, 139], // node 1: arriving where the stem will cross. NO pen-up
        //            until here — this is the whole of stroke 1
      ],
      [
        [242, 90, 'tip'], // node 8: top of the stem
        [242, 114],
        [241, 139], // straight down across the connector
        [242, 166],
        [244, 192],
        [252, 200], // and out along the foot, past the baseline
        [261, 201, 'tip'], // node 10
      ],
    ],
  },

  pha: {
    note: 'S through the crossing, then the pigtail; crossbar last, left to right',
    strokes: [
      [
        [210, 86, 'tip'], // top right tip
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
        [212, 240, 'tip'], // tail exits right
      ],
      [
        [150, 159, 'tip'], // crossbar, left to right
        [164, 149],
        [182, 139],
        [198, 139],
        [219, 129],
        [231, 125, 'tip'],
      ],
    ],
  },

  ra: {
    note: 'one stroke, not two: the knot doubles back rather than lifting',
    strokes: [
      [
        [154, 97, 'tip'], // top left tip
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
        [228, 201, 'tip'], // bottom right
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
        [219, 130, 'tip'],
      ],
      [
        [220, 90, 'tip'], // the stem, top to bottom
        [220, 130],
        [220, 170],
        [227, 196],
        [239, 201, 'tip'],
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
        [108, 91, 'tip'], // top-left tip
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
        [256, 147, 'tip'],
      ],
      [
        [257, 90, 'tip'], // the stem, top to bottom
        [257, 118],
        [257, 147],
        [257, 170],
        [259, 192],
        [276, 201, 'tip'], // baseline flick
      ],
    ],
  },

  aa: {
    note: 'અ shifted 29px left, then the ા bar last — "draw અ, then the long bar"',
    strokes: [
      [
        [79, 91, 'tip'],
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
        [227, 147, 'tip'],
      ],
      [
        [228, 90, 'tip'], // અ's own stem
        [228, 118],
        [228, 147],
        [228, 170],
        [230, 192],
        [247, 201, 'tip'],
      ],
      [
        [286, 90, 'tip'], // the ા bar, full height, and its flick
        [286, 143],
        [291, 196],
        [306, 201, 'tip'],
      ],
    ],
  },

  uu: {
    note: 'the bowl runs the same way round as ઉ; then ઉ’s inner loop, then the tall bar',
    strokes: [
      [
        [215, 40, 'tip'], // where ઉ starts, heading left along the top
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
        [225, 45, 'tip'], // the tall bar, top to bottom
        [240, 57],
        [251, 73],
        [257, 135],
        [263, 197],
        [277, 201, 'tip'], // baseline flick
      ],
    ],
  },

  r: {
    note: 'one left-to-right sweep through the centre; lower arm, then stem last',
    strokes: [
      [
        [111, 106, 'tip'], // upper-left arm, from its tip
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
        [250, 182, 'tip'],
      ],
      [
        [176, 139], // lower-left arm, centre outwards
        [163, 149],
        [150, 157],
        [132, 168, 'tip'],
      ],
      [
        [196, 89, 'tip'], // the stem, top to bottom
        [196, 110],
        [196, 130],
        [196, 165],
        [199, 193],
        [215, 202, 'tip'], // baseline flick
      ],
    ],
  },

  l: {
    note: 'the body is one motion up the left and out along the tail; ticks after',
    strokes: [
      [
        [150, 183, 'tip'], // bottom-left tip
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
        [260, 217, 'tip'],
      ],
      [
        [221, 89, 'tip'], // the tick above the centre, top down
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
    note: 'C (blue) first, right hook (red) second, top-right tick (green) LAST — 3 strokes. Anchors from skeleton dump: nod7=(222,90) tick-top, j1=(221,126) junction, n8=(133,114) C-top-tip, n9=(127,187) C-bot-tip, j3=(243,142), n10=(231,199) hook-tail.',
    strokes: [
      // Stroke 1 (C): top-left tip → right → down right side → along bottom → bottom-left tip
      [
        [133, 114, 'tip'], // node 8: top-left tip of the C (start)
        [153, 110], // top arc, left of centre
        [173, 115], // top arc, right of centre
        [182, 124], // junction 0: top-right of the C
        [191, 133], // junction 2: where the right limb begins
        [190, 149], // down the right side of the C
        [183, 193], // lower right of the C
        [173, 202], // bottom of the C, right of centre
        [156, 204], // bottom of the C, left of centre
        [138, 198], // towards bottom-left
        [135, 196], // node 6: bottom-left junction
        [127, 187, 'tip'], // node 9: bottom-left tip of the C (end)
      ],
      // Stroke 2 (right hook): from junction 1 (below the tick), right → down → tail
      [
        [221, 126], // junction 1: start, just below the tick
        [231, 131], // heading right
        [240, 137], // entering the hook bulge
        [245, 146], // right side, upper
        [248, 164], // rightmost point of the hook
        [244, 182], // lower right, curve back
        [234, 197], // approaching the tail
        [231, 199, 'tip'], // node 10: tail end (bottom of the hook)
      ],
      // Stroke 3 (tick): top of tick → down to junction 1, drawn LAST
      [
        [222, 90, 'tip'],  // node 7: top of the tick (start)
        [222, 107], // mid tick
        [222, 125], // bottom of the tick, meets junction 1 (end)
      ],
    ],
  },

  dha: {
    note: 'top bar left-to-right (start ON the bar), down the right, diagonally across the knot, down the left limb (inside the bowl), along the bottom of the bowl, up the right limb and back into the curl to close. Knot region gets more waypoints this time.',
    strokes: [
      [
        [168, 84, 'tip'],  // top of bar, left side — ON the bar ink (was off-ink before)
        [185, 84],  // mid-bar
        [203, 87],  // right end of bar (top of stroke 1, on the centreline)
        [211, 103], // down the right limb
        [209, 117], // right limb, just above the knot crossing
        [202, 127], // entering the knot from the right, on the diagonal (was too few anchors here)
        [195, 132], // knot centre — the exact crossing the child must trace
        [186, 136], // knot exit, going left (junction 2)
        [175, 144], // on the diagonal, mid-left of the crossing (inside the bowl wall)
        [162, 152], // knot exit left, joining the left limb (junction 3)
        [154, 165], // left limb, just below the crossing — upper bowl wall
        [152, 176], // left limb, mid — outer bowl wall
        [155, 188], // left limb, lower — inner bowl wall
        [160, 193], // bottom-left of the bowl (junction 6)
        [172, 201], // along the bowl bottom, left
        [186, 204], // bowl bottom, centre (junction 8)
        [200, 203], // bowl bottom, right (junction 7)
        [213, 193], // up the right limb, approaching the right wall of the bowl
        [224, 180], // right limb, mid (junction 4)
        [214, 167], // right limb, upper — closing back into the knot from the right
        [198, 162], // inside the bowl opening, heading left into the stroke 3 diagonal
        [180, 155], // final approach into the knot from the bowl — stroke ends here,
        //         // meeting the earlier pass at ~ (175,144); the child sees the same
        //         // knot visited twice (once from the top diagonal, once from the bowl)
      ],
    ],
  },

  dha2: {
    note: 'curl and bowl are one stroke that rises up the stem; tick and flick after',
    strokes: [
      [
        [164, 79, 'tip'], // top of the curl
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
        [226, 89, 'tip'], // top of the stem
      ],
      [
        [157, 131], // the tick, left to right
        [171, 129],
        [184, 128, 'tip'],
      ],
      [
        [226, 169], // back at the junction
        [229, 193],
        [246, 201, 'tip'], // baseline flick
      ],
    ],
  },
};
