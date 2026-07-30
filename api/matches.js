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

/* A mentee's first accepted mentor is the active engagement; the rest are
   supports. One active at a time is a product rule, not a UI detail. */
const seatFor = (hasActiveSeat) => (hasActiveSeat ? "support" : "active");

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
        $set: { ...pair, status: MATCH_STATUS.DECLINED, seat: null, respondedAt: now, updatedAt: now },
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
    seat: null,
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

  // The mentee's seat is decided by the mentee's own existing matches,
  // whichever side is doing the accepting.
  const menteeUsage = side === "mentee"
    ? use
    : await usage({ id: match.menteeId, role: "mentee" });

  const col = await (await getDb()).collection(collections.matches);
  const now = new Date();

  // Filtered on status:"pending" so two concurrent accepts produce one winner
  // rather than two writes racing over the same document.
  const updated = await col.findOneAndUpdate(
    { _id: match._id, status: MATCH_STATUS.PENDING },
    {
      $set: {
        status: MATCH_STATUS.ACCEPTED,
        seat: seatFor(menteeUsage.hasActiveSeat),
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
    await col.updateOne({ _id: match._id }, { $set: { status: MATCH_STATUS.ENDED, seat: null, updatedAt: now } });
    return json({ ok: true, status: MATCH_STATUS.ENDED });
  }

  // Promoting a support mentor to the active engagement. The demoted one keeps
  // its seat as support rather than being dropped.
  if (action === "promote") {
    if (sideOf(user) !== "mentee") return fail(403, "mentee_only", "Only a mentee sets their active mentor.");
    if (match.status !== MATCH_STATUS.ACCEPTED) return fail(409, "not_accepted", "Not an active pairing.");
    await col.updateMany(
      { menteeId: user.id, status: MATCH_STATUS.ACCEPTED, seat: "active" },
      { $set: { seat: "support", updatedAt: now } }
    );
    await col.updateOne({ _id: match._id }, { $set: { seat: "active", updatedAt: now } });
    return json({ ok: true, seat: "active" });
  }

  return fail(400, "bad_request", "Unknown action.");
}

async function handler(request, user) {
  if (request.method === "GET") return getMatches(request, user);
  if (request.method === "POST") return createMatch(request, user);
  if (request.method === "PATCH") return patchMatch(request, user);
  return fail(405, "method_not_allowed", "GET, POST or PATCH.");
}

export default { fetch: withUser(handler) };
