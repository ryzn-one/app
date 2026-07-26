import { ObjectId } from "mongodb";
import { getDb, collections } from "../../lib/db.js";
import { json, fail, withUser } from "../../lib/http.js";
import { rateLimit } from "../../lib/ratelimit.js";

/**
 * POST /api/invites/redeem  { code }   (authenticated)
 *
 * Promotes the caller to role="mentor". This is the only path to that role —
 * `role` is input:false in the Better Auth config, so it can never be set from
 * the client.
 *
 * The claim is a single atomic findOneAndUpdate guarded on `redeemedBy: null`.
 * Two people racing the same code means exactly one matches the filter and
 * wins; the loser gets `already_used`. Doing this as read-then-write would let
 * both through.
 */
async function handler(request, user) {
  if (request.method !== "POST") return fail(405, "method_not_allowed", "Use POST.");

  const limit = await rateLimit(`invite-redeem:${user.id}`, { limit: 10 });
  if (!limit.ok) return fail(429, "rate_limited", "Too many attempts. Try again later.");

  let code;
  try {
    ({ code } = await request.json());
  } catch {
    return fail(400, "bad_request", "Expected a JSON body.");
  }
  if (typeof code !== "string" || !code.trim()) {
    return fail(400, "bad_request", "Enter your invitation code.");
  }

  const db = await getDb();
  const invites = db.collection(collections.invites);
  const normalized = code.trim().toUpperCase();

  if (user.role === "mentor") {
    return json({ ok: true, alreadyMentor: true });
  }

  const claimed = await invites.findOneAndUpdate(
    {
      code: normalized,
      redeemedBy: null,
      revokedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    },
    { $set: { redeemedBy: user.id, redeemedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!claimed) {
    // Distinguish "wrong code" from "already spent" without leaking existence
    // to unauthenticated callers — this endpoint requires a session, so it's safe.
    const existing = await invites.findOne({ code: normalized });
    if (!existing) return fail(404, "invalid_code", "That code isn't recognized.");
    if (existing.revokedAt) return fail(410, "revoked", "That invitation was withdrawn.");
    if (existing.redeemedBy) return fail(409, "already_used", "That code has already been claimed.");
    return fail(410, "expired", "That invitation has expired.");
  }

  await db.collection(collections.user).updateOne(
    { _id: new ObjectId(user.id) },
    { $set: { role: "mentor", invitedBy: claimed.createdBy ?? null, updatedAt: new Date() } }
  );

  // Reshape the profile for the mentor side of the app.
  await db.collection(collections.profiles).updateOne(
    { userId: user.id },
    {
      $set: {
        role: "mentor",
        impact: 0,
        tier: "Scout",
        cohort: [],
        greetingUploaded: false,
        updatedAt: new Date(),
      },
      $unset: { mentorUserId: "", supportMentorIds: "", earned: "", xp: "", rank: "", week: "", streak: "" },
    },
    { upsert: true }
  );

  return json({ ok: true, role: "mentor" });
}

export default { fetch: withUser(handler) };
