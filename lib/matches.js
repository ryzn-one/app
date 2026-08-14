import { ObjectId } from "mongodb";
import { getDb, collections } from "./db.js";
import { appSide } from "./roles.js";

/**
 * Mentee ↔ mentor matches.
 *
 * A match is one document shared by both sides, so there is exactly one answer
 * to "are these two working together" no matter who asks. It was previously
 * React state on both sides, which meant a mentor's cohort and a mentee's
 * mentor were two independent fictions that vanished on refresh.
 *
 * Either side may open a match; it counts for nothing until the OTHER side
 * accepts. That handshake is the point — a mentor appearing in a mentee's app
 * because the mentee swiped right would be the same lie in a new place.
 *
 *   pending    one side asked, the other hasn't answered
 *   accepted   both sides agreed — this is a real pairing
 *   declined   answered no
 *   ended      was accepted, since dissolved
 */

export const MATCH_STATUS = { PENDING: "pending", ACCEPTED: "accepted", DECLINED: "declined", ENDED: "ended" };

/** Statuses that occupy one of a mentee's seats. */
const LIVE = [MATCH_STATUS.PENDING, MATCH_STATUS.ACCEPTED];

/**
 * A mentee holds three mentor seats. The seats are equal — there is no active
 * engagement and no supports. Each accepted mentor gets their own Orbit, so
 * ranking them served nothing but a UI that could only render one.
 *
 * Since v2 this is the *fallback* only. The real number is `policy.cap`, set per
 * orbit: a company orbit may want one mentor per employee, a circle two, the
 * public orbit three. `MENTEE_SEATS` is what a match formed before orbits
 * existed was counted against, and what an unresolvable orbit falls back to.
 */
export const MENTEE_SEATS = 3;

/**
 * Which orbit a pairing was formed in.
 *
 * Matches written before orbits existed have no `orbitId` and belong to the
 * public orbit — that is where Ryzn was. Reading it through this helper rather
 * than off the document means no caller has to know that.
 */
export const orbitOfMatch = (match) => match?.orbitId || "public";

/**
 * A pairing is unique *between two people*, not per orbit.
 *
 * The alternative — the same mentee and mentor paired separately in a circle and
 * at work — models one relationship as two, and would give them two threads, two
 * programmes and two sets of progress to keep straight. The orbit is recorded on
 * the match because it decides which seat cap the pairing counts against and
 * which console can see it, not because the relationship belongs to it.
 */

/** Fallback when a mentor hasn't answered the capacity question yet. */
export const DEFAULT_MENTOR_CAPACITY = 4;

/** Founders (`admin`) sit on the mentor side of every pairing. */
export const sideOf = (user) => appSide(user?.role);

/** Builds the {menteeId, mentorId} key from the caller and the other party. */
export function pairFor(user, otherId) {
  return sideOf(user) === "mentor"
    ? { mentorId: user.id, menteeId: String(otherId) }
    : { menteeId: user.id, mentorId: String(otherId) };
}

export const matchFilterFor = (user) =>
  sideOf(user) === "mentor" ? { mentorId: user.id } : { menteeId: user.id };

/**
 * Is this pair actually working together?
 *
 * The authorization check behind a mentee reading a mentor's feed. Without it
 * /api/posts?mentorId= would hand any signed-in user any mentor's content.
 */
export async function hasAcceptedPair({ menteeId, mentorId }) {
  return Boolean(await acceptedPair({ menteeId, mentorId }));
}

/**
 * The same check, returning the document.
 *
 * Callers that need to know *which orbit* a pairing lives in want this one — the
 * chat gate is a policy field, and reading a policy means first knowing whose
 * policy applies.
 */
export async function acceptedPair({ menteeId, mentorId }) {
  const col = await matchesCollection();
  return col.findOne({
    menteeId: String(menteeId),
    mentorId: String(mentorId),
    status: MATCH_STATUS.ACCEPTED,
  });
}

export async function matchesCollection() {
  const db = await getDb();
  return db.collection(collections.matches);
}

/** Every match the user is part of, newest first. */
export async function listMatches(user, { statuses } = {}) {
  const col = await matchesCollection();
  const filter = matchFilterFor(user);
  if (statuses) filter.status = { $in: statuses };
  return col.find(filter).sort({ createdAt: -1 }).toArray();
}

/**
 * Attaches the other party's public details to each match.
 *
 * Deliberately no email: an accepted match opens a conversation inside Ryzn,
 * it does not hand over contact details.
 */
export async function hydrate(matches, viewer) {
  if (!matches.length) return [];
  const db = await getDb();
  const side = sideOf(viewer);
  const otherIds = matches.map((m) => (side === "mentor" ? m.menteeId : m.mentorId));

  const users = await db
    .collection(collections.user)
    .find(
      { _id: { $in: otherIds.map((id) => new ObjectId(id)) } },
      { projection: { name: 1, image: 1, role: 1 } }
    )
    .toArray();
  const byId = new Map(users.map((u) => [String(u._id), u]));

  const profiles = await db
    .collection(collections.profiles)
    .find({ userId: { $in: otherIds } })
    .toArray();
  const profileById = new Map(profiles.map((p) => [p.userId, p]));

  return matches.map((m) => {
    const otherId = side === "mentor" ? m.menteeId : m.mentorId;
    const u = byId.get(otherId);
    const p = profileById.get(otherId) || {};
    const base = {
      id: String(m._id),
      status: m.status,
      requestedBy: m.requestedBy,
      /* Which orbit this pairing was formed in, and — in an Apply orbit — what
         the applicant wrote to qualify. The answer is the entire content of a
         mentor's requests inbox: approving a name tells them nothing, approving
         a name attached to "I want to run my first project end to end" is a
         decision they can actually make. */
      orbitId: orbitOfMatch(m),
      answer: m.answer ?? null,
      // Whose turn it is. Drives "PENDING" vs "RESPOND" without the client
      // having to re-derive the rule.
      awaitingYou: m.status === MATCH_STATUS.PENDING && m.requestedBy !== side,
      createdAt: m.createdAt,
      respondedAt: m.respondedAt ?? null,
      person: {
        id: otherId,
        name: u?.name || "—",
        image: u?.image ?? null,
      },
    };
    if (side === "mentee") {
      base.person.headline = p.headline ?? null;
      base.person.industry = p.industry ?? null;
      base.person.tier = p.tier ?? "Scout";
      base.person.impact = p.impact ?? 0;
      base.person.expertise = p.expertise ?? [];
      base.person.why = p.why ?? null;
      base.person.education = p.education ?? null;
      base.person.experience = p.experience ?? null;
    } else {
      base.person.track = p.track ?? null;
      base.person.goals = p.goals ?? [];
      base.person.skills = p.skills ?? [];
      base.person.interests = p.interests ?? [];
      base.person.influences = p.influences ?? [];
      base.person.education = p.education ?? null;
      base.person.experience = p.experience ?? null;
      base.person.week = p.week ?? 1;
      base.person.streak = p.streak ?? 0;
    }
    return base;
  });
}

/**
 * How many seats/slots the user has already committed.
 *
 * Scoped to one orbit when given one, because seats are: `policy.cap` is a rule
 * about how many mentors someone may hold *here*. A mentee with three mentors in
 * the public orbit still starts their company orbit with every seat free, which
 * is the whole point of scoping progress and leaving identity portable.
 *
 * Omitting `orbitId` counts every orbit — what /api/me wants for a person's
 * overall standing, and what the pre-v2 behaviour was.
 */
export async function usage(user, orbitId) {
  const col = await matchesCollection();
  const rows = await col.find({ ...matchFilterFor(user), status: { $in: LIVE } }).toArray();
  const scoped = orbitId ? rows.filter((r) => orbitOfMatch(r) === String(orbitId)) : rows;
  return {
    live: scoped.length,
    accepted: scoped.filter((r) => r.status === MATCH_STATUS.ACCEPTED).length,
    pending: scoped.filter((r) => r.status === MATCH_STATUS.PENDING).length,
    /* Across every orbit — what a mentor's own capacity is measured against.
       A mentor's time is not per-orbit even though their seats are. */
    liveEverywhere: rows.length,
    acceptedEverywhere: rows.filter((r) => r.status === MATCH_STATUS.ACCEPTED).length,
  };
}

/** A mentor's self-declared cohort size, with a sane floor. */
export async function capacityOf(mentorId) {
  const db = await getDb();
  const p = await db.collection(collections.profiles).findOne({ userId: mentorId }, { projection: { capacity: 1 } });
  const n = Number(p?.capacity);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MENTOR_CAPACITY;
}

/**
 * How many seats each of these mentors has already committed.
 *
 * `capacityOf` answers for one mentor and reads one profile; a deck asking that
 * per card is a read per face. This is one aggregation for the whole page, and
 * it counts LIVE — a pending request holds a seat exactly as an accepted one
 * does, which is what api/matches.js enforces on the write side.
 */
export async function mentorLoads(mentorIds) {
  const ids = [...new Set(mentorIds.map(String))];
  if (!ids.length) return new Map();
  const col = await matchesCollection();
  const rows = await col
    .aggregate([
      { $match: { mentorId: { $in: ids }, status: { $in: LIVE } } },
      { $group: { _id: "$mentorId", live: { $sum: 1 } } },
    ])
    .toArray();
  return new Map(rows.map((r) => [r._id, r.live]));
}

/** Accepted matches for an arbitrary user id — used by /api/me for both sides. */
export async function acceptedFor(userId, side) {
  const col = await matchesCollection();
  const filter = side === "mentor" ? { mentorId: userId } : { menteeId: userId };
  return col.find({ ...filter, status: MATCH_STATUS.ACCEPTED }).toArray();
}
