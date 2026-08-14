import { ObjectId } from "mongodb";
import { collections } from "./db.js";

/**
 * Orbits — the v2 spine.
 *
 * One app, one identity, one follow graph. XP, tier, badges, streak and follows
 * belong to a person and travel everywhere. An *orbit* is a space that identity
 * moves through, and there are exactly three kinds:
 *
 *   public     Ryzn itself. Everyone is in it, nobody administers it.
 *   community  A creator's circle. Free to join, the creator sets the rules.
 *   private    A company orbit. Invite/SSO only, HR sets the rules.
 *
 * **The rule that makes or breaks the build:** behaviour branches on *policy
 * values*, never on `orbit.kind`. If a screen or an endpoint wants to know the
 * kind in order to decide what to *do*, that decision belongs in the policy
 * object below instead. Kind may still decide copy and labelling — that is
 * presentation, not behaviour.
 *
 * Storage: every non-public orbit is one document in `orgs`, discriminated by
 * `kind`, and membership is one document per (orbit, person) in `org_members`.
 * Reusing those two collections is deliberate — a single membership table is
 * what makes "one identity in many orbits" a query rather than a merge. Orbit
 * documents written before v2 have no `kind` and read as `private`, which is
 * exactly what they were.
 *
 * The public orbit has no document. It is synthesised by `PUBLIC_ORBIT` because
 * it has no owner, no membership row and no editable policy — inventing a row
 * for it would create a thing an admin could then be handed the keys to.
 */

export const ORBIT_KINDS = new Set(["public", "community", "private"]);

/** Orbit documents predate `kind`; those are all company orbits. */
export const kindOf = (orbit) => (ORBIT_KINDS.has(orbit?.kind) ? orbit.kind : "private");

/** The synthetic id of the public orbit. Never an ObjectId — it has no document. */
export const PUBLIC_ORBIT_ID = "public";

/* ————————————————— the policy object —————————————————
 *
 *   matchMode   "Open"    instant add
 *               "Apply"   qualify, then the mentor approves
 *   cap         mentor seats one mentee may hold *in this orbit*
 *   chatGate    DMs unlock only once Stage 1 is complete
 *   levelGate   hide mentors below Staff+ from the deck
 *   crossDiv    allow matching across divisions
 *   boardScope  which leaderboard a member sees
 *
 * Six fields, and every behavioural difference between the three orbit kinds is
 * one of them. Adding a seventh is how the product stays one codebase; adding a
 * `kind` check is how it stops being one.
 */

export const MATCH_MODES = new Set(["Open", "Apply"]);
export const BOARD_SCOPES = new Set(["Global", "Community", "Org", "Department"]);

/** Seats per mentee. Below 1 an orbit has no mentorship in it; above 8 the
    "one active mentor, a few in support" model stops being true. */
export const CAP_MIN = 1;
export const CAP_MAX = 8;

/**
 * The public orbit's policy is frozen, not defaulted.
 *
 * Nobody administers Ryzn's own orbit, so there is no console that could write
 * this and no document it could be written to. Freezing it means a bug that
 * tries reads as a throw in development rather than a silent mutation shared by
 * every signed-in person.
 *
 * `matchMode: "Open"` here is the one place the platform is open by default:
 * §10.1 recommends Apply everywhere, and the public orbit stays Open so the
 * contrast between a public add and a company application is visible.
 */
export const PUBLIC_POLICY = Object.freeze({
  matchMode: "Open",
  cap: 3,
  chatGate: true,
  levelGate: false,
  crossDiv: true,
  boardScope: "Global",
});

/** A company orbit out of the box: earned access, gated chat, org board. */
export const DEFAULT_PRIVATE_POLICY = Object.freeze({
  matchMode: "Apply",
  cap: 3,
  chatGate: true,
  levelGate: false,
  crossDiv: true,
  boardScope: "Org",
});

/** A circle out of the box: a creator wants reach, so joining is frictionless,
    but their own time is scarce — hence the tighter seat cap. */
export const DEFAULT_COMMUNITY_POLICY = Object.freeze({
  matchMode: "Open",
  cap: 2,
  chatGate: true,
  levelGate: false,
  crossDiv: true,
  boardScope: "Community",
});

export const defaultPolicyFor = (kind) =>
  kind === "public" ? PUBLIC_POLICY
  : kind === "community" ? DEFAULT_COMMUNITY_POLICY
  : DEFAULT_PRIVATE_POLICY;

/**
 * Board scopes an orbit kind can actually mean.
 *
 * "Department" in a circle would scope a leaderboard by a field circles don't
 * have, and "Global" inside a company orbit would rank an employee against
 * strangers — clamping here is what stops a console from writing either.
 */
const SCOPES_FOR_KIND = {
  public: ["Global"],
  community: ["Community", "Global"],
  private: ["Org", "Department"],
};

/**
 * A stored policy, with defaults filled in and every field legal for the kind.
 *
 * Read-side normalisation matters as much as write-side: orbits created before
 * a field existed have no value for it and must read as the default, not as
 * `undefined` — a screen branching on `policy.chatGate === undefined` would
 * silently ungate chat for every orbit created last month.
 */
export function resolvePolicy(orbit) {
  const kind = kindOf(orbit);
  if (kind === "public") return PUBLIC_POLICY;

  const base = defaultPolicyFor(kind);
  const stored = orbit?.policy || {};
  const scopes = SCOPES_FOR_KIND[kind];

  /* Legacy bridge: `crossDiv` was `rules.crossDivision` before orbits existed,
     and orgs configured under the old console still carry only that. Falling
     back to it means switching an org over to v2 cannot silently re-open a
     division boundary its HR admin closed. New writes go to `policy`, and
     api/orgs.js mirrors both while the old console is still shipped. */
  const legacyCrossDiv = orbit?.rules?.crossDivision;

  return {
    matchMode: MATCH_MODES.has(stored.matchMode) ? stored.matchMode : base.matchMode,
    cap: clampCap(stored.cap, base.cap),
    chatGate: typeof stored.chatGate === "boolean" ? stored.chatGate : base.chatGate,
    levelGate: typeof stored.levelGate === "boolean" ? stored.levelGate : base.levelGate,
    crossDiv:
      typeof stored.crossDiv === "boolean" ? stored.crossDiv
      : typeof legacyCrossDiv === "boolean" ? legacyCrossDiv
      : base.crossDiv,
    boardScope: scopes.includes(stored.boardScope) ? stored.boardScope : base.boardScope,
  };
}

function clampCap(value, fallback) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, CAP_MIN), CAP_MAX);
}

/**
 * A console's patch, merged onto what is stored.
 *
 * Merged rather than replaced so a console that only knows about four switches
 * cannot blank the other two by omitting them — and unknown keys are dropped,
 * so a hand-rolled PATCH can't persist a field nothing enforces.
 */
export function cleanPolicy(input, orbit) {
  const current = resolvePolicy(orbit);
  const kind = kindOf(orbit);
  if (kind === "public") return PUBLIC_POLICY; // callers are rejected before this
  const patch = input || {};
  const scopes = SCOPES_FOR_KIND[kind];

  return {
    matchMode: MATCH_MODES.has(patch.matchMode) ? patch.matchMode : current.matchMode,
    cap: patch.cap === undefined ? current.cap : clampCap(patch.cap, current.cap),
    chatGate: patch.chatGate === undefined ? current.chatGate : !!patch.chatGate,
    levelGate: patch.levelGate === undefined ? current.levelGate : !!patch.levelGate,
    crossDiv: patch.crossDiv === undefined ? current.crossDiv : !!patch.crossDiv,
    boardScope: scopes.includes(patch.boardScope) ? patch.boardScope : current.boardScope,
  };
}

/* ————————————————— seniority —————————————————
 *
 * `levelGate` hides mentors below Staff+ from the deck. That switch was left out
 * of the pre-v2 org rules on the grounds that nothing in the data model recorded
 * seniority, and filtering on a meaningless field is worse than not filtering —
 * so the field lands here, on the *membership*, before the switch does.
 *
 * It sits on the seat rather than the profile for the same reason `division`
 * does: it describes a person's standing inside one organisation and means
 * nothing outside it. A staff engineer at Northbound is not a staff engineer in
 * a public orbit that has no ladder at all.
 */
export const ORBIT_LEVELS = ["Associate", "Senior", "Staff+"];
export const GATED_LEVEL = "Staff+";

export const cleanLevel = (v) => {
  const s = String(v ?? "").trim();
  return ORBIT_LEVELS.includes(s) ? s : null;
};

/** Does this seat clear the orbit's level gate? A seat with no level recorded
    does not — an ungraded mentor showing up in a Staff+-only deck would make the
    gate look broken to the mentee and to the HR admin who switched it on. */
export const clearsLevelGate = (policy, seat) =>
  !policy.levelGate || seat?.level === GATED_LEVEL;

/* ————————————————— membership —————————————————
 *
 * Orbit role and platform role are separate, and stay that way:
 *
 *   role      (user doc)         mentee | mentor | admin — what the product does for you
 *   orgRole   (org_members doc)  owner | admin | member  — what you may do inside one orbit
 *
 * The public orbit has neither document nor row: everyone is a member, nobody
 * manages it, so `PUBLIC_MEMBERSHIP` is what callers get instead of a lookup.
 */

export const PUBLIC_MEMBERSHIP = Object.freeze({
  orbitId: PUBLIC_ORBIT_ID,
  orgRole: "member",
  division: null,
  level: null,
  joinedAt: null,
});

/** The public orbit as every payload renders it. */
export const PUBLIC_ORBIT = Object.freeze({
  id: PUBLIC_ORBIT_ID,
  kind: "public",
  name: "Ryzn",
  tag: "Public orbit",
  slug: null,
  accent: "#6C5CE7",
  policy: PUBLIC_POLICY,
  orgRole: "member",
  canManage: false,
  memberCount: null,
  ownerId: null,
});

/**
 * An orbit document as the client sees it, with its policy already resolved.
 *
 * Policy is resolved *here*, once, on the way out — no client ever merges
 * defaults, because two implementations of the resolution order is how the
 * console and the phone start disagreeing about what the rules are.
 */
export const publicOrbit = (orbit, { orgRole = null, memberCount = null, division = null, level = null } = {}) => {
  const kind = kindOf(orbit);
  return {
    id: String(orbit._id),
    kind,
    name: orbit.name,
    tag: orbit.tagline || (kind === "community" ? "Circle" : "Company orbit"),
    slug: orbit.slug ?? null,
    accent: orbit.accent || (kind === "community" ? "#00B894" : "#6C5CE7"),
    coverUrl: orbit.coverUrl ?? null,
    policy: resolvePolicy(orbit),
    ownerId: orbit.ownerId,
    memberCount,
    orgRole,
    division,
    level,
    canManage: orgRole === "owner" || orgRole === "admin",
    /* A private orbit's feed is closed until HR opens it; a circle's whole point
       is its feed, so it is open from the first post. */
    orbitActive: kind === "community" ? true : !!orbit.orbitActive,
    /* §6.5 — governs whether posts by public/community mentors a member follows
       may appear inside a company orbit. Circles never fence content off. */
    allowExternal: kind === "community" ? true : orbit.allowExternal !== false,
    createdAt: orbit.createdAt ?? null,
  };
};

/**
 * Every orbit this person moves through: the public one, then their memberships
 * oldest first.
 *
 * Two reads for the whole switcher, not one per membership. The public orbit is
 * always first because it is the one nobody can be removed from — it is the
 * floor a person lands on when they leave everything else.
 */
export async function myOrbits(db, userId) {
  const memberships = await db
    .collection(collections.orbitMembers)
    .find({ userId: String(userId) })
    .sort({ joinedAt: 1 })
    .toArray();

  const ids = memberships.map((m) => m.orgId).filter(ObjectId.isValid).map((id) => new ObjectId(id));
  const docs = ids.length
    ? await db.collection(collections.orbits).find({ _id: { $in: ids } }).toArray()
    : [];
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  const counts = await memberCounts(db, docs.map((d) => String(d._id)));

  const mine = memberships
    // A membership whose orbit was deleted is not an error the caller has to
    // handle — it is simply not an orbit any more.
    .filter((m) => byId.has(m.orgId))
    .map((m) =>
      publicOrbit(byId.get(m.orgId), {
        orgRole: m.orgRole,
        division: m.division ?? null,
        level: m.level ?? null,
        memberCount: counts.get(m.orgId) ?? null,
      })
    );

  return [PUBLIC_ORBIT, ...mine];
}

/** Member counts for several orbits in one aggregate. Counted, never cached on
    the orbit document — a cached count drifts the first time a delete races. */
export async function memberCounts(db, orbitIds) {
  if (!orbitIds.length) return new Map();
  const rows = await db
    .collection(collections.orbitMembers)
    .aggregate([
      { $match: { orgId: { $in: orbitIds.map(String) } } },
      { $group: { _id: "$orgId", n: { $sum: 1 } } },
    ])
    .toArray();
  return new Map(rows.map((r) => [r._id, r.n]));
}

/**
 * Resolve the orbit a request is scoped to, and the caller's standing in it.
 *
 * Every orbit-scoped endpoint starts here, and it is the only place membership
 * is checked. An id the caller is not a member of resolves to `null` rather than
 * to the orbit — for a private orbit the difference between "not a member" and
 * "no such orbit" is itself information an outsider should not get.
 *
 * `orbitId` absent, unknown or unparseable falls back to the public orbit, which
 * every signed-in person is in. Requests never fail on a stale orbit id in a
 * client's local state; they land on the floor.
 */
export async function orbitContext(db, userId, orbitId) {
  const id = String(orbitId ?? PUBLIC_ORBIT_ID);
  if (id === PUBLIC_ORBIT_ID || !ObjectId.isValid(id)) {
    return { orbit: PUBLIC_ORBIT, policy: PUBLIC_POLICY, membership: PUBLIC_MEMBERSHIP, doc: null };
  }

  const membership = await db
    .collection(collections.orbitMembers)
    .findOne({ orgId: id, userId: String(userId) });
  if (!membership) return null;

  const doc = await db.collection(collections.orbits).findOne({ _id: new ObjectId(id) });
  if (!doc) return null;

  const count = (await memberCounts(db, [id])).get(id) ?? null;
  return {
    orbit: publicOrbit(doc, {
      orgRole: membership.orgRole,
      division: membership.division ?? null,
      level: membership.level ?? null,
      memberCount: count,
    }),
    policy: resolvePolicy(doc),
    membership,
    doc,
  };
}

/** Everyone in an orbit, as seats keyed by user id — one read for a whole deck. */
export async function orbitSeats(db, orbitId) {
  if (String(orbitId) === PUBLIC_ORBIT_ID) return new Map();
  const rows = await db
    .collection(collections.orbitMembers)
    .find({ orgId: String(orbitId) }, { projection: { userId: 1, orgRole: 1, division: 1, level: 1 } })
    .toArray();
  return new Map(rows.map((r) => [r.userId, { orgRole: r.orgRole, division: r.division ?? null, level: r.level ?? null }]));
}

/**
 * Who may be seen in this orbit's deck, given the viewer's seat and the policy.
 *
 * Both filters are policy fields, so the same function serves a company orbit
 * enforcing divisions and a circle enforcing nothing — there is no branch on
 * kind here, and there must never be one.
 */
export const visibleInDeck = (policy, viewerSeat, candidateSeat) => {
  if (!clearsLevelGate(policy, candidateSeat)) return false;
  if (policy.crossDiv) return true;
  if (!viewerSeat?.division) return true; // unseated members see everyone
  return candidateSeat?.division === viewerSeat.division;
};

/* ————————————————— identity —————————————————
 *
 * Tier is derived from XP on every read and never stored. A stored tier is a
 * number that can disagree with the ledger it came from, and because XP is
 * portable across orbits the disagreement would show up in whichever orbit the
 * person happened not to be in when it was last written.
 */
export const TIERS = [
  { name: "Scout", at: 0 },
  { name: "Pathfinder", at: 1200 },
  { name: "Architect", at: 2500 },
  { name: "Luminary", at: 4000 },
];

export const tierFor = (xp) => {
  const n = Number(xp) || 0;
  return n >= 4000 ? "Luminary" : n >= 2500 ? "Architect" : n >= 1200 ? "Pathfinder" : "Scout";
};

/** XP still to go, and the tier it buys. `null` at the top of the ladder. */
export const nextTier = (xp) => {
  const n = Number(xp) || 0;
  const next = TIERS.find((t) => t.at > n);
  return next ? { name: next.name, at: next.at, remaining: next.at - n } : null;
};
