import { ObjectId } from "mongodb";
import { getDb, collections } from "../../lib/db.js";
import { json, fail } from "../../lib/http.js";
import { withAdmin } from "../../lib/admin.js";

/**
 * GET    /api/admin/users?q=&role=&limit=   the People table in the console.
 * DELETE /api/admin/users  { userId }       erase an account and all it owns.
 *
 * Nothing here edits a role: promotion still happens only through an invite
 * claim, so a compromised console cannot mint mentors. Deletion is the single
 * write this endpoint allows, and it is deliberately total — a founder
 * clearing out a test account should not be leaving its posts, matches and
 * messages behind for the next query to trip over.
 */

/* Every collection that stores a user id, and the field holding it. A miss
   here fails silently — it leaves an orphan that outlives the account and that
   nobody goes looking for — so this list is the thing to update when a new
   collection is added to lib/db.js. */
const OWNED = [
  [collections.session, "userId"],
  [collections.account, "userId"],
  [collections.profiles, "userId"],
  [collections.onboardingAnswers, "userId"],
  [collections.xpEvents, "userId"],
  [collections.exercises, "userId"],
  [collections.postEvents, "userId"],
  [collections.eventResponses, "userId"],
  [collections.orgMembers, "userId"],
  [collections.posts, "authorId"],
  [collections.postComments, "authorId"],
  [collections.messages, "senderId"],
  [collections.programs, "mentorId"],
  [collections.events, "hostId"],
  [collections.matches, "menteeId"],
  [collections.matches, "mentorId"],
  [collections.sessions1v1, "menteeId"],
  [collections.sessions1v1, "mentorId"],
];

/* The domain collections all write String(user._id), and Better Auth's own
   tables do too — but match both shapes rather than bet the cascade on it. */
const idShapes = (id) => (ObjectId.isValid(id) ? [id, new ObjectId(id)] : [id]);

async function remove(request, admin) {
  let body = {};
  try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

  const userId = String(body.userId || "").trim();
  if (!ObjectId.isValid(userId)) return fail(400, "bad_request", "Which account?");

  // Deleting your own account destroys the session mid-request and drops you
  // out of the console you are standing in.
  if (String(admin.id) === userId) {
    return fail(409, "self_delete", "You can't delete the account you're signed in with.");
  }

  const db = await getDb();
  const users = db.collection(collections.user);
  const target = await users.findOne(
    { _id: new ObjectId(userId) },
    { projection: { name: 1, email: 1, role: 1 } }
  );
  if (!target) return fail(404, "not_found", "No such account.");

  // The console is reachable only with an admin role, so removing the last one
  // locks it permanently — for everyone, including whoever pressed the button.
  if (target.role === "admin" && (await users.countDocuments({ role: "admin" })) <= 1) {
    return fail(409, "last_admin", "That's the last admin account — promote someone else first.");
  }

  // An organisation outlives its owner in every table that points at it, so
  // refuse rather than strand a company with no one able to administer it.
  const owned = await db.collection(collections.orgs).countDocuments({ ownerId: userId });
  if (owned) {
    return fail(409, "owns_org", `That account owns ${owned} organisation${owned === 1 ? "" : "s"} — transfer or delete ${owned === 1 ? "it" : "them"} first.`);
  }

  const shapes = idShapes(userId);
  const removed = {};
  for (const [name, field] of OWNED) {
    const res = await db.collection(name).deleteMany({ [field]: { $in: shapes } });
    if (res.deletedCount) removed[name] = (removed[name] || 0) + res.deletedCount;
  }

  /* A code claimed by an account that no longer exists cannot stay "claimed" —
     the ledger would show a seat held by nobody. Revoking keeps the audit trail
     and, unlike releasing it, does not bring a single-use code back to life for
     whoever still has the original invitation email. */
  const revoked = await db.collection(collections.invites).updateMany(
    { redeemedBy: { $in: shapes } },
    { $set: { revokedAt: new Date(), revokedBy: admin.email, revokedReason: "account_deleted" } }
  );

  await users.deleteOne({ _id: new ObjectId(userId) });

  return json({
    ok: true,
    deleted: { id: userId, name: target.name || null, email: target.email, role: target.role || "mentee" },
    removed,
    invitesRevoked: revoked.modifiedCount,
  });
}

async function handler(request, admin) {
  if (request.method === "DELETE") return remove(request, admin);
  if (request.method !== "GET") return fail(405, "method_not_allowed", "Use GET or DELETE.");

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
