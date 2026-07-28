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
  ["rate_limits", { key: 1, windowStart: 1 }, { name: "key_window" }],
  ["rate_limits", { expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" }],
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
