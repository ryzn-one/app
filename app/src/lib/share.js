/**
 * Sharing out of Ryzn.
 *
 * Three buttons across the app used to toast "Opening LinkedIn share…" and do
 * nothing at all. This opens LinkedIn's real composer with the text prefilled.
 *
 * Deliberately the `shareActive` composer rather than `share-offsite`: the
 * latter needs a public URL to attach, and Ryzn has no public profile or badge
 * verification pages yet. When those exist, add a `url` here.
 */
export function shareToLinkedIn(text) {
  const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer,width=680,height=720");
}
