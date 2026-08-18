/**
 * Sharing out of Ryzn.
 *
 * A post link is a public page — ryzn.one/{handle}/{slug} — served by
 * lib/post-page.js with its own Open Graph tags, the way an Instagram or TikTok
 * link is. Anyone can open it, app or no app, account or no account.
 *
 * Legacy /p/{slug} links still resolve. Prefer the handle form whenever we
 * know who wrote it.
 *
 * It only works that way for a post the mentor marked public: a cohort post
 * keeps its pairing check, and its link lands on the locked page. The Share
 * button says which one you copied so nobody sends a link that dead-ends.
 *
 * LinkedIn still uses the text composer — LinkedIn's share endpoint takes a
 * text body, not a URL, so the link goes in as part of the post.
 */
import { copyText } from "./invite-url.js";

export function shareToLinkedIn(text) {
  const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer,width=680,height=720");
}

const originNow = () => (typeof window !== "undefined" ? window.location.origin : "https://ryzn.one");

/** True when this link opens for a stranger rather than landing on the wall. */
export const isPublicPost = (post) => !!(post?.slug && post?.visibility === "public");

/**
 * The link to hand out. Falls back to the authenticated deep link for a post
 * old enough to have no slug yet — the next read of that post mints one.
 */
export function buildPostShareUrl(post) {
  const slug = typeof post === "string" ? null : post?.slug;
  const id = typeof post === "string" ? post : post?.id;
  const handle = typeof post === "string" ? null : (post?.authorHandle || post?.handle || null);
  if (slug && handle) return `${originNow()}/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}`;
  if (slug) return `${originNow()}/p/${encodeURIComponent(slug)}`;
  return `${originNow()}/app/#/post/${encodeURIComponent(id)}`;
}

/**
 * Sharing a promoted resource.
 *
 * The link that goes out is the *original* one — the TikTok, the book, the
 * paper — not a Ryzn page wrapped around it. Interposing ourselves between a
 * creator and their views to farm a click-through would be the exact behaviour
 * that makes people stop pasting links, and a mentor forwarding a recommendation
 * wants their friend to land on the thing, not on a signup wall.
 *
 * What Ryzn gets is the attribution line that travels with it. That is the whole
 * growth mechanic here: the endorsement is ours, the content never was.
 */
export function resourceShareText(resource, by) {
  const who = by ? `${by} on Ryzn` : "Ryzn";
  const lines = [resource.title, resource.note ? `“${resource.note}”` : null, `Promoted by ${who} · ryzn.one`];
  return lines.filter(Boolean).join("\n");
}

export async function shareResourceLink(resource, { by } = {}) {
  const url = resource?.url;
  if (!url) return "copied";
  const text = resourceShareText(resource, by);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: resource.title || "Worth your time", text, url });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "shared";
    }
  }
  await copyText(`${text}\n${url}`);
  return "copied";
}

/**
 * Prefer the OS share sheet when it exists; otherwise copy the link.
 * Returns `"shared"` | `"copied"`.
 */
export async function sharePostLink(post, { title, text } = {}) {
  const url = buildPostShareUrl(post);
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
