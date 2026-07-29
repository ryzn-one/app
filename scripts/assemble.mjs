import { copyFileSync, cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

mkdirSync(dist, { recursive: true });
copyFileSync(join(root, "site", "index.html"), join(dist, "index.html"));
copyFileSync(join(root, "site", "mentor-invite.html"), join(dist, "mentor-invite.html"));
/* site/invite.html was a byte-identical second copy of the invite page, shipped
   alongside it. Two files meant every fix had to be applied twice or they drifted
   apart silently. It's gone; vercel.json redirects /invite.html here so any link
   already sent out still lands. */
copyFileSync(join(root, "site", "privacy.html"), join(dist, "privacy.html"));
copyFileSync(join(root, "site", "terms.html"), join(dist, "terms.html"));

const brandingSrc = join(root, "site", "branding");
if (existsSync(brandingSrc)) {
  cpSync(brandingSrc, join(dist, "branding"), { recursive: true });
}

console.log("Assembled site + branding + /app into dist/");
