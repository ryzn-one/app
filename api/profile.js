import { handleUpload } from "@vercel/blob/client";
import { del } from "@vercel/blob";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser, getUser } from "../lib/http.js";

/**
 * /api/profile — the fields people write about themselves.
 *
 *   PATCH /api/profile            headline, education, experience, industry,
 *                                 avatarUrl, bannerUrl
 *   POST  /api/profile?upload=1   Vercel Blob token for an avatar / banner
 *
 * The upload token lives here rather than in its own function because Vercel
 * counts functions per deployment and this project sits near the ceiling.
 * /api/posts?upload=1 signs tokens for cohort content, which only mentors
 * publish; this one signs tokens for a profile picture, which everyone has.
 */

const MAX = {
  // LinkedIn's own cap, and the length the placeholder copy is written against.
  headline: 220,
  education: 600,
  experience: 600,
  industry: 80,
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Where a caller's profile images are allowed to live. Used twice: to approve
    the upload token, and to check the URL they hand back afterwards. */
const prefixFor = (userId) => `avatars/${userId}/`;

/**
 * The browser uploads straight to Blob storage and then tells us the URL, so
 * "the client said so" has to be checked before it becomes someone's picture.
 * Right host, and a path inside the caller's own folder — the same two checks
 * api/posts.js makes, for the same reason: without them any URL on the internet
 * could be pinned to a profile and served as though we host it.
 *
 * Returns the cleaned URL, null to clear the field, or undefined for a value we
 * won't store.
 */
function cleanImageUrl(value, userId) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  let parsed;
  try { parsed = new URL(value); } catch { return undefined; }
  if (!parsed.host.endsWith(".public.blob.vercel-storage.com")) return undefined;
  if (!parsed.pathname.replace(/^\//, "").startsWith(prefixFor(userId))) return undefined;
  return parsed.toString();
}

/** Best-effort cleanup of the file a picture just replaced. Uploads carry a
    random suffix, so without this every re-crop leaks a blob forever. A failure
    here must not fail the save — the new image is already live. */
async function forget(url) {
  try { await del(url); } catch (err) { console.warn("[profile] stale blob left behind:", err?.message); }
}

async function handler(request, user) {
  if (request.method !== "PATCH") {
    return fail(405, "method_not_allowed", "Use PATCH.");
  }

  const db = await getDb();
  const profiles = db.collection(collections.profiles);
  const body = await request.json().catch(() => ({}));

  const updates = {};

  for (const [key, limit] of Object.entries(MAX)) {
    if (!(key in body)) continue;
    // Empty clears the field rather than storing "", so every reader's
    // `?? null` and `u?.headline &&` checks stay true to what's on the profile.
    updates[key] = String(body[key] ?? "").trim().slice(0, limit) || null;
  }

  for (const key of ["avatarUrl", "bannerUrl"]) {
    if (!(key in body)) continue;
    const url = cleanImageUrl(body[key], user.id);
    if (url === undefined) {
      return fail(400, "bad_image", `That ${key === "bannerUrl" ? "cover image" : "picture"} isn't one we hosted for you.`);
    }
    updates[key] = url;
  }

  if (!Object.keys(updates).length) {
    return fail(400, "nothing_to_save", "No profile fields to update.");
  }

  updates.updatedAt = new Date();

  /* Read-then-write so the blob a picture replaces can be deleted: the
     pre-image is the only place the old URL still exists. */
  const before = await profiles.findOneAndUpdate(
    { userId: user.id },
    { $set: updates },
    { projection: { avatarUrl: 1, bannerUrl: 1 }, returnDocument: "before" }
  );
  if (!before) return fail(404, "no_profile", "Profile not found.");

  await Promise.all(
    ["avatarUrl", "bannerUrl"]
      .filter((key) => key in updates && before[key] && before[key] !== updates[key])
      .map((key) => forget(before[key]))
  );

  return json({ ok: true, profile: updates });
}

/**
 * Blob upload tokens for profile images.
 *
 * Sits outside withUser because handleUpload owns the request body and needs
 * the raw request; the session is resolved inside onBeforeGenerateToken. The
 * file goes browser → Blob directly and never through this function.
 */
async function upload(request) {
  let body;
  try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }
  try {
    return json(await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getUser(request);
        if (!user) throw new Error("Sign in to upload.");
        /* This hook can approve a destination but not rewrite it, so the client
           proposes the path and anything outside the caller's own folder is
           refused — otherwise one account could write into another's prefix and
           then claim the file as their picture. */
        if (!String(pathname).startsWith(prefixFor(user.id))) {
          throw new Error("Bad upload path.");
        }
        return {
          allowedContentTypes: IMAGE_TYPES,
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async () => {
        /* Never fires on localhost — there's no public URL to call back to. The
           PATCH that follows is what saves the picture, so this stays empty and
           the flow behaves the same in both places. */
      },
    }));
  } catch (err) {
    return fail(400, "upload_failed", err?.message || "Couldn't start that upload.");
  }
}

export default {
  fetch: (request) =>
    request.method === "POST" && new URL(request.url).searchParams.get("upload") === "1"
      ? upload(request)
      : withUser(handler)(request),
};
