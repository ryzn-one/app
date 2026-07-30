/**
 * One-shot: collapse profile.track / profile.industry arrays into strings.
 *
 *   node --env-file=.env.local scripts/repair-scalar-fields.mjs
 */
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

const asLabel = (v) => {
  if (Array.isArray(v)) {
    const first = v.find((x) => typeof x === "string" && x.trim());
    return first ? first.trim() : null;
  }
  if (typeof v === "string") {
    const s = v.trim();
    return s || null;
  }
  return null;
};

const client = new MongoClient(uri);
await client.connect();
const db = client.db(process.env.MONGODB_DB || "ryzn");
const profiles = db.collection("profiles");

const bad = await profiles
  .find({ $or: [{ track: { $type: "array" } }, { industry: { $type: "array" } }] })
  .toArray();

console.log(`profiles with array track/industry: ${bad.length}`);
for (const p of bad) {
  const set = {};
  if (Array.isArray(p.track)) set.track = asLabel(p.track);
  if (Array.isArray(p.industry)) set.industry = asLabel(p.industry);
  console.log(`  ${p.userId}`, set);
  await profiles.updateOne({ _id: p._id }, { $set: { ...set, updatedAt: new Date() } });
}
console.log("done.");
await client.close();
