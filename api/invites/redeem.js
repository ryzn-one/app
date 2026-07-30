import { ObjectId } from "mongodb";
import { getDb, collections } from "../../lib/db.js";
import { json, fail, withUser } from "../../lib/http.js";
import { rateLimit } from "../../lib/ratelimit.js";
import { GRANTABLE_ORG_ROLES } from "../../lib/orgs.js";

/**
 * POST /api/invites/redeem  { code }   (authenticated)
 *
 * Promotes the caller to the role recorded ON THE INVITE — "mentor" by default,
 * or "admin" for codes minted as admin invites in the founder console. This is
 * the only path to either role: `role` is input:false in the Better Auth config,
 * so a client can never send one, and the role here comes from a document only
 * an existing admin could have written.
 *
 * The claim is a single atomic findOneAndUpdate guarded on `redeemedBy: null`.
 * Two people racing the same code means exactly one matches the filter and
 * wins; the loser gets `already_used`. Doing this as read-then-write would let
 * both through.
 */

// Whitelist, not passthrough: a malformed or hand-edited invite document must
// never be able to name an arbitrary role.
const GRANTABLE = new Set(["mentor", "admin"]);
const roleOf = (invite) => (GRANTABLE.has(invite?.role) ? invite.role : "mentor");

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

  // Read-only peek, purely to avoid burning a single-use code on someone who
  // already holds what it grants. The claim below is still the atomic one.
  const peek = await invites.findOne({ code: normalized }, { projection: { role: 1, orgId: 1 } });
  const grants = roleOf(peek);
  // An org code carries a seat as well as a role, so a mentor who already holds
  // the role still has something to claim — skipping it here would leave a
  // mentor invited by their own company permanently outside it.
  if (user.role === grants && !peek?.orgId) {
    return json({ ok: true, already: true, role: grants });
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

  // Re-read the role off the claimed document rather than trusting the peek —
  // the peek and the claim are two round trips, and only this one is atomic.
  const granted = roleOf(claimed);

  await db.collection(collections.user).updateOne(
    { _id: new ObjectId(user.id) },
    { $set: { role: granted, invitedBy: claimed.createdBy ?? null, updatedAt: new Date() } }
  );

  await db.collection(collections.profiles).updateOne(
    { userId: user.id },
    granted === "mentor"
      // Reshape the profile for the mentor side of the app.
      ? {
          $set: {
            role: "mentor",
            impact: 0,
            tier: "Scout",
            cohort: [],
            greetingUploaded: false,
            updatedAt: new Date(),
          },
          $unset: { mentorUserId: "", supportMentorIds: "", earned: "", xp: "", rank: "", week: "", streak: "" },
        }
      // Admins are staff, not participants — flag the role and leave the rest
      // of their profile alone so they keep whatever they had.
      : { $set: { role: granted, updatedAt: new Date() } },
    { upsert: true }
  );

  /* An org code seats them in the org that minted it. The seat is a consequence
     of the claim above, never a second route to a platform role: `orgRole` is
     scoped to that one organisation, and `role` came off the invite document as
     it always has. Whitelisted, so a hand-edited invite can't name `owner`. */
  let org = null;
  if (claimed.orgId) {
    const orgDoc = await db.collection(collections.orgs).findOne(
      { _id: new ObjectId(claimed.orgId) },
      { projection: { name: 1, slug: 1 } }
    ).catch(() => null);
    if (orgDoc) {
      const orgRole = GRANTABLE_ORG_ROLES.has(claimed.orgRole) ? claimed.orgRole : "member";
      await db.collection(collections.orgMembers).updateOne(
        { orgId: String(claimed.orgId), userId: user.id },
        {
          $setOnInsert: {
            orgId: String(claimed.orgId),
            userId: user.id,
            joinedAt: new Date(),
            invitedBy: claimed.createdByUserId ?? null,
          },
          $set: { orgRole },
        },
        { upsert: true }
      );
      org = { id: String(orgDoc._id), name: orgDoc.name, slug: orgDoc.slug, orgRole };
    }
  }

  return json({ ok: true, role: granted, org });
}

export default { fetch: withUser(handler) };
