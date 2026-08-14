/* Ryzn service worker.
 *
 * The manifest and the icons were already right, but nothing here registered a
 * service worker, and Chrome still refuses to fire `beforeinstallprompt`
 * without one that handles fetch — so the app could only ever be installed by
 * digging through the browser menu, and once installed it was blank without a
 * connection.
 *
 * It ships from site/ so it lands at the origin root and its scope is "/",
 * which covers both the marketing pages and /app/. A worker served from
 * /app/sw.js could not control "/" at all.
 *
 * Three rules, in order of how much damage getting them wrong would do:
 *   /api/**            never touched. Sessions, invites and posts must never be
 *                      answered from a cache, and a stale session is worse than
 *                      no session.
 *   navigations        network first, cache only as an offline fallback, so a
 *                      deploy is live on the next load rather than the next
 *                      cache version.
 *   /app/assets/**     cache first — Vite content-hashes these, so a given URL
 *                      never changes meaning.
 *   /branding/**       stale while revalidate: instant, but a changed icon or
 *                      font is picked up in the background. Pure cache-first
 *                      here is what would pin an old favicon on returning
 *                      visitors for a whole cache generation.
 */

const VERSION = "v2";
const PRECACHE = `ryzn-precache-${VERSION}`;
const RUNTIME = `ryzn-runtime-${VERSION}`;

/* The shells and the icon set: enough for an installed app to open offline and
   look like itself. Hashed bundles are not listed because their names change
   every build; they enter RUNTIME on first visit. */
const PRECACHE_URLS = [
  "/",
  "/app/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/branding/ryzn-brand-kit/icon/png/favicon-16.png",
  "/branding/ryzn-brand-kit/icon/png/favicon-32.png",
  "/branding/ryzn-brand-kit/icon/png/favicon-48.png",
  "/branding/ryzn-brand-kit/icon/png/ryzn-app-icon-180.png",
  "/branding/ryzn-brand-kit/icon/png/ryzn-app-icon-192.png",
  "/branding/ryzn-brand-kit/icon/png/ryzn-app-icon-512.png",
  "/branding/ryzn-brand-kit/icon/png/ryzn-maskable-512.png",
  "/branding/ryzn-brand-kit/fonts/SpaceGrotesk.ttf",
  "/branding/ryzn-brand-kit/fonts/SpaceMono-Regular.ttf",
];

const OFFLINE_BODY = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ryzn is offline</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#E9E8E4;color:#1A1A1A;font:16px/1.5 'Space Grotesk',system-ui,sans-serif;padding:24px}
  div{text-align:center;max-width:320px}
  b{display:block;font-size:34px;color:#5B4FCF}
</style></head>
<body><div><b>RYZN</b><p>You are offline. This page will load as soon as you have a connection.</p></div></body></html>`;

const offlineResponse = () =>
  new Response(OFFLINE_BODY, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) =>
      /* One request per URL rather than addAll, because addAll rejects as a
         unit: a single 404 would leave the worker uninstalled and the app with
         no offline support at all. */
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {})
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("ryzn-") && key !== PRECACHE && key !== RUNTIME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Cache a response only if it is one we could serve again as-is. */
const isStorable = (response) => response && response.ok && response.type === "basic";

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (isStorable(response)) {
      const cache = await caches.open(RUNTIME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const shell = new URL(request.url).pathname.startsWith("/app/") ? "/app/" : "/";
    return (
      (await caches.match(request, { ignoreSearch: true })) ||
      (await caches.match(shell)) ||
      offlineResponse()
    );
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (isStorable(response)) {
    const cache = await caches.open(RUNTIME);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(request);
  const update = fetch(request)
    .then((response) => {
      if (isStorable(response)) cache.put(request, response.clone());
      return response;
    })
    .catch(() => hit);
  return hit || update;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.pathname.startsWith("/app/assets/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.pathname.startsWith("/branding/") || url.pathname === "/favicon.ico" ||
      url.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(request));
  }
});
