import { slugify } from "./orgs.js";

/**
 * The public face of a post: ryzn.one/{handle}/{slug}.
 *
 * Legacy short links at /p/<slug> still resolve. Everything else about a post
 * is gated — a share link used to be /app/#/post/<id>, which is a deep link
 * into an authenticated SPA. Pasted into Slack or iMessage it unfurled as the
 * marketing site ("Ryzn — Rise now.") because the crawler only ever sees
 * site/index.html, and anyone without an account hit the sign-in wall. So the
 * link proved nothing and travelled nowhere.
 *
 * This module renders that post as a real HTML document, server-side, with its
 * own Open Graph tags — the way an Instagram or TikTok link works. Only posts
 * the author marked `public` render; a cohort post gets the locked page, which
 * is deliberately a 404 so no crawler previews its contents.
 */

const OG_FALLBACK = "/branding/ryzn-brand-kit/social/ryzn-og-image.png";
const LOGO = "/branding/ryzn-brand-kit/logo/svg/ryzn-lockup-horizontal-purple.svg";

/* Ambiguous characters are left out: a share code gets read aloud and retyped. */
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** 5 random characters, uniform — 256 / 32 divides exactly, so no modulo bias. */
function code() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/**
 * "Run on BOS" -> "run-on-bos-x7k2q".
 *
 * The words are there so the link reads like the post; the code is what makes
 * it unique. Slug lookups are exact, so the words can never collide their way
 * onto someone else's content.
 */
export function makeSlug(seed) {
  const base = slugify(String(seed ?? "").split(/\s+/).slice(0, 7).join(" "));
  return base ? `${base.slice(0, 48)}-${code()}` : `post-${code()}`;
}

/** The link itself, given an origin. Prefer /{handle}/{slug}; fall back to /p/. */
export const shareUrlFor = (origin, slug, handle) =>
  handle ? `${origin}/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}` : `${origin}/p/${encodeURIComponent(slug)}`;

/** Vercel terminates TLS upstream, so the incoming request is plain http. */
export function originOf(request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return "https://ryzn.one";
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}`;
}

/**
 * Link unfurlers fetch the page to build a preview — counting those as views
 * would mean one paste into Slack reads as a dozen people watching.
 */
export function isCrawler(ua) {
  return /bot|crawler|spider|facebookexternalhit|slackbot|whatsapp|telegram|discord|linkedinbot|twitterbot|embedly|preview|curl|wget|headless/i.test(
    String(ua || "")
  );
}

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const clamp = (s, n) => {
  const text = String(s ?? "").replace(/\s+/g, " ").trim();
  return text.length > n ? `${text.slice(0, n - 1)}…` : text;
};

const initials = (name) =>
  String(name || "R").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "R";

/** "4 August 2026" — absolute, because a public page has no session timezone to
    compute "2d ago" against and a wrong one is worse than a date. */
const longDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

const KIND_LABEL = { status: "Post", photo: "Photo", video: "Video", resource: "Resource" };

const CSS = `
*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
:root{--purple:#5B4FCF;--deep:#2D2580;--ink:#1A1A1A;--gray:#5F5E5A;--mute:#A5A39D;--surface:#F5F5F3;--line:#E8E7E3;--teal:#0F6E56;--tealTint:#E1F5EE;--purpleTint:#EEF0FC;
--sans:'Space Grotesk','Century Gothic',system-ui,-apple-system,sans-serif;--mono:'Space Mono','Consolas',monospace}
@font-face{font-family:"Space Grotesk";src:url("/branding/ryzn-brand-kit/fonts/SpaceGrotesk.ttf") format("truetype");font-weight:400 700;font-display:swap}
@font-face{font-family:"Space Mono";src:url("/branding/ryzn-brand-kit/fonts/SpaceMono-Regular.ttf") format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Space Mono";src:url("/branding/ryzn-brand-kit/fonts/SpaceMono-Bold.ttf") format("truetype");font-weight:700;font-display:swap}
html{width:100%;overflow-x:hidden}
body{font-family:var(--sans);background:var(--surface);color:var(--ink);min-height:100vh;display:flex;flex-direction:column}
a{color:inherit;text-decoration:none}
.mono{font-family:var(--mono);letter-spacing:.12em;text-transform:uppercase}
nav{border-bottom:1px solid var(--line);background:rgba(245,245,243,.94);backdrop-filter:blur(8px);position:sticky;top:0;z-index:10}
.nav-in{max-width:660px;margin:0 auto;padding:0 20px;height:60px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.nav-in img{height:24px;width:auto;display:block}
.wrap{max-width:660px;margin:0 auto;padding:24px 20px 40px;width:100%;flex:1}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;overflow:hidden}
.who{display:flex;align-items:center;gap:12px}
.ava{width:46px;height:46px;border-radius:0;flex-shrink:0;object-fit:cover;background:var(--purple);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px}
.name{font-weight:700;font-size:16px;line-height:1.25}
.sub{font-size:12.5px;color:var(--gray);margin-top:2px;line-height:1.35}
.stamp{font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);margin-top:4px}
.tier{display:inline-flex;align-items:center;gap:5px;background:var(--purpleTint);color:var(--purple);font-family:var(--mono);font-size:9px;letter-spacing:.1em;padding:3px 7px;margin-top:6px;text-transform:uppercase;font-weight:700}
h1{font-size:21px;line-height:1.28;margin-top:16px;font-weight:700}
.body{font-size:15px;line-height:1.62;color:var(--ink);margin-top:10px;white-space:pre-wrap;word-wrap:break-word}
.media{margin-top:16px;border-radius:12px;overflow:hidden;background:var(--ink);line-height:0}
.media img,.media video{width:100%;height:auto;max-height:78vh;display:block;object-fit:contain;background:var(--ink)}
.file{display:flex;align-items:center;gap:12px;margin-top:16px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px;font-weight:600;font-size:14px}
.file span.mono{font-size:9.5px;color:var(--gray);font-weight:700;display:block;margin-top:3px;letter-spacing:.1em}
.file .glyph{width:38px;height:44px;background:#F7EEDD;color:#BA7517;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:var(--mono);font-size:10px;font-weight:700}
.counts{display:flex;gap:18px;align-items:center;margin-top:16px;padding-top:14px;border-top:1px solid var(--line);font-family:var(--mono);font-size:11px;color:var(--gray);flex-wrap:wrap}
.cta{margin-top:14px;display:flex;gap:10px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--sans);font-weight:600;font-size:14.5px;padding:13px 22px;border-radius:12px;border:none;cursor:pointer;flex:1;min-width:150px}
.btn-solid{background:var(--purple);color:#fff}
.btn-solid:hover{background:var(--deep)}
.btn-ghost{background:transparent;color:var(--ink);border:1.5px solid var(--ink)}
.btn-ghost:hover{background:var(--ink);color:#fff}
.pitch{margin-top:18px;text-align:center;font-size:13px;color:var(--gray);line-height:1.55}
.pitch b{color:var(--ink)}
.locked{text-align:center;padding:34px 22px}
.locked .glyph{width:52px;height:52px;background:var(--surface);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:22px}
footer{border-top:1px solid var(--line);padding:20px;text-align:center;font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}
footer a{margin:0 8px}
footer a:hover{color:var(--ink)}
@media(max-width:520px){.wrap{padding:16px 14px 32px}.card{padding:15px;border-radius:14px}h1{font-size:19px}}
`;

function head({ title, description, url, image, video, origin, index, publishedAt, author }) {
  const abs = (p) => (/^https?:\/\//i.test(p) ? p : `${origin}${p}`);
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#5B4FCF">
${index ? `<link rel="canonical" href="${esc(url)}">` : '<meta name="robots" content="noindex,nofollow">'}
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="16x16" href="/branding/ryzn-brand-kit/icon/png/favicon-16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/branding/ryzn-brand-kit/icon/png/favicon-32.png">
<link rel="icon" type="image/png" sizes="48x48" href="/branding/ryzn-brand-kit/icon/png/favicon-48.png">
<link rel="apple-touch-icon" href="/branding/ryzn-brand-kit/icon/png/ryzn-app-icon-180.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta property="og:site_name" content="Ryzn">
<meta property="og:type" content="${video ? "video.other" : "article"}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(abs(image))}">
<meta property="og:image:alt" content="${esc(clamp(title, 120))}">
${author ? `<meta property="article:author" content="${esc(author)}">` : ""}
${publishedAt ? `<meta property="article:published_time" content="${esc(publishedAt)}">` : ""}
${video ? `<meta property="og:video" content="${esc(video.url)}">
<meta property="og:video:secure_url" content="${esc(video.url)}">
<meta property="og:video:type" content="${esc(video.type)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(abs(image))}">
<style>${CSS}</style>`;
}

const chrome = (inner, { origin, index, headTags }) => `<!doctype html>
<html lang="en">
<head>
${headTags}
</head>
<body>
<nav><div class="nav-in">
  <a href="${origin}/" aria-label="Ryzn"><img src="${LOGO}" alt="Ryzn"></a>
  <a class="mono" style="font-size:10px;color:var(--purple);font-weight:700" href="${origin}/app/">Open Ryzn →</a>
</div></nav>
${inner}
<footer>
  <a href="${origin}/">Ryzn</a>·<a href="${origin}/privacy.html">Privacy</a>·<a href="${origin}/terms.html">Terms</a>
</footer>
</body>
</html>`;

const avatarTag = (author) =>
  author.avatarUrl
    ? `<img class="ava" src="${esc(author.avatarUrl)}" alt="${esc(author.name)}">`
    : `<div class="ava">${esc(initials(author.name))}</div>`;

function mediaTag(post) {
  const url = post.media?.url;
  if (!url) return "";
  if (post.kind === "photo") {
    return `<div class="media"><img src="${esc(url)}" alt="${esc(post.title || "Photo")}" loading="lazy"></div>`;
  }
  if (post.kind === "video") {
    const poster = post.media.posterUrl ? ` poster="${esc(post.media.posterUrl)}"` : "";
    return `<div class="media"><video src="${esc(url)}" controls playsinline preload="metadata"${poster}></video></div>`;
  }
  if (post.kind === "resource") {
    return `<a class="file" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
  <div class="glyph">${esc((post.fileKind || "FILE").slice(0, 4))}</div>
  <div><div>${esc(post.title || "Attached file")}</div><span class="mono">Open file</span></div>
</a>`;
  }
  return "";
}

/**
 * The public post. `post` is the shaped API object; `author` is
 * `{ name, avatarUrl, headline, tier }`.
 */
export function renderPostPage({ post, author, origin }) {
  const url = shareUrlFor(origin, post.slug, author.handle || post.authorHandle);
  const deepLink = `${origin}/app/#/post/${encodeURIComponent(post.id)}`;
  const headline = post.title || clamp(post.text, 70) || `${author.name} on Ryzn`;
  const description =
    clamp(post.text || post.title, 200) || `${KIND_LABEL[post.kind] || "Post"} by ${author.name} on Ryzn.`;
  const isVideo = post.kind === "video" && post.media?.url;
  const image =
    (post.kind === "photo" && post.media?.url) || post.media?.posterUrl || author.avatarUrl || OG_FALLBACK;

  const views = (post.views ?? 0) + (post.publicViews ?? 0);
  const counts = [
    `${post.reactions ?? 0} ${post.reactions === 1 ? "like" : "likes"}`,
    `${post.comments ?? 0} ${post.comments === 1 ? "comment" : "comments"}`,
    `${views} ${views === 1 ? "view" : "views"}`,
  ];

  const inner = `<main class="wrap">
  <article class="card">
    <div class="who">
      ${avatarTag(author)}
      <div style="min-width:0">
        <div class="name">${esc(author.name)}</div>
        ${author.headline ? `<div class="sub">${esc(clamp(author.headline, 90))}</div>` : ""}
        <div class="stamp">${esc(longDate(post.createdAt))} · ${esc(KIND_LABEL[post.kind] || "Post")}${post.mins ? ` · ${esc(post.mins)}` : ""}</div>
      </div>
    </div>
    ${post.title && post.kind !== "resource" ? `<h1>${esc(post.title)}</h1>` : ""}
    ${post.text ? `<div class="body">${esc(post.text)}</div>` : ""}
    ${mediaTag(post)}
    <div class="counts">${counts.map((c) => `<span>${esc(c)}</span>`).join("")}</div>
    <div class="cta">
      <a class="btn btn-solid" href="${esc(deepLink)}">Like, comment &amp; reply in Ryzn</a>
      <a class="btn btn-ghost" href="${origin}/">What is Ryzn?</a>
    </div>
  </article>
  <p class="pitch"><b>${esc(author.name)}</b> mentors on Ryzn — a 12-week program with verifiable badges and real outcomes.</p>
</main>`;

  return chrome(inner, {
    origin,
    index: true,
    headTags: head({
      title: `${headline} · ${author.name} on Ryzn`,
      description,
      url,
      image,
      video: isVideo ? { url: post.media.url, type: post.media.contentType || "video/mp4" } : null,
      origin,
      index: true,
      publishedAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
      author: author.name,
    }),
  });
}

/**
 * Missing, deleted, or cohort-only. All three render the same page on purpose:
 * a public link must not reveal that a private post exists at that slug, and
 * the 404 stops crawlers from unfurling one.
 */
export function renderMissingPage({ origin, postId }) {
  const deepLink = postId ? `${origin}/app/#/post/${encodeURIComponent(postId)}` : `${origin}/app/`;
  const inner = `<main class="wrap">
  <div class="card locked">
    <div class="glyph">🔒</div>
    <div style="font-weight:700;font-size:17px">This post isn’t public</div>
    <p class="sub" style="margin-top:8px;max-width:380px;margin-left:auto;margin-right:auto">
      It may have been removed, or it’s shared with the author’s cohort only. Sign in to Ryzn and you’ll see it if it was meant for you.
    </p>
    <div class="cta" style="max-width:420px;margin-left:auto;margin-right:auto">
      <a class="btn btn-solid" href="${esc(deepLink)}">Open in Ryzn</a>
      <a class="btn btn-ghost" href="${origin}/">What is Ryzn?</a>
    </div>
  </div>
</main>`;

  return chrome(inner, {
    origin,
    index: false,
    headTags: head({
      title: "This post isn’t public · Ryzn",
      description: "Mentorship that proves itself. Verifiable badges, real outcomes.",
      url: `${origin}/app/`,
      image: OG_FALLBACK,
      video: null,
      origin,
      index: false,
      publishedAt: null,
      author: null,
    }),
  });
}
