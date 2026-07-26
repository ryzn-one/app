/**
 * Who has claimed a founding-cohort invite.
 *
 *   node --env-file=.env.local scripts/invites-status.mjs
 *   node --env-file=.env.local scripts/invites-status.mjs --revoke=RYZ-INV-2026-XXXXXXXX
 *
 * The database is the source of truth for redemption — invites.local.md is just
 * your record of who you mailed which code to.
 */

import { MongoClient } from "mongodb";
import { ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/invites-status.mjs");
  process.exit(1);
}

const revoke = process.argv.find((a) => a.startsWith("--revoke="))?.split("=")[1];

const client = new MongoClient(uri);
await client.connect();
const db = client.db(process.env.MONGODB_DB || "ryzn");
const invites = db.collection("invites");

if (revoke) {
  const res = await invites.updateOne(
    { code: revoke.trim().toUpperCase(), redeemedBy: null },
    { $set: { revokedAt: new Date() } }
  );
  console.log(
    res.matchedCount
      ? `Revoked ${revoke}. It can no longer be claimed.`
      : `No unclaimed invite matching ${revoke} — already claimed codes cannot be revoked this way.`
  );
  await client.close();
  process.exit(0);
}

const all = await invites.find({}).sort({ createdAt: 1 }).toArray();
if (!all.length) {
  console.log("No invites in the database. Run: npm run db:invites");
  await client.close();
  process.exit(0);
}

// Resolve claimants in one query rather than per-invite.
const claimedIds = all.filter((i) => i.redeemedBy).map((i) => new ObjectId(i.redeemedBy));
const users = claimedIds.length
  ? await db.collection("user").find({ _id: { $in: claimedIds } }).toArray()
  : [];
const byId = new Map(users.map((u) => [String(u._id), u]));

const now = new Date();
const state = (i) => {
  if (i.revokedAt) return "revoked";
  if (i.redeemedBy) return "claimed";
  if (i.expiresAt && i.expiresAt < now) return "expired";
  return "open";
};

console.log(`\n${all.length} invite(s) in "${db.databaseName}":\n`);
for (const i of all) {
  const s = state(i);
  const who = i.redeemedBy ? byId.get(i.redeemedBy) : null;
  const detail = who
    ? `${who.name || "?"} <${who.email}> · ${new Date(i.redeemedAt).toLocaleDateString()}`
    : s === "open" && i.expiresAt
      ? `expires ${i.expiresAt.toDateString()}`
      : "";
  console.log(`  ${s.padEnd(8)} ${i.code}  ${detail}`);
}

const counts = all.reduce((acc, i) => ((acc[state(i)] = (acc[state(i)] || 0) + 1), acc), {});
console.log(
  `\n${counts.open || 0} open · ${counts.claimed || 0} claimed · ${counts.expired || 0} expired · ${counts.revoked || 0} revoked\n`
);

await client.close();
