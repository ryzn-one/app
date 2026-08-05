import { deflateSync } from "node:zlib";
import { writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Regenerates the browser favicons — the PNG set and the bundled .ico.
 *
 * The shipped files were the single-diamond "atom" from the kit, so every tab,
 * bookmark and dashboard that reads a favicon showed a mark nobody recognises
 * as Ryzn. These are the real logo: the three ascending diamonds, same purple
 * squircle as the app icon, just with tighter padding so the small diamond
 * still lands on a pixel at 16px.
 *
 * Same hand-rolled rasteriser as make-maskable-icon.mjs — the art is three
 * axis-aligned diamonds on a rounded square, so `|dx| + |dy| <= r` and a
 * corner-radius test are the whole renderer.
 *
 *   node scripts/make-favicons.mjs
 */

const SIZES = [16, 32, 48, 64];
const ICO_SIZES = [16, 32, 48];
const SAMPLES = 4;              // per axis; 16 samples/pixel
const BG = [0x5b, 0x4f, 0xcf];  // --purple
const FG = [0xff, 0xff, 0xff];
const RADIUS = 120.32 / 512;    // squircle corner, from icon/svg/ryzn-app-icon.svg
const PADDING = 0.14;           // the 1024px app icon uses 0.2; too much at 16px

/* Diamond centres and radii from logo/svg/ryzn-mark-purple.svg, in its own
   89 x 81 glyph box. */
const GLYPH = [[11, 70, 11], [40, 48, 15], [69, 20, 20]];
const GLYPH_W = 89;
const GLYPH_H = 81;

function geometry(size) {
  const scale = ((1 - 2 * PADDING) * size) / GLYPH_W;
  const originX = (size - GLYPH_W * scale) / 2;
  const originY = (size - GLYPH_H * scale) / 2;
  return {
    radius: RADIUS * size,
    diamonds: GLYPH.map(([x, y, r]) => ({
      cx: originX + x * scale,
      cy: originY + y * scale,
      r: r * scale,
    })),
  };
}

const inGlyph = (diamonds, x, y) =>
  diamonds.some((d) => Math.abs(x - d.cx) + Math.abs(y - d.cy) <= d.r);

/** Inside the squircle: only the four corner quadrants can fall outside. */
function inSquircle(size, radius, x, y) {
  const dx = Math.min(x, size - x);
  const dy = Math.min(y, size - y);
  if (dx >= radius || dy >= radius) return dx >= 0 && dy >= 0;
  const ox = radius - dx;
  const oy = radius - dy;
  return ox * ox + oy * oy <= radius * radius;
}

/** Coverage of a shape over one pixel, 0..1 — this is the whole antialiaser. */
function coverage(px, py, hit) {
  let hits = 0;
  for (let sy = 0; sy < SAMPLES; sy++) {
    for (let sx = 0; sx < SAMPLES; sx++) {
      if (hit(px + (sx + 0.5) / SAMPLES, py + (sy + 0.5) / SAMPLES)) hits++;
    }
  }
  return hits / (SAMPLES * SAMPLES);
}

/* One scanline per row, each prefixed with filter type 0 (None). Alpha comes
   from the squircle so the corners stay transparent, not white. */
function rasterise(size) {
  const { radius, diamonds } = geometry(size);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let i = 0;
  for (let y = 0; y < size; y++) {
    raw[i++] = 0;
    for (let x = 0; x < size; x++) {
      const glyph = coverage(x, y, (sx, sy) => inGlyph(diamonds, sx, sy));
      for (let c = 0; c < 3; c++) raw[i++] = Math.round(BG[c] + (FG[c] - BG[c]) * glyph);
      raw[i++] = Math.round(255 * coverage(x, y, (sx, sy) => inSquircle(size, radius, sx, sy)));
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

function png(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rasterise(size), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* A .ico is a directory of images; PNG frames are legal and are what the
   previous file used, so nothing new is asked of any browser here. */
function ico(frames) {
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2);              // type: icon
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header[e] = size === 256 ? 0 : size;
    header[e + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, e + 4);        // colour planes
    header.writeUInt16LE(32, e + 6);       // bits per pixel
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...frames.map((f) => f.data)]);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rendered = new Map(SIZES.map((size) => [size, png(size)]));
const bundle = ico(ICO_SIZES.map((size) => ({ size, data: rendered.get(size) })));

/* The kit lives in two trees — site/ serves the marketing pages, app/public/
   is what Vite copies under /app/. Both need the same files, and each tree also
   keeps a favicon.ico at its root because browsers request /favicon.ico blind. */
const files = [];
for (const base of ["site", "app/public"]) {
  const tree = join(root, ...base.split("/"));
  const kit = join(tree, "branding", "ryzn-brand-kit", "icon");
  for (const size of SIZES) files.push([join(kit, "png", `favicon-${size}.png`), rendered.get(size)]);
  files.push([join(kit, "favicon.ico"), bundle]);
  files.push([join(tree, "favicon.ico"), bundle]);
}

for (const [target, data] of files) {
  if (!existsSync(dirname(target))) {
    console.warn(`skipped (no such folder): ${target}`);
    continue;
  }
  writeFileSync(target, data);
  console.log(`wrote ${target} (${data.length} bytes)`);
}
