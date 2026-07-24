# Ryzn — Production Readiness Plan

This document maps every simulated behavior in the prototype to the real service it needs, defines the data model and API surface implied by the UI, and closes with a launch checklist. The prototype is intentionally structured so that `src/data.js` is the only file holding fake data and `src/RyznApp.jsx` is the only file holding business rules — replacing those two layers converts the prototype into the product without touching the screens.

## Recommended stack

The frontend ships as-is on Vite + React 18 and deploys to Vercel, Netlify, or Cloudflare Pages. For the backend, a Postgres database behind a typed API (Supabase or Firebase for speed; NestJS/Fastify + Prisma if you want full control) covers everything the UI implies. Realtime chat and presence come free with Supabase Realtime or Firebase; otherwise use a websocket layer (Ably, Pusher). Media (greeting videos, feed content, badge assets) belongs in object storage behind a CDN — Supabase Storage, S3 + CloudFront, or Mux specifically for video since mentors upload and mentees stream. Push notifications route through FCM/APNs via OneSignal or Expo if you wrap this in a native shell (the 384×780 layout is already phone-shaped; Capacitor is the fastest path to app stores).

## What is simulated, and what replaces it

**Authentication.** Register/login/forgot-password screens are visual only; any input passes. Replace with real email+password plus Google OAuth, a verified 4-digit reset-code email flow, and session tokens. The mentor invitation code (`RYZ-INV-2026-0087`) must validate server-side against a single-use invites table — the Roster being invitation-only is a core brand promise, so treat code redemption as an atomic claim.

**Ryzn AI onboarding.** The chat is fully scripted client-side. In production the script can remain deterministic (it works, and it's cheap), with answers persisted per question to power matching. If you later want the AI to probe follow-ups ("why MrBeast?"), route the conversation through an LLM with the script as the spine — but ship v1 scripted. The influencer pools in `data.js` should move to a server table so trending names can be updated without a release, and free-text additions should be stored raw for matching-signal mining.

**Matching.** Match percentages are hardcoded. The real matcher scores mentor/mentee pairs on interest overlap, skills-gap complementarity, influencer affinity, track fit, and mentor capacity — a weighted cosine over the onboarding vectors is enough for v1; log outcomes (request → accept → week-4 retention) to tune weights later. The "first request auto-accepts in 1.7 s" is demo sugar; production is asynchronous with the 48-hour reply SLA the UI already advertises, push-notifying both sides.

**Gamification.** All XP/Impact awards live in `RyznApp.jsx` (onboarding per-question XP, +25 first request, +30 per accepted mentee, +15 support mentor, +40/+30/+20 exercises, +15 session logged, +10 post, +15 greeting, +5/+10 content review). Move these to a server-side ledger — an append-only `xp_events` table — so totals are auditable and un-cheatable, and so streaks are computed from server timestamps in the user's timezone with an explicit grace rule. Badge issuance must also be server-side: each badge gets a real verification record behind `ryzn.one/v/{code}` and a real QR (the prototype's QR is decorative), which is what makes "verifiable on LinkedIn" true.

**Messaging and gating.** DM threads are local state with one canned reply. Replace with realtime channels, but keep the gates as server-enforced policy, not UI decoration: mentee↔mentor chat opens only after the mentee's Stage 1 completion event exists, and the one-active-engagement rule (active vs. support mentors, max 3 seats, promote/drop) is a state machine the API owns. Because users include minors, all messages must be retained, reportable, and run through automated safety screening, with a human-escalation path — this is non-negotiable and should be built before chat launches, not after.

**Mentor content.** The Content Studio writes to local state. Production needs upload (video via Mux/Storage with transcoding), a moderated publish pipeline for the founding cohort (manual review is fine at 20 mentors), and view/reaction counters. Greeting videos should be capped (90 s) at upload time since the UI promises it.

**Everything else.** Notifications are static — drive them from real events with deep links matching the existing `navTo` targets. Leaderboards (cohort XP, school badges, mentor Impact) become scheduled materialized views; mentee handles stay anonymized (`R-####`) exactly as designed. Mentor Meets tickets need a real ticketing record with QR check-in, gated by the Mentor Approved badge.

## Data model (minimum viable)

`users` (role, track, school, invited_by) · `onboarding_answers` (user, question, value[]) · `mentors` (tier, capacity, bio, achievements, companies, talks) · `matches` (mentor, mentee, score, status: suggested/requested/accepted/passed, role: active/support) · `cohorts` and `cohort_members` · `exercises` and `exercise_submissions` (text/audio, milestone flag) · `sessions` (agenda jsonb, completed_at) · `badges` and `badge_awards` (code, verify_url) · `xp_events` (user, delta, reason, ref) · `streaks` (current, longest, last_active_date) · `content_posts` (mentor, type, media_url, views, reactions) · `messages` (thread, sender, body, flagged) · `events` and `event_tickets` · `notifications`.

## API surface implied by the UI

Auth: `POST /auth/register`, `/auth/login`, `/auth/reset/request`, `/auth/reset/confirm`, `POST /invites/redeem`. Onboarding: `PUT /onboarding/answers`, `POST /onboarding/complete` (returns badge + matches). Matching: `GET /matches?filters`, `POST /matches/:id/request|accept|pass`, `POST /mentors/:id/promote`, `DELETE /mentors/:id` (drop), all enforcing the 3-seat and 3-adds caps. Program: `GET /exercises/today`, `POST /exercises/:id/submit`, `GET/POST /sessions`. Gamification: `GET /me/summary` (xp, streak, badges, rank), `GET /leaderboards/{cohort|schools|mentors}`. Content: `POST /content` (+ signed upload URL), `POST /content/:id/view`. Chat: `GET/POST /threads/:id/messages` over websocket. Badges: `GET /verify/:code` (public).

## Security, privacy, and youth safety

Most mentees are minors, so this is the highest-stakes area: mentor vetting with background checks before Roster activation; parental/guardian consent capture for under-18 signups; PIPEDA compliance (Canadian users) including data export and deletion, which the Settings screen already promises; chat monitoring with automated flagging and human review; no public exposure of minors' identities (the anonymized leaderboard handles already model this — keep that discipline everywhere); rate limiting and server-side validation of every gamification event; and signed, expiring URLs for all media.

## Launch checklist

Replace `data.js` reads with API client calls behind a thin `src/api/` layer; move XP/streak/badge logic server-side; wire real auth + invite redemption; stand up chat with safety screening; media pipeline for greetings and feed content; real QR verification pages; push notifications with deep links; analytics events (onboarding step completion, first request, Stage 1 completion, D1/D7 streak retention — these are your activation metrics); error tracking (Sentry); set `DEMO = false`; accessibility pass (the swipe decks need button-only parity, which already exists via ✕/↺/✓ — verify focus order and labels); load real mentor photos into the deck card image slots; legal review of terms, privacy policy, and minor-consent flow; and a closed beta with the 20 founding mentors before opening cohort registration.
