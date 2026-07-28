import { auth } from "../lib/auth.js";

/**
 * Better Auth entrypoint for every /api/auth/* path.
 *
 * Nested routes like /api/auth/sign-up/email do not reach api/auth/[...all]
 * on non-Next Vercel projects (catch-alls only match one segment). vercel.json
 * rewrites all /api/auth/:path* here; the Request URL stays the original path
 * so Better Auth can still route internally.
 */
export default {
  fetch(request) {
    return auth.handler(request);
  },
};
