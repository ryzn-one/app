import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { rateLimit } from "../lib/ratelimit.js";
import { isMentorRole } from "../lib/roles.js";
import { newInviteCode } from "../lib/admin.js";
import { sendEmail, orgInviteEmail } from "../lib/email.js";
import { inviteUrl, nameFromEmail } from "../lib/invite-url.js";
import {
  GRANTABLE_ORG_ROLES, canManageOrg, cleanName, cleanShort, cleanMission,
  cleanWebsite, cleanDivision, cleanRules, DEFAULT_ORG_RULES,
  freeSlug, orgContext, publicOrg,
} from "../lib/orgs.js";

/**
 * /api/orgs — a mentor's own organisation.
 *
 *   GET                                       my org, my standing in it, its people
 *   POST  { name, size, website, mission }    create one (mentors only) and own it
 *   PATCH { action: "update", … }             rename / edit, managers
 *   PATCH { action: "rules", … }              programme rules, managers
 *   PATCH { action: "orbit", enabled }        open or close the org Orbit
 *   PATCH { action: "invite", to?, count? }   mint org-scoped mentor codes
 *   PATCH { action: "revoke", code }          kill an unclaimed org code
 *   PATCH { action: "role", userId, orgRole } owner promotes/demotes
 *   PATCH { action: "division", userId, … }   managers seat someone in a team
 *   PATCH { action: "remove", userId }        managers remove someone
 *   PATCH { action: "leave" }                 anyone but the owner walks out
 *
 * Creating an org requires the mentor role, which still only comes from claiming
 * an invite — so this endpoint hands out org-level admin, never platform admin.
 * The two stay separate on purpose: an org owner runs their own roster, not Ryzn.
 *
 * One function, several verbs. Vercel's function budget is tight enough that
 * five endpoints for one resource isn't worth the slots, and every branch here
 * shares the same membership lookup anyway.
 */

const MAX_MINT = 25;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Platform roles an org can seat — never platform admin. */
const GRANTABLE_ROLES = new Set(["mentor", "mentee"]);
const roleLabel = (role) => (role === "mentee" ? "Mentee" : "Mentor");

const inviteState = (i, now = new Date()) => {
  if (i.revokedAt) return "revoked";
  if (i.redeemedBy) return "claimed";
  if (i.expiresAt && i.expiresAt < now) return "expired";
  return "open";
};

/** People in the org, with the bits the console actually renders. */
async function peopleOf(db, orgId, { withEmail }) {
  const memberships = await db
    .collection(collections.orgMembers)
    .find({ orgId: String(orgId) })
    .sort({ joinedAt: 1 })
    .toArray();
  if (!memberships.length) return [];

  const ids = memberships.map((m) => m.userId);
  const [users, profiles] = await Promise.all([
    db.collection(collections.user)
      .find(
        { _id: { $in: ids.filter(ObjectId.isValid).map((id) => new ObjectId(id)) } },
        { projection: { name: 1, email: 1, role: 1 } }
      )
      .toArray(),
    db.collection(collections.profiles)
      .find({ userId: { $in: ids } }, { projection: { userId: 1, impact: 1, tier: 1, headline: 1 } })
      .toArray(),
  ]);
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const profileById = new Map(profiles.map((p) => [p.userId, p]));

  return memberships.map((m) => {
    const u = byId.get(m.userId);
    const p = profileById.get(m.userId) || {};
    return {
      id: m.userId,
      name: u?.name || "—",
      // Addresses are manager-only: a member roster is not a mailing list.
      email: withEmail ? u?.email ?? null : null,
      role: u?.role || "mentee",
      orgRole: m.orgRole,
      division: m.division ?? null,
      headline: p.headline ?? null,
      impact: p.impact ?? null,
      tier: p.tier ?? null,
      joinedAt: m.joinedAt,
    };
  });
}

/** Codes minted for this org, newest first. Managers only — see callers. */
async function invitesOf(db, orgId) {
  const rows = await db
    .collection(collections.invites)
    .find({ orgId: String(orgId) })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const now = new Date();
  return rows.map((i) => ({
    code: i.code,
    state: inviteState(i, now),
    role: GRANTABLE_ROLES.has(i.role) ? i.role : "mentor",
    orgRole: i.orgRole || "member",
    division: i.orgDivision ?? null,
    note: i.note || null,
    createdAt: i.createdAt,
    expiresAt: i.expiresAt || null,
    redeemedAt: i.redeemedAt || null,
    sentTo: i.sentTo || null,
    sentName: i.sentName || null,
    sentAt: i.sentAt || null,
    lastSendError: i.lastSendError || null,
  }));
}

/**
 * Mail one org code. Never throws: a delivery failure must not undo a mint —
 * the code is live either way and the manager can still copy the link by hand.
 */
async function deliver({ invites, code, to, name, inviter, org, role }) {
  const seat = GRANTABLE_ROLES.has(role) ? role : "mentor";
  const url = inviteUrl({ code, name, founder: inviter, org, role: roleLabel(seat) });
  await invites.updateOne({ code }, { $set: { sentTo: to, sentName: name || null } });
  try {
    const msg = orgInviteEmail({ name, url, inviter, org, role: seat });
    const res = await sendEmail({ to, ...msg });
    await invites.updateOne(
      { code },
      { $set: { sentAt: new Date(), lastSendError: null }, $inc: { sentCount: 1 } }
    );
    return res.delivered
      ? { sent: true, url }
      : { sent: false, url, sendError: "No email provider configured — the invitation was logged, not sent." };
  } catch (err) {
    const sendError = String(err?.message || err).slice(0, 300);
    await invites.updateOne({ code }, { $set: { lastSendError: sendError } });
    return { sent: false, url, sendError };
  }
}

/** The whole console payload, so every write can answer with fresh state. */
async function contextPayload(db, user, ctx) {
  if (!ctx) {
    return {
      org: null,
      members: [],
      invites: [],
      // Owning an org is a mentor's tool. A mentee sees the pitch instead, and
      // the client says why rather than hiding the form with no explanation.
      canCreate: isMentorRole(user.role),
    };
  }
  const { org, membership } = ctx;
  const manages = canManageOrg(membership.orgRole);
  const [members, invites] = await Promise.all([
    peopleOf(db, org._id, { withEmail: manages }),
    manages ? invitesOf(db, org._id) : Promise.resolve([]),
  ]);
  return {
    org: publicOrg(org, { orgRole: membership.orgRole, memberCount: members.length }),
    members,
    invites,
    canCreate: false,
  };
}

async function handler(request, user) {
  const db = await getDb();
  const orgs = db.collection(collections.orgs);
  const orgMembers = db.collection(collections.orgMembers);
  const invites = db.collection(collections.invites);

  const ctx = await orgContext(db, user.id);

  /* ————— read ————— */
  if (request.method === "GET") {
    return json(await contextPayload(db, user, ctx));
  }

  /* ————— create ————— */
  if (request.method === "POST") {
    if (!isMentorRole(user.role)) {
      return fail(403, "mentors_only", "Organisations are created by mentors. Claim a mentor invitation first.");
    }
    if (ctx) return fail(409, "already_in_org", `You're already in ${ctx.org.name}.`);

    const limit = await rateLimit(`org-create:${user.id}`, { limit: 5 });
    if (!limit.ok) return fail(429, "rate_limited", "Too many attempts. Try again later.");

    let body = {};
    try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

    const name = cleanName(body.name);
    if (name.length < 2) return fail(400, "bad_name", "Give the organisation a name.");

    const now = new Date();
    const base = {
      name,
      ownerId: user.id,
      size: cleanShort(body.size) || null,
      website: cleanWebsite(body.website),
      mission: cleanMission(body.mission) || null,
      // The Orbit is a deliberate second step: an empty org feed on day one is
      // worse than a closed one, so the owner opens it when there's a roster.
      orbitActive: false,
      orbitActivatedAt: null,
      // Written explicitly rather than left absent, so a new org's rules are
      // visible in the document a manager is about to edit.
      rules: { ...DEFAULT_ORG_RULES },
      createdAt: now,
      updatedAt: now,
    };

    let inserted;
    for (let attempt = 0; attempt < 2 && !inserted; attempt++) {
      const slug = await freeSlug(db, attempt === 0 ? name : `${name}-${Math.random().toString(36).slice(2, 6)}`);
      try {
        const res = await orgs.insertOne({ ...base, slug });
        inserted = { _id: res.insertedId, ...base, slug };
      } catch (err) {
        // 11000 on ownerId means a double-submit already made this org — return
        // that one rather than a second. On slug it means someone took the name
        // between the check and the insert; the retry picks a fresh one.
        if (err?.code !== 11000) throw err;
        const mine = await orgs.findOne({ ownerId: user.id });
        if (mine) inserted = mine;
      }
    }
    if (!inserted) return fail(409, "name_taken", "Couldn't reserve that name. Try a slightly different one.");

    await orgMembers.updateOne(
      { orgId: String(inserted._id), userId: user.id },
      { $setOnInsert: { orgId: String(inserted._id), userId: user.id, orgRole: "owner", joinedAt: now, invitedBy: null } },
      { upsert: true }
    );

    const fresh = await orgContext(db, user.id);
    return json(await contextPayload(db, user, fresh), 201);
  }

  /* ————— manage ————— */
  if (request.method !== "PATCH") return fail(405, "method_not_allowed", "Use GET, POST or PATCH.");
  if (!ctx) return fail(404, "no_org", "You're not in an organisation yet.");

  let body = {};
  try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

  const { org, membership } = ctx;
  const orgId = String(org._id);
  const manages = canManageOrg(membership.orgRole);
  const isOwner = membership.orgRole === "owner";
  const action = String(body.action || "");

  const managerOnly = () =>
    manages ? null : fail(403, "not_a_manager", "Only the owner and org admins can do that.");

  if (action === "update") {
    const denied = managerOnly();
    if (denied) return denied;

    const $set = { updatedAt: new Date() };
    if (body.name !== undefined) {
      const name = cleanName(body.name);
      if (name.length < 2) return fail(400, "bad_name", "Give the organisation a name.");
      $set.name = name;
    }
    if (body.size !== undefined) $set.size = cleanShort(body.size) || null;
    if (body.website !== undefined) $set.website = cleanWebsite(body.website);
    if (body.mission !== undefined) $set.mission = cleanMission(body.mission) || null;
    // The slug is the org's handle and may already be in circulation — renaming
    // the org does not silently move it.
    await orgs.updateOne({ _id: org._id }, { $set });
    return json(await contextPayload(db, user, await orgContext(db, user.id)));
  }

  if (action === "rules") {
    const denied = managerOnly();
    if (denied) return denied;
    /* Merged against what's stored, so a console that only knows one switch
       cannot blank the others by omitting them. */
    const rules = cleanRules(body.rules ?? body, org.rules);
    await orgs.updateOne({ _id: org._id }, { $set: { rules, updatedAt: new Date() } });
    return json(await contextPayload(db, user, await orgContext(db, user.id)));
  }

  if (action === "division") {
    const denied = managerOnly();
    if (denied) return denied;
    const userId = String(body.userId || "");
    // null is a real value here — it un-seats someone from a team, which the
    // cross-division rule then reads as "shows them everyone".
    const division = cleanDivision(body.division);
    const res = await orgMembers.updateOne({ orgId, userId }, { $set: { division } });
    if (!res.matchedCount) return fail(404, "not_a_member", "They're not in this organisation.");
    return json(await contextPayload(db, user, ctx));
  }

  if (action === "orbit") {
    const denied = managerOnly();
    if (denied) return denied;
    const enabled = !!body.enabled;
    await orgs.updateOne(
      { _id: org._id },
      { $set: { orbitActive: enabled, orbitActivatedAt: enabled ? new Date() : null, updatedAt: new Date() } }
    );
    return json(await contextPayload(db, user, await orgContext(db, user.id)));
  }

  if (action === "invite") {
    const denied = managerOnly();
    if (denied) return denied;

    const role = GRANTABLE_ROLES.has(body.role) ? body.role : "mentor";
    // Org admin is a mentor-side privilege — mentee invites are always members.
    const orgRole = role === "mentee"
      ? "member"
      : (GRANTABLE_ORG_ROLES.has(body.orgRole) ? body.orgRole : "member");
    const to = String(body.to || "").trim().toLowerCase();
    if (to && !EMAIL_RE.test(to)) return fail(400, "bad_request", "That doesn't look like an email address.");

    const rl = await rateLimit(`org-invite:${user.id}`, { limit: 60 });
    if (!rl.ok) return fail(429, "rate_limited", "That's a lot of invitations in one hour. Try again shortly.");

    // Addressing one person means one code for them, whatever count says.
    const count = to ? 1 : Math.min(Math.max(Number(body.count) || 1, 1), MAX_MINT);
    const days = Number(body.expiresDays) > 0 ? Number(body.expiresDays) : 90;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const note = cleanShort(body.note) || org.name;
    /* Which team they're joining, decided at invite time. Carried on the code
       and copied onto the membership at redeem, so an employee lands already
       seated — otherwise every new hire starts division-less and the
       cross-division rule has nothing to match them on. */
    const division = cleanDivision(body.division);

    const docs = Array.from({ length: count }, () => ({
      code: newInviteCode(),
      // Platform role, read back by api/invites/redeem.js. An org can seat
      // mentors and mentees — it can never mint platform admins.
      role,
      orgId,
      orgRole,
      orgDivision: division,
      orgName: org.name,
      createdAt: new Date(),
      createdBy: user.email,
      createdByUserId: user.id,
      expiresAt,
      redeemedBy: null,   // explicit null, not absent — the atomic claim filter
      redeemedAt: null,   // in api/invites/redeem.js matches on null
      revokedAt: null,
      note,
    }));

    await invites.insertMany(docs);
    const created = docs.map((d) => d.code);

    let delivery = { sent: false };
    if (to) {
      const name = String(body.name || "").trim() || nameFromEmail(to);
      delivery = await deliver({
        invites, code: created[0], to, name,
        inviter: user.name || user.email, org: org.name, role,
      });
    } else {
      // Even without email, hand back the web-invite URL so "copy link" and
      // the mint response agree with what /mentor-invite.html expects.
      delivery = {
        sent: false,
        url: inviteUrl({
          code: created[0],
          founder: user.name || user.email,
          org: org.name,
          role: roleLabel(role),
        }),
      };
    }

    return json({ ...(await contextPayload(db, user, ctx)), created, to: to || null, ...delivery }, 201);
  }

  if (action === "revoke") {
    const denied = managerOnly();
    if (denied) return denied;
    const code = String(body.code || "").trim().toUpperCase();
    if (!code) return fail(400, "bad_request", "Which code?");
    // Scoped to this org's own codes, and guarded on redeemedBy: null — a
    // claimed code can't be withdrawn, the mentor already holds the role.
    const res = await invites.updateOne(
      { code, orgId, redeemedBy: null },
      { $set: { revokedAt: new Date(), revokedBy: user.email } }
    );
    if (!res.matchedCount) return fail(409, "not_revocable", "That code is already claimed or isn't one of yours.");
    return json(await contextPayload(db, user, ctx));
  }

  if (action === "role") {
    if (!isOwner) return fail(403, "owner_only", "Only the owner changes who runs the org.");
    const userId = String(body.userId || "");
    const orgRole = String(body.orgRole || "");
    if (!GRANTABLE_ORG_ROLES.has(orgRole)) return fail(400, "bad_request", "Roles are `admin` or `member`.");
    if (userId === org.ownerId) return fail(400, "owner_immutable", "The owner's role can't be changed here.");
    const res = await orgMembers.updateOne({ orgId, userId }, { $set: { orgRole } });
    if (!res.matchedCount) return fail(404, "not_a_member", "They're not in this organisation.");
    return json(await contextPayload(db, user, ctx));
  }

  if (action === "remove") {
    const denied = managerOnly();
    if (denied) return denied;
    const userId = String(body.userId || "");
    if (userId === org.ownerId) return fail(400, "owner_immutable", "The owner can't be removed from their own org.");
    // An org admin runs the roster; only the owner outranks another admin.
    const target = await orgMembers.findOne({ orgId, userId });
    if (!target) return fail(404, "not_a_member", "They're not in this organisation.");
    if (target.orgRole === "admin" && !isOwner) {
      return fail(403, "owner_only", "Only the owner can remove another org admin.");
    }
    await orgMembers.deleteOne({ orgId, userId });
    return json(await contextPayload(db, user, ctx));
  }

  if (action === "leave") {
    if (isOwner) {
      return fail(400, "owner_cannot_leave", "Hand the org to someone else before you leave it.");
    }
    await orgMembers.deleteOne({ orgId, userId: user.id });
    return json(await contextPayload(db, user, null));
  }

  return fail(400, "bad_request", "Unknown action.");
}

export default { fetch: withUser(handler) };
