/**
 * One-shot database setup: indexes, then optionally seed mentor invite codes.
 *
 *   node --env-file=.env.local scripts/db-setup.mjs
 *   node --env-file=.env.local scripts/db-setup.mjs --seed-invites=20
 *   node --env-file=.env.local scripts/db-setup.mjs --seed-invites=20 --expires-days=90
 *
 * Safe to re-run: createIndex is idempotent, and seeding only ever inserts new
 * codes. It never touches existing ones.
 */

import { MongoClient } from "mongodb";
import { randomInt } from "node:crypto";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/db-setup.mjs");
  process.exit(1);
}

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : null;
};

// Crockford-style base32: no I, L, O, U — nothing a mentor can misread off an
// email. 8 chars over 32 symbols ≈ 40 bits, which makes guessing infeasible
// even before the rate limiter on /api/invites/validate.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const randomCode = () => {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `RYZ-INV-${new Date().getFullYear()}-${s}`;
};

const client = new MongoClient(uri);
await client.connect();
const db = client.db(process.env.MONGODB_DB || "ryzn");
console.log(`Connected to "${db.databaseName}".\n`);

/* ————— indexes ————— */

const indexes = [
  ["user", { email: 1 }, { unique: true, name: "email_unique" }],
  ["user", { role: 1 }, { name: "role" }],
  ["session", { token: 1 }, { unique: true, name: "token_unique" }],
  ["session", { userId: 1 }, { name: "userId" }],
  // TTL sweep so dead sessions don't accumulate forever.
  ["session", { expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" }],
  ["account", { userId: 1 }, { name: "userId" }],
  ["verification", { identifier: 1 }, { name: "identifier" }],
  ["verification", { expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" }],

  ["invites", { code: 1 }, { unique: true, name: "code_unique" }],
  ["invites", { redeemedBy: 1 }, { sparse: true, name: "redeemedBy" }],
  // Org-scoped mentor codes, newest first — the org console's Invites list.
  ["invites", { orgId: 1, createdAt: -1 }, { sparse: true, name: "org_recent" }],
  ["profiles", { userId: 1 }, { unique: true, name: "userId_unique" }],
  // One document per pair, enforced by the database — this is what stops a
  // double-tap on "Request" from opening two matches between the same people.
  ["matches", { menteeId: 1, mentorId: 1 }, { unique: true, name: "pair_unique" }],
  ["matches", { menteeId: 1, status: 1 }, { name: "mentee_status" }],
  ["matches", { mentorId: 1, status: 1 }, { name: "mentor_status" }],
  ["teams_interest", { email: 1 }, { unique: true, name: "email_unique" }],
  // The onboarding answers are stored as one document per user, not one per
  // question — the old compound index never matched anything written.
  ["onboarding_answers", { userId: 1 }, { unique: true, name: "userId_unique" }],
  ["xp_events", { userId: 1, createdAt: -1 }, { name: "user_recent" }],
  // A mentor's own feed, newest first.
  ["posts", { authorId: 1, createdAt: -1 }, { name: "author_recent" }],
  // What a mentee sees: one author, cohort-visible, newest first.
  ["posts", { authorId: 1, visibility: 1, createdAt: -1 }, { name: "author_visibility" }],
  // One view and one reaction per person per post, enforced by the database —
  // this is what stops a double-tap inflating a mentor's numbers.
  ["post_events", { postId: 1, userId: 1, type: 1 }, { unique: true, name: "viewer_unique" }],
  // Comments under a post, oldest first for the thread.
  ["post_comments", { postId: 1, createdAt: 1 }, { name: "post_thread" }],
  ["post_comments", { authorId: 1, createdAt: -1 }, { name: "author_recent" }],
  // One daily exercise per mentee — double-submit can't double-award XP.
  ["exercises", { userId: 1, dayKey: 1 }, { unique: true, name: "user_day_unique" }],
  ["exercises", { userId: 1, createdAt: -1 }, { name: "user_recent" }],
  ["messages", { menteeId: 1, mentorId: 1, createdAt: 1 }, { name: "thread" }],
  ["messages", { senderId: 1, createdAt: -1 }, { name: "sender_recent" }],
  ["rate_limits", { key: 1, windowStart: 1 }, { name: "key_window" }],
  ["rate_limits", { expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" }],
  // Mentor Meets events
  ["events", { kind: 1, status: 1, createdAt: -1 }, { name: "kind_status" }],
  ["events", { hostId: 1, createdAt: -1 }, { name: "host_recent" }],
  ["event_responses", { eventId: 1, userId: 1 }, { unique: true, name: "event_user_unique" }],
  // 1:1 sessions. Named _1v1 so it can never be confused with Better Auth's
  // `session` collection. Each side reads its own list; the calendar reads by
  // confirmed start time.
  ["sessions_1v1", { mentorId: 1, createdAt: -1 }, { name: "mentor_recent" }],
  ["sessions_1v1", { menteeId: 1, createdAt: -1 }, { name: "mentee_recent" }],
  ["sessions_1v1", { status: 1, "confirmedSlot.start": 1 }, { name: "status_start" }],
  // Ryzn for Teams. The org handle is public, so slugs are unique; one org per
  // owner is enforced by the database rather than by a check the create path
  // could race past.
  ["orgs", { slug: 1 }, { unique: true, name: "slug_unique" }],
  ["orgs", { ownerId: 1 }, { unique: true, name: "owner_unique" }],
  // One membership per person per org — a double-claimed invite can't seat
  // someone twice and inflate the roster count.
  ["org_members", { orgId: 1, userId: 1 }, { unique: true, name: "org_user_unique" }],
  ["org_members", { userId: 1 }, { name: "userId" }],
];

for (const [col, spec, opts] of indexes) {
  try {
    await db.collection(col).createIndex(spec, opts);
    console.log(`  index ok    ${col}.${opts.name}`);
  } catch (err) {
    console.warn(`  index SKIP  ${col}.${opts.name} — ${err.message}`);
  }
}

/* ————— seed invites ————— */

const n = Number(arg("seed-invites") || 0);
if (n > 0) {
  const days = Number(arg("expires-days") || 90);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const docs = Array.from({ length: n }, () => ({
    code: randomCode(),
    createdAt: new Date(),
    createdBy: "seed",
    expiresAt,
    redeemedBy: null,   // must be explicit null, not absent — the atomic claim
    redeemedAt: null,   // filter in api/invites/redeem.js matches on null
    revokedAt: null,
    note: "Founding cohort",
  }));

  await db.collection("invites").insertMany(docs);
  console.log(`\n${n} invite codes created (expire ${expiresAt.toDateString()}):\n`);
  for (const d of docs) console.log(`  ${d.code}`);
  console.log("\nThese are single-use. Send one per mentor — anyone holding a code can claim the role.");
}

const unclaimed = await db.collection("invites").countDocuments({ redeemedBy: null, revokedAt: null });
console.log(`\nDone. ${unclaimed} unclaimed invite code(s) in the database.`);

await client.close();
