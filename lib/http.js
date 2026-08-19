import { auth } from "./auth.js";

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

export const fail = (status, code, message) => json({ error: code, message }, status);

/**
 * Resolves the caller's session from the request cookies.
 * Returns null when unauthenticated, callers decide whether that's fatal.
 */
export async function getUser(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

/**
 * Wraps a handler so it only runs for signed-in callers.
 * Usage: export default { fetch: withUser(async (request, user) => …) }
 */
export function withUser(handler) {
  return async (request) => {
    try {
      const user = await getUser(request);
      if (!user) return fail(401, "unauthorized", "Sign in to continue.");
      return await handler(request, user);
    } catch (err) {
      console.error("[api] unhandled error:", err);
      return fail(500, "internal_error", "Something broke on our end.");
    }
  };
}

/** Age in whole years, or null if we don't have a DOB on file. */
export function ageFrom(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}
