/* Converts world-atlas 110m country polygons into SVG path strings in the
   map's 720×360 equirectangular space, and writes them as a static module.
   Run once; the app ships the output and never depends on topojson.

   Both inputs are build-time only and deliberately not app dependencies —
   install them in a scratch directory, run this from there, and point the
   output at app/src/lib/basemap.js:

     npm install world-atlas@2 topojson-client@3
     node gen-basemap.mjs ../app/app/src/lib/basemap.js

   110m is the coarsest Natural Earth tier. It is the right one: the map tops
   out around 23° of longitude across the frame, which is well inside what this
   resolution supports, and a finer tier would multiply the shipped bytes for
   detail nobody can zoom in far enough to see. */
import fs from "node:fs";
import { feature } from "topojson-client";

const W = 720, H = 360;
const topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-110m.json", "utf8"));
const fc = feature(topo, topo.objects.countries);

const px = (lng) => ((lng + 180) / 360) * W;
const py = (lat) => ((90 - lat) / 180) * H;
const r = (n) => Math.round(n * 10) / 10;

/** Shoelace area in projected units — used to drop specks that render as noise. */
function area(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}

const MIN_AREA = 0.35;   // projected px² — keeps small island nations, drops dust

/**
 * One ring → zero or more path strings.
 *
 * Rings that cross the antimeridian (Russia, Fiji, NZ's outliers) arrive with
 * longitudes that jump ±360 mid-ring. Drawn literally, the jump becomes a
 * horizontal streak across the entire map. So the ring is unwrapped into a
 * continuous longitude run first, then re-emitted at every ±360 offset that
 * lands inside the frame — which is also what makes the map look right when it
 * is panned past the edge.
 */
function ringToPaths(ring) {
  let lastLng = ring[0][0];
  let shift = 0;
  const unwrapped = ring.map(([lng, lat]) => {
    const d = lng + shift - lastLng;
    if (d > 180) shift -= 360;
    else if (d < -180) shift += 360;
    const out = [px(lng + shift), py(lat)];
    lastLng = lng + shift;
    return out;
  });

  if (area(unwrapped) < MIN_AREA) return [];

  // Drop vertices that move less than a third of a pixel from the last kept one.
  const pts = [];
  for (const p of unwrapped) {
    const q = [r(p[0]), r(p[1])];
    const last = pts[pts.length - 1];
    if (last && Math.abs(last[0] - q[0]) < 0.3 && Math.abs(last[1] - q[1]) < 0.3) continue;
    pts.push(q);
  }
  if (pts.length < 3) return [];

  const min = Math.min(...pts.map((p) => p[0]));
  const max = Math.max(...pts.map((p) => p[0]));
  const out = [];
  for (const dx of [-W, 0, W]) {
    if (max + dx < 0 || min + dx > W) continue;
    out.push(`M${pts.map((p) => `${r(p[0] + dx)} ${p[1]}`).join("L")}Z`);
  }
  return out;
}

const paths = [];
for (const f of fc.features) {
  const g = f.geometry;
  if (!g) continue;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  const parts = [];
  for (const poly of polys) {
    for (const ring of poly) parts.push(...ringToPaths(ring));
  }
  if (parts.length) paths.push(parts.join(""));
}

const body = `/* GENERATED — world-atlas 110m country polygons, projected into the map's
   720×360 equirectangular space (see lib/regions.js \`project\`) and rounded to
   0.1px. Regenerate with scripts/gen-basemap.mjs; do not hand-edit.

   One entry per country, so borders read as borders. Coordinates are already in
   map space, which is why the map needs no projection library at runtime. */
export const WORLD_PATHS = ${JSON.stringify(paths)};
export default WORLD_PATHS;
`;

fs.writeFileSync(process.argv[2], body);
console.log(`${paths.length} countries, ${(body.length / 1024).toFixed(0)} KB`);
