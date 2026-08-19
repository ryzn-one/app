import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { rateLimit } from "../lib/ratelimit.js";
import {
  MATCH_STATUS, MENTEE_SEATS, sideOf, pairFor, listMatches, hydrate, usage, capacityOf, orbitOfMatch,
} from "../lib/matches.js";
import { orbitContext, orbitSeats, visibleInDeck, PUBLIC_ORBIT_ID } from "../lib/orbits.js";

/**
 * /api/matches, the mentee↔mentor pairing that used to live in React state.
 *
 *   GET   ?orbitId=            the caller's matches, with the other party attached
 *   POST  {otherId, orbitId}   open a match, or accept one the other side opened
 *   PATCH {id, action}         accept | decline | end
 *
 * Both sides read the same documents, so a mentor's cohort and a mentee's
 * mentor list can no longer disagree, and neither survives only until refresh.
 *
 * **Policy, not kind.** Three of the six policy fields are enforced right here,
 * and every one of them is read off the orbit the request names:
 *
 *   matchMode  "Apply" makes a written answer part of the request; the mentor
 *              reads it and approves. "Open" sends the request with no question
 *              asked.
 *
 *              Note what "Open" does *not* mean here. The prototype adds a
 *              mentor instantly, because its mentors are fixtures. Ours are
 *              people, and a person appearing in someone's cohort without having
 *              agreed is the same lie the handshake exists to prevent, so Open
 *              removes the qualifying step, not the consent. The mentee-facing
 *              difference is real and immediate ("Add mentor", no modal); the
 *              mentor still says yes.
 *   cap        how many mentors one mentee may hold *in this orbit*.
 *   levelGate  a mentor who doesn't clear the gate can't be requested at all,
 *   crossDiv   nor one outside the mentee's division.
 *
 * The last two are also applied by /api/roster, which is what a deck renders
 * from, but a filtered list is a courtesy and this is the enforcement. A client
 * posting a raw user id is exactly the case the deck's filter cannot cover.
 */

/* A mentee's accepted mentors are peers. There used to be an `active` seat and
   two `support` seats, assigned by accept order, and only the active one got a
   working product, the other two had no Orbit, no feed and no thread. Each
   mentor now gets their own Orbit, so which one arrived first decides nothing.
   `seat` is no longer written; old documents may still carry a stale value and
   nothing reads it. MENTEE_SEATS survives as what it always really was, a
   count of how many mentors one mentee may hold at once. */

async function getMatches(request, user) {
  const db = await getDb();
  const orbitId = new URL(request.url).searchParams.get("orbitId");
  const ctx = await orbitContext(db, user.id, orbitId);
  /* An orbit the caller isn't in resolves to nothing rather than to a 403 with
     a roster in it. The client's stored orbit id can be stale; falling back to
     what they can see is the same rule the switcher applies. */
  const scope = ctx?.orbit.id ?? PUBLIC_ORBIT_ID;
  const policy = ctx?.policy ?? null;

  const rows = await listMatches(user);
  const [hydrated, use] = await Promise.all([hydrate(rows, user), usage(user, scope)]);

  /* A mentee's limit is the orbit's `cap`; a mentor's is their own stated cohort
     size, which is not a policy field, an orbit sets how many mentors a person
     may hold, never how many people a mentor must take on. */
  const limit = sideOf(user) === "mentor"
    ? await capacityOf(user.id)
    : (policy?.cap ?? MENTEE_SEATS);

  return json({
    role: sideOf(user),
    orbitId: scope,
    // Every match the caller has, in every orbit, the client filters by
    // `orbitId` for the current surface and still knows the rest exist.
    matches: hydrated,
    usage: { ...use, limit },
  });
}

async function createMatch(request, user) {
  const limited = await rateLimit(`match-create:${user.id}`, { limit: 60 });
  if (!limited.ok) return fail(429, "rate_limited", "Slow down a moment.");

  let otherId, action = "request", orbitId, answer;
  try {
    ({ otherId, action = "request", orbitId, answer } = await request.json());
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

  /* Which orbit's rules govern this request. Not a label on the document, it
     is the thing that decides whether the request is allowed, what it must
     carry, and which seat count it spends. */
  const ctx = await orbitContext(db, user.id, orbitId);
  if (!ctx) return fail(404, "no_orbit", "That's not one of your orbits.");
  const { policy, orbit } = ctx;
  const scope = orbit.id;

  // The other party must exist and actually be on the opposite side. Without
  // this a mentee could pair with another mentee by posting a raw id.
  const other = await db
    .collection(collections.user)
    .findOne({ _id: new ObjectId(otherId) }, { projection: { role: 1 } });
  if (!other) return fail(404, "not_found", "We couldn't find that person.");
  const otherSide = sideOf(other);
  if (otherSide === side) return fail(400, "bad_request", "Matches are between a mentee and a mentor.");

  /* Both people have to actually be in this orbit, and the two deck filters have
     to hold for the pair, otherwise a raw POST is a way around the same rules
     the deck applies on the way in. The public orbit has no seats to read, so
     `visibleInDeck` sees two empty ones and both filters pass, which is correct:
     its policy sets neither gate. */
  if (scope !== PUBLIC_ORBIT_ID) {
    const seats = await orbitSeats(db, scope);
    if (!seats.has(otherId)) {
      return fail(404, "not_in_orbit", "They're not in this orbit.");
    }
    const menteeSeat = seats.get(side === "mentee" ? user.id : otherId);
    const mentorSeat = seats.get(side === "mentee" ? otherId : user.id);
    if (!visibleInDeck(policy, menteeSeat, mentorSeat)) {
      return fail(403, "not_matchable", policy.levelGate
        ? "This orbit matches mentees with Staff+ mentors."
        : "This orbit matches people within their own division.");
    }
  }

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
        // The orbit the pass happened in, so a deck knows not to re-offer them
        // here without claiming they were passed on somewhere they never appeared.
        $setOnInsert: { requestedBy: side, orbitId: scope, answer: null, createdAt: now },
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
    // declined / ended, let them try again rather than blocking forever.
  }

  const use = await usage(user, scope);
  if (side === "mentee" && use.live >= policy.cap) {
    return fail(409, "no_seats", policy.cap === 1
      ? `${orbit.name} gives you one mentor seat, and it's taken.`
      : `You're holding all ${policy.cap} mentor seats in ${orbit.name}.`);
  }
  if (side === "mentor") {
    // A mentor's capacity is their own, counted across every orbit: their time
    // does not reset when they switch spaces.
    const cap = await capacityOf(user.id);
    if (use.acceptedEverywhere >= cap) return fail(409, "at_capacity", `Your cohort is full at ${cap}.`);
  }

  /* Apply mode: the written answer is what the mentor approves on, so it is
     required rather than optional. Open mode ignores anything sent, a rule
     that is off must not quietly keep collecting what it would have needed. */
  const qualified = String(answer ?? "").trim().slice(0, 600);
  if (policy.matchMode === "Apply" && side === "mentee" && qualified.length < 10) {
    return fail(400, "answer_required", "Tell them what you're hoping to work on, a sentence is enough.");
  }

  const doc = {
    ...pair,
    orbitId: scope,
    answer: policy.matchMode === "Apply" ? (qualified || null) : null,
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

  /* Seats are re-checked against the orbit the pairing was formed in, not the
     one the accepter happens to be looking at. An application sent when a
     company orbit allowed three mentors must not slip through after HR cut the
     cap to one, the rule that applies is the one in force where the pairing
     lives, read at the moment it completes. */
  const db = await getDb();
  const scope = orbitOfMatch(match);
  const menteeId = side === "mentee" ? user.id : match.menteeId;
  const ctx = await orbitContext(db, menteeId, scope);
  const cap = ctx?.policy.cap ?? MENTEE_SEATS;

  const use = await usage(user, scope);
  if (side === "mentee" && use.live > cap) {
    return fail(409, "no_seats", `You're holding all ${cap} mentor seats there.`);
  }
  if (side === "mentor") {
    const capacity = await capacityOf(user.id);
    if (use.acceptedEverywhere >= capacity) return fail(409, "at_capacity", `Your cohort is full at ${capacity}.`);
    /* The mentee's side of the cap, checked by the mentor's accept: they are the
       one whose seat is about to be filled, and they are not in this request. */
    const theirUse = await usage({ id: match.menteeId, role: "mentee" }, scope);
    if (theirUse.accepted >= cap) {
      return fail(409, "their_seats_full", "They've filled their mentor seats in that orbit.");
    }
  }

  const col = db.collection(collections.matches);
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
