import { createAuthClient } from "better-auth/react";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";

/* There is no prototype mode. Every screen talks to the real backend, and an
   unauthenticated caller gets a 401 rather than a fixture, the bypass that
   used to let any input through the auth screens is gone deliberately. */

export const authClient = createAuthClient({
  // Same origin as the app, so cookies just work. basePath defaults to /api/auth.
  plugins: [
    emailOTPClient(),
    // The client can't import the server config (separate package), so the
    // custom user fields are declared here to keep them typed and returned.
    inferAdditionalFields({
      user: {
        role: { type: "string" },
        onboardingComplete: { type: "boolean" },
        dateOfBirth: { type: "date" },
        guardianEmail: { type: "string" },
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

/** Turns Better Auth's error shape into something a screen can render. */
export const messageFor = (error, fallback = "Something went wrong. Try again.") => {
  if (!error) return fallback;
  const code = error.code || error.status;
  const map = {
    INVALID_EMAIL_OR_PASSWORD: "That email and password don't match.",
    USER_ALREADY_EXISTS: "An account with that email already exists.",
    PASSWORD_TOO_SHORT: "Passwords need at least 10 characters.",
    INVALID_OTP: "That code isn't right. Check it and try again.",
    OTP_EXPIRED: "That code expired. Request a new one.",
    TOO_MANY_ATTEMPTS: "Too many attempts. Wait a few minutes.",
  };
  return map[code] || error.message || fallback;
};

/** Thin JSON fetch for the non-Better-Auth endpoints (/api/me, /api/invites/*). */
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || res.statusText), { code: data.error, status: res.status });
  return data;
}

export const validateInvite = (code) => api("/invites/validate", { method: "POST", body: { code } });
export const redeemInvite = (code) => api("/invites/redeem", { method: "POST", body: { code } });
export const fetchMe = () => api("/me");

/** Persists the Ryzn AI setup answers. The chat is one-time-only, so this is
    what makes that promise true across sessions. */
export const saveOnboarding = (answers) => api("/onboarding", { method: "POST", body: { answers } });

/** Update profile fields like education, experience, headline, etc. */
export const updateProfile = (updates) => api("/profile", { method: "PATCH", body: updates });

/* ----- Preferences, export, deletion -----
   Preferences are identity-level: notification, visibility and availability
   settings follow a person across every orbit, because nobody should configure
   streak reminders once per employer and again per circle. Merged server-side,
   so sending one switch leaves the rest alone. */
export const updatePrefs = (prefs) => api("/profile", { method: "PATCH", body: { prefs } });

/** Everything Ryzn holds about the caller. Fetched rather than linked so the
    session cookie authenticates it, a data export is not a public URL. */
export async function exportMyData() {
  const res = await fetch("/api/profile?export=1", { credentials: "include" });
  if (!res.ok) throw new Error("Couldn't build your export.");
  return res.blob();
}

/** Erase the account and everything it owns. Refused while the caller still owns
    an orbit, the people in it would lose a space because someone else left. */
export const deleteMyAccount = () => api("/profile", { method: "DELETE" });

/** Real people on the other side of the platform, mentors for a mentee,
    mentees for a mentor. Returns `{ role, people }`; `people` is often empty
    in an early cohort, and that is a valid answer, not an error. */
export const fetchRoster = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== false));
  return api(`/roster${qs.toString() ? `?${qs}` : ""}`);
};
/** Explore keeps people you've already answered for, tagged with `matchState`,
    so the directory doesn't hide your own cohort from you. */
export const exploreRoster = ({ q } = {}) => fetchRoster({ include: "all", q });

/** The Teams deck: your own company only, under your org's programme rules.
 *
 *  Answers `{ scope, org: { name, division, divisions }, rules, people }` -
 *  each person carrying their `division`, so the deck can label why it is
 *  narrower than the platform one. 403s `no_org` if the caller has no org,
 *  which is a client-side routing bug rather than an empty company. */
export const fetchOrgRoster = ({ q, side, include } = {}) =>
  fetchRoster({ scope: "org", q, side, include });

/** The deck for one orbit, drawn from its pool under its policy.
 *
 *  Answers `{ policy, org, rules, people }`, the policy that was *applied*, not
 *  a copy of it, so the deck's CTA, its seat counter and its "why is this narrow"
 *  chips all describe the rules the server just enforced. The public orbit is
 *  unscoped: its pool is everyone. */
export const fetchOrbitRoster = ({ orbitId, q, side, include } = {}) =>
  fetchRoster({ orbitId, q, side, include });

/* ----- The mentor network -----
   Mentor ↔ mentor, which is a different relationship from mentor ↔ mentee: a
   follow is one-sided, needs no handshake, and commits neither side to a
   pairing. It decides one thing, whose posts land in your network feed. */

/** Other mentors, with `following` / `followsYou` / `followers` per row.
    The Roster. `guild` rides along: mentors worldwide, chapters, and, only when
    an orbit is named, how many are here. The first two are the same in every
    orbit, because the guild lives above them. */
export const fetchMentorPeers = ({ q, orbitId } = {}) => fetchRoster({ side: "mentors", q, orbitId });
export const followMentor = (mentorId) =>
  api("/roster", { method: "POST", body: { mentorId, action: "follow" } });
export const unfollowMentor = (mentorId) =>
  api("/roster", { method: "POST", body: { mentorId, action: "unfollow" } });

/** Public posts from the mentors you follow. Each carries `amplified`: whether
    you've already put it in your own Orbit. */
export const fetchNetworkFeed = () => api("/posts?scope=following");

/**
 * Discover, the orbit feed.
 *
 * One store, one filter: posts by this orbit's pool, plus everyone you follow.
 * There are no per-orbit copies of a post; the union *is* the cross-orbit reach
 * property, which is why a creator's post lands in a member's company orbit at
 * all. A company orbit whose admin switched `allowExternal` off drops the second
 * half of that union, and each post says which half it arrived through.
 */
export const fetchOrbitFeed = (orbitId) =>
  api(`/posts?scope=orbit${orbitId ? `&orbitId=${encodeURIComponent(orbitId)}` : ""}`);
/** Put another mentor's public post into your Orbit, your mentees read it
    alongside your own. A pointer, not a copy: the byline, the counters and the
    delete button all stay with whoever wrote it. Idempotent. */
export const amplifyPost = (id) => api("/posts", { method: "PATCH", body: { id, action: "amplify" } });
export const unamplifyPost = (id) => api("/posts", { method: "PATCH", body: { id, action: "unamplify" } });

/* ----- Matches -----
   A pairing is one shared document, so both sides read the same truth and it
   survives a refresh. Opening a match against someone who already asked you
   *is* the accept, the server collapses that case. */
/** Every pairing the caller has, in every orbit, each tagged with `orbitId`.
    `usage.limit` is the active orbit's `cap` for a mentee, pass `orbitId` so
    the seat counter describes the orbit they are actually looking at. */
export const fetchMatches = (orbitId) =>
  api(`/matches${orbitId ? `?orbitId=${encodeURIComponent(orbitId)}` : ""}`);
/** `action` is "request" or "pass", a pass is recorded so the deck doesn't
    re-offer someone you already said no to. `otherId` is a user id here.

    `answer` is what the applicant wrote to qualify, and is required when the
    orbit's `policy.matchMode` is "Apply". In "Open" it is ignored server-side -
    a rule that is switched off must not keep collecting what it would need. */
export const requestMatch = (otherId, action = "request", { orbitId, answer } = {}) =>
  api("/matches", { method: "POST", body: { otherId, action, orbitId, answer } });
/** `id` is a match id, not a user id: accept | decline | end | promote. */
export const respondToMatch = (id, action) => api("/matches", { method: "PATCH", body: { id, action } });

/* ----- Mentor content -----
   The mentor writes it, their cohort reads it. Both sides call the same
   endpoint; the server decides what each is allowed to see. Posts used to be a
   React array that died on refresh and never reached a mentee at all. */

/** Own feed when called bare; a mentor's feed when given their id (requires an
    accepted match, the server checks, not us). Pass `scope: "profile"` to read
    only public posts without a pair (match-deck / explore previews).
    Returns `{posts, viewerState}`; `viewerState` rehydrates what you've already
    watched and reacted to. */
export const fetchPosts = ({ mentorId, scope, id } = {}) => {
  const qs = new URLSearchParams();
  if (mentorId) qs.set("mentorId", mentorId);
  if (scope) qs.set("scope", scope);
  if (id) qs.set("id", id);
  const q = qs.toString();
  return api(`/posts${q ? `?${q}` : ""}`);
};
export const createPost = (body) => api("/posts", { method: "POST", body });
/** `action` is "view" or "react". Idempotent, a second call is a no-op, so a
    double tap can't inflate a mentor's numbers or re-award XP. */
export const postAction = (id, action) => api("/posts", { method: "PATCH", body: { id, action } });
/** Comment thread for a post the caller can already see. */
export const fetchComments = (id) => api(`/posts?id=${encodeURIComponent(id)}&comments=1`);
export const addComment = (id, text) =>
  api("/posts", { method: "PATCH", body: { id, action: "comment", text } });
/** Like a comment. Idempotent, the server dedupes via likedBy. */
export const reactToComment = (postId, commentId) =>
  api("/posts", { method: "PATCH", body: { id: postId, action: "comment_react", commentId } });
/** Pin, change visibility, or edit the copy. Author only. */
export const updatePost = (id, patch) => api("/posts", { method: "PATCH", body: { id, ...patch } });
export const deletePost = (id) => api(`/posts?id=${encodeURIComponent(id)}`, { method: "DELETE" });

/* ----- Promote to Ryzn -----
   A mentor's shelf: things they found elsewhere, a TikTok, a short, a book, a
   paper, and put their name behind. Every one of these rides on /api/profile
   under `?resources=1`; the shelf belongs to a profile in the same sense a
   headline does, and Vercel counts functions per deployment.

   Nothing here is rehosted. The row holds a URL and the mentor's own reason for
   vouching, and opening one leaves for the original platform, which is what
   keeps a creator's views the creator's. */

const RESOURCES = "/profile?resources=1";

/** Own shelf when called bare; a mentor's shelf when given their id. A cohort
    resource needs an accepted pairing, exactly like a cohort post, the server
    checks, not us. `scope: "saved"` is the caller's own reading list;
    `scope: "network"` is public picks from the mentors they follow, each tagged
    with `onMyShelf`. */
export const fetchResources = ({ mentorId, scope } = {}) => {
  const qs = new URLSearchParams();
  if (mentorId) qs.set("mentorId", mentorId);
  if (scope) qs.set("scope", scope);
  const extra = qs.toString();
  return api(`${RESOURCES}${extra ? `&${extra}` : ""}`);
};

/** Put something on your shelf. Mentors only. The server reads the platform,
    the kind and the thumbnail off the URL, so `{ url, title }` is enough. */
export const promoteResource = (body) => api(RESOURCES, { method: "POST", body });

/** Take a peer's public pick onto your own shelf, credited to them. A copy, not
    a pointer, the canonical thing is the link, so your shelf survives them
    taking their endorsement down. */
export const repromoteResource = (id, { note } = {}) =>
  api(RESOURCES, { method: "POST", body: { repromote: id, note } });

/** Record the tap that opens the link. Idempotent: XP is collected once, and
    the mentor's click count moves once. Answers `{ xp, url }`. */
export const openResource = (id) => api(RESOURCES, { method: "PATCH", body: { id, action: "open" } });
/** Keep it, or stop keeping it. The mentee half of a curated shelf. */
export const saveResource = (id) => api(RESOURCES, { method: "PATCH", body: { id, action: "save" } });
export const unsaveResource = (id) => api(RESOURCES, { method: "PATCH", body: { id, action: "unsave" } });
/** Pin, retitle, re-note, or flip who it's for. Owner only. */
export const updateResource = (id, patch) => api(RESOURCES, { method: "PATCH", body: { id, ...patch } });
export const deleteResource = (id) => api(`${RESOURCES}&id=${encodeURIComponent(id)}`, { method: "DELETE" });

/* ----- Program -----
   A mentor's authored phases, and a mentee's progress against them. Progress
   lives on the shared match record server-side, not here, this is just the
   thin fetch wrapper, same shape as the other domain calls. */
export const fetchProgram = ({ mentorId, menteeId } = {}) => {
  const qs = new URLSearchParams(
    Object.entries({ mentorId, menteeId }).filter(([, v]) => v)
  ).toString();
  return api(`/program${qs ? `?${qs}` : ""}`);
};
export const saveProgram = (phases) => api("/program", { method: "PUT", body: { phases } });
export const setPhaseComplete = ({ menteeId, phaseId, completed }) =>
  api("/program", { method: "PATCH", body: { menteeId, phaseId, completed } });

/* ----- Daily exercises -----
   Mentee writes today's paragraph; the server stores it, awards XP, bumps
   streak, and flips stage1Complete so Direct Connect opens. Mentors read a
   paired mentee's submissions with ?menteeId=. */
/* ----- Impact history -----
   The mentor's own Impact Score trend, aggregated server-side from the
   xp_events ledger. Mentor-only; used to draw the dashboard sparkline. */
export const fetchImpactHistory = () => api("/impact");

export const fetchExercises = () => api("/exercises");
export const fetchMenteeExercises = (menteeId) =>
  api(`/exercises?menteeId=${encodeURIComponent(menteeId)}`);
/** `orbitId` decides which orbit's Stage 1 track this paragraph completes. The
    XP and streak are identity-level and count everywhere; the track is not. */
export const submitExercise = ({ text, exerciseId, orbitId } = {}) =>
  api("/exercises", { method: "POST", body: { text, exerciseId, orbitId } });

/* ----- Direct Connect -----
   Accepted mentee↔mentor only; locked until the mentee finishes Stage 1. */
export const fetchMessages = (otherId) =>
  api(`/messages?otherId=${encodeURIComponent(otherId)}`);
export const sendMessage = (otherId, text) =>
  api("/messages", { method: "POST", body: { otherId, text } });

/* ----- Mentor Meets -----
   Events are either quarterly platform-wide Meets (admin-created) or mentor-hosted
   events (fixed-time or poll availability). Both mentors/admins and mentees can
   see and respond to visible events: RSVPing for fixed events or voting on poll
   availability. Hosts can finalize polls and cancel events. */
export const fetchEvents = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== false));
  return api(`/events${qs.toString() ? `?${qs}` : ""}`);
};
export const createEvent = (body) => api("/events", { method: "POST", body });
export const eventAction = (id, action, extra = {}) =>
  api("/events", { method: "PATCH", body: { id, action, ...extra } });

/* ----- 1:1 Sessions -----
   The booking handshake between a matched mentor and mentee: one side proposes
   up to five times, the other accepts one of them. Only then is a session
   booked, and only then can it go into anyone's calendar. */
export const fetchSessions = () => api("/sessions");
export const createSession = (body) => api("/sessions", { method: "POST", body });
/** `action` is accept | decline | reschedule | cancel | complete | update. */
export const sessionAction = (id, action, extra = {}) =>
  api("/sessions", { method: "PATCH", body: { id, action, ...extra } });

/** Ryzn for Teams waitlist. Unauthenticated by design, see api/teams-interest.js. */
export const registerTeamsInterest = (body) => api("/teams-interest", { method: "POST", body });

/* ----- Organisations -----
   A mentor's own company inside Ryzn. Every one of these returns the whole org
   context, org, people, codes, so a write and a refresh are one round trip and
   the console can never render a half-updated roster.

   `orgRole` (owner | admin | member) is scoped to the org and is not the
   platform `role`. Creating an org needs the mentor role; it never grants one. */
export const fetchOrg = () => api("/orgs");
export const createOrg = (body) => api("/orgs", { method: "POST", body });
const orgAction = (action, extra = {}) => api("/orgs", { method: "PATCH", body: { action, ...extra } });
export const updateOrg = (patch) => orgAction("update", patch);
/** Opens or closes the org Orbit, the shared feed across everyone in the org. */
export const setOrgOrbit = (enabled) => orgAction("orbit", { enabled });
/** Mints org-scoped mentor codes. With `to`, mints exactly one and mails it. */
export const orgMintInvites = (body) => orgAction("invite", body);
export const orgRevokeInvite = (code) => orgAction("revoke", { code });
export const orgSetMemberRole = (userId, orgRole) => orgAction("role", { userId, orgRole });
export const orgRemoveMember = (userId) => orgAction("remove", { userId });
export const orgLeave = () => orgAction("leave");
/** Programme rules, merged server-side, so sending one switch leaves the rest
    alone. They are enforced by /api/roster, not by the console. */
export const orgSetRules = (rules) => orgAction("rules", { rules });
/** Moves someone between teams. `null` un-seats them, which the cross-division
    rule reads as "shows them everyone". */
export const orgSetDivision = (userId, division) => orgAction("division", { userId, division });
/** The org Orbit feed: profile-visible posts from everyone in the org. */
export const fetchOrgOrbit = () => api("/posts?scope=org");

/* ----- Orbits -----
   The spaces one identity moves through: the public orbit, community circles,
   and private company orbits. Every call answers with the caller's whole orbit
   list so a write and a refresh are one round trip and the switcher can never
   render a stale policy next to a fresh one.

   The `policy` on each orbit is already resolved server-side. Nothing here
   merges defaults or reads a policy field off a kind, if a screen wants to know
   what an orbit does, it reads `orbit.policy`. */
export const fetchOrbits = () => api("/orbits");
/** A circle's join page by its link. Works before joining, that is the point -
    and answers `{ circle, joined }` with no roster and no policy internals. */
export const fetchCircle = (slug) => api(`/orbits?slug=${encodeURIComponent(slug)}`);
export const createCircle = (body) => api("/orbits", { method: "POST", body });
const orbitAction = (action, extra = {}) => api("/orbits", { method: "PATCH", body: { action, ...extra } });
/** Free join, and it follows the creator, the follow is what makes their next
    post reach you in every orbit you're in, not only this one. */
export const joinCircle = ({ slug, orbitId } = {}) => orbitAction("join", { slug, orbitId });
/** Identity survives: XP, tier, badges and follows are yours, not the orbit's.
    Only the orbit-scoped progress ends. */
export const leaveOrbit = (orbitId) => orbitAction("leave", { orbitId });
/** The six switches every screen branches on. Merged server-side, so sending one
    leaves the rest alone, and clamped to what the orbit's kind can mean. */
export const setOrbitPolicy = (orbitId, policy) => orbitAction("policy", { orbitId, policy });
/** Orbit identity, name, tagline, accent, cover, plus `allowExternal` on a
    company orbit: whether posts from mentors a member follows elsewhere may
    appear inside it. */
export const setOrbitSettings = (orbitId, patch) => orbitAction("settings", { orbitId, ...patch });
/** A person's seat: which team they sit in (`crossDiv` reads it) and how senior
    they are (`levelGate` reads it). */
export const setOrbitSeat = (orbitId, userId, patch) => orbitAction("seat", { orbitId, userId, ...patch });

/* Founder console. Every one of these 403s unless the caller is an admin -
   see lib/admin.js. */
export const adminStats = () => api("/admin/stats");
export const adminUsers = (params = {}) => api(`/admin/users?${new URLSearchParams(params)}`);
export const adminInvites = () => api("/admin/invites");
export const adminMintInvites = (body) => api("/admin/invites", { method: "POST", body });
export const adminRevokeInvite = (code) => api("/admin/invites", { method: "PATCH", body: { code, action: "revoke" } });
/** Mails an already-minted code again. `to` is optional, the server falls back
    to whoever it went to last, so the row's Resend needs no retyping. */
export const adminResendInvite = ({ code, to, name }) => api("/admin/invites", { method: "PATCH", body: { code, to, name, action: "resend" } });
/** Erases the code row outright. Revoke is the tool for a real invitation -
    this one is for clearing test codes out of the ledger. */
export const adminDeleteInvite = (code) => api("/admin/invites", { method: "DELETE", body: { code } });
/** Erases an account and everything it owns. Refused for your own account, the
    last admin, and anyone who still owns an organisation. */
export const adminDeleteUser = (userId) => api("/admin/users", { method: "DELETE", body: { userId } });
/** Every live post across all authors, the console's moderation queue. */
export const adminPosts = () => api("/posts?scope=admin");
