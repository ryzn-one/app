/* Per-surface browser chrome: title, theme colour, icons, manifest.
 *
 * All three surfaces are one document — /app/ swaps between the consumer app,
 * Teams and the founder console on the hash alone — so until now they shared
 * one head. Standing in the console you got the purple squircle in the tab,
 * "Ryzn — Rise now." as the title, and the consumer manifest, which named the
 * install "Ryzn" and pointed start_url back at /app/.
 *
 * That is what produced the second home-screen icon: adding the console from
 * /app/#/admin asked the browser to install something the consumer manifest
 * did not describe, so it kept the URL and drew its own tile for it — the white
 * letter "R" next to the purple diamonds. Two icons, neither of which said
 * "console".
 *
 * The console now declares its own identity: the same three ascending diamonds
 * in ink rather than purple (scripts/make-console-icons.mjs), its own
 * /console.webmanifest with start_url on /app/#/admin, and its own name. One
 * glance at the tab or the dock tells a founder which surface they are on, and
 * an installed console lands back in the console instead of the consumer feed.
 *
 * Applied from JS rather than written into index.html because the surface is
 * only known from the hash, which the server never sees. The links live in
 * index.html as the consumer defaults so a cold load paints the right icon
 * before this module runs; this only ever moves them off that default.
 */

const KIT = "/branding/ryzn-brand-kit/icon";

const SURFACES = {
  /* Mirrors the markup in app/index.html — keep the two in step, this is the
     set the console is swapped back to when you leave #/admin. */
  app: {
    title: "Ryzn — Rise now.",
    appleTitle: "Ryzn",
    themeColor: "#5B4FCF",
    manifest: "/manifest.webmanifest",
    ico: "/favicon.ico",
    favicon: (size) => `${KIT}/png/favicon-${size}.png`,
    appleTouch: `${KIT}/png/ryzn-app-icon-180.png`,
  },
  console: {
    title: "Ryzn Console",
    appleTitle: "Ryzn Console",
    themeColor: "#1A1A1A",
    manifest: "/console.webmanifest",
    ico: `${KIT}/console.ico`,
    favicon: (size) => `${KIT}/png/console-favicon-${size}.png`,
    appleTouch: `${KIT}/png/ryzn-console-icon-180.png`,
  },
};

const FAVICON_SIZES = [16, 32, 48];

const surfaceFor = (hash) => (String(hash).startsWith("#/admin") ? "console" : "app");

function meta(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/* Icon links are replaced, not re-pointed. Chrome re-reads the tab icon when
   the element changes; mutating href on the element already in the document is
   the version that leaves the old favicon on screen until a reload. */
function icons(surface) {
  for (const el of document.head.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')) {
    el.remove();
  }
  const add = (attrs) => {
    const el = document.createElement("link");
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.head.appendChild(el);
  };
  add({ rel: "icon", href: surface.ico, sizes: "any" });
  for (const size of FAVICON_SIZES) {
    add({ rel: "icon", type: "image/png", sizes: `${size}x${size}`, href: surface.favicon(size) });
  }
  add({ rel: "apple-touch-icon", href: surface.appleTouch });
}

let current = null;

/** Point the head at the surface the hash names. Cheap and idempotent. */
export function applySurfaceChrome(hash = window.location.hash) {
  const key = surfaceFor(hash);
  if (key === current) return;
  current = key;

  const surface = SURFACES[key];
  document.title = surface.title;
  meta("theme-color", surface.themeColor);
  meta("apple-mobile-web-app-title", surface.appleTitle);
  icons(surface);

  let manifest = document.head.querySelector('link[rel="manifest"]');
  if (!manifest) {
    manifest = document.createElement("link");
    manifest.setAttribute("rel", "manifest");
    document.head.appendChild(manifest);
  }
  manifest.setAttribute("href", surface.manifest);
}
