/**
 * Sharing out of Ryzn.
 *
 * LinkedIn still uses the text composer — Ryzn has no public offsite profile
 * page yet (see docs/BACKEND.md). Post links are authenticated deep links:
 * anyone with access who is signed in lands on the post; everyone else gets
 * the normal sign-in wall.
 */
import { copyText } from "./invite-url.js";

export function shareToLinkedIn(text) {
  const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer,width=680,height=720");
}

/** Origin-aware deep link a paired mentee / org peer can open after signing in. */
export function buildPostShareUrl(postId) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://ryzn.one";
  return `${origin}/app/#/post/${encodeURIComponent(postId)}`;
}

/**
 * Prefer the OS share sheet when it exists; otherwise copy the link.
 * Returns `"shared"` | `"copied"`.
 */
export async function sharePostLink(postId, { title, text } = {}) {
  const url = buildPostShareUrl(postId);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: title || "Ryzn post",
        text: text || "Open this on Ryzn",
        url,
      });
      return "shared";
    } catch (err) {
      // User dismissed the sheet — not an error worth toasting as failure.
      if (err?.name === "AbortError") return "shared";
    }
  }
  await copyText(url);
  return "copied";
}
