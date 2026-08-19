import { getDb, collections } from "../../lib/db.js";
import { json, fail } from "../../lib/http.js";
import { rateLimit, clientIp } from "../../lib/ratelimit.js";

/**
 * POST /api/invites/validate  { code }
 *
 * Read-only check that powers the live "VALID ✓" indicator on the mentor
 * register screen. Deliberately returns nothing but a boolean and a reason -
 * no inviter name, no cohort, nothing worth harvesting.
 */
async function handler(request) {
  if (request.method !== "POST") return fail(405, "method_not_allowed", "Use POST.");

  const limit = await rateLimit(`invite-validate:${clientIp(request)}`, { limit: 10 });
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
  const invite = await db
    .collection(collections.invites)
    .findOne({ code: code.trim().toUpperCase() });

  if (!invite) return json({ valid: false, reason: "not_found" });
  if (invite.revokedAt) return json({ valid: false, reason: "revoked" });
  if (invite.redeemedBy) return json({ valid: false, reason: "already_used" });
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return json({ valid: false, reason: "expired" });
  }

  return json({
    valid: true,
    role: invite.role === "mentee" || invite.role === "admin" || invite.role === "mentor"
      ? invite.role
      : "mentor",
    org: invite.orgName || null,
  });
}

export default { fetch: handler };
