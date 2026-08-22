/**
 * Push Production environment variables to Vercel (no git branch scope).
 *
 *   node scripts/setup-production-env.mjs
 *
 * Reads .env.local, applies production overrides, syncs to Production.
 * Use this instead of copying Preview (dev) vars — branch-scoped vars cannot
 * be promoted to Production in the Vercel dashboard.
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env.local");
const productionOrigin = "https://ryzn.one";

if (!existsSync(envFile)) {
  console.error("Missing .env.local — copy .env.example and fill it in first.");
  process.exit(1);
}

/** @param {string} raw */
function parseEnv(raw) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) out[key] = value;
  }
  return out;
}

const local = parseEnv(readFileSync(envFile, "utf8"));

/** Production-specific values. */
const OVERRIDES = {
  MONGODB_DB: "ryzn",
  PUBLIC_ORIGIN: productionOrigin,
  BETTER_AUTH_URL: productionOrigin,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS || "bilal@ryzn.one",
};

/** Only push vars needed for a working production deploy. */
const KEYS = [
  "MONGODB_URI",
  "MONGODB_DB",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "PUBLIC_ORIGIN",
  "ADMIN_EMAILS",
  "POSTMARK_SERVER_TOKEN",
  "EMAIL_FROM",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  // Optional, like Google: unset both and the LinkedIn button simply isn't
  // offered. The loop below skips any key with no value.
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "TURNSTILE_SECRET_KEY",
  "VITE_TURNSTILE_SITE_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "ANTHROPIC_API_KEY",
];

/** @type {Record<string, string>} */
const target = {};
for (const key of KEYS) {
  const value = OVERRIDES[key] ?? local[key];
  if (value) target[key] = value;
}

console.log(`Syncing ${Object.keys(target).length} Production env vars.\n`);

/** @param {string} name @param {string} value */
function setProductionEnv(name, value) {
  spawnSync("vercel", ["env", "rm", name, "production", "--yes"], {
    cwd: root,
    stdio: "ignore",
    shell: process.platform === "win32",
  });

  const res = spawnSync(
    "vercel",
    ["env", "add", name, "production", "--value", value, "--yes"],
    {
      cwd: root,
      encoding: "utf8",
      shell: process.platform === "win32",
    }
  );

  if (res.status !== 0) {
    console.error(`  failed  ${name}`);
    if (res.stdout) console.error(res.stdout.trim());
    if (res.stderr) console.error(res.stderr.trim());
    return false;
  }

  console.log(`  set     ${name}`);
  return true;
}

let ok = 0;
let fail = 0;
for (const [name, value] of Object.entries(target)) {
  if (setProductionEnv(name, value)) ok++;
  else fail++;
}

console.log(`\nDone: ${ok} set, ${fail} failed.`);
if (fail) process.exit(1);

console.log(`
Redeploy production for changes to take effect:
  vercel deploy --prod

Production URL: ${productionOrigin}/app/
`);
