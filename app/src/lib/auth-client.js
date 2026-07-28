import { createAuthClient } from "better-auth/react";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";

/* There is no prototype mode. Every screen talks to the real backend, and an
   unauthenticated caller gets a 401 rather than a fixture — the bypass that
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

/** Real people on the other side of the platform — mentors for a mentee,
    mentees for a mentor. Returns `{ role, people }`; `people` is often empty
    in an early cohort, and that is a valid answer, not an error. */
export const fetchRoster = () => api("/roster");

/* ————— Matches —————
   A pairing is one shared document, so both sides read the same truth and it
   survives a refresh. Opening a match against someone who already asked you
   *is* the accept — the server collapses that case. */
export const fetchMatches = () => api("/matches");
/** `action` is "request" or "pass" — a pass is recorded so the deck doesn't
    re-offer someone you already said no to. `otherId` is a user id here. */
export const requestMatch = (otherId, action = "request") =>
  api("/matches", { method: "POST", body: { otherId, action } });
/** `id` is a match id, not a user id: accept | decline | end | promote. */
export const respondToMatch = (id, action) => api("/matches", { method: "PATCH", body: { id, action } });

/** Ryzn for Teams waitlist. Unauthenticated by design — see api/teams-interest.js. */
export const registerTeamsInterest = (body) => api("/teams-interest", { method: "POST", body });

/* Founder console. Every one of these 403s unless the caller is an admin —
   see lib/admin.js. */
export const adminStats = () => api("/admin/stats");
export const adminUsers = (params = {}) => api(`/admin/users?${new URLSearchParams(params)}`);
export const adminInvites = () => api("/admin/invites");
export const adminMintInvites = (body) => api("/admin/invites", { method: "POST", body });
export const adminRevokeInvite = (code) => api("/admin/invites", { method: "PATCH", body: { code, action: "revoke" } });
