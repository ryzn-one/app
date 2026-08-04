import { deflateSync } from "node:zlib";
import { writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Regenerates the maskable app icon.
 *
 * A maskable icon is not "the app icon with rounded corners" — the launcher
 * supplies the corners. The shipped file was the same squircle as the `any`
 * icon, so Android rounded an already-rounded shape and left transparent
 * wedges at the corners. A maskable icon has to bleed colour to all four
 * edges and keep its artwork inside the centre 80% circle, which is what this
 * writes: a full-bleed purple square with the three diamonds untouched.
 *
 * Written by hand rather than rasterised from the SVG because the art is three
 * axis-aligned diamonds on a flat field — a renderer dependency to draw
 * `|dx| + |dy| <= r` would cost more than it explains.
 *
 *   node scripts/make-maskable-icon.mjs
 */

const SIZE = 512;
const SAMPLES = 4;              // per axis; 16 samples/pixel is plenty for straight edges
const BG = [0x5b, 0x4f, 0xcf];  // --purple
const FG = [0xff, 0xff, 0xff];

/* Geometry lifted from icon/svg/ryzn-app-icon-maskable.svg: the glyph group is
   translate(138.24 148.83) scale(2.6463) over diamonds centred at (11,70) r11,
   (40,48) r15 and (69,20) r20 in local units. */
const OFFSET = [138.24, 148.83];
const SCALE = 2.6463;
const DIAMONDS = [[11, 70, 11], [40, 48, 15], [69, 20, 20]].map(([x, y, r]) => ({
  cx: OFFSET[0] + x * SCALE,
  cy: OFFSET[1] + y * SCALE,
  r: r * SCALE,
}));

const inGlyph = (x, y) => DIAMONDS.some((d) => Math.abs(x - d.cx) + Math.abs(y - d.cy) <= d.r);

/** Coverage of the glyph over one pixel, 0..1 — this is the whole antialiaser. */
function coverage(px, py) {
  let hits = 0;
  for (let sy = 0; sy < SAMPLES; sy++) {
    for (let sx = 0; sx < SAMPLES; sx++) {
      if (inGlyph(px + (sx + 0.5) / SAMPLES, py + (sy + 0.5) / SAMPLES)) hits++;
    }
  }
  return hits / (SAMPLES * SAMPLES);
}

/* One scanline per row, each prefixed with filter type 0 (None). Opaque
   throughout — that opacity is the entire point of a maskable icon. */
function rasterise() {
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  let i = 0;
  for (let y = 0; y < SIZE; y++) {
    raw[i++] = 0;
    for (let x = 0; x < SIZE; x++) {
      const a = coverage(x, y);
      for (let c = 0; c < 3; c++) raw[i++] = Math.round(BG[c] + (FG[c] - BG[c]) * a);
      raw[i++] = 255;
    }
  }
  return raw;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
}

function png(raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = png(rasterise());

/* The kit lives in two trees — site/ serves the marketing pages, app/public/
   is what Vite copies under /app/. Both need the fixed file. */
const targets = ["site", "app/public"].map((base) =>
  join(root, ...base.split("/"), "branding", "ryzn-brand-kit", "icon", "png", "ryzn-maskable-512.png")
);

for (const target of targets) {
  if (!existsSync(dirname(target))) {
    console.warn(`skipped (no such folder): ${target}`);
    continue;
  }
  writeFileSync(target, out);
  console.log(`wrote ${target} (${out.length} bytes)`);
}
