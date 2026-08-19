import { getDb } from "./db.js";

/**
 * Minimal fixed-window rate limiter backed by Mongo.
 *
 * Exists because /api/invites/validate is necessarily unauthenticated, the
 * register screen validates a code before an account exists, which makes it
 * the one endpoint an attacker can hammer to enumerate invite codes.
 * Combined with high-entropy codes (see scripts/db-setup.mjs) this closes it.
 */
export async function rateLimit(key, { limit = 10, windowMs = 60 * 60 * 1000 } = {}) {
  const db = await getDb();
  const col = db.collection("rate_limits");
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

  const doc = await col.findOneAndUpdate(
    { key, windowStart },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart.getTime() + windowMs) } },
    { upsert: true, returnDocument: "after" }
  );

  const count = doc?.count ?? 1;
  return { ok: count <= limit, count, limit };
}

/** Best-effort client IP behind Vercel's proxy. */
export const clientIp = (request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  request.headers.get("x-real-ip") ||
  "unknown";
