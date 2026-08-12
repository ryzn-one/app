import { ObjectId } from "mongodb";
import { collections } from "./db.js";

/**
 * Orgs — a mentor's own company inside Ryzn.
 *
 * The shape is deliberately small. An org is one document with an owner, and
 * membership is one document per person, so "who is in this org" has exactly one
 * source and cannot drift from a counter cached on the org. Member counts are
 * counted, never incremented.
 *
 * Platform role and org role are separate things and must stay that way:
 *   role       (user doc)        mentee | mentor | admin — what the product does for you
 *   orgRole    (org_members doc) owner | admin | member  — what you may do inside one org
 *
 * An org invite mints an ordinary invite code with `orgId` on it (mentor or
 * mentee platform role), so the one atomic claim in api/invites/redeem.js still
 * decides the platform role. Joining the org is a consequence of that claim,
 * not a second way to get one.
 *
 * One org per person for now: `orgContext` reads the first membership it finds.
 * The unique index is (orgId, userId), so widening this later is a query change
 * here rather than a migration.
 */

export const ORG_ROLES = new Set(["owner", "admin", "member"]);
/** Roles an existing manager can hand out — never `owner`; that transfers the org. */
export const GRANTABLE_ORG_ROLES = new Set(["admin", "member"]);

export const canManageOrg = (orgRole) => orgRole === "owner" || orgRole === "admin";

const MAX_NAME = 80;
const MAX_SHORT = 120;
const MAX_MISSION = 400;
const MAX_DIVISION = 40;

export const cleanName = (v) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
export const cleanShort = (v) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SHORT);
export const cleanMission = (v) => String(v ?? "").trim().slice(0, MAX_MISSION);

/**
 * The team someone sits in inside their org — "Product", "Engineering".
 *
 * It lives on the membership rather than the profile because it describes a
 * seat, not a person: it means nothing outside this org and it should leave
 * with them. Free text on purpose — an org's org chart is not ours to enumerate.
 */
export const cleanDivision = (v) => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_DIVISION);
  return s || null;
};

/**
 * Programme rules — the switches a manager flips in the console, applied
 * server-side on every org-scoped roster read.
 *
 *   crossDivision  false ⇒ a mentee only sees mentors in their own division
 *   capacityGate   true  ⇒ mentors already at their stated cohort size drop out
 *                          of the deck rather than being offered and then 409ing
 *
 * These belong on the org document, not in the console's React state. A rule
 * that only exists in the client is a rule /api/roster cannot enforce, and
 * /api/roster is the endpoint that decides who a mentee is allowed to see.
 *
 * Deliberately absent: the "Staff+ mentors only" seniority gate from the
 * prototype. Nothing in the data model records seniority — `profiles.tier` is
 * written once as "Scout" at redeem and never promoted — so the switch would
 * filter on a field that carries no meaning. It needs a real seniority field
 * on the membership before it can be honest.
 */
export const DEFAULT_ORG_RULES = { crossDivision: true, capacityGate: false };

/** An org's rules with defaults filled in — orgs created before rules existed
    have no `rules` key, and must read as the permissive default, not as `{}`. */
export const orgRules = (org) => ({ ...DEFAULT_ORG_RULES, ...(org?.rules || {}) });

/** Known keys only, coerced to booleans. An unknown key from a hand-rolled
    PATCH would otherwise persist and read back as a rule nothing enforces. */
export function cleanRules(input, current) {
  const out = orgRules({ rules: current });
  for (const key of Object.keys(DEFAULT_ORG_RULES)) {
    if (input?.[key] !== undefined) out[key] = !!input[key];
  }
  return out;
}

/** "Genie Labs, Inc." -> "genie-labs-inc". Used for the org's public handle. */
export function slugify(name) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * First unused slug for a name. The unique index is still the authority — a
 * concurrent create can take the candidate between the check and the insert, so
 * the caller retries on a duplicate-key error rather than trusting this alone.
 */
export async function freeSlug(db, name) {
  const base = slugify(name) || "org";
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const hit = await db.collection(collections.orgs).findOne({ slug: candidate }, { projection: { _id: 1 } });
    if (!hit) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

/** A website field that's safe to render as a link, or null. */
export function cleanWebsite(v) {
  const raw = String(v ?? "").trim().slice(0, 200);
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * The caller's org and their standing in it, or null.
 * Returns null for an orphaned membership too — a deleted org is not an error
 * the caller has to handle differently from having no org at all.
 */
export async function orgContext(db, userId) {
  const membership = await db
    .collection(collections.orgMembers)
    .findOne({ userId: String(userId) }, { sort: { joinedAt: 1 } });
  if (!membership) return null;

  let org = null;
  try {
    org = await db.collection(collections.orgs).findOne({ _id: new ObjectId(membership.orgId) });
  } catch {
    return null; // membership written with an unparseable id — treat as no org
  }
  if (!org) return null;
  return { org, membership };
}

/** Everyone in an org, oldest membership first. */
export async function orgMemberIds(db, orgId) {
  const rows = await db
    .collection(collections.orgMembers)
    .find({ orgId: String(orgId) }, { projection: { userId: 1 } })
    .toArray();
  return rows.map((r) => r.userId);
}

/**
 * Every seat in an org, keyed by user id.
 *
 * One read for a whole roster page: the alternative is a membership lookup per
 * candidate, and the org-scoped deck needs a division for every card it draws.
 */
export async function orgSeats(db, orgId) {
  const rows = await db
    .collection(collections.orgMembers)
    .find({ orgId: String(orgId) }, { projection: { userId: 1, orgRole: 1, division: 1 } })
    .toArray();
  return new Map(rows.map((r) => [r.userId, { orgRole: r.orgRole, division: r.division ?? null }]));
}

/** The distinct divisions an org actually uses, for the console's pickers and
    the deck's filter sheet. Derived from the seats, never a second list to
    keep in sync. */
export const divisionsOf = (seats) =>
  [...new Set([...seats.values()].map((s) => s.division).filter(Boolean))].sort();

/** The org as the client sees it. `orgRole` is the viewer's, not the org's. */
export const publicOrg = (org, { orgRole = null, memberCount = null } = {}) => ({
  id: String(org._id),
  name: org.name,
  slug: org.slug,
  size: org.size ?? null,
  website: org.website ?? null,
  mission: org.mission ?? null,
  orbitActive: !!org.orbitActive,
  orbitActivatedAt: org.orbitActivatedAt ?? null,
  // The programme rules the org-scoped roster enforces. Shipped on every org
  // payload so the deck can show *why* it is narrower than the platform one
  // ("Product only") instead of silently hiding people.
  rules: orgRules(org),
  ownerId: org.ownerId,
  createdAt: org.createdAt,
  memberCount,
  orgRole,
  canManage: canManageOrg(orgRole),
});
