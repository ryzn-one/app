import { getDb, collections } from "../../lib/db.js";
import { json, fail } from "../../lib/http.js";
import { withAdmin } from "../../lib/admin.js";

/**
 * GET /api/admin/stats — everything the founder console renders above the fold.
 *
 * One round of countDocuments plus two small aggregations. Cheap enough to call
 * on every console load; if the user table ever gets big, cache it in Edge
 * Config rather than trimming what's here.
 */
async function handler(request) {
  if (request.method !== "GET") return fail(405, "method_not_allowed", "Use GET.");

  const db = await getDb();
  const users = db.collection(collections.user);
  const invites = db.collection(collections.invites);
  const profiles = db.collection(collections.profiles);

  const now = new Date();
  const since = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const [
    total, mentees, mentors, admins,
    last7, last30,
    invOpen, invClaimed, invExpired, invRevoked,
    onboarded, greetings,
  ] = await Promise.all([
    users.countDocuments({}),
    users.countDocuments({ role: { $in: [null, "mentee"] } }),
    users.countDocuments({ role: "mentor" }),
    users.countDocuments({ role: "admin" }),
    users.countDocuments({ createdAt: { $gte: since(7) } }),
    users.countDocuments({ createdAt: { $gte: since(30) } }),
    invites.countDocuments({ redeemedBy: null, revokedAt: null, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }),
    invites.countDocuments({ redeemedBy: { $ne: null } }),
    invites.countDocuments({ redeemedBy: null, revokedAt: null, expiresAt: { $lte: now } }),
    invites.countDocuments({ revokedAt: { $ne: null } }),
    profiles.countDocuments({ onboardingComplete: true }),
    profiles.countDocuments({ greetingUploaded: true }),
  ]);

  // Signups per day for the last 14 days, zero-filled so the chart never has
  // gaps where nobody joined.
  const raw = await users
    .aggregate([
      { $match: { createdAt: { $gte: since(13) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
    ])
    .toArray();
  const byDay = new Map(raw.map((r) => [r._id, r.n]));
  const daily = Array.from({ length: 14 }, (_, i) => {
    const d = since(13 - i);
    const key = d.toISOString().slice(0, 10);
    return { day: key, n: byDay.get(key) || 0 };
  });

  const recent = await users
    .find({}, { projection: { name: 1, email: 1, role: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(8)
    .toArray();

  return json({
    users: { total, mentees, mentors, admins, last7, last30 },
    invites: { open: invOpen, claimed: invClaimed, expired: invExpired, revoked: invRevoked },
    activation: { onboarded, greetings, profiles: await profiles.countDocuments({}) },
    daily,
    recent: recent.map((u) => ({
      id: String(u._id),
      name: u.name || "—",
      email: u.email,
      role: u.role || "mentee",
      createdAt: u.createdAt,
    })),
  });
}

export default { fetch: withAdmin(handler) };
