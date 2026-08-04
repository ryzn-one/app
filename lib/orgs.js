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

export const cleanName = (v) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
export const cleanShort = (v) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SHORT);
export const cleanMission = (v) => String(v ?? "").trim().slice(0, MAX_MISSION);

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
  ownerId: org.ownerId,
  createdAt: org.createdAt,
  memberCount,
  orgRole,
  canManage: canManageOrg(orgRole),
});
