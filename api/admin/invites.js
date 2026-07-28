import { ObjectId } from "mongodb";
import { getDb, collections } from "../../lib/db.js";
import { json, fail } from "../../lib/http.js";
import { withAdmin, newInviteCode } from "../../lib/admin.js";

/**
 * /api/admin/invites — the founder side of the mentor Roster.
 *
 *   GET                                        list codes, newest first
 *   POST  { count, expiresDays, note, role }   mint single-use codes
 *   PATCH { code, action:"revoke" }            kill an unclaimed code
 *
 * Redemption still happens only in api/invites/redeem.js. Nothing here promotes
 * anyone — minting a code and claiming it stay separate operations. An admin
 * code is how a founder adds another founder without touching env vars: mint,
 * send, they sign in and paste it.
 */

const MAX_MINT = 50;
const GRANTABLE = new Set(["mentor", "admin"]);

async function list(db) {
  const invites = db.collection(collections.invites);
  const rows = await invites.find({}).sort({ createdAt: -1 }).limit(200).toArray();

  // Resolve claimants in one query rather than per-invite.
  const ids = rows.filter((i) => i.redeemedBy).map((i) => new ObjectId(i.redeemedBy));
  const users = ids.length
    ? await db.collection(collections.user).find({ _id: { $in: ids } }, { projection: { name: 1, email: 1 } }).toArray()
    : [];
  const byId = new Map(users.map((u) => [String(u._id), u]));

  const now = new Date();
  const state = (i) => {
    if (i.revokedAt) return "revoked";
    if (i.redeemedBy) return "claimed";
    if (i.expiresAt && i.expiresAt < now) return "expired";
    return "open";
  };

  return rows.map((i) => {
    const who = i.redeemedBy ? byId.get(String(i.redeemedBy)) : null;
    return {
      code: i.code,
      state: state(i),
      role: GRANTABLE.has(i.role) ? i.role : "mentor",
      note: i.note || null,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt || null,
      redeemedAt: i.redeemedAt || null,
      claimedBy: who ? { name: who.name || "—", email: who.email } : null,
    };
  });
}

async function handler(request, admin) {
  const db = await getDb();
  const invites = db.collection(collections.invites);

  if (request.method === "GET") {
    return json({ invites: await list(db) });
  }

  if (request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

    const role = GRANTABLE.has(body.role) ? body.role : "mentor";
    // An admin code hands over the whole console. Mint them one at a time so a
    // fat-fingered "50" can't scatter founder access across an inbox.
    const cap = role === "admin" ? 5 : MAX_MINT;
    const count = Math.min(Math.max(Number(body.count) || 1, 1), cap);
    const days = Number(body.expiresDays) > 0 ? Number(body.expiresDays) : 90;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const fallbackNote = role === "admin" ? "Founder access" : "Founding cohort";
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 120) : fallbackNote;

    const docs = Array.from({ length: count }, () => ({
      code: newInviteCode(),
      role,               // read back by api/invites/redeem.js — the only thing
      createdAt: new Date(),  // that decides which role a claim grants
      createdBy: admin.email,
      expiresAt,
      redeemedBy: null,   // explicit null, not absent — the atomic claim filter
      redeemedAt: null,   // in api/invites/redeem.js matches on null
      revokedAt: null,
      note,
    }));

    await invites.insertMany(docs);
    return json({ created: docs.map((d) => d.code), role, expiresAt }, 201);
  }

  if (request.method === "PATCH") {
    let body = {};
    try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

    const code = String(body.code || "").trim().toUpperCase();
    if (!code) return fail(400, "bad_request", "Which code?");
    if (body.action !== "revoke") return fail(400, "bad_request", "Only `revoke` is supported.");

    // Guarded on redeemedBy: null — a claimed code cannot be withdrawn, the
    // mentor already has the role.
    const res = await invites.updateOne(
      { code, redeemedBy: null },
      { $set: { revokedAt: new Date(), revokedBy: admin.email } }
    );
    if (!res.matchedCount) return fail(409, "not_revocable", "That code is already claimed or doesn't exist.");
    return json({ ok: true, code });
  }

  return fail(405, "method_not_allowed", "Use GET, POST or PATCH.");
}

export default { fetch: withAdmin(handler) };
