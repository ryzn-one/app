import { auth } from "../../lib/auth.js";

/**
 * Catch-all for every Better Auth endpoint: /api/auth/sign-in/email,
 * /api/auth/sign-up/email, /api/auth/callback/google, /api/auth/sign-out, etc.
 *
 * The `fetch` default export gives us the standard Web Request/Response on
 * Vercel's Node runtime, which is exactly what auth.handler expects — no
 * body-parser juggling, and no risk of the raw body being consumed first.
 */
export default {
  fetch(request) {
    return auth.handler(request);
  },
};
