import { copyFileSync, cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

mkdirSync(dist, { recursive: true });
copyFileSync(join(root, "site", "index.html"), join(dist, "index.html"));
copyFileSync(join(root, "site", "mentor-invite.html"), join(dist, "mentor-invite.html"));
/* Mentees get their own page. They used to land on mentor-invite.html with
   ?role=mentee, which rewrote two lines of copy and left the rest — Impact
   Score, the global mentor leaderboard, "one active mentee at a time" — pitching
   a student on being a mentor. */
copyFileSync(join(root, "site", "mentee-invite.html"), join(dist, "mentee-invite.html"));
/* site/invite.html was a byte-identical second copy of the invite page, shipped
   alongside it. Two files meant every fix had to be applied twice or they drifted
   apart silently. It's gone; vercel.json redirects /invite.html here so any link
   already sent out still lands. */
copyFileSync(join(root, "site", "privacy.html"), join(dist, "privacy.html"));
copyFileSync(join(root, "site", "terms.html"), join(dist, "terms.html"));
/* One manifest at the origin root, scoped to "/", so installing from the
   marketing site and from /app/ produce the same app with the same icon.
   Its absence is why Chrome was drawing a generated "R" tile. */
copyFileSync(join(root, "site", "manifest.webmanifest"), join(dist, "manifest.webmanifest"));
/* The worker has to sit at the origin root: a worker's scope cannot rise above
   the path it is served from, and this one controls both / and /app/. */
copyFileSync(join(root, "site", "sw.js"), join(dist, "sw.js"));

const brandingSrc = join(root, "site", "branding");
if (existsSync(brandingSrc)) {
  cpSync(brandingSrc, join(dist, "branding"), { recursive: true });
}

/* Browsers still request /favicon.ico by default even when <link rel="icon"> is set. */
const faviconSrc = join(root, "site", "favicon.ico");
const faviconFromKit = join(root, "site", "branding", "ryzn-brand-kit", "icon", "favicon.ico");
if (existsSync(faviconSrc)) {
  copyFileSync(faviconSrc, join(dist, "favicon.ico"));
} else if (existsSync(faviconFromKit)) {
  copyFileSync(faviconFromKit, join(dist, "favicon.ico"));
}

console.log("Assembled site + branding + /app into dist/");
