import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { emailOTP, captcha } from "better-auth/plugins";
import { getDb } from "./db.js";
import { sendEmail, resetCodeEmail, verifyEmail } from "./email.js";

// Top-level await: ESM on Vercel's Node runtime supports it, and the module is
// evaluated once per container, so this resolves on cold start only.
const db = await getDb();

if (!process.env.BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET is not set");

/**
 * Preview deployments get a unique hostname per deploy, so a fixed
 * BETTER_AUTH_URL can never match the browser's origin there and every request
 * fails an origin check. Fall back to Vercel's system variables:
 *
 *   VERCEL_BRANCH_URL  stable per branch (ryzn-app-git-main-*.vercel.app)
 *   VERCEL_URL         unique per deployment
 *
 * Production still uses the explicit BETTER_AUTH_URL — never infer it there,
 * because that's the value the Google callback and cookie domain depend on.
 * Requires "Enable access to System Environment Variables" (already on).
 */
const baseURL =
  process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`);

if (!baseURL) throw new Error("BETTER_AUTH_URL is not set and no Vercel URL is available");

export const auth = betterAuth({
  database: mongodbAdapter(db),
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
    // The UI promises "ten characters minimum" on the reset screen — keep the
    // server the source of truth for that rule, not the client.
    minPasswordLength: 10,
    maxPasswordLength: 128,
    requireEmailVerification: false, // flip on once Postmark sender is verified
  },

  // Google is optional. Leave the credentials unset and email+password still
  // works — a half-configured provider would otherwise break every auth route.
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},

  user: {
    additionalFields: {
      // NEVER client-settable. Mentors are promoted server-side by redeeming a
      // valid invite code — see api/invites/redeem.js. The Roster being
      // invitation-only is a brand promise, so role must not be spoofable.
      role: {
        type: "string",
        required: false,
        defaultValue: "mentee",
        input: false,
      },
      // Most mentees are minors. Capturing DOB at signup is far cheaper than
      // backfilling it after you have real users, and it gates consent.
      dateOfBirth: { type: "date", required: false, input: true },
      guardianEmail: { type: "string", required: false, input: true },
      guardianConsentAt: { type: "date", required: false, input: false },
      invitedBy: { type: "string", required: false, input: false },
      onboardingComplete: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,      // refresh at most daily
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  account: {
    accountLinking: {
      enabled: true,
      // Google verifies its own emails, so linking a Google login to an
      // existing password account of the same address is safe here.
      trustedProviders: ["google"],
    },
  },

  advanced: {
    cookiePrefix: "ryzn",
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  trustedOrigins: [
    baseURL,
    // On preview both hostnames are reachable — the browser may be on either the
    // per-deploy URL or the stable per-branch one, so trust whichever isn't baseURL.
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
    ...(process.env.VERCEL_ENV === "production" ? [] : ["http://localhost:5173"]),
  ].filter(Boolean),

  plugins: [
    // The Forgot screen is a code-entry flow, not a magic link, so reset runs
    // on OTP rather than Better Auth's default link-based reset.
    emailOTP({
      otpLength: 6,
      expiresIn: 600, // 10 minutes, matching the copy in the UI
      allowedAttempts: 5,
      async sendVerificationOTP({ email, otp, type }) {
        const msg = type === "forget-password" ? resetCodeEmail(otp) : verifyEmail(otp);
        await sendEmail({ to: email, ...msg });
      },
    }),
    // Optional, like Google above: unset TURNSTILE_SECRET_KEY and sign-up works
    // exactly as before. Scoped to sign-up only — that's the one public,
    // unauthenticated, account-creating form a bot can hammer for free; sign-in
    // and password-reset still lean on rate limiting rather than a widget, since
    // there's no signed-in-user-facing screen to render one on those paths yet.
    ...(process.env.TURNSTILE_SECRET_KEY
      ? [
          captcha({
            provider: "cloudflare-turnstile",
            secretKey: process.env.TURNSTILE_SECRET_KEY,
            endpoints: ["/sign-up/email"],
          }),
        ]
      : []),
  ],
});
