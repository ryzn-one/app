import { upload } from "@vercel/blob/client";

/**
 * Media uploads.
 *
 * The file goes browser → Blob storage directly. It never passes through a
 * Vercel function, which caps a request body at 4.5 MB — a 90-second greeting
 * video is comfortably past that, so routing it server-side isn't a style
 * choice we could have made differently. /api/posts?upload=1 only signs a token.
 *
 * The returned descriptor is handed straight to createPost(). The server
 * re-checks the host and the path prefix before storing it, because "the client
 * told us the URL" is otherwise a way to attach any URL on the internet.
 */

export const ACCEPT = {
  photo: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/quicktime,video/webm",
  resource: ".pdf,.doc,.docx,.pptx,application/pdf",
};

const MAX = { video: 200 * 1024 * 1024, other: 12 * 1024 * 1024 };

/** Reads a video's duration in the browser so the post can show "1:24" without
    the server having to open the file. Resolves null if the browser won't say. */
function durationOf(file) {
  if (!file.type.startsWith("video/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    const done = (v) => { URL.revokeObjectURL(el.src); resolve(v); };
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : null);
    el.onerror = () => done(null);
    el.src = URL.createObjectURL(file);
  });
}

/** Strips anything that would let a filename climb out of its own folder. */
const safeName = (name) => String(name).replace(/[^\w.\-]+/g, "_").slice(-80) || "file";

/**
 * `userId` is part of the path because the destination is chosen here, not on
 * the server: onBeforeGenerateToken can't override the pathname, it can only
 * approve or reject it. So the client proposes `posts/<its id>/<file>` and the
 * server checks that prefix against the session twice — once when signing the
 * token, once when the post is created.
 */
export async function uploadMedia(file, kind, onProgress, userId) {
  const cap = kind === "video" ? MAX.video : MAX.other;
  if (file.size > cap) {
    throw new Error(`That file is ${Math.round(file.size / 1048576)} MB — the limit is ${Math.round(cap / 1048576)} MB.`);
  }
  if (!userId) throw new Error("Not signed in.");

  const [blob, durationSec] = await Promise.all([
    upload(`posts/${userId}/${safeName(file.name)}`, file, {
      access: "public",
      handleUploadUrl: "/api/posts?upload=1",
      // Read by onBeforeGenerateToken to pick the right size cap.
      clientPayload: kind,
      onUploadProgress: onProgress ? (p) => onProgress(p.percentage ?? 0) : undefined,
    }),
    durationOf(file),
  ]);

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: file.type,
    size: file.size,
    durationSec,
  };
}
