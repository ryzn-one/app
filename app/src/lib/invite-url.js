/**
 * Mentor invitation links, shared by the founder console and anything else that
 * hands a code to a human.
 *
 * Lives here rather than in the Teams bundle it used to sit in: the founder
 * console is the real, shipping user of this, and it should not depend on a
 * module that exists to serve a marketing surface.
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
export function buildInviteUrl({ code, email, role, orgName, adminName }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://ryzn.one";
  const nameGuess = (email || "").split("@")[0].split(/[._]/)[0];
  const display = nameGuess ? nameGuess.charAt(0).toUpperCase() + nameGuess.slice(1) : "";

  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (display) params.set("name", display);
  if (adminName) params.set("founder", adminName);
  if (orgName) params.set("org", orgName);
  if (role) params.set("role", role);
  params.set("claim", `${origin}/app/#/join?code=${encodeURIComponent(code || "")}`);

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
