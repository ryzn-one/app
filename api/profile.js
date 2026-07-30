import { getDb, collections } from "../lib/db.js";
import { json, withUser } from "../lib/http.js";

/**
 * PATCH /api/profile — update profile fields like education, experience, etc.
 */
async function handler(request, user) {
  if (request.method !== "PATCH") {
    return json({ error: "Method not allowed" }, 405);
  }

  const db = await getDb();
  const profiles = db.collection(collections.profiles);

  const body = await request.json().catch(() => ({}));

  // Whitelist fields that can be updated
  const allowed = ["education", "experience", "headline", "industry"];
  const updates = {};

  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return json({ error: "No valid fields to update" }, 400);
  }

  updates.updatedAt = new Date();

  const result = await profiles.updateOne(
    { userId: user.id },
    { $set: updates }
  );

  if (result.matchedCount === 0) {
    return json({ error: "Profile not found" }, 404);
  }

  return json({ success: true });
}

export default { fetch: withUser(handler) };
