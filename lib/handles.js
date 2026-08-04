import { collections } from "./db.js";

/**
 * Public profile handles — the first segment of ryzn.one/{handle}/{post-slug}.
 *
 * Compact (no hyphens): "Bilal Shafi" → "bilalshafi". That matches how people
 * already type a profile into a URL bar, and keeps the path visually distinct
 * from post slugs which still use hyphenated words.
 */

const MAX = 30;

/** Path segments and product surfaces that must never be claimable as handles. */
export const RESERVED_HANDLES = new Set([
  "app", "api", "p", "admin", "branding", "privacy", "terms",
  "invite", "mentor-invite", "favicon", "manifest", "assets",
  "www", "mail", "static", "cdn", "org", "orgs", "teams",
  "login", "join", "post", "posts", "me", "settings", "help",
  "auth", "robots", "sitemap", "health", "status",
]);

/** "Bilal Shafi" / "bilal.shafi" → "bilalshafi". */
export function handleFromName(name) {
  const compact = String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, MAX);
  return compact || "user";
}

export function cleanHandle(raw) {
  const h = handleFromName(raw);
  if (h.length < 2) return null;
  if (RESERVED_HANDLES.has(h)) return null;
  if (/^\d+$/.test(h)) return null;
  return h;
}

/**
 * First unused handle for this account. Unique index on profiles.handle is the
 * authority — a concurrent signup can take the candidate between check and
 * write, so the caller retries on duplicate key rather than trusting this alone.
 */
export async function freeHandle(db, name) {
  const base = cleanHandle(name) || "user";
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? base : `${base}${i + 1}`.slice(0, MAX);
    if (RESERVED_HANDLES.has(candidate)) continue;
    const hit = await db.collection(collections.profiles).findOne(
      { handle: candidate },
      { projection: { _id: 1 } }
    );
    if (!hit) return candidate;
  }
  return `${base}${Math.random().toString(36).slice(2, 6)}`.slice(0, MAX);
}

/**
 * Ensure the profile has a public handle. Idempotent. Returns the (possibly
 * updated) profile document.
 */
export async function ensureHandle(db, user, profile) {
  if (profile?.handle && !RESERVED_HANDLES.has(profile.handle)) return profile;

  const profiles = db.collection(collections.profiles);
  for (let attempt = 0; attempt < 4; attempt++) {
    const handle = await freeHandle(db, user?.name || user?.email || "user");
    try {
      await profiles.updateOne(
        { userId: String(user.id), $or: [{ handle: null }, { handle: { $exists: false } }, { handle: "" }] },
        { $set: { handle, updatedAt: new Date() } }
      );
      const fresh = await profiles.findOne({ userId: String(user.id) });
      if (fresh?.handle) return fresh;
    } catch (err) {
      if (err?.code !== 11000) throw err;
    }
  }
  return profile;
}
