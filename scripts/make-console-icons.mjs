import { deflateSync } from "node:zlib";
import { writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Renders the founder console's icon set — the app mark in ink instead of
 * purple.
 *
 * The console is a route in the consumer document (/app/#/admin), so it had no
 * icons of its own: it inherited the purple squircle and the "Ryzn" install
 * name. Installing it from that route gave you a second home-screen entry the
 * browser had to name and draw itself, which is where the white letter "R"
 * tile sitting next to the purple icon came from.
 *
 * Same three ascending diamonds, same squircle, same padding rules as
 * make-favicons.mjs and make-maskable-icon.mjs — only the field colour changes,
 * so the console reads as Ryzn at a glance and still never gets mistaken for
 * the app people ship to mentees.
 *
 * Same hand-rolled rasteriser as those two: the art is three axis-aligned
 * diamonds on a rounded square, so `|dx| + |dy| <= r` and a corner-radius test
 * are the whole renderer.
 *
 *   node scripts/make-console-icons.mjs
 */

const SAMPLES = 4;              // per axis; 16 samples/pixel
const BG = [0x1a, 0x1a, 0x1a];  // --ink, the console's field
const FG = [0xff, 0xff, 0xff];
const RADIUS = 120.32 / 512;    // squircle corner, from icon/svg/ryzn-app-icon.svg

/* Diamond centres and radii from logo/svg/ryzn-mark-purple.svg, in its own
   89 x 81 glyph box. */
const GLYPH = [[11, 70, 11], [40, 48, 15], [69, 20, 20]];
const GLYPH_W = 89;
const GLYPH_H = 81;

/* Padding is the only thing that varies between the three jobs:
     0.14  favicons — the app icon's 0.2 loses the small diamond at 16px
     0.20  the app icon proper, matching icon/svg/ryzn-app-icon.svg
     0.27  maskable — artwork inside the safe circle, colour to all four edges */
const FAVICONS = [16, 32, 48, 64];
const ICO_SIZES = [16, 32, 48];
const APP_ICONS = [180, 192, 512];
const MASKABLE = 512;

function geometry(size, padding) {
  const scale = ((1 - 2 * padding) * size) / GLYPH_W;
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

/* One scanline per row, each prefixed with filter type 0 (None). Squircle
   icons take their alpha from the corner test so the corners stay transparent
   rather than white; a maskable icon is opaque throughout, which is the entire
   point of it. */
function rasterise(size, padding, squircle) {
  const { radius, diamonds } = geometry(size, padding);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let i = 0;
  for (let y = 0; y < size; y++) {
    raw[i++] = 0;
    for (let x = 0; x < size; x++) {
      const glyph = coverage(x, y, (sx, sy) => inGlyph(diamonds, sx, sy));
      for (let c = 0; c < 3; c++) raw[i++] = Math.round(BG[c] + (FG[c] - BG[c]) * glyph);
      raw[i++] = squircle
        ? Math.round(255 * coverage(x, y, (sx, sy) => inSquircle(size, radius, sx, sy)))
        : 255;
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

function png(size, padding, squircle = true) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rasterise(size, padding, squircle), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* A .ico is a directory of images; PNG frames are legal and are what the
   consumer favicon already ships, so nothing new is asked of any browser. */
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

/* The SVGs are the same geometry expressed the way the rest of the kit is, so
   a designer opening the folder finds a console mark next to the app mark
   instead of only PNGs they cannot edit. */
const hex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
function svg(padding, rounded) {
  const scale = (1 - 2 * padding) * 512 / GLYPH_W;
  const x = ((512 - GLYPH_W * scale) / 2).toFixed(2);
  const y = ((512 - GLYPH_H * scale) / 2).toFixed(2);
  const corner = rounded ? ` rx="${(RADIUS * 512).toFixed(2)}" ry="${(RADIUS * 512).toFixed(2)}"` : "";
  const paths = GLYPH.map(([cx, cy, r]) =>
    `<path d="M${cx}.00 ${cy - r}.00L${cx + r}.00 ${cy}.00L${cx}.00 ${cy + r}.00L${cx - r}.00 ${cy}.00Z" fill="${hex(FG)}"/>`
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512.00 512.00" fill="none">` +
    `<rect width="512" height="512"${corner} fill="${hex(BG)}"/>` +
    `<g transform="translate(${x} ${y}) scale(${scale.toFixed(4)})">${paths}</g></svg>\n`;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const favicons = new Map(FAVICONS.map((size) => [size, png(size, 0.14)]));
const bundle = ico(ICO_SIZES.map((size) => ({ size, data: favicons.get(size) })));
const appIcons = new Map(APP_ICONS.map((size) => [size, png(size, 0.2)]));
const maskable = png(MASKABLE, 0.27, false);

/* The kit lives in two trees — site/ serves the marketing pages, app/public/
   is what Vite copies under /app/. Both need the same files. */
const files = [];
for (const base of ["site", "app/public"]) {
  const kit = join(root, ...base.split("/"), "branding", "ryzn-brand-kit", "icon");
  for (const size of FAVICONS) files.push([join(kit, "png", `console-favicon-${size}.png`), favicons.get(size)]);
  for (const size of APP_ICONS) files.push([join(kit, "png", `ryzn-console-icon-${size}.png`), appIcons.get(size)]);
  files.push([join(kit, "png", `ryzn-console-maskable-${MASKABLE}.png`), maskable]);
  files.push([join(kit, "console.ico"), bundle]);
  files.push([join(kit, "svg", "ryzn-console-icon.svg"), Buffer.from(svg(0.2, true), "utf8")]);
  files.push([join(kit, "svg", "ryzn-console-icon-maskable.svg"), Buffer.from(svg(0.27, false), "utf8")]);
}

for (const [target, data] of files) {
  if (!existsSync(dirname(target))) {
    console.warn(`skipped (no such folder): ${target}`);
    continue;
  }
  writeFileSync(target, data);
  console.log(`wrote ${target} (${data.length} bytes)`);
}
