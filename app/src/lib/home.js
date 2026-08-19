/* ----------------- HOME VIEW -----------------

   Where the map should be pointing the moment it opens.

   A world map that opens on the whole world opens on nothing: every bubble is
   four pixels wide and the place you actually live is a smudge. So the map
   starts over the viewer's own continent and lets them zoom out if they want
   the rest.

   The viewer's location is not a field on the profile, nothing in the schema
   carries one today. The browser's IANA timezone is, though, and it is exactly
   as coarse as this needs to be: `America/Toronto` says North America, which is
   the whole question being asked. No permission prompt, no geolocation API, no
   network call, and nothing about it is stored or sent anywhere.

   When a location field does land on profiles, `homeView` gains an argument and
   the timezone becomes the fallback rather than the answer.
*/

/** Continent frames: centre plus how many degrees of longitude to show. */
export const HOME_VIEWS = {
  na:     { name: "North America", lat: 41,  lng: -97,  span: 120 },
  sa:     { name: "South America", lat: -16, lng: -60,  span: 80 },
  eu:     { name: "Europe",        lat: 49,  lng: 13,   span: 62 },
  af:     { name: "Africa",        lat: 3,   lng: 20,   span: 95 },
  asia:   { name: "Asia",          lat: 28,  lng: 88,   span: 120 },
  oc:     { name: "Oceania",       lat: -26, lng: 146,  span: 80 },
  world:  { name: "the world",     lat: 18,  lng: 5,    span: 360 },
};

/* `America/*` is two continents. These are the zones on the southern half of
   it, everything else under that prefix is North America, which is the right
   default for a prefix this lopsided. */
const SOUTH_AMERICAN = /^America\/(Argentina|Sao_Paulo|Bahia|Fortaleza|Recife|Belem|Manaus|Cuiaba|Campo_Grande|Araguaina|Maceio|Noronha|Santarem|Porto_Velho|Boa_Vista|Rio_Branco|Eirunepe|Lima|Bogota|Santiago|Caracas|La_Paz|Asuncion|Montevideo|Guayaquil|Cayenne|Paramaribo|Guyana|Punta_Arenas)/;

/* Prefixes, longest match first. Istanbul and Moscow sit under `Europe/`
   already, so the prefix is doing the work almost everywhere. */
const BY_PREFIX = [
  ["Europe/", "eu"],
  ["Africa/", "af"],
  ["Asia/", "asia"],
  ["Australia/", "oc"],
  ["Pacific/", "oc"],
  ["Antarctica/", "world"],
  ["Atlantic/", "eu"],
  ["Indian/", "asia"],
  ["America/", "na"],
  ["US/", "na"],
  ["Canada/", "na"],
  ["Mexico/", "na"],
  ["Brazil/", "sa"],
  ["Chile/", "sa"],
];

/** Continent key for an IANA timezone string. */
export function homeRegionFor(tz) {
  const z = String(tz || "");
  if (!z) return "world";
  if (SOUTH_AMERICAN.test(z)) return "sa";
  for (const [prefix, id] of BY_PREFIX) if (z.startsWith(prefix)) return id;
  return "world";
}

/**
 * The frame the map opens on.
 *
 * Wrapped in a try because `resolvedOptions` is the one call here that can
 * throw on an old or locked-down browser, and a map that fails to render is a
 * far worse outcome than a map that opens on the wrong continent.
 */
export function homeView() {
  let tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* fall through to world */ }
  const id = homeRegionFor(tz);
  return { id, ...HOME_VIEWS[id] };
}
