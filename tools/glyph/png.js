// A minimal PNG encoder — enough to write the per-letter proof sheets.
//
// The tool renders every glyph inside a headless browser and then reasons about
// the pixels in Node. Nothing in the pipeline needs to *read* a PNG (the ink is
// kept as run-length JSON, see render.js), so this is write-only: 8-bit RGB,
// no interlacing, filter 0 on every row. That is a couple of dozen lines on top
// of node:zlib and saves the project a native image dependency it would
// otherwise carry forever for a dev-time script.
import { deflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// CRC-32, table built once. The PNG spec's polynomial, nothing exotic.
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
};

/**
 * Encode an RGB image.
 *
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} rgb Row-major, 3 bytes per pixel, length width*height*3.
 * @returns {Buffer} PNG bytes.
 */
export const encodePng = (width, height, rgb) => {
  const stride = width * 3;
  // One extra byte per row for the filter type, which is always 0 (None):
  // these are flat two-colour proof sheets, so the win from real filtering is
  // not worth the code.
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/** A blank RGB buffer filled with one colour. */
export const blankRgb = (width, height, [r, g, b]) => {
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < rgb.length; i += 3) {
    rgb[i] = r;
    rgb[i + 1] = g;
    rgb[i + 2] = b;
  }
  return rgb;
};

export const setPixel = (rgb, width, height, x, y, [r, g, b]) => {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= width || iy >= height) return;
  const i = (iy * width + ix) * 3;
  rgb[i] = r;
  rgb[i + 1] = g;
  rgb[i + 2] = b;
};

export const drawDisc = (rgb, width, height, cx, cy, radius, colour) => {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) setPixel(rgb, width, height, cx + dx, cy + dy, colour);
    }
  }
};

export const drawLine = (rgb, width, height, x0, y0, x1, y1, colour) => {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    setPixel(rgb, width, height, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, colour);
  }
};
