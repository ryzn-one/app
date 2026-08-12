import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { isMentorRole } from "../lib/roles.js";

/**
 * GET /api/impact — this mentor's Impact Score trend, built from the xp_events
 * ledger /api/posts already writes to (kind: "impact") every time a post or
 * greeting video lands. The founding cohort is thin on history, so a handful
 * of points — or none — is a normal, honest answer here; nothing is
 * backfilled or smoothed to look busier than it is.
 */
async function handler(request, user) {
  if (!isMentorRole(user.role)) return fail(403, "forbidden", "Mentors only.");

  const db = await getDb();
  const events = await db.collection(collections.xpEvents)
    .find({ userId: user.id, kind: "impact" }, { projection: { amount: 1, createdAt: 1 } })
    .sort({ createdAt: 1 })
    .limit(200)
    .toArray();

  let running = 0;
  const points = events.map((e) => {
    running += e.amount || 0;
    return { t: e.createdAt?.toISOString?.() ?? e.createdAt, cumulative: running };
  });

  return json({ points, total: running });
}

export default { fetch: withUser(handler) };
