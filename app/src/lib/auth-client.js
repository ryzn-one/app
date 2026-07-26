import { createAuthClient } from "better-auth/react";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";

/**
 * When false, the auth screens keep their original prototype behaviour —
 * any input passes and you land straight in the app. Set VITE_API_MODE=live
 * to talk to the real backend. This keeps the demo runnable with no database.
 */
export const LIVE = import.meta.env.VITE_API_MODE === "live";

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
