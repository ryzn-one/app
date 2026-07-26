# Ryzn Backend — Auth & Database

Serverless API on the same Vercel project as the site, so `/api/*` is same-origin
with `/app/` and session cookies work with no CORS.

```
lib/db.js          pooled Mongo client (cached on globalThis — see note below)
lib/auth.js        Better Auth config: email+password, Google, OTP reset
lib/email.js       Resend sender; logs to console when no API key
lib/http.js        json/fail helpers, withUser() guard, ageFrom()
lib/ratelimit.js   fixed-window limiter backed by Mongo

api/auth/[...all].js   every Better Auth endpoint
api/me.js              GET  — session + profile (bootstraps profile on first call)
api/invites/validate.js POST — read-only code check (unauthenticated, rate-limited)
api/invites/redeem.js   POST — atomic single-use claim; only path to role=mentor

scripts/db-setup.mjs   indexes + invite seeding (idempotent)
```

## Collections

Better Auth owns `user`, `session`, `account`, `verification` — do not write to
them directly except the deliberate role promotion in `api/invites/redeem.js`.

Ryzn owns `profiles`, `invites`, `onboarding_answers`, `xp_events`, `rate_limits`.

## Three things that are load-bearing

**Connection pooling.** `lib/db.js` caches the `connect()` *promise* on
`globalThis`. Serverless containers cold-start constantly; connecting per request
exhausts the Atlas connection limit under real load. Don't "simplify" this.

**Role is not client-settable.** `role` is `input: false` in the Better Auth
config, so no client can send it. Mentors are promoted only by
`api/invites/redeem.js` after an atomic claim. The Roster being invitation-only
is a brand promise — keep it enforced server-side.

**The invite claim is one atomic operation.** `findOneAndUpdate` filtered on
`redeemedBy: null` means two people racing the same code produce exactly one
winner. A read-then-write would let both through.

## Local development

Two servers: `vercel dev` serves `/api`, Vite serves the UI with HMR and proxies
`/api` to it (configured in `app/vite.config.js`).

```bash
vercel dev                # terminal 1 — port 3000
npm run dev               # terminal 2 — port 5173, open /app/
```

Set `VITE_API_MODE=live` in `app/.env.local` to make the auth screens hit the
real backend. Without it they keep the original prototype behaviour and need no
database — that's the default, so the demo still runs anywhere.

## Not built yet

- Guardian consent email flow. `/api/me` returns `compliance.needsGuardianConsent`
  for under-18 accounts, but nothing sends the consent request or sets
  `guardianConsentAt`. **Chat must not open for minors until this exists.**
- Onboarding answer persistence, matching, XP ledger, badge issuance —
  still client-side in `RyznApp.jsx`. See `docs/PRODUCTION.md`.
- Email verification is off (`requireEmailVerification: false`). Turn it on once
  the sending domain is verified in Resend.
