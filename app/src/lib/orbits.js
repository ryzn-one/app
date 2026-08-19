import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchOrbits } from "./auth-client.js";

/**
 * Orbits, client side.
 *
 * One app, one identity, one follow graph. XP, tier, badges, streak and follows
 * belong to a person and travel everywhere; an orbit is a space that identity
 * moves through. There are three kinds, public, community, private, and every
 * behavioural difference between them is a value in the policy object the server
 * resolves and ships on each orbit.
 *
 * **What this file may and may not do.** It holds copy, labels and the switcher's
 * state. It does *not* resolve policy, fill in defaults or infer a rule from a
 * kind: `orbit.policy` arrives resolved from /api/orbits and is the only source.
 * A second resolution order living here is how the console and the phone start
 * disagreeing about what the rules are.
 *
 * Screens branch on **policy values**, never on `orbit.kind`. Copy and labelling
 * may branch on kind, that is presentation, and that is what `COPY` below is.
 */

export const PUBLIC_ORBIT_ID = "public";

/**
 * Everything that legitimately differs by kind: what the space is called, what
 * its events are called, what joining it means. No behaviour here, if a screen
 * needs a *decision* rather than a word, it belongs in the policy object.
 */
export const COPY = {
  public: {
    noun: "orbit",
    space: "the public orbit",
    events: "Meets",
    board: "Global leaderboard",
    joinVerb: "Join Ryzn",
    runBy: "Run by Ryzn",
    leaveWarning: "You can't leave the public orbit, it's where everyone starts.",
  },
  community: {
    noun: "circle",
    space: "this circle",
    events: "Circle events",
    board: "Circle leaderboard",
    joinVerb: "Join circle",
    runBy: "Run by its creator",
    leaveWarning: "Leaving the circle keeps your XP, badges and follows. Only your progress here ends.",
  },
  private: {
    noun: "orbit",
    space: "your company orbit",
    events: "Sessions",
    board: "Org leaderboard",
    joinVerb: "Join with your invite",
    runBy: "Run by your organisation",
    leaveWarning: "Leaving keeps your XP, badges and follows, they're yours, not your employer's. Only your progress in this orbit ends.",
  },
};

export const copyFor = (orbit) => COPY[orbit?.kind] || COPY.public;

/**
 * The policy object, in the words a person reads.
 *
 * Every console row and every read-only filter row draws from this one map, so
 * the switch an HR admin flips and the explanation a mentee sees for why their
 * deck is narrow are guaranteed to describe the same rule.
 */
export const POLICY_COPY = {
  matchMode: {
    label: "How people match",
    sub: "Open adds a mentor instantly. Apply asks a question first, and the mentor approves.",
    valueLabel: (v) => (v === "Apply" ? "Apply to join" : "Open, add instantly"),
  },
  cap: {
    label: "Mentor seats",
    sub: "How many mentors one person can hold in this orbit at once.",
    valueLabel: (v) => `${v} ${v === 1 ? "seat" : "seats"}`,
  },
  chatGate: {
    label: "Chat unlocks after Stage 1",
    sub: "Messaging opens once the first track is finished. The tab stays visible and padlocked until then.",
    valueLabel: (v) => (v ? "Earned" : "Open from day one"),
  },
  levelGate: {
    label: "Staff+ mentors only",
    sub: "Hides mentors below Staff+ from the deck. Seats are graded in People.",
    valueLabel: (v) => (v ? "Staff+ only" : "Everyone"),
  },
  crossDiv: {
    label: "Match across divisions",
    sub: "Off keeps people inside their own team.",
    valueLabel: (v) => (v ? "Across the org" : "Own division only"),
  },
  boardScope: {
    label: "Leaderboard",
    sub: "Who a member is ranked against.",
    valueLabel: (v) => `${v} board`,
  },
};

/* ----- identity -----
   Tier is derived from XP wherever it is shown and never stored; the server
   derives it the same way from the same thresholds. XP is portable, so a stored
   tier would be a number that can disagree with the ledger it came from. */

export const TIER_THRESHOLDS = { Pathfinder: 1200, Architect: 2500, Luminary: 4000 };

export const tierFor = (xp) => {
  const n = Number(xp) || 0;
  return n >= 4000 ? "Luminary" : n >= 2500 ? "Architect" : n >= 1200 ? "Pathfinder" : "Scout";
};

export const nextTier = (xp) => {
  const n = Number(xp) || 0;
  const next = Object.entries(TIER_THRESHOLDS).find(([, at]) => at > n);
  return next ? { name: next[0], at: next[1], remaining: next[1] - n } : null;
};

/* Which orbit the person was last in. A preference, not state, losing it drops
   someone into the public orbit, which is a place they are definitely a member
   of, rather than into an error. */
const LAST_ORBIT_KEY = "ryzn.orbit";
const readLast = () => {
  try { return window.localStorage.getItem(LAST_ORBIT_KEY); } catch { return null; }
};
const writeLast = (id) => {
  try { window.localStorage.setItem(LAST_ORBIT_KEY, id); } catch { /* private mode, the default is fine */ }
};

/**
 * The orbit switcher's state, and the single place `policy` enters the app.
 *
 * Resolved once here and passed down as a prop. No screen reads policy from a
 * global and no screen mutates it, the only writers are the two consoles, and
 * they write it through /api/orbits and refresh from the answer.
 *
 * The highest-value assertion in the whole product is that changing a policy in
 * a console changes a mentee's screen without a reload. `refresh` is what makes
 * that true: every console write returns the caller's whole orbit list, and the
 * shell re-renders off it.
 */
export function useOrbits(enabled = true) {
  const [orbits, setOrbits] = useState([]);
  const [orbitId, setOrbitId] = useState(() => readLast());
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchOrbits();
      const list = data.orbits || [];
      setOrbits(list);
      /* Where someone lands the first time, before they have ever switched:
         their company orbit if they have one, otherwise the public orbit. An
         employee opening the app is at work, dropping them into the public
         orbit and making them find their employer would be a worse first screen
         than the one they had before orbits existed. */
      setOrbitId((current) => {
        if (current && list.some((o) => o.id === current)) return current;
        return (list.find((o) => o.kind === "private") || list[0])?.id ?? PUBLIC_ORBIT_ID;
      });
      setError(null);
      return list;
    } catch (err) {
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    load();
  }, [enabled, load]);

  /* An id that is no longer one of ours, a circle left in another tab, an orbit
     archived by its owner, lands on the public orbit rather than on nothing.
     Falling back rather than erroring is the same rule the server applies. */
  const orbit = useMemo(
    () => orbits.find((o) => o.id === orbitId) || orbits.find((o) => o.id === PUBLIC_ORBIT_ID) || null,
    [orbits, orbitId]
  );

  const switchTo = useCallback((id) => {
    setOrbitId(id);
    writeLast(id);
  }, []);

  /* Consoles hand back the full list they just wrote, so a policy change is one
     round trip and the switcher never shows a stale rule beside a fresh one. */
  const applyOrbits = useCallback((next) => {
    if (Array.isArray(next)) setOrbits(next);
  }, []);

  return {
    orbits,
    orbit,
    orbitId: orbit?.id ?? PUBLIC_ORBIT_ID,
    policy: orbit?.policy ?? null,
    loading,
    error,
    switchTo,
    refresh: load,
    applyOrbits,
  };
}
