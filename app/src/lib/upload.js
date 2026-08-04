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

/**
 * A still from the video, as a JPEG.
 *
 * This is the thumbnail a shared link unfurls with. It has to be grabbed here
 * because nothing server-side can produce one — the file goes browser → Blob
 * directly and a Vercel function has neither the video nor a decoder for it.
 * Resolves null whenever the browser can't decode the codec (a .mov from an
 * iPhone on Chrome, say), and the link falls back to the Ryzn card.
 */
function posterOf(file) {
  if (!file.type.startsWith("video/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    el.muted = true;
    el.playsInline = true;

    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(el.src);
      resolve(v);
    };
    // Never hold up the post: a browser that stalls on seek just gets no poster.
    const timer = setTimeout(() => done(null), 8000);

    // Frame zero of a talking-head video is usually a half-blink, so seek in.
    el.onloadeddata = () => {
      try { el.currentTime = Math.min(1.5, (el.duration || 2) / 2); }
      catch { done(null); }
    };
    el.onseeked = () => {
      try {
        const { videoWidth: w, videoHeight: h } = el;
        if (!w || !h) return done(null);
        const scale = Math.min(1, 1280 / w);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        canvas.getContext("2d").drawImage(el, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => done(blob ? new File([blob], "poster.jpg", { type: "image/jpeg" }) : null),
          "image/jpeg",
          0.82
        );
      } catch { done(null); }
    };
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

  const [blob, durationSec, poster] = await Promise.all([
    upload(`posts/${userId}/${safeName(file.name)}`, file, {
      access: "public",
      handleUploadUrl: "/api/posts?upload=1",
      // Read by onBeforeGenerateToken to pick the right size cap.
      clientPayload: kind,
      onUploadProgress: onProgress ? (p) => onProgress(p.percentage ?? 0) : undefined,
    }),
    durationOf(file),
    posterOf(file),
  ]);

  /* The poster is a nicety — a failure here must not cost the mentor the
     upload they just sat through. */
  let posterUrl = null;
  if (poster) {
    try {
      const shot = await upload(`posts/${userId}/poster-${safeName(file.name)}.jpg`, poster, {
        access: "public",
        handleUploadUrl: "/api/posts?upload=1",
        clientPayload: "photo",
      });
      posterUrl = shot.url;
    } catch { posterUrl = null; }
  }

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: file.type,
    size: file.size,
    durationSec,
    posterUrl,
  };
}

/* Profile pictures are smaller than cohort content and everyone has one, so
   they get their own cap and their own prefix rather than sharing `posts/`,
   which /api/posts signs for mentors only. */
const MAX_PROFILE_IMAGE = 8 * 1024 * 1024;

/**
 * Avatar or cover image. Same browser → Blob path as uploadMedia; the caller
 * follows up with updateProfile({ avatarUrl }) to actually pin it, and the
 * server re-checks the host and prefix before it stores the URL.
 *
 * `kind` only shapes the filename — the destination folder is the caller's own
 * either way, which is what the token check is written against.
 */
export async function uploadProfileImage(file, kind, onProgress, userId) {
  if (!ACCEPT.photo.split(",").includes(file.type)) {
    throw new Error("Pick a JPG, PNG, WEBP or GIF.");
  }
  if (file.size > MAX_PROFILE_IMAGE) {
    throw new Error(`That image is ${Math.round(file.size / 1048576)} MB — the limit is ${Math.round(MAX_PROFILE_IMAGE / 1048576)} MB.`);
  }
  if (!userId) throw new Error("Not signed in.");

  const blob = await upload(`avatars/${userId}/${kind}-${safeName(file.name)}`, file, {
    access: "public",
    handleUploadUrl: "/api/profile?upload=1",
    onUploadProgress: onProgress ? (p) => onProgress(p.percentage ?? 0) : undefined,
  });
  return blob.url;
}
