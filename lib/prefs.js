/**
 * Preferences — notification, visibility and availability.
 *
 * **Identity-level, not orbit-scoped**, and that is a decision rather than an
 * omission: nobody should have to reconfigure whether they want streak reminders
 * once per company they work for and once per circle they join. A person has one
 * set of preferences and carries them everywhere, the same way they carry their
 * XP and their follows.
 *
 * In lib/ rather than beside the endpoint that writes them, because /api/me
 * reads them too — and importing a handler for a helper would drag that
 * handler's dependencies (the Blob SDK, in profile.js's case) into every
 * function that wanted the defaults.
 */

export const DEFAULT_PREFS = Object.freeze({
  // notifications
  streak: true,        // daily reminder
  notes: true,         // mentor notes / mentee activity — the label swaps by role
  sessions: true,      // session reminders
  posts: true,         // new posts from people you follow
  board: false,        // leaderboard movement — off by default; it is the noisiest
  // visibility
  badgeVis: true,      // badges visible to a manager, in a company orbit
  feedVis: true,       // wins on the cohort feed / Impact on the board
  discoverable: true,  // findable in Explore
  // availability
  avail: "Flexible",   // Mornings | Afternoons | Flexible
  /* §10.1's per-mentor escape hatch: an orbit's policy sets Apply as the
     default, and this lets one mentor opt out without the orbit changing for
     everyone else. */
  openDoor: false,
  /* The humane alternative to leaving: hidden from the deck, cohort intact. */
  paused: false,
});

export const AVAILABILITY = ["Mornings", "Afternoons", "Flexible"];
const AVAIL = new Set(AVAILABILITY);

/** Stored prefs with defaults filled in. Someone who signed up before a
    preference existed must read as its default, never as `undefined` — a toggle
    bound to `undefined` renders off, and the first tap then turns a live
    notification stream off rather than on. */
export const prefsOf = (profile) => ({ ...DEFAULT_PREFS, ...(profile?.prefs || {}) });

/**
 * A patch, merged onto what is stored. Known keys only, coerced — an unknown key
 * from a hand-rolled PATCH would otherwise persist and read back as a preference
 * nothing honours.
 */
export function cleanPrefs(input, current) {
  const out = prefsOf({ prefs: current });
  for (const key of Object.keys(DEFAULT_PREFS)) {
    if (input?.[key] === undefined) continue;
    out[key] = key === "avail"
      ? (AVAIL.has(input.avail) ? input.avail : out.avail)
      : !!input[key];
  }
  return out;
}
