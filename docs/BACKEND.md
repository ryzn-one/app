# Ryzn Backend — Auth & Database

Serverless API on the same Vercel project as the site, so `/api/*` is same-origin
with `/app/` and session cookies work with no CORS.

```
lib/db.js          pooled Mongo client (cached on globalThis — see note below)
lib/auth.js        Better Auth config: email+password, Google, OTP reset
lib/email.js       Postmark sender (Resend fallback); logs when no token
lib/http.js        json/fail helpers, withUser() guard, ageFrom()
lib/admin.js       withAdmin() guard + invite code minting (founder console)
lib/ratelimit.js   fixed-window limiter backed by Mongo
lib/orgs.js        org model helpers: slugs, membership lookup, org-role rules

api/auth-handler.js    every Better Auth endpoint (vercel rewrite /api/auth/*)
api/me.js              GET  — session + profile (bootstraps profile on first call)
api/onboarding.js      POST  — persists the Ryzn AI setup answers, sets onboardingComplete
api/roster.js          GET   — the other side of the platform (mentors↔mentees)
api/matches.js         GET/POST/PATCH — the mentee↔mentor pairing handshake
api/teams-interest.js  POST  — Ryzn for Teams waitlist (unauthenticated)
api/orgs.js            GET/POST/PATCH — a mentor's organisation: create, roster,
                       org-scoped invite codes, org roles, the org Orbit
api/invites/validate.js POST — read-only code check (unauthenticated, rate-limited)
api/invites/redeem.js   POST — atomic single-use claim; only path to role=mentor
api/admin/stats.js     GET   — platform counts, 14-day signups, activation funnel
api/admin/users.js     GET   — people table, search + role filter (read-only)
api/admin/invites.js   GET/POST/PATCH — list, mint, revoke mentor codes

scripts/db-setup.mjs   indexes + invite seeding (idempotent)
```

## The founder console

`/app/#/admin` renders `src/admin/RyznAdmin.jsx`: platform analytics, the invite
Roster, and the people table. It is a page inside the same app — same origin,
same session cookie, same deploy as `/app/` and `/app/#/teams`. Deliberately not
a subdomain: a sibling host would not receive the `ryzn.one` session cookie
without rescoping cookies for the whole platform.

Access is decided **server-side on every `/api/admin/*` call** by `lib/admin.js`.
Signing in on the console's own form proves identity only — it grants nothing.
A caller passes if their account has `role: "admin"`, **or** they are a
`mentor` whose email is listed in `ADMIN_EMAILS`. Mentees never pass — even when
listed in `ADMIN_EMAILS`. Bootstrap the first admin with
`npm run admin:grant -- you@example.com` or an admin invite code.

The console mints and revokes invite codes. It deliberately cannot edit users or
assign the mentor role — that still happens only in `api/invites/redeem.js`, when
a mentor claims a code themselves. Keep it that way.

The console reads live data only. It used to have a sample mode that rendered
seeded platform metrics and a fake people table for anyone who opened the URL
without a database; that is gone, along with `VITE_API_MODE`. Signing in still
proves nothing on its own — `lib/admin.js` decides on every request.

To turn it on: grant `role: "admin"` (CLI or invite), or put a mentor email in
`ADMIN_EMAILS` in the Vercel project. Nothing else — no domain, no DNS, no
second project.

## Organisations (Ryzn for Teams)

`/app/#/teams` is the org console. A **mentor** creates an organisation there and
owns it; `api/orgs.js` is the whole surface.

Two role systems, deliberately separate — do not merge them:

| | where | values | means |
|---|---|---|---|
| `role` | `user` doc | `mentee` `mentor` `admin` | what the platform does for you |
| `orgRole` | `org_members` doc | `owner` `admin` `member` | what you may do inside **one** org |

An org owner is an admin of their own roster and nothing else. The founder
console stays gated by `lib/admin.js` on `role: "admin"`, which no org can grant.

Seats work through the existing invite machinery rather than beside it: an org
mints an ordinary invite carrying `orgId` + `orgRole`, always with `role:
"mentor"`. The single atomic claim in `api/invites/redeem.js` still decides the
platform role; joining the org is a consequence of that claim. `owner` is not
grantable by invite, and an existing mentor is *not* short-circuited by the
"already holds this role" check when the code carries an org — otherwise a mentor
invited by their own company could never take the seat.

The **org Orbit** (`GET /api/posts?scope=org`) is one feed across everyone in the
org, and it reads `visibility: "public"` posts only. A `cohort` post is written
for that mentor's own mentees; the Orbit must never widen who can see one. It is
closed until an owner or org admin opens it.

Membership is one document per person — counts are counted, never cached on the
org. Slug and `ownerId` are unique indexes, so "one org per owner" and a free
handle are enforced by the database, not by a check the create path could race.

## Collections

Better Auth owns `user`, `session`, `account`, `verification` — do not write to
them directly except the deliberate role promotion in `api/invites/redeem.js`.

Ryzn owns `profiles`, `invites`, `onboarding_answers`, `xp_events`, `matches`,
`teams_interest`, `posts`, `post_events`, `exercises`, `messages`, `rate_limits`,
`events`, `event_responses`, `sessions_1v1`, `orgs`, `org_members`.

`sessions_1v1` is deliberately *not* called `sessions`: Better Auth owns
`session`, and a one-character difference between an auth collection and a
product collection is a bug waiting to happen.

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

**Uploaded media is verified, not trusted.** Files go browser → Blob directly —
a function body caps at 4.5 MB and a greeting video is far past that, so the
client tells us the resulting URL. `cleanMedia()` in `api/posts.js` therefore
checks the host is the project's blob store *and* the path starts with
`posts/{their own id}/`. Without both, a mentor could attach any URL on the
internet and have it render as their content. Note `onUploadCompleted` never
fires on localhost, so nothing may depend on it.

## Local development

Two servers: `vercel dev` serves `/api`, Vite serves the UI with HMR and proxies
`/api` to it (configured in `app/vite.config.js`).

```bash
vercel dev                # terminal 1 — port 3000
npm run dev               # terminal 2 — port 5173, open /app/
```

A database is required. There is no offline mode: the app asks `/api/me` who
you are on mount and shows the signed-out journey if that 401s.

## Matching

A pairing is **one document** in `matches`, shared by both sides, so a mentor's
cohort and a mentee's mentor list can never disagree.

```
pending    one side asked, the other hasn't answered
accepted   both sides agreed — a real pairing
declined   answered no (also how a swipe-left is recorded)
ended      was accepted, since dissolved
```

Three rules are load-bearing:

**Either side may ask; nobody is paired until the other accepts.** Requesting
someone who already requested you *is* the accept — the server collapses that
case rather than opening a second document.

**A pass is stored, not forgotten.** `/api/roster` excludes anyone with a
pending, accepted or declined record, so the deck never re-offers a person the
caller already answered for. Losing that on refresh was the old behaviour.

**The unique index on `{menteeId, mentorId}` is the real guard.** It is what
stops a double-tap from opening two matches. The accept is a
`findOneAndUpdate` filtered on `status: "pending"`, so two concurrent accepts
produce exactly one winner.

A mentee holds three seats — one `active`, up to two `support`. A mentor's limit
is the `capacity` they answered in onboarding. `/api/me` derives `mentor`,
`supportMentors` and `cohort` from this collection on every call; none of it is
denormalised onto the profile.

Run `npm run db:setup` before this works properly — the unique index is created
there, and without it concurrent requests can duplicate a pair.

## 1:1 sessions

`/api/sessions` holds the booking handshake between a matched pair. One document
in `sessions_1v1` per session, shared by both sides, same shape of guarantee as
`matches`.

```
proposed    up to 5 times on the table, waiting on the other side
confirmed   one slot agreed — the only state that carries a date
declined    the other side said no to all of them
canceled    was live, called off by either side
completed   the mentor logged that it happened
```

Two rules carry the weight:

**The proposer cannot accept their own proposal.** `proposedBy` records which
side asked; `accept` and `decline` 403 for that side. Without it a mentor could
write times into a mentee's calendar unilaterally, which is the same lie as an
unaccepted match.

**Only an accepted pairing can book.** `POST` checks `hasAcceptedPair()` before
anything is written, so a session can't be used to reach someone who never
agreed to work with you.

`reschedule` is a counter-offer from either side: it replaces the slots, clears
any confirmation, and flips `proposedBy` to the caller — so the turn always
belongs to the other party. Adding to a calendar is entirely client-side
(`app/src/lib/calendar.js` builds the `.ics` and the Google template URL from
the confirmed slot); there is no calendar integration and nothing leaves the
browser.

## Not built yet

Screens that depend on these render an explicit empty state. None of them fall
back to sample content — that was the point of the demo-data removal, and a
placeholder mentor or a seeded leaderboard is worse than an empty one.

- Guardian consent email flow. `/api/me` returns `compliance.needsGuardianConsent`
  for under-18 accounts, but nothing sends the consent request or sets
  `guardianConsentAt`. **Chat must not open for minors until this exists.**
- **Nobody is notified of a match.** A pending request sits in the other party's
  app until they happen to open it. With Postmark wired up this is the obvious
  next thing to send.
- Badge issuance — still client-side in `RyznApp.jsx`. Exercise submissions award
  XP and a streak day that never reach the server either. Publishing a post and
  watching one *do* now write through `xp_events` and `$inc` the profile, so
  those two are real; everything else that toasts "+XP" still isn't.
- **Nobody is notified of a proposed session.** Same gap as matches: the
  proposal sits in the other party's app until they open it. The in-app
  surfaces (Home card, Notifications, the amber "needs your answer" pile) are
  the whole delivery mechanism until Postmark is wired up.
- **Public mentor pages.** A mentor's "Public view" renders exactly what a
  cohort mentee sees, using the same components, but there is no unauthenticated
  `/m/:slug` route and no share link. Building one is a decision about putting
  adults' names on the open internet alongside a platform containing minors —
  it needs to be made deliberately, not as a side effect of a UI change. The
  verification QR stays out until that URL exists and resolves.
- Cross-user leaderboards (cohort XP, mentor Impact ranking).
- Org-wide programmes. An org has a roster and an Orbit (see below), but cohorts,
  exercises and matching are still person-to-person — an org does not yet run a
  programme of its own, and nothing in the console claims it does.
- Email verification is off (`requireEmailVerification: false`). Turn it on once
  the sending domain / signature is verified in Postmark.
