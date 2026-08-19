import { randomInt } from "node:crypto";
import { fail, getUser } from "./http.js";

/**
 * Founder-level access for /api/admin/*.
 *
 * `role: "admin"` is the durable gate (set by claiming an admin invite or
 * `npm run admin:grant`). ADMIN_EMAILS is break-glass for accounts that already
 * hold an admin/mentor role, it must not let a mentee open the console just
 * because their email is on the env list.
 */

const allowList = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const isAdmin = (user) =>
  Boolean(user) &&
  (user.role === "admin" || allowList().includes(String(user.email || "").toLowerCase()));

/** Console + /api/admin/*: admin role, or mentor who is also on the admin list. */
export const canAccessAdminConsole = (user) =>
  Boolean(user) &&
  (user.role === "admin" ||
    (user.role === "mentor" && allowList().includes(String(user.email || "").toLowerCase())));

export function withAdmin(handler) {
  return async (request) => {
    try {
      const user = await getUser(request);
      if (!user) return fail(401, "unauthorized", "Sign in to continue.");
      if (!canAccessAdminConsole(user)) {
        return fail(403, "forbidden", "This console is for mentor admins only.");
      }
      return await handler(request, user);
    } catch (err) {
      console.error("[api:admin] unhandled error:", err);
      return fail(500, "internal_error", "Something broke on our end.");
    }
  };
}

// Crockford-style base32: no I, L, O, U, nothing a mentor can misread off an
// email. Same alphabet and shape as scripts/db-setup.mjs; codes minted here and
// codes minted by the script are interchangeable.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function newInviteCode() {
  let s = "";
  // 8 chars over 32 symbols ≈ 40 bits, infeasible to guess even before the
  // rate limiter on /api/invites/validate.
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `RYZ-INV-${new Date().getFullYear()}-${s}`;
}
