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

/** Statuses that occupy one of a mentee's three seats. */
const LIVE = [MATCH_STATUS.PENDING, MATCH_STATUS.ACCEPTED];

/**
 * A mentee holds three mentor seats. The seats are equal — there is no active
 * engagement and no supports. Each accepted mentor gets their own Orbit, so
 * ranking them served nothing but a UI that could only render one.
 */
export const MENTEE_SEATS = 3;

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
  const col = await matchesCollection();
  const m = await col.findOne(
    { menteeId: String(menteeId), mentorId: String(mentorId), status: MATCH_STATUS.ACCEPTED },
    { projection: { _id: 1 } }
  );
  return Boolean(m);
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

/** How many seats/slots the user has already committed. */
export async function usage(user) {
  const col = await matchesCollection();
  const rows = await col.find({ ...matchFilterFor(user), status: { $in: LIVE } }).toArray();
  return {
    live: rows.length,
    accepted: rows.filter((r) => r.status === MATCH_STATUS.ACCEPTED).length,
    pending: rows.filter((r) => r.status === MATCH_STATUS.PENDING).length,
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
