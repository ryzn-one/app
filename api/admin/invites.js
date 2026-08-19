import { ObjectId } from "mongodb";
import { getDb, collections } from "../../lib/db.js";
import { json, fail } from "../../lib/http.js";
import { withAdmin, newInviteCode } from "../../lib/admin.js";
import { rateLimit } from "../../lib/ratelimit.js";
import { sendEmail, inviteEmail } from "../../lib/email.js";
import { inviteUrl, nameFromEmail } from "../../lib/invite-url.js";

/**
 * /api/admin/invites, the founder side of the mentor Roster.
 *
 *   GET                                          list codes, newest first
 *   POST  { count, expiresDays, note, role }     mint single-use codes
 *   POST  { to, name, ... }                      mint one and email it
 *   PATCH { code, action:"revoke" }              kill an unclaimed code
 *   PATCH { code, action:"resend", to?, name? }  email an existing code again
 *   DELETE { code }                              erase the row entirely
 *
 * Revoke and delete are not the same tool. Revoke kills a code and keeps the
 * record of it; delete removes the row, and with it any trace of who was
 * invited and whether they came. Revoke is the one to reach for on a real
 * invitation, delete exists to clear test codes out of the ledger.
 *
 * Redemption still happens only in api/invites/redeem.js. Nothing here promotes
 * anyone, minting a code and claiming it stay separate operations. An admin
 * code is how a founder adds another founder without touching env vars: mint,
 * send, they sign in and paste it.
 *
 * Sending is deliberately folded in here rather than given its own function:
 * from the founder's side "mint and send" is one action, and Vercel's function
 * budget is tight enough that a second endpoint isn't worth the slot.
 */

const MAX_MINT = 50;
const GRANTABLE = new Set(["mentor", "mentee", "admin"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const roleLabel = (role) => {
  if (role === "admin") return "Admin";
  if (role === "mentee") return "Mentee";
  return "Mentor";
};

/**
 * Mail a code to one person.
 *
 * Never throws: a delivery failure must not undo a mint. The code is already
 * valid and the founder can still copy the link by hand, so the caller reports
 * the failure and moves on rather than losing the invitation entirely.
 */
async function deliver({ invites, code, to, name, founder, role = "mentor" }) {
  const seat = GRANTABLE.has(role) ? role : "mentor";
  const url = inviteUrl({ code, name, founder, role: roleLabel(seat) });
  // Persist who this seat is for even if the send fails, Postmark and the
  // personalized link both need sentName later.
  await invites.updateOne(
    { code },
    { $set: { sentTo: to, sentName: name || null } }
  );
  try {
    const msg = inviteEmail({ name, url, founder, role: seat });
    const res = await sendEmail({ to, ...msg });

    /* delivered:false means no provider token is configured, the mail was
       written to the log, not sent. That is a failed send and has to be
       recorded as one. Stamping sentAt here regardless (as this did) left a
       row indistinguishable from a real delivery: the console showed a sent
       date, `npm run invites:status` agreed, and nobody had the invitation.
       A misconfigured mailer must not be able to look like a delivered one. */
    if (!res.delivered) {
      const sendError = "No email provider configured, the invitation was logged, not sent.";
      await invites.updateOne({ code }, { $set: { lastSendError: sendError } });
      return { sent: false, url, sendError };
    }

    await invites.updateOne(
      { code },
      { $set: { sentAt: new Date(), lastSendError: null }, $inc: { sentCount: 1 } }
    );
    return { sent: true, url, provider: res.provider };
  } catch (err) {
    const sendError = String(err?.message || err).slice(0, 300);
    await invites.updateOne({ code }, { $set: { lastSendError: sendError } });
    return { sent: false, url, sendError };
  }
}

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
      claimedBy: who ? { name: who.name || "-", email: who.email } : null,
      sentTo: i.sentTo || null,
      sentName: i.sentName || null,
      sentAt: i.sentAt || null,
      sentCount: i.sentCount || 0,
      lastSendError: i.lastSendError || null,
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

    const to = String(body.to || "").trim().toLowerCase();
    if (to && !EMAIL_RE.test(to)) return fail(400, "bad_request", "That doesn't look like an email address.");
    if (to) {
      const rl = await rateLimit(`invite-send:${admin.email}`, { limit: 50 });
      if (!rl.ok) return fail(429, "rate_limited", "That's a lot of invitations in one hour. Try again shortly.");
    }

    // An admin code hands over the whole console. Mint them one at a time so a
    // fat-fingered "50" can't scatter founder access across an inbox.
    const cap = role === "admin" ? 5 : MAX_MINT;
    // Addressing one person means minting exactly one code for them, whatever
    // count says, a batch would email the same person five separate seats.
    const count = to ? 1 : Math.min(Math.max(Number(body.count) || 1, 1), cap);
    const days = Number(body.expiresDays) > 0 ? Number(body.expiresDays) : 90;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const fallbackNote = role === "admin" ? "Founder access" : role === "mentee" ? "Mentee seat" : "Founding cohort";
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 120) : fallbackNote;

    const docs = Array.from({ length: count }, () => ({
      code: newInviteCode(),
      role,               // read back by api/invites/redeem.js, the only thing
      createdAt: new Date(),  // that decides which role a claim grants
      createdBy: admin.email,
      expiresAt,
      redeemedBy: null,   // explicit null, not absent, the atomic claim filter
      redeemedAt: null,   // in api/invites/redeem.js matches on null
      revokedAt: null,
      note,
    }));

    await invites.insertMany(docs);
    const created = docs.map((d) => d.code);

    if (to) {
      const name = String(body.name || "").trim() || nameFromEmail(to);
      const out = await deliver({
        invites, code: created[0], to, name, founder: admin.name || admin.email, role,
      });
      return json({ created, role, expiresAt, to, ...out }, 201);
    }

    return json({ created, role, expiresAt, sent: false }, 201);
  }

  if (request.method === "PATCH") {
    let body = {};
    try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

    const code = String(body.code || "").trim().toUpperCase();
    if (!code) return fail(400, "bad_request", "Which code?");
    if (body.action !== "revoke" && body.action !== "resend") {
      return fail(400, "bad_request", "Only `revoke` and `resend` are supported.");
    }

    if (body.action === "resend") {
      const rl = await rateLimit(`invite-send:${admin.email}`, { limit: 50 });
      if (!rl.ok) return fail(429, "rate_limited", "That's a lot of invitations in one hour. Try again shortly.");

      const iv = await invites.findOne({ code });
      if (!iv) return fail(404, "invalid_code", "No such code.");
      if (iv.redeemedBy) return fail(409, "already_used", "That code is already claimed.");
      if (iv.revokedAt) return fail(410, "revoked", "That code was revoked.");

      // Falls back to whoever it went to last, so "Resend" on an existing row
      // needs no retyping.
      const to = String(body.to || iv.sentTo || "").trim().toLowerCase();
      if (!to) return fail(400, "bad_request", "No address on file for that code, enter one.");
      if (!EMAIL_RE.test(to)) return fail(400, "bad_request", "That doesn't look like an email address.");

      const name = String(body.name || "").trim() || iv.sentName || nameFromEmail(to);
      const out = await deliver({
        invites, code, to, name, founder: admin.name || admin.email, role: iv.role || "mentor",
      });
      return json({ ok: true, code, to, ...out });
    }

    // Guarded on redeemedBy: null, a claimed code cannot be withdrawn, the
    // mentor already has the role.
    const res = await invites.updateOne(
      { code, redeemedBy: null },
      { $set: { revokedAt: new Date(), revokedBy: admin.email } }
    );
    if (!res.matchedCount) return fail(409, "not_revocable", "That code is already claimed or doesn't exist.");
    return json({ ok: true, code });
  }

  if (request.method === "DELETE") {
    let body = {};
    try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

    const code = String(body.code || "").trim().toUpperCase();
    if (!code) return fail(400, "bad_request", "Which code?");

    /* Deleting a claimed code is allowed but destroys the record of how that
       person got in, the account keeps its role either way, since the role
       lives on the user document, not here. Returned so the console can say
       what it just erased rather than a bare ok. */
    const gone = await invites.findOneAndDelete({ code });
    if (!gone) return fail(404, "invalid_code", "No such code.");
    return json({ ok: true, code, wasClaimed: !!gone.redeemedBy });
  }

  return fail(405, "method_not_allowed", "Use GET, POST, PATCH or DELETE.");
}

export default { fetch: withAdmin(handler) };
