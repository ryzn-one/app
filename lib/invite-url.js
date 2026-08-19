/**
 * Server-side twin of app/src/lib/invite-url.js.
 *
 * The client builder reads window.location.origin, which does not exist inside a
 * serverless function, so it cannot be reused here, and `app/` is the Vite root
 * and cannot import from `../../lib/`, so it cannot be shared the other way
 * either. The two files must be kept in step; if you change the query shape in
 * one, change it in the other.
 */

/**
 * Where an invitation link points.
 *
 * Origin never falls back to VERCEL_URL: a preview hostname baked into a real
 * email 404s for the recipient the moment that deployment is superseded, and an
 * invitation is exactly the kind of mail people open a week late.
 */
export function inviteOrigin() {
  return (
    process.env.PUBLIC_ORIGIN ||
    process.env.BETTER_AUTH_URL ||
    "https://ryzn.one"
  ).replace(/\/+$/, "");
}

export function inviteUrl({ code, name, founder, role, org, origin = inviteOrigin() }) {
  const isMentee = String(role || "").toLowerCase() === "mentee";
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (name) params.set("name", name);
  if (founder) params.set("founder", founder);
  // `org` re-writes the invitation's opening line to name the company doing the
  // inviting, both invite pages read it. Set when an org seats someone.
  if (org) params.set("org", org);
  if (role) params.set("role", role);
  params.set("claim", `${origin}/app/#/join?code=${encodeURIComponent(code || "")}${isMentee ? "&role=mentee" : ""}`);

  // Two pages, one query shape. A mentee sent to mentor-invite.html reads a
  // pitch about Impact Score and holding a roster seat, which is not the offer.
  return `${origin}/${isMentee ? "mentee-invite" : "mentor-invite"}.html?${params.toString()}`;
}

/** "kaleem.shah@x.com" -> "Kaleem". Only a guess; an explicit name always wins. */
export function nameFromEmail(email) {
  const guess = String(email || "").split("@")[0].split(/[._-]/)[0];
  return guess ? guess.charAt(0).toUpperCase() + guess.slice(1) : "";
}
