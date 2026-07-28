/**
 * Grant (or revoke) founder-console access, straight against the database.
 *
 *   npm run admin:grant  -- you@ryzn.one
 *   npm run admin:grant  -- you@ryzn.one bilal@ryzn.one
 *   npm run admin:grant  -- --list
 *   npm run admin:grant  -- --revoke=someone@ryzn.one
 *
 * This is the bootstrap: it makes the *first* admin without an env var and
 * without a redeploy. After that, admins invite each other from the console
 * (Invites → Admin), so you should rarely need this again.
 *
 * The account must already exist — create it at /app like any other user, then
 * run this against the same email.
 */

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run: npm run admin:grant -- you@ryzn.one");
  process.exit(1);
}

const args = process.argv.slice(2);
const revoke = args.find((a) => a.startsWith("--revoke="))?.split("=")[1];
const listOnly = args.includes("--list");
const emails = args.filter((a) => !a.startsWith("--")).map((e) => e.trim().toLowerCase());

if (!listOnly && !revoke && !emails.length) {
  console.error("Which account? Usage: npm run admin:grant -- you@ryzn.one");
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db(process.env.MONGODB_DB || "ryzn");
const users = db.collection("user");
const profiles = db.collection("profiles");

const showAdmins = async () => {
  const rows = await users.find({ role: "admin" }, { projection: { name: 1, email: 1 } }).toArray();
  console.log(`\n${rows.length} admin account(s) in "${db.databaseName}":`);
  for (const r of rows) console.log(`  ${r.email}  ${r.name || ""}`);
  console.log();
};

if (listOnly) {
  await showAdmins();
  await client.close();
  process.exit(0);
}

if (revoke) {
  const email = revoke.trim().toLowerCase();
  const user = await users.findOne({ email, role: "admin" });
  if (!user) {
    console.log(`No admin account matching ${email}.`);
  } else {
    await users.updateOne({ _id: user._id }, { $set: { role: "mentee", updatedAt: new Date() } });
    await profiles.updateOne({ userId: String(user._id) }, { $set: { role: "mentee", updatedAt: new Date() } });
    console.log(`Revoked admin from ${email}.`);
  }
  await showAdmins();
  await client.close();
  process.exit(0);
}

for (const email of emails) {
  const user = await users.findOne({ email });
  if (!user) {
    console.error(`  no account   ${email} — create it at /app first, then re-run.`);
    continue;
  }
  if (user.role === "admin") {
    console.log(`  already      ${email}`);
    continue;
  }
  await users.updateOne({ _id: user._id }, { $set: { role: "admin", updatedAt: new Date() } });
  await profiles.updateOne(
    { userId: String(user._id) },
    { $set: { role: "admin", updatedAt: new Date() } },
    { upsert: false }
  );
  console.log(`  granted      ${email}`);
}

await showAdmins();
await client.close();
