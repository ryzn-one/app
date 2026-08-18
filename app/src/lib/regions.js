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
