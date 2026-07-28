import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

mkdirSync(dist, { recursive: true });
copyFileSync(join(root, "site", "index.html"), join(dist, "index.html"));
copyFileSync(join(root, "site", "mentor-invite.html"), join(dist, "mentor-invite.html"));
if (existsSync(join(root, "site", "invite.html"))) {
  copyFileSync(join(root, "site", "invite.html"), join(dist, "invite.html"));
}
copyFileSync(join(root, "site", "privacy.html"), join(dist, "privacy.html"));
copyFileSync(join(root, "site", "terms.html"), join(dist, "terms.html"));

/* site/avatars held 30 stock portraits used to give the invented Ryzn for Teams
   mentors and mentees faces. Nothing references them since Teams stopped
   simulating an org, and shipping photographs of people who aren't users is
   exactly the kind of prop this cleanup removed. Re-add the copy step here if a
   real asset directory ever lands. */

console.log("Assembled site + /app into dist/");
