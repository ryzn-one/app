import { MongoClient } from "mongodb";

/**
 * Pooled Mongo client.
 *
 * Serverless functions cold-start constantly. Calling MongoClient.connect()
 * per request exhausts the Atlas connection limit within minutes under any
 * real load — this is the single most common Mongo-on-Vercel failure. Caching
 * the connect() *promise* on globalThis means concurrent invocations inside one
 * warm container share a single pool, and in-flight connects are not duplicated.
 */

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set");

const options = {
  maxPoolSize: 10,        // Atlas M0 caps at 500 total; stay well under across containers
  minPoolSize: 0,         // let idle containers release connections
  maxIdleTimeMS: 30_000,
  serverSelectionTimeoutMS: 8_000,
  retryWrites: true,
};

const cache = globalThis.__ryznMongo ?? (globalThis.__ryznMongo = { promise: null });

export function getClient() {
  if (!cache.promise) {
    cache.promise = new MongoClient(uri, options).connect().catch((err) => {
      cache.promise = null; // let the next invocation retry rather than caching a failure
      throw err;
    });
  }
  return cache.promise;
}

export async function getDb() {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || "ryzn");
}

export const collections = {
  // Better Auth owns these four — do not write to them directly.
  user: "user",
  session: "session",
  account: "account",
  verification: "verification",
  // Ryzn domain collections.
  profiles: "profiles",
  invites: "invites",
  onboardingAnswers: "onboarding_answers",
  xpEvents: "xp_events",
  matches: "matches",
  teamsInterest: "teams_interest",
  posts: "posts",
  /* One doc per (post, viewer, action). Makes the counters on `posts`
     idempotent, and is what rehydrates "already watched / already reacted"
     after a refresh. */
  postEvents: "post_events",
  /* Thread under a post. Count is denormalised onto `posts.comments`. */
  postComments: "post_comments",
  /* One doc per mentee per UTC day. The paragraph the home card promises a
     mentor will read — and the ledger that makes XP/streak survive a refresh. */
  exercises: "exercises",
  /* Direct Connect thread between an accepted mentee↔mentor pair. */
  messages: "messages",
  /* One doc per mentor: the phases they author for their program. Progress
     against them lives on the `matches` doc, not here — see programProgress. */
  programs: "programs",
  /* Mentor Meets: quarterly platform events and mentor-hosted events/polls. */
  events: "events",
  /* Ryzn for Teams: one doc per organisation, created by the mentor who owns it. */
  orgs: "orgs",
  /* One doc per (org, person) — the single source for who is in an org. Member
     counts are counted off this, never cached on the org document. */
  orgMembers: "org_members",
  /* 1:1 mentor↔mentee bookings. One doc per session, shared by both sides —
     see api/sessions.js for the propose → accept handshake. */
  sessions1v1: "sessions_1v1",
  /* RSVP and poll-vote ledger: one doc per (event, user), idempotent on unique index. */
  eventResponses: "event_responses",
  /* Mentor → mentor follows. One doc per (follower, following). Directed and
     one-sided on purpose: following someone is not a pairing and needs no
     handshake — it only decides whose posts show up in your network feed. */
  follows: "follows",
  /* One doc per (mentor, post) a mentor has carried into their own Orbit, so
     their mentees read it alongside the mentor's own posts. The post itself is
     never copied — this is a pointer, and the original author keeps the views,
     the reactions and the byline. */
  amplified: "amplified_posts",
};
