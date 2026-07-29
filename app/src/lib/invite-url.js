/**
 * Mentor invitation links, shared by the founder console and anything else that
 * hands a code to a human.
 *
 * Lives here rather than in the Teams bundle it used to sit in: the founder
 * console is the real, shipping user of this, and it should not depend on a
 * module that exists to serve a marketing surface.
 *
 * lib/invite-url.js at the repo root is the server-side twin, used when the
 * console mints and emails a code in one action. It cannot be shared with this
 * file — `app/` is the Vite root and cannot reach outside it — so the two must
 * be kept in step by hand. Change the query shape in one, change it in both.
 */

/**
 * The public invitation page for a minted code.
 *
 * `claim` is where the recipient lands after confirming — the consumer app's
 * mentor sign-up, with the code carried through so they never retype it. This
 * previously pointed at the Ryzn for Teams demo, which meant a real founding
 * mentor accepting a real invitation ended up in a mock org console instead of
 * creating an account.
 */
export function buildInviteUrl({ code, email, name, role, orgName, adminName, preview }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://ryzn.one";
  const explicit = String(name || "").trim();
  const nameGuess = (email || "").split("@")[0].split(/[._-]/)[0];
  const display =
    explicit ||
    (nameGuess ? nameGuess.charAt(0).toUpperCase() + nameGuess.slice(1) : "");

  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (display) params.set("name", display);
  if (adminName) params.set("founder", adminName);
  if (orgName) params.set("org", orgName);
  if (role) params.set("role", role);
  if (preview) params.set("preview", "1");
  if (code && !preview) {
    params.set("claim", `${origin}/app/#/join?code=${encodeURIComponent(code)}`);
  }

  return `${origin}/mentor-invite.html?${params.toString()}`;
}

export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  return Promise.resolve();
}
