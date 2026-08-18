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

/* ————— migrations —————
 *
 * Idempotent by construction: each one is a no-op on a database that has already
 * had it applied, so this stays a script that is safe to re-run by hand.
 */

/* v2 orbits. Every org written before orbits existed is a private orbit — that
   is what an org *was*. Stamping `kind` explicitly rather than inferring it on
   read is what lets the partial unique index below see these documents, and what
   keeps `kindOf`'s fallback a safety net instead of the actual mechanism. */
{
  const res = await db.collection("orgs").updateMany({ kind: { $exists: false } }, { $set: { kind: "private" } });
  if (res.modifiedCount) console.log(`  migrate     orgs.kind="private" on ${res.modifiedCount} document(s)`);
}

/* The one-org-per-owner index is being replaced by a partial one so a person can
   own a company orbit and run a circle. Dropped by its old name first: creating
   an index with the same name and different options is an error Mongo reports
   rather than a change it applies, so leaving this one in place would silently
   keep the old constraint. */
try {
  await db.collection("orgs").dropIndex("owner_unique");
  console.log("  migrate     dropped orgs.owner_unique (superseded by owner_private_unique)");
} catch {
  // Not there — either already migrated, or a database that never had it.
}

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
  // Public share URLs are ryzn.one/{handle}/{slug} — handles are unique and
  // sparse so older profiles without one still pass until /api/me backfills.
  ["profiles", { handle: 1 }, { unique: true, sparse: true, name: "handle_unique" }],
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
  // The public share link, ryzn.one/p/<slug>. Sparse because posts published
  // before share links existed get theirs backfilled on first read, and unique
  // because the slug is the only thing identifying a post to a stranger.
  ["posts", { slug: 1 }, { unique: true, sparse: true, name: "share_slug" }],
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
  /* One company orbit per owner, enforced by the database rather than by a check
     the create path could race past.
     Partial since v2: the same collection now also holds community circles, and
     a person may own a company orbit *and* run a circle — they are different
     kinds of space with different jobs. The filter is what keeps the one-org-
     per-owner guarantee from quietly becoming one-space-per-owner. The backfill
     above is what lets the filter see orgs written before `kind` existed. */
  ["orgs", { ownerId: 1 }, { unique: true, name: "owner_private_unique", partialFilterExpression: { kind: "private" } }],
  // Orbit-scoped Stage 1 progress: one doc per person per orbit. Unique, because
  // two progress docs for one (person, orbit) is two answers to "what step am I
  // on" and the screen would show whichever came back first.
  ["stage_progress", { userId: 1, orbitId: 1 }, { unique: true, name: "user_orbit_unique" }],
  // One membership per person per org — a double-claimed invite can't seat
  // someone twice and inflate the roster count.
  ["org_members", { orgId: 1, userId: 1 }, { unique: true, name: "org_user_unique" }],
  ["org_members", { userId: 1 }, { name: "userId" }],
  // Mentor → mentor follows. Unique per direction: following is one-sided, so
  // (a→b) and (b→a) are two different documents and both may exist.
  ["follows", { followerId: 1, followingId: 1 }, { unique: true, name: "follow_unique" }],
  ["follows", { followingId: 1 }, { name: "followers" }],
  // One pointer per (mentor, post) into another mentor's Orbit. Unique so a
  // double tap on "Add to my Orbit" can't put the same post there twice.
  ["amplified_posts", { mentorId: 1, postId: 1 }, { unique: true, name: "mentor_post_unique" }],
  ["amplified_posts", { mentorId: 1, createdAt: -1 }, { name: "mentor_recent" }],
  // Read when a mentee opens an amplified post: which mentors relayed it.
  ["amplified_posts", { postId: 1 }, { name: "post" }],
  /* "Promote to Ryzn" shelves. One row per (mentor, url), enforced by the
     database: a shelf with the same link on it twice is not a curation, and it
     is also what stops the +5 Impact on a promote being farmed by tapping the
     same button. The re-promote path relies on this too — a copy of a peer's
     row is refused rather than duplicated. */
  ["resources", { mentorId: 1, url: 1 }, { unique: true, name: "mentor_url_unique" }],
  // A mentor's shelf, pinned first, newest after — the profile section's sort.
  ["resources", { mentorId: 1, pinned: -1, createdAt: -1 }, { name: "shelf" }],
  // The network shelf: public picks from the mentors you follow.
  ["resources", { visibility: 1, createdAt: -1 }, { name: "public_recent" }],
  // One open and one save per person per resource — a double tap can't re-award
  // XP or inflate a mentor's click count.
  ["resource_events", { resourceId: 1, userId: 1, type: 1 }, { unique: true, name: "viewer_unique" }],
  // A mentee's reading list, newest save first.
  ["resource_events", { userId: 1, type: 1, createdAt: -1 }, { name: "user_saves" }],
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
