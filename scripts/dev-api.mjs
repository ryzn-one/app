/**
 * Local API server — the `/api/*` half of development, without Vercel CLI.
 *
 *   node --env-file=.env.local scripts/dev-api.mjs        (npm run dev:api)
 *
 * Why this exists: `vercel dev` builds the whole project before it will serve a
 * function, and on a machine without yarn on PATH that build fails before the
 * first request ("'yarn' is not recognized"). Nothing about editing an endpoint
 * needs the site assembled, so this skips it.
 *
 * It is not a Vercel emulator and does not try to be. Every file under api/
 * already exports `{ fetch(request) }` — the Web standard, the same contract
 * Vercel invokes — so this is a thin Node HTTP shim over the real handlers.
 * The code that runs here is the code that runs in production; only the router
 * in front of it is different, and it mirrors the rewrites in vercel.json.
 *
 * Two details that are load-bearing for sign-in:
 *
 *   Host  The browser is on Vite at :5173 and Vite proxies here with
 *         `changeOrigin: false`, so the Host header still says :5173. The
 *         Request URL is rebuilt from that header rather than from the socket,
 *         because Better Auth compares it against BETTER_AUTH_URL and rejects a
 *         mismatch — sign-in fails with a bare "Couldn't sign you in".
 *
 *   Set-Cookie  A session response sends more than one, and Node's headers
 *               object collapses duplicates. getSetCookie() keeps them apart.
 */

import { createServer } from "node:http";
import { readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const API_DIR = join(HERE, "..", "api");
const PORT = Number(process.env.DEV_API_PORT) || 3000;

/** Every handler module under api/, by route path ("roster", "invites/redeem"). */
async function routes(dir = API_DIR, prefix = "") {
  const out = new Map();
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const [k, v] of await routes(join(dir, entry.name), `${prefix}${entry.name}/`)) out.set(k, v);
    } else if (entry.name.endsWith(".js")) {
      out.set(`${prefix}${entry.name.slice(0, -3)}`, join(dir, entry.name));
    }
  }
  return out;
}

const table = await routes();

/** vercel.json rewrites, as far as local development needs them. */
function resolve(pathname) {
  if (!pathname.startsWith("/api/")) return null;
  const rel = pathname.slice(5).replace(/\/+$/, "");
  // /api/auth/:path* → auth-handler. Catch-alls match one segment on Vercel,
  // so nested routes like /api/auth/sign-up/email only work via this rewrite.
  if (rel === "auth" || rel.startsWith("auth/")) return table.get("auth-handler");
  return table.get(rel) || table.get(rel.split("/")[0]) || null;
}

const server = createServer(async (req, res) => {
  const file = resolve(req.url.split("?")[0]);
  if (!file) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found", message: `No handler for ${req.url}` }));
    return;
  }

  try {
    const mod = (await import(pathToFileURL(file).href)).default;
    if (typeof mod?.fetch !== "function") throw new Error(`${file} does not export { fetch }`);

    const body = ["GET", "HEAD"].includes(req.method)
      ? undefined
      : Buffer.concat(await new Promise((ok, no) => {
          const chunks = [];
          req.on("data", (c) => chunks.push(c));
          req.on("end", () => ok(chunks));
          req.on("error", no);
        }));

    // Host, not the socket — see the note at the top of this file.
    const url = `http://${req.headers.host || `localhost:${PORT}`}${req.url}`;
    const response = await mod.fetch(new Request(url, { method: req.method, headers: req.headers, body }));

    const headers = Object.fromEntries(response.headers);
    delete headers["set-cookie"];
    res.writeHead(response.status, { ...headers, ...(response.headers.getSetCookie?.().length
      ? { "Set-Cookie": response.headers.getSetCookie() } : {}) });
    res.end(Buffer.from(await response.arrayBuffer()));
    console.log(`${res.statusCode}  ${req.method} ${req.url}`);
  } catch (err) {
    console.error(`500  ${req.method} ${req.url}\n`, err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "dev_server_error", message: String(err?.message || err) }));
  }
});

server.listen(PORT, () => {
  console.log(`\n  api      http://localhost:${PORT}/api/*   (${table.size} handlers)`);
  console.log(`  db       ${process.env.MONGODB_DB || "ryzn"}`);
  console.log(`  auth     ${process.env.BETTER_AUTH_URL}`);
  console.log(`\n  Browse the app on Vite (:5173) — it proxies /api here.\n`);
});
