import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { sideOf, hasAcceptedPair, pairFor } from "../lib/matches.js";
import { rateLimit } from "../lib/ratelimit.js";

/**
 * /api/messages — Direct Connect between an accepted mentee↔mentor pair.
 *
 *   GET  /api/messages?otherId=…     thread with that person
 *   POST /api/messages { otherId, text }
 *
 * DMScreen used to keep messages in React state and invent mentor replies.
 * Fake replies are gone; this is the real store. Mentee Stage 1 (first
 * exercise) must be complete before either side can write.
 */

const MAX_TEXT = 2000;
const MIN_TEXT = 1;
const PAGE = 100;

const shape = (doc, viewerId) => ({
  id: String(doc._id),
  text: doc.text,
  senderId: doc.senderId,
  who: doc.senderId === viewerId ? "me" : "them",
  createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
});

async function stage1Done(db, menteeId) {
  const p = await db.collection(collections.profiles).findOne(
    { userId: String(menteeId) },
    { projection: { stage1Complete: 1 } }
  );
  return !!p?.stage1Complete;
}

async function handler(request, user) {
  const db = await getDb();
  const col = db.collection(collections.messages);
  const side = sideOf(user);

  if (request.method === "GET") {
    const otherId = new URL(request.url).searchParams.get("otherId");
    if (!otherId) return fail(400, "bad_request", "otherId is required.");
    if (!/^[a-f\d]{24}$/i.test(otherId)) return fail(400, "bad_request", "otherId looks wrong.");

    const { menteeId, mentorId } = pairFor(user, otherId);
    if (!(await hasAcceptedPair({ menteeId, mentorId }))) {
      return fail(403, "forbidden", "Direct Connect is only open with an accepted match.");
    }

    const rows = await col
      .find({ menteeId, mentorId })
      .sort({ createdAt: 1 })
      .limit(PAGE)
      .toArray();

    return json({
      messages: rows.map((r) => shape(r, user.id)),
      pair: { menteeId, mentorId },
      unlocked: await stage1Done(db, menteeId),
    });
  }

  if (request.method === "POST") {
    const rl = await rateLimit(`message-send:${user.id}`, { limit: 120, windowMs: 60 * 60 * 1000 });
    if (!rl.ok) return fail(429, "rate_limited", "Slow down — try again in a bit.");

    let body;
    try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected JSON."); }

    const otherId = String(body?.otherId || "");
    const text = String(body?.text || "").trim();
    if (!otherId) return fail(400, "bad_request", "otherId is required.");
    if (!/^[a-f\d]{24}$/i.test(otherId)) return fail(400, "bad_request", "otherId looks wrong.");
    if (text.length < MIN_TEXT) return fail(400, "too_short", "Write something before sending.");
    if (text.length > MAX_TEXT) return fail(400, "too_long", "That message is too long.");

    const { menteeId, mentorId } = pairFor(user, otherId);
    if (!(await hasAcceptedPair({ menteeId, mentorId }))) {
      return fail(403, "forbidden", "Direct Connect is only open with an accepted match.");
    }
    if (!(await stage1Done(db, menteeId))) {
      return fail(403, "locked", "Direct Connect unlocks when the mentee finishes their first exercise.");
    }

    // Confirm the other party still exists — soft guard against stale client ids.
    const other = await db.collection(collections.user).findOne(
      { _id: new ObjectId(otherId) },
      { projection: { _id: 1 } }
    );
    if (!other) return fail(404, "not_found", "That person isn't on Ryzn.");

    const now = new Date();
    const { insertedId } = await col.insertOne({
      menteeId,
      mentorId,
      senderId: user.id,
      senderRole: side,
      text,
      createdAt: now,
    });

    const doc = await col.findOne({ _id: insertedId });
    return json({ message: shape(doc, user.id) });
  }

  return fail(405, "method_not_allowed", "Use GET or POST.");
}

export default { fetch: withUser(handler) };
