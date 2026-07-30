import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { rateLimit } from "../lib/ratelimit.js";
import { sideOf, hasAcceptedPair } from "../lib/matches.js";

/**
 * /api/sessions — the 1:1 booking handshake between a mentor and a mentee.
 *
 *   GET                     every session the caller is part of
 *   POST                    propose a session (1–5 times) to someone you're paired with
 *   PATCH {id,action}       accept | decline | reschedule | cancel | complete
 *
 * One document per session, shared by both sides, exactly like `matches` — so a
 * booked time is a single fact rather than two copies that drift. The Sessions
 * tab used to derive a card per mentee client-side and admit, in mono type, that
 * nothing could be booked. This is the backend that sentence was waiting for.
 *
 * The proposer never accepts their own proposal: `proposedBy` records which side
 * asked, and only the *other* side can confirm a time. That handshake is the
 * same rule matches use, and it's what stops a mentor filling a mentee's
 * calendar unilaterally.
 *
 *   proposed    times on the table, waiting on the other side
 *   confirmed   a slot is agreed — this is a real booking
 *   declined    the other side said no to all of them
 *   canceled    was live, called off by either side
 *   completed   the session happened (mentor logs it)
 */

const STATUS = {
  PROPOSED: "proposed",
  CONFIRMED: "confirmed",
  DECLINED: "declined",
  CANCELED: "canceled",
  COMPLETED: "completed",
};

const MAX_SLOTS = 5;
const MAX_AGENDA = 8;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

const randomId = () => `slot-${Math.random().toString(36).slice(2, 11)}`;
const iso = (d) => d?.toISOString?.() ?? d ?? null;

const shapeSlot = (s) => (s ? { id: s.id, start: iso(s.start), end: iso(s.end) } : null);

/** The session as the caller sees it: the *other* party, and whose turn it is. */
function shape(doc, side) {
  const otherId = side === "mentor" ? doc.menteeId : doc.mentorId;
  const otherName = side === "mentor" ? doc.menteeName : doc.mentorName;
  return {
    id: String(doc._id),
    mentorId: doc.mentorId,
    menteeId: doc.menteeId,
    title: doc.title,
    agenda: doc.agenda || [],
    notes: doc.notes || null,
    location: doc.location || null,
    proposedBy: doc.proposedBy,
    slots: (doc.slots || []).map(shapeSlot),
    confirmedSlot: shapeSlot(doc.confirmedSlot),
    status: doc.status,
    week: doc.week ?? null,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
    respondedAt: iso(doc.respondedAt),
    completedAt: iso(doc.completedAt),
    viewerSide: side,
    person: { id: otherId, name: otherName || "—" },
    // Whose move it is. Drives the "needs your answer" pile without the client
    // re-deriving the rule.
    awaitingYou: doc.status === STATUS.PROPOSED && doc.proposedBy !== side,
  };
}

/** Trim, drop blanks, cap length — used for the agenda lines. */
const cleanAgenda = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((a) => String(a ?? "").trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, MAX_AGENDA);

const cleanText = (v, max) => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

/**
 * Validates proposed times into stored slots.
 * Returns `{ slots }` or `{ error: [code, message] }`.
 */
function validateSlots(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: ["missing_slots", "Propose at least one time."] };
  }
  if (raw.length > MAX_SLOTS) {
    return { error: ["too_many_slots", `Propose at most ${MAX_SLOTS} times.`] };
  }
  const slots = [];
  for (const s of raw) {
    const start = new Date(s?.start);
    const end = new Date(s?.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      return { error: ["bad_slot", "Each option needs a start time before its end time."] };
    }
    if (end - start > MAX_DURATION_MS) {
      return { error: ["slot_too_long", "A session can't run longer than eight hours."] };
    }
    // A minute of slack absorbs clock skew between the browser and the server.
    if (start.getTime() < Date.now() - 60_000) {
      return { error: ["slot_past", "Propose a time in the future."] };
    }
    slots.push({ id: randomId(), start, end });
  }
  slots.sort((a, b) => a.start - b.start);
  return { slots };
}

const cleanLocation = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const label = cleanText(raw.label, 120);
  const url = cleanText(raw.url, 500);
  if (!label && !url) return null;
  return { label, url };
};

async function nameOf(db, id) {
  if (!ObjectId.isValid(id)) return null;
  const u = await db
    .collection(collections.user)
    .findOne({ _id: new ObjectId(id) }, { projection: { name: 1 } });
  return u?.name || null;
}

/* ————— GET ————— */

async function listSessions(request, user) {
  const db = await getDb();
  const side = sideOf(user);
  const filter = side === "mentor" ? { mentorId: user.id } : { menteeId: user.id };
  const rows = await db
    .collection(collections.sessions1v1)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();
  return json({ side, sessions: rows.map((r) => shape(r, side)) });
}

/* ————— POST ————— */

async function createSession(request, user) {
  const rl = await rateLimit(`session-create:${user.id}`, { limit: 40 });
  if (!rl.ok) return fail(429, "rate_limited", "Slow down — try again in a bit.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad_request", "Expected JSON.");
  }

  const { otherId, title, agenda, notes, location, slots: rawSlots, week } = body;
  if (!otherId || !ObjectId.isValid(String(otherId))) {
    return fail(400, "bad_request", "Who is this session with?");
  }

  const side = sideOf(user);
  const mentorId = side === "mentor" ? user.id : String(otherId);
  const menteeId = side === "mentor" ? String(otherId) : user.id;
  if (mentorId === menteeId) return fail(400, "bad_request", "You can't book a session with yourself.");

  // The pairing is the authorization: no accepted match, no session.
  if (!(await hasAcceptedPair({ menteeId, mentorId }))) {
    return fail(403, "not_paired", "You can only book sessions with someone you're matched with.");
  }

  const { slots, error } = validateSlots(rawSlots);
  if (error) return fail(400, error[0], error[1]);

  const db = await getDb();
  const [mentorName, menteeName] = await Promise.all([nameOf(db, mentorId), nameOf(db, menteeId)]);

  const now = new Date();
  const doc = {
    mentorId,
    menteeId,
    mentorName: mentorName || "—",
    menteeName: menteeName || "—",
    title: cleanText(title, 120) || "Mentorship session",
    agenda: cleanAgenda(agenda),
    notes: cleanText(notes, 1000),
    location: cleanLocation(location),
    proposedBy: side,
    proposedById: user.id,
    slots,
    confirmedSlot: null,
    status: STATUS.PROPOSED,
    week: Number.isFinite(Number(week)) ? Number(week) : null,
    createdAt: now,
    updatedAt: now,
    respondedAt: null,
    completedAt: null,
  };

  const { insertedId } = await db.collection(collections.sessions1v1).insertOne(doc);
  return json({ session: shape({ ...doc, _id: insertedId }, side) }, 201);
}

/* ————— PATCH ————— */

async function patchSession(request, user) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad_request", "Expected JSON.");
  }

  const { id, action } = body;
  if (!id || !ObjectId.isValid(String(id))) return fail(400, "bad_request", "Invalid session id.");

  const db = await getDb();
  const col = db.collection(collections.sessions1v1);
  const session = await col.findOne({ _id: new ObjectId(String(id)) });
  if (!session) return fail(404, "not_found", "Session not found.");

  const side = sideOf(user);
  const mine = side === "mentor" ? session.mentorId === user.id : session.menteeId === user.id;
  if (!mine) return fail(403, "forbidden", "That isn't your session.");

  const now = new Date();
  const save = async (set) => {
    const updated = await col.findOneAndUpdate(
      { _id: session._id },
      { $set: { ...set, updatedAt: now } },
      { returnDocument: "after" }
    );
    return json({ session: shape(updated, side) });
  };

  /* ACCEPT — only the side that didn't propose, and only on a live proposal. */
  if (action === "accept") {
    if (session.status !== STATUS.PROPOSED) {
      return fail(409, "not_pending", "This session isn't waiting on an answer.");
    }
    if (session.proposedBy === side) {
      return fail(403, "proposer_cannot_accept", "You proposed these times — it's their turn to pick one.");
    }
    const slot = (session.slots || []).find((s) => s.id === body.slotId);
    if (!slot) return fail(400, "bad_slot", "Pick one of the proposed times.");
    return save({ status: STATUS.CONFIRMED, confirmedSlot: slot, respondedAt: now });
  }

  /* DECLINE — none of the proposed times work and no counter-offer is coming. */
  if (action === "decline") {
    if (session.status !== STATUS.PROPOSED) {
      return fail(409, "not_pending", "This session isn't waiting on an answer.");
    }
    if (session.proposedBy === side) {
      return fail(403, "proposer_cannot_decline", "Cancel your own proposal instead.");
    }
    return save({ status: STATUS.DECLINED, respondedAt: now });
  }

  /* RESCHEDULE — a counter-offer. Either side, on anything still live. The turn
     flips to whoever didn't just propose, so the handshake still holds. */
  if (action === "reschedule") {
    if (![STATUS.PROPOSED, STATUS.CONFIRMED, STATUS.DECLINED].includes(session.status)) {
      return fail(409, "not_live", "This session is closed.");
    }
    const { slots, error } = validateSlots(body.slots);
    if (error) return fail(400, error[0], error[1]);
    return save({
      slots,
      confirmedSlot: null,
      proposedBy: side,
      proposedById: user.id,
      status: STATUS.PROPOSED,
      respondedAt: null,
      ...(body.title !== undefined ? { title: cleanText(body.title, 120) || "Mentorship session" } : {}),
      ...(body.agenda !== undefined ? { agenda: cleanAgenda(body.agenda) } : {}),
      ...(body.location !== undefined ? { location: cleanLocation(body.location) } : {}),
    });
  }

  /* CANCEL — either side, either state. */
  if (action === "cancel") {
    if (![STATUS.PROPOSED, STATUS.CONFIRMED].includes(session.status)) {
      return fail(409, "not_live", "This session is already closed.");
    }
    return save({ status: STATUS.CANCELED, canceledBy: side });
  }

  /* COMPLETE — the mentor logs that it happened. Only after the booked time. */
  if (action === "complete") {
    if (side !== "mentor") return fail(403, "mentor_only", "Your mentor logs the session.");
    if (session.status !== STATUS.CONFIRMED) {
      return fail(409, "not_confirmed", "Only a booked session can be logged.");
    }
    const start = session.confirmedSlot?.start ? new Date(session.confirmedSlot.start) : null;
    if (start && start.getTime() > Date.now()) {
      return fail(409, "not_yet", "This session hasn't happened yet.");
    }
    return save({
      status: STATUS.COMPLETED,
      completedAt: now,
      ...(body.notes !== undefined ? { notes: cleanText(body.notes, 1000) } : {}),
    });
  }

  /* DETAILS — title/agenda/location edits that don't move the time. */
  if (action === "update") {
    if (![STATUS.PROPOSED, STATUS.CONFIRMED].includes(session.status)) {
      return fail(409, "not_live", "This session is closed.");
    }
    return save({
      ...(body.title !== undefined ? { title: cleanText(body.title, 120) || "Mentorship session" } : {}),
      ...(body.agenda !== undefined ? { agenda: cleanAgenda(body.agenda) } : {}),
      ...(body.notes !== undefined ? { notes: cleanText(body.notes, 1000) } : {}),
      ...(body.location !== undefined ? { location: cleanLocation(body.location) } : {}),
    });
  }

  return fail(400, "bad_action", "Unknown action.");
}

async function handler(request, user) {
  if (request.method === "GET") return listSessions(request, user);
  if (request.method === "POST") return createSession(request, user);
  if (request.method === "PATCH") return patchSession(request, user);
  return fail(405, "method_not_allowed", "Use GET, POST or PATCH.");
}

export default { fetch: withUser(handler) };
