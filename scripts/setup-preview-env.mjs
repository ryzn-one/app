/**
 * Push Preview environment variables to Vercel for the `dev` branch.
 *
 *   node scripts/setup-preview-env.mjs
 *   node scripts/setup-preview-env.mjs --branch=staging
 *
 * Reads .env.local, skips empty values, applies preview overrides, then syncs
 * each key to the Vercel Preview environment via the CLI.
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env.local");
const branch = (process.argv.find((a) => a.startsWith("--branch="))?.split("=")[1] || "dev").trim();
const previewOrigin = `https://ryzn-git-${branch}-bos-studio.vercel.app`;

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

const gitEmail = spawnSync("git", ["config", "user.email"], { encoding: "utf8" }).stdout.trim();

/** Keys we never push to Preview — auth.js infers the URL from Vercel system vars. */
const SKIP = new Set(["BETTER_AUTH_URL"]);

/** Preview-specific values that must not match production. */
const OVERRIDES = {
  MONGODB_DB: "ryzn_dev",
  PUBLIC_ORIGIN: previewOrigin,
  ...(gitEmail ? { ADMIN_EMAILS: gitEmail } : {}),
};

/** @type {Record<string, string>} */
const target = { ...local, ...OVERRIDES };
for (const key of SKIP) delete target[key];

console.log(`Syncing ${Object.keys(target).length} Preview env vars for branch "${branch}".`);
console.log(`PUBLIC_ORIGIN → ${previewOrigin}\n`);

/** @param {string} name @param {string} value */
function setPreviewEnv(name, value) {
  spawnSync("vercel", ["env", "rm", name, "preview", branch, "--yes"], {
    cwd: root,
    stdio: "ignore",
    shell: process.platform === "win32",
  });

  const res = spawnSync(
    "vercel",
    ["env", "add", name, "preview", branch, "--value", value, "--yes"],
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
  if (setPreviewEnv(name, value)) ok++;
  else fail++;
}

console.log(`\nDone: ${ok} set, ${fail} failed.`);
if (fail) process.exit(1);

console.log(`
Next:
  MONGODB_DB=ryzn_dev npm run db:setup
  git push -u origin dev   # if the branch is not on GitHub yet

Preview URL: ${previewOrigin}/app/
`);
