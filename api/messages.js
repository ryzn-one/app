import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { sideOf, acceptedPair, pairFor, orbitOfMatch } from "../lib/matches.js";
import { rateLimit } from "../lib/ratelimit.js";
import { orbitContext, PUBLIC_ORBIT_ID, PUBLIC_POLICY } from "../lib/orbits.js";
import { recordedSteps, resolveStage, chatUnlocked } from "../lib/stage.js";

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

/**
 * Is Chat open for this pairing?
 *
 * `chatGate` is a policy field, so the answer depends on the orbit the pairing
 * was formed in — and an orbit that never gated chat must not inherit a gate
 * from one that does. Two things are read together:
 *
 *   policy.chatGate   does this orbit gate chat at all
 *   stage.complete    has the mentee finished the track *there*
 *
 * The same question the padlock on the tab asks, answered from the same helper.
 * Enforcing it here rather than only in the client is the point: a locked screen
 * is a designed destination, but it is not a security boundary.
 */
async function chatOpenFor(db, menteeId, match) {
  const scope = orbitOfMatch(match);
  const [ctx, recorded, profile] = await Promise.all([
    orbitContext(db, menteeId, scope),
    recordedSteps(db, menteeId, scope),
    db.collection(collections.profiles).findOne(
      { userId: String(menteeId) },
      { projection: { stage1Complete: 1, onboardingComplete: 1 } }
    ),
  ]);

  // Pairings older than orbits sit in the public orbit, and so does the one
  // Stage 1 completion those mentees have.
  const legacy = scope === PUBLIC_ORBIT_ID && profile?.stage1Complete ? ["first-exercise"] : [];
  const stage = resolveStage({
    recorded: [...recorded, ...legacy],
    onboardingComplete: !!profile?.onboardingComplete,
    // The pairing exists, so the "find your mentor" step is done by definition.
    hasMentor: true,
  });
  return chatUnlocked(ctx?.policy ?? PUBLIC_POLICY, stage);
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
    const match = await acceptedPair({ menteeId, mentorId });
    if (!match) {
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
      orbitId: orbitOfMatch(match),
      unlocked: await chatOpenFor(db, menteeId, match),
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
    const match = await acceptedPair({ menteeId, mentorId });
    if (!match) {
      return fail(403, "forbidden", "Direct Connect is only open with an accepted match.");
    }
    if (!(await chatOpenFor(db, menteeId, match))) {
      return fail(403, "locked", "Chat unlocks when the mentee finishes their first track in this orbit.");
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
