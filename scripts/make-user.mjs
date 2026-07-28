/**
 * Create (or re-role) a Ryzn account from the command line — for seeding test
 * accounts without clicking through signup, and without a mentor invite code.
 *
 *   npm run user:make -- alex@example.com "yourpassword10+" "Alex Reyes"    mentee
 *   npm run user:make -- jord@example.com "yourpassword10+" "Jordan Clarke" mentor
 *   npm run user:make -- you@example.com  "yourpassword10+" "Pranet Patel"  admin
 *
 * Passwords are hashed by Better Auth itself (auth.api.signUpEmail), not by
 * this script — writing a hash by hand would produce an account that exists in
 * the database and can never actually sign in.
 *
 * Re-running with an existing email leaves the password alone and only updates
 * the role, so it doubles as a promote/demote tool.
 *
 * NOTE: this writes to whatever MONGODB_URI in .env.local points at. If that is
 * your production cluster, these are real accounts on the live site.
 */

import { auth } from "../lib/auth.js";
import { getDb, collections } from "../lib/db.js";
import { ObjectId } from "mongodb";

const ROLES = new Set(["mentee", "mentor", "admin"]);

const [email, password, name, role = "mentee"] = process.argv.slice(2);

if (!email || !password || !name) {
  console.error(`Usage: npm run user:make -- <email> <password> <"Full Name"> [mentee|mentor|admin]`);
  process.exit(1);
}
if (!ROLES.has(role)) {
  console.error(`Unknown role "${role}". Use one of: ${[...ROLES].join(", ")}`);
  process.exit(1);
}
if (password.length < 10) {
  console.error("Password must be at least 10 characters — the server enforces this too.");
  process.exit(1);
}

const db = await getDb();
const users = db.collection(collections.user);
const profiles = db.collection(collections.profiles);
const normalized = email.trim().toLowerCase();

let created = false;
try {
  await auth.api.signUpEmail({ body: { email: normalized, password, name } });
  created = true;
} catch (err) {
  const msg = String(err?.body?.message || err?.message || err);
  if (/exist/i.test(msg)) {
    console.log(`  account exists — leaving the password alone, updating role only`);
  } else {
    console.error(`  sign-up failed: ${msg}`);
    process.exit(1);
  }
}

const user = await users.findOne({ email: normalized });
if (!user) {
  console.error("  account not found after sign-up — nothing was changed.");
  process.exit(1);
}

// `role` is input:false in the Better Auth config, so sign-up can never set it.
// That is deliberate; this script is trusted local code writing directly.
await users.updateOne({ _id: new ObjectId(user._id) }, { $set: { role, updatedAt: new Date() } });

await profiles.updateOne(
  { userId: String(user._id) },
  role === "mentor"
    ? {
        $set: { role, impact: 0, tier: "Scout", cohort: [], greetingUploaded: false, fresh: true, updatedAt: new Date() },
        $unset: { mentorUserId: "", supportMentorIds: "", earned: "", xp: "", rank: "", week: "", streak: "" },
      }
    : role === "mentee"
      ? { $set: { role, week: 1, streak: 0, xp: 0, rank: null, earned: {}, fresh: true, updatedAt: new Date() } }
      : { $set: { role, updatedAt: new Date() } },
  { upsert: true }
);

console.log(`  ${created ? "created" : "updated"}     ${normalized}  ·  ${name}  ·  role=${role}`);
console.log(`\nSign in at /app (or /app/#/admin for the console) with that email and password.\n`);
process.exit(0);
