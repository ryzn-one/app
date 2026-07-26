import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
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

const avatarsSrc = join(root, "site", "avatars");
if (existsSync(avatarsSrc)) {
  cpSync(avatarsSrc, join(dist, "avatars"), { recursive: true });
}

console.log("Assembled site + /app + avatars into dist/");
