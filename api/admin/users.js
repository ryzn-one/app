import { getDb, collections } from "../../lib/db.js";
import { json, fail } from "../../lib/http.js";
import { withAdmin } from "../../lib/admin.js";

/**
 * GET /api/admin/users?q=&role=&limit=  — the People table in the console.
 *
 * Read-only. Nothing in the admin API edits a user: role changes still happen
 * only through an invite claim, so a compromised console can't mint mentors.
 */
async function handler(request) {
  if (request.method !== "GET") return fail(405, "method_not_allowed", "Use GET.");

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const role = url.searchParams.get("role");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);

  const filter = {};
  if (role && role !== "all") filter.role = role === "mentee" ? { $in: [null, "mentee"] } : role;
  if (q) {
    // Escaped: a search box must never let an admin paste a regex bomb.
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: { $regex: safe, $options: "i" } }, { email: { $regex: safe, $options: "i" } }];
  }

  const db = await getDb();
  const rows = await db
    .collection(collections.user)
    .find(filter, { projection: { name: 1, email: 1, role: 1, createdAt: 1, emailVerified: 1, onboardingComplete: 1 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const profiles = await db
    .collection(collections.profiles)
    .find({ userId: { $in: rows.map((u) => String(u._id)) } })
    .toArray();
  const byUser = new Map(profiles.map((p) => [p.userId, p]));

  return json({
    users: rows.map((u) => {
      const p = byUser.get(String(u._id)) || {};
      return {
        id: String(u._id),
        name: u.name || "—",
        email: u.email,
        role: u.role || "mentee",
        createdAt: u.createdAt,
        emailVerified: !!u.emailVerified,
        onboardingComplete: !!u.onboardingComplete,
        xp: p.xp ?? null,
        impact: p.impact ?? null,
        week: p.week ?? null,
        streak: p.streak ?? null,
      };
    }),
  });
}

export default { fetch: withAdmin(handler) };
