import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { rateLimit } from "../lib/ratelimit.js";
import {
  MATCH_STATUS, MENTEE_SEATS, sideOf, pairFor, listMatches, hydrate, usage, capacityOf,
} from "../lib/matches.js";

/**
 * /api/matches — the mentee↔mentor pairing that used to live in React state.
 *
 *   GET               the caller's matches, with the other party attached
 *   POST  {otherId}   open a match, or accept one the other side already opened
 *   PATCH {id,action} accept | decline | end
 *
 * Both sides read the same documents, so a mentor's cohort and a mentee's
 * mentor list can no longer disagree, and neither survives only until refresh.
 */

/* A mentee's accepted mentors are peers. There used to be an `active` seat and
   two `support` seats, assigned by accept order, and only the active one got a
   working product — the other two had no Orbit, no feed and no thread. Each
   mentor now gets their own Orbit, so which one arrived first decides nothing.
   `seat` is no longer written; old documents may still carry a stale value and
   nothing reads it. MENTEE_SEATS survives as what it always really was — a
   count of how many mentors one mentee may hold at once. */

async function getMatches(request, user) {
  const rows = await listMatches(user);
  const [hydrated, use] = await Promise.all([hydrate(rows, user), usage(user)]);
  const limit = sideOf(user) === "mentor" ? await capacityOf(user.id) : MENTEE_SEATS;
  return json({ role: sideOf(user), matches: hydrated, usage: { ...use, limit } });
}

async function createMatch(request, user) {
  const limited = await rateLimit(`match-create:${user.id}`, { limit: 60 });
  if (!limited.ok) return fail(429, "rate_limited", "Slow down a moment.");

  let otherId, action = "request";
  try {
    ({ otherId, action = "request" } = await request.json());
  } catch {
    return fail(400, "bad_request", "Expected a JSON body.");
  }
  if (typeof otherId !== "string" || !ObjectId.isValid(otherId)) {
    return fail(400, "bad_request", "That isn't a valid person.");
  }
  if (otherId === user.id) return fail(400, "bad_request", "You can't match with yourself.");
  if (action !== "request" && action !== "pass") {
    return fail(400, "bad_request", "Unknown action.");
  }

  const db = await getDb();
  const side = sideOf(user);
  const pair = pairFor(user, otherId);

  // The other party must exist and actually be on the opposite side. Without
  // this a mentee could pair with another mentee by posting a raw id.
  const other = await db
    .collection(collections.user)
    .findOne({ _id: new ObjectId(otherId) }, { projection: { role: 1 } });
  if (!other) return fail(404, "not_found", "We couldn't find that person.");
  const otherSide = sideOf(other);
  if (otherSide === side) return fail(400, "bad_request", "Matches are between a mentee and a mentor.");

  const col = db.collection(collections.matches);
  const existing = await col.findOne(pair);
  const now = new Date();

  /* A pass is recorded, not just forgotten. Otherwise the deck re-offers
     everyone the caller already said no to on the next page load. It costs no
     seat, so it skips the limit checks below. */
  if (action === "pass") {
    if (existing?.status === MATCH_STATUS.ACCEPTED) {
      return fail(409, "already_matched", "End the pairing instead.");
    }
    await col.updateOne(
      pair,
      {
        $set: { ...pair, status: MATCH_STATUS.DECLINED, respondedAt: now, updatedAt: now },
        $setOnInsert: { requestedBy: side, createdAt: now },
      },
      { upsert: true }
    );
    return json({ ok: true, status: MATCH_STATUS.DECLINED });
  }

  if (existing) {
    if (existing.status === MATCH_STATUS.ACCEPTED) {
      return fail(409, "already_matched", "You're already working together.");
    }
    if (existing.status === MATCH_STATUS.PENDING) {
      // Requesting someone who already requested you is the accept.
      if (existing.requestedBy !== side) return acceptMatch(user, existing);
      return fail(409, "already_requested", "That request is already out.");
    }
    // declined / ended — let them try again rather than blocking forever.
  }

  const use = await usage(user);
  if (side === "mentee" && use.live >= MENTEE_SEATS) {
    return fail(409, "no_seats", `You're holding all ${MENTEE_SEATS} mentor seats.`);
  }
  if (side === "mentor") {
    const cap = await capacityOf(user.id);
    if (use.accepted >= cap) return fail(409, "at_capacity", `Your cohort is full at ${cap}.`);
  }

  const doc = {
    ...pair,
    status: MATCH_STATUS.PENDING,
    requestedBy: side,
    createdAt: now,
    updatedAt: now,
    respondedAt: null,
  };

  try {
    // Upsert rather than insert: the unique index on the pair is what stops a
    // double-tap from opening two matches between the same two people.
    await col.updateOne(pair, { $set: doc }, { upsert: true });
  } catch (err) {
    if (err?.code === 11000) return fail(409, "already_requested", "That request is already out.");
    throw err;
  }

  const saved = await col.findOne(pair);
  const [row] = await hydrate([saved], user);
  return json({ ok: true, match: row }, 201);
}

/** Completing the handshake. Only the side that did NOT ask can accept. */
async function acceptMatch(user, match) {
  const side = sideOf(user);
  if (match.requestedBy === side) {
    return fail(409, "awaiting_them", "They haven't answered yet.");
  }

  const use = await usage(user);
  if (side === "mentee" && use.live > MENTEE_SEATS) {
    return fail(409, "no_seats", `You're holding all ${MENTEE_SEATS} mentor seats.`);
  }
  if (side === "mentor") {
    const cap = await capacityOf(user.id);
    if (use.accepted >= cap) return fail(409, "at_capacity", `Your cohort is full at ${cap}.`);
  }

  const col = await (await getDb()).collection(collections.matches);
  const now = new Date();

  // Filtered on status:"pending" so two concurrent accepts produce one winner
  // rather than two writes racing over the same document.
  const updated = await col.findOneAndUpdate(
    { _id: match._id, status: MATCH_STATUS.PENDING },
    {
      $set: {
        status: MATCH_STATUS.ACCEPTED,
        respondedAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  );
  if (!updated) return fail(409, "already_answered", "That request was already answered.");

  const [row] = await hydrate([updated], user);
  return json({ ok: true, match: row });
}

async function patchMatch(request, user) {
  let id, action;
  try {
    ({ id, action } = await request.json());
  } catch {
    return fail(400, "bad_request", "Expected a JSON body.");
  }
  if (!ObjectId.isValid(id)) return fail(400, "bad_request", "Unknown match.");

  const db = await getDb();
  const col = db.collection(collections.matches);

  // Scoped to the caller's own matches, so an id from elsewhere resolves to
  // nothing rather than to someone else's pairing.
  const match = await col.findOne({
    _id: new ObjectId(id),
    ...(sideOf(user) === "mentor" ? { mentorId: user.id } : { menteeId: user.id }),
  });
  if (!match) return fail(404, "not_found", "Unknown match.");

  if (action === "accept") return acceptMatch(user, match);

  const now = new Date();
  if (action === "decline") {
    if (match.status !== MATCH_STATUS.PENDING) return fail(409, "not_pending", "Nothing to decline.");
    await col.updateOne({ _id: match._id }, { $set: { status: MATCH_STATUS.DECLINED, respondedAt: now, updatedAt: now } });
    return json({ ok: true, status: MATCH_STATUS.DECLINED });
  }

  if (action === "end") {
    if (match.status !== MATCH_STATUS.ACCEPTED) return fail(409, "not_accepted", "Nothing to end.");
    await col.updateOne({ _id: match._id }, { $set: { status: MATCH_STATUS.ENDED, updatedAt: now } });
    return json({ ok: true, status: MATCH_STATUS.ENDED });
  }

  /* `promote` is gone. It set one mentor as the active engagement and demoted
     the previous one, which was only ever needed because a single Orbit had to
     choose an occupant. Mentees now hold every mentor at once. */

  return fail(400, "bad_request", "Unknown action.");
}

async function handler(request, user) {
  if (request.method === "GET") return getMatches(request, user);
  if (request.method === "POST") return createMatch(request, user);
  if (request.method === "PATCH") return patchMatch(request, user);
  return fail(405, "method_not_allowed", "GET, POST or PATCH.");
}

export default { fetch: withUser(handler) };
