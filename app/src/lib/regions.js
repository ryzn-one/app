/* ————————————————— REGIONS —————————————————

   Two things live here and nothing else does: the projection that turns a
   lat/lng into a point on the map's SVG, and `rollUp`, which is the rule that
   keeps a city bucket from ever pointing at one person.

   Everything in this file is pure. The map component decides how a bucket
   looks; this decides what a bucket is allowed to be.
*/

/**
 * The smallest number of people a bucket may name.
 *
 * A city with four mentees in it is not a statistic, it is close to a name —
 * especially on the High school track, where "1 mentee in Kelowna" next to a
 * tappable list is most of an identification. Cities under this threshold lose
 * their own point on the map and fold into their parent region.
 *
 * Five is the conventional floor for this kind of disclosure control. It is a
 * product decision as much as a safety one, so it lives as a named constant
 * rather than buried in the comparison below.
 */
export const MIN_BUCKET = 5;

/**
 * Equirectangular: longitude maps straight to x, latitude straight to y.
 *
 * The simplest projection there is, and the correct one for this screen. The
 * map here is a filter control, not an atlas — nothing is measured off it, so
 * area distortion toward the poles costs nothing, and the inverse is one
 * subtraction per axis when a click has to become a region.
 */
export const project = (lat, lng, w, h) => ({
  x: ((Number(lng) + 180) / 360) * w,
  y: ((90 - Number(lat)) / 180) * h,
});

/**
 * k-anonymity over the city buckets.
 *
 * Anything under `min` is merged into its parent region and loses its own
 * point. The merged bucket keeps the full count, so the numbers on the map
 * still sum to the roster — dropping the people would make the map lie about
 * how many mentees exist. Only *where* they are is coarsened, which is the part
 * that carries the risk.
 *
 * Returns the buckets that survived plus `foldedCities`, so the UI can say
 * "3 cities rolled up" rather than silently showing a different map than the
 * data supports.
 */
export function rollUp(cities = [], min = MIN_BUCKET) {
  const kept = [];
  const parents = new Map();
  let foldedCities = 0;
  let orphaned = 0;

  for (const c of cities) {
    const count = Number(c.count) || 0;
    if (count <= 0) continue;

    if (count >= min) {
      kept.push({
        id: c.id,
        kind: "city",
        name: c.city,
        sub: c.region || c.country || null,
        lat: c.lat,
        lng: c.lng,
        count,
      });
      continue;
    }

    /* Too thin to name. Fold it up. A city with no declared parent has nowhere
       safe to go, so its people go uncounted on the map rather than get a
       parent invented for them. */
    foldedCities += 1;
    const p = c.parent;
    if (!p) { orphaned += count; continue; }

    const prev = parents.get(p.id);
    if (prev) prev.count += count;
    else parents.set(p.id, { id: p.id, kind: "region", name: p.name, sub: c.country || null, lat: p.lat, lng: p.lng, count });
  }

  /* A parent that only ever collected folded cities can itself land under the
     threshold. Applying the rule once is not enough — it has to hold for the
     bucket the roll-up produced too, or the fold just relocates the problem. */
  const rolled = [];
  for (const b of parents.values()) {
    if (b.count >= min) rolled.push(b);
    else orphaned += b.count;
  }

  const buckets = [...kept, ...rolled].sort((a, b) => b.count - a.count);
  const placed = buckets.reduce((n, b) => n + b.count, 0);

  /* `unplaced` is people the map cannot show anywhere without breaking the
     rule. The UI names them ("+7 elsewhere") instead of quietly shrinking the
     total, so the map and the list never disagree about how many exist. */
  return { buckets, foldedCities, placed, unplaced: orphaned };
}

/** Total people across the raw city rows, mapped or not. */
export const totalOf = (cities = []) =>
  cities.reduce((n, c) => n + (Number(c.count) || 0), 0);

/* ————————————————— MOCK —————————————————

   Stand-in for `GET /api/roster?facets=region`, which does not exist yet. The
   shape is the contract: the endpoint returns city rows with a parent region,
   and the client applies `rollUp` — never the other way round. Doing the
   threshold server-side would be stronger, and is the right move once the
   profile field ships; until then this at least keeps the rule in one place.

   Deliberately includes cities under MIN_BUCKET so the fold is visible in the
   demo rather than something you have to take on faith.
*/
const CA = { id: "ca-on", name: "Ontario", lat: 50.0, lng: -85.0 };
const UK = { id: "uk-eng", name: "England", lat: 52.4, lng: -1.5 };
const US_NE = { id: "us-ne", name: "Northeast US", lat: 42.5, lng: -74.5 };
const IN_MH = { id: "in-mh", name: "Maharashtra", lat: 19.5, lng: 75.5 };
const CA_BC = { id: "ca-bc", name: "British Columbia", lat: 53.7, lng: -124.0 };

export const MOCK_CITIES = [
  { id: "toronto",   city: "Toronto",   region: "Ontario",     country: "Canada",        lat: 43.65, lng: -79.38, count: 34, parent: CA },
  { id: "london",    city: "London",    region: "England",     country: "UK",            lat: 51.51, lng: -0.13,  count: 28, parent: UK },
  { id: "nyc",       city: "New York",  region: "New York",    country: "USA",           lat: 40.71, lng: -74.01, count: 26, parent: US_NE },
  { id: "mumbai",    city: "Mumbai",    region: "Maharashtra", country: "India",         lat: 19.08, lng: 72.88,  count: 21, parent: IN_MH },
  { id: "lagos",     city: "Lagos",     region: "Lagos",       country: "Nigeria",       lat: 6.52,  lng: 3.38,   count: 17, parent: null },
  { id: "singapore", city: "Singapore", region: null,          country: "Singapore",     lat: 1.35,  lng: 103.82, count: 14, parent: null },
  { id: "berlin",    city: "Berlin",    region: "Berlin",      country: "Germany",       lat: 52.52, lng: 13.40,  count: 12, parent: null },
  { id: "sydney",    city: "Sydney",    region: "NSW",         country: "Australia",     lat: -33.87, lng: 151.21, count: 11, parent: null },
  { id: "sf",        city: "San Francisco", region: "California", country: "USA",        lat: 37.77, lng: -122.42, count: 9, parent: null },
  { id: "nairobi",   city: "Nairobi",   region: "Nairobi",     country: "Kenya",         lat: -1.29, lng: 36.82,  count: 8,  parent: null },
  { id: "saopaulo",  city: "São Paulo", region: "São Paulo",   country: "Brazil",        lat: -23.55, lng: -46.63, count: 7, parent: null },
  /* Under the floor — these fold into Ontario / England rather than render. */
  { id: "ottawa",    city: "Ottawa",    region: "Ontario",     country: "Canada",        lat: 45.42, lng: -75.70, count: 4,  parent: CA },
  { id: "hamilton",  city: "Hamilton",  region: "Ontario",     country: "Canada",        lat: 43.26, lng: -79.87, count: 3,  parent: CA },
  /* Kelowna's parent is BC, which nothing else feeds — so the roll-up itself
     lands under the floor and these people go unplaced rather than getting a
     region invented for them. That path is the one worth having in the demo. */
  { id: "kelowna",   city: "Kelowna",   region: "BC",          country: "Canada",        lat: 49.89, lng: -119.50, count: 1, parent: CA_BC },
  { id: "leeds",     city: "Leeds",     region: "England",     country: "UK",            lat: 53.80, lng: -1.55,  count: 2,  parent: UK },
];

/**
 * Assigns a real roster row to a mock bucket, so the map can filter the list in
 * the demo. DELETE THIS the moment profiles carry a region.
 *
 * People have no location field anywhere in the schema today — not on the
 * profile, not in the roster projection. Without this the map would select a
 * region and the list underneath would not move, which reads as a broken
 * feature rather than a missing column. Deterministic on id so a row doesn't
 * jump cities between renders.
 *
 * The surface renders a DEMO DATA marker whenever this is what's driving the
 * filter. That marker is not decoration — a map that appears to filter real
 * people by real location is exactly the wrong thing to show a room.
 */
export function mockBucketFor(personId, buckets) {
  if (!buckets.length) return null;
  const s = String(personId ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return buckets[h % buckets.length];
}
