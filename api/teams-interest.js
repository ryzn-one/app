import { getDb, collections } from "../lib/db.js";
import { json, fail } from "../lib/http.js";
import { rateLimit } from "../lib/ratelimit.js";

/**
 * POST /api/teams-interest, Ryzn for Teams waitlist.
 *
 * Unauthenticated: the whole point is to hear from people who don't have an
 * account. That makes it the second public write endpoint on the platform, so
 * it is rate limited by IP and stores nothing it wasn't given.
 */

const MAX = 200;
const clean = (v) => (typeof v === "string" ? v.trim().slice(0, MAX) : "");

// Deliberately loose. A stricter pattern rejects valid addresses far more often
// than it catches bad ones, and this list gets read by a human anyway.
const looksLikeEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default {
  async fetch(request) {
    if (request.method !== "POST") return fail(405, "method_not_allowed", "Use POST.");

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = await rateLimit(`teams-interest:${ip}`, { limit: 5 });
    if (!limit.ok) return fail(429, "rate_limited", "Too many submissions. Try again later.");

    let body;
    try {
      body = await request.json();
    } catch {
      return fail(400, "bad_request", "Expected a JSON body.");
    }

    const email = clean(body?.email).toLowerCase();
    if (!looksLikeEmail(email)) return fail(400, "bad_email", "That doesn't look like an email address.");

    const db = await getDb();
    const now = new Date();

    // Upsert on email so a second submission updates rather than duplicating,
    // and so re-submitting is never an error the visitor has to think about.
    await db.collection(collections.teamsInterest).updateOne(
      { email },
      {
        $set: { email, org: clean(body?.org), size: clean(body?.size), updatedAt: now },
        $setOnInsert: { createdAt: now, source: "app" },
      },
      { upsert: true }
    );

    return json({ ok: true });
  },
};
