// A 3x5 bitmap digit, drawn at 2x. The proof sheets are only useful if the
// stroke order is readable off them, and pulling in a font renderer to write
// "11" next to a dot would be absurd.
import { setPixel } from './png.js';

const GLYPHS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '001', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

const SCALE = 2;

export const drawNumber = (rgb, width, height, value, x, y, colour) => {
  let cursor = x;
  for (const character of String(value)) {
    const rows = GLYPHS[character];
    if (!rows) continue;
    rows.forEach((row, ry) => {
      [...row].forEach((bit, rx) => {
        if (bit !== '1') return;
        for (let sy = 0; sy < SCALE; sy++) {
          for (let sx = 0; sx < SCALE; sx++) {
            setPixel(rgb, width, height, cursor + rx * SCALE + sx, y + ry * SCALE + sy, colour);
          }
        }
      });
    });
    cursor += 4 * SCALE;
  }
};
