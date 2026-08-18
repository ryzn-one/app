import { ObjectId } from "mongodb";
import { collections } from "./db.js";
import { json, fail } from "./http.js";
import { sideOf, hasAcceptedPair } from "./matches.js";
import { followingIds } from "./network.js";

/**
 * "Promote to Ryzn" — a mentor putting their name behind something they found
 * somewhere else.
 *
 * A mentor's credibility is mostly built outside Ryzn: the video that changed
 * how they think, the book they hand every junior, the thread they still quote.
 * None of that could exist here before, because the only way to put something on
 * a profile was to author it as a post. So mentors either re-uploaded other
 * people's work — which is theft with extra steps — or said nothing.
 *
 * This is the other verb. The resource stays where it lives; what Ryzn stores is
 * the endorsement: who vouched for it, why, and who it's for. That distinction is
 * the whole design:
 *
 *   - The link is never rehosted. We keep a URL and a title, and every open
 *     leaves for the original platform, which is what keeps the creator's views
 *     the creator's.
 *   - One row per (mentor, url). A shelf is a curation, and a mentor who can
 *     promote the same link twice has a feed instead.
 *   - Re-promoting a peer's resource *copies* the row and credits them in `via`.
 *     Posts amplify by pointer, because a post has one author who can still edit
 *     or delete it. A link has no such owner here — the canonical thing is the
 *     URL — so a copy is the honest model, and it means the shelf survives the
 *     peer taking their own endorsement down.
 */

export const KINDS = new Set(["video", "book", "article", "podcast", "course", "tool", "link"]);
export const VISIBILITY = new Set(["cohort", "public"]);

const MAX = { title: 160, note: 400, creator: 120, url: 2000 };

/* What a mentor may put on a shelf before it stops being a curation. Generous
   enough that nobody sensible meets it, low enough that the Impact award below
   can't be farmed into a leaderboard. */
const SHELF_CAP = 200;

/* Impact for the mentor, XP for whoever opens it. Awarded server-side on the
   write, like every other number on this platform — see api/posts.js for why
   that rule exists. Both are one-shot: `promote` is guarded by the unique
   (mentorId, url) index, `open` by the unique resource_events index, so neither
   can be collected twice for the same thing. */
const IMPACT = { promote: 5, repromoted: 2, opened: 1 };
const XP_OPEN = 3;

/* Tracking junk that turns one link into a hundred distinct ones and defeats
   the per-URL uniqueness the shelf depends on. */
const JUNK_PARAMS = /^(utm_|fbclid|gclid|mc_[ce]id|igshid|si$|ref_?src|ref$|feature$)/i;

/**
 * Where a link points, and what that implies it is.
 *
 * Host-driven rather than user-declared because the kind decides the icon, the
 * label and the sort — and a mentor who has to classify their own link before
 * they can post it is a mentor who closes the sheet. They can still override
 * `kind`; this is the default that makes the form one field long.
 */
const PLATFORMS = [
  [/(^|\.)tiktok\.com$/,                    { platform: "TikTok",     kind: "video" }],
  [/(^|\.)(youtube\.com|youtu\.be)$/,       { platform: "YouTube",    kind: "video" }],
  [/(^|\.)instagram\.com$/,                 { platform: "Instagram",  kind: "video" }],
  [/(^|\.)(twitter\.com|x\.com)$/,          { platform: "X",          kind: "link" }],
  [/(^|\.)linkedin\.com$/,                  { platform: "LinkedIn",   kind: "article" }],
  [/(^|\.)(open\.)?spotify\.com$/,          { platform: "Spotify",    kind: "podcast" }],
  [/(^|\.)podcasts\.apple\.com$/,           { platform: "Apple Podcasts", kind: "podcast" }],
  [/(^|\.)(goodreads\.com|bookshop\.org)$/, { platform: "Goodreads",  kind: "book" }],
  [/(^|\.)amazon\.[a-z.]+$/,                { platform: "Amazon",     kind: "book" }],
  [/(^|\.)(substack\.com|medium\.com)$/,    { platform: "Substack",   kind: "article" }],
  [/(^|\.)(coursera\.org|udemy\.com|edx\.org|maven\.com)$/, { platform: "Course", kind: "course" }],
  [/(^|\.)github\.com$/,                    { platform: "GitHub",     kind: "tool" }],
  [/(^|\.)(arxiv\.org|nature\.com|hbr\.org)$/, { platform: "Paper",   kind: "article" }],
];

/** The YouTube id in any of the three shapes people paste. */
function youTubeId(parsed) {
  if (/(^|\.)youtu\.be$/.test(parsed.hostname)) return parsed.pathname.slice(1).split("/")[0] || null;
  if (!/(^|\.)youtube\.com$/.test(parsed.hostname)) return null;
  const v = parsed.searchParams.get("v");
  if (v) return v;
  const m = parsed.pathname.match(/^\/(shorts|embed|live)\/([^/]+)/);
  return m ? m[2] : null;
}

/**
 * Cleans a pasted URL into the one thing we'll store and later open.
 *
 * Returns null for anything that isn't an http(s) link. That check is not
 * cosmetic: this string becomes an `href` a mentee taps, so a `javascript:` or
 * `data:` URL arriving from a client that skipped our form would be a script
 * running under ryzn.one with their session attached.
 */
export function cleanUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > MAX.url) return null;
  let parsed;
  try { parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname.includes(".")) return null;

  // Always https on the way out: half these hosts redirect anyway, and a mentee
  // tapping a mentor's link should not be the one downgraded.
  parsed.protocol = "https:";
  parsed.hash = "";
  /* `www.` and case are the two ways the same page arrives looking like two
     different ones. That matters more here than it would elsewhere: the unique
     (mentorId, url) index is what makes a shelf a curation and what stops the
     promote Impact being farmed, and an index can only dedupe strings that
     actually match. Someone pasting the link off their phone and someone
     copying it out of a desktop address bar must land on one row. */
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  // "example.com/" and "example.com" are the same page.
  if (parsed.pathname === "/") parsed.pathname = "";
  for (const key of [...parsed.searchParams.keys()]) {
    if (JUNK_PARAMS.test(key)) parsed.searchParams.delete(key);
  }
  return parsed.toString();
}

/** Host, platform label, default kind and — where it's derivable — a thumbnail. */
export function describe(url) {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, "");
  const hit = PLATFORMS.find(([re]) => re.test(host));
  const id = youTubeId(parsed);
  return {
    domain: host,
    platform: hit ? hit[1].platform : host,
    kind: hit ? hit[1].kind : "link",
    /* Only YouTube, and only because its thumbnail URL is derivable from the id
       with no request. Everything else would need a server-side fetch of a
       third-party page per promote — a crawler we'd have to rate-limit, cache
       and defend, for a picture. The cards are designed to look right without
       one. */
    thumbnailUrl: id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : null,
  };
}

const trim = (value, limit) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, limit);

const shape = (r, { opened = false, saved = false } = {}) => ({
  id: String(r._id),
  mentorId: r.mentorId,
  url: r.url,
  domain: r.domain,
  platform: r.platform,
  kind: r.kind,
  title: r.title,
  creator: r.creator ?? null,
  note: r.note ?? null,
  thumbnailUrl: r.thumbnailUrl ?? null,
  visibility: r.visibility,
  pinned: !!r.pinned,
  clicks: r.clicks ?? 0,
  saves: r.saves ?? 0,
  /* Who this endorsement travelled through. Null on an original — the mentor
     found it themselves — and the whole point of the feature when it isn't:
     "Dana rates this, and Sam passed it on" is two mentors' credibility, not
     one, and losing the first name would quietly turn a relay into a claim. */
  via: r.via ?? null,
  createdAt: r.createdAt,
  opened,
  saved,
});

/** Display names for a set of mentor ids, as a Map keyed by string id. */
async function namesFor(db, ids) {
  const unique = [...new Set(ids.map(String))].filter((id) => ObjectId.isValid(id));
  if (!unique.length) return new Map();
  const rows = await db
    .collection(collections.user)
    .find({ _id: { $in: unique.map((id) => new ObjectId(id)) } }, { projection: { name: 1 } })
    .toArray();
  return new Map(rows.map((u) => [String(u._id), u.name]));
}

/** What the caller has already opened or saved out of this page of rows. */
async function viewerState(db, userId, ids) {
  if (!ids.length) return { opened: new Set(), saved: new Set() };
  const rows = await db
    .collection(collections.resourceEvents)
    .find({ userId: String(userId), resourceId: { $in: ids } })
    .toArray();
  return {
    opened: new Set(rows.filter((r) => r.type === "open").map((r) => String(r.resourceId))),
    saved: new Set(rows.filter((r) => r.type === "save").map((r) => String(r.resourceId))),
  };
}

/** Shapes rows for a reader, folding in their own open/save history and — where
    the rows come from more than one shelf — whose shelf each one is. */
async function present(db, rows, viewerId, { withOwner = false } = {}) {
  const state = await viewerState(db, viewerId, rows.map((r) => r._id));
  const names = withOwner ? await namesFor(db, rows.map((r) => r.mentorId)) : null;
  return rows.map((r) => ({
    ...shape(r, {
      opened: state.opened.has(String(r._id)),
      saved: state.saved.has(String(r._id)),
    }),
    ...(names ? { mentorName: names.get(String(r.mentorId)) || "—" } : {}),
  }));
}

/**
 * Everything on one mentor's shelf that this caller is allowed to see.
 *
 * A cohort resource is for the people that mentor actually works with, and the
 * accepted pairing is the only thing that carries it — the same rule /api/posts
 * enforces, for the same reason. Everyone else, mentee or peer, sees the public
 * shelf, which is exactly what the profile already shows them.
 */
async function shelfFilter(db, user, mentorId) {
  const filter = { mentorId: String(mentorId), deletedAt: null };
  if (String(mentorId) === String(user.id)) return filter;
  if (await hasAcceptedPair({ menteeId: user.id, mentorId: String(mentorId) })) return filter;
  return { ...filter, visibility: "public" };
}

const sortSpec = { pinned: -1, createdAt: -1 };

/* ————— reads ————— */

async function read(db, request, user) {
  const params = new URL(request.url).searchParams;
  const scope = params.get("scope");
  const mentorId = params.get("mentorId");
  const rows = db.collection(collections.resources);

  /* The reading list. Saving is the mentee half of this feature: a mentor's
     shelf is only worth curating if the things on it can be kept, and a mentee
     with somewhere to keep them has a reason to open the shelf at all. */
  if (scope === "saved") {
    const events = await db
      .collection(collections.resourceEvents)
      .find({ userId: String(user.id), type: "save" })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    if (!events.length) return json({ resources: [] });
    /* Re-checked on every read rather than trusted from the save: a mentor can
       drop an endorsement or make it private long after someone saved it, and a
       reading list must not outlive the permission that filled it. */
    const found = await rows.find({ _id: { $in: events.map((e) => e.resourceId) }, deletedAt: null }).toArray();
    const byId = new Map(found.map((r) => [String(r._id), r]));

    /* One pair check per mentor, not per saved row: a list of forty things off
       one mentor's shelf is one question about that mentor, asked forty times
       if this loop is written the obvious way. */
    const needsPair = [...new Set(
      found
        .filter((r) => r.visibility !== "public" && String(r.mentorId) !== String(user.id))
        .map((r) => String(r.mentorId))
    )];
    const paired = new Set(
      (await Promise.all(needsPair.map(async (id) =>
        (await hasAcceptedPair({ menteeId: user.id, mentorId: id })) ? id : null
      ))).filter(Boolean)
    );

    // Save order, newest first — the list is a history of decisions, not a feed.
    const visible = events
      .map((e) => byId.get(String(e.resourceId)))
      .filter((r) => r && (
        r.visibility === "public"
        || String(r.mentorId) === String(user.id)
        || paired.has(String(r.mentorId))
      ));
    return json({ resources: await present(db, visible, user.id, { withOwner: true }) });
  }

  /* What the mentors you follow are putting their name behind — the surface a
     re-promote comes from. Public only: following someone is not the pairing
     that carries a cohort resource, the same line /api/posts?scope=following
     draws. */
  if (scope === "network") {
    if (sideOf(user) !== "mentor") return fail(403, "mentors_only", "The mentor network is for mentors.");
    const ids = await followingIds(db, user.id);
    if (!ids.length) return json({ resources: [], following: 0 });
    const found = await rows
      .find({ mentorId: { $in: ids }, deletedAt: null, visibility: "public" })
      .sort({ createdAt: -1 })
      .limit(60)
      .toArray();
    /* Which of these the caller already has on their own shelf — one query for
       the page rather than a lookup per card. Keyed by URL, because that is
       what "already promoted this" means once a re-promote is a copy. */
    const mine = found.length
      ? await rows.find({ mentorId: user.id, deletedAt: null, url: { $in: found.map((r) => r.url) } }, { projection: { url: 1 } }).toArray()
      : [];
    const have = new Set(mine.map((r) => r.url));
    const shaped = await present(db, found, user.id, { withOwner: true });
    return json({
      resources: shaped.map((r) => ({ ...r, onMyShelf: have.has(r.url) })),
      following: ids.length,
    });
  }

  const owner = mentorId || user.id;
  const found = await rows.find(await shelfFilter(db, user, owner)).sort(sortSpec).limit(SHELF_CAP).toArray();
  return json({ resources: await present(db, found, user.id) });
}

/* ————— writes ————— */

async function create(db, user, body) {
  const rows = db.collection(collections.resources);

  /* Re-promote: take a peer's public endorsement onto your own shelf, with
     their name on it. The client sends the id it is looking at; everything
     else is read from that row rather than trusted from the request, or a
     "re-promote" would be a way to write any URL under someone else's credit. */
  let source = null;
  if (body.repromote) {
    let _id;
    try { _id = new ObjectId(String(body.repromote)); } catch { return fail(400, "bad_request", "Which resource?"); }
    source = await rows.findOne({ _id, deletedAt: null });
    if (!source) return fail(404, "not_found", "That resource is gone.");
    if (String(source.mentorId) === String(user.id)) {
      return fail(400, "own_resource", "That's already on your shelf.");
    }
    if (source.visibility !== "public") {
      return fail(403, "not_public", "Only a mentor's public resources can be promoted on.");
    }
  }

  const url = cleanUrl(source ? source.url : body.url);
  if (!url) return fail(400, "bad_url", "That doesn’t look like a link we can open.");

  const meta = describe(url);
  const title = trim(source ? source.title : body.title, MAX.title);
  if (!title) return fail(400, "no_title", "Give it a title — that’s what your mentees read first.");

  const count = await rows.countDocuments({ mentorId: user.id, deletedAt: null });
  if (count >= SHELF_CAP) {
    return fail(409, "shelf_full", `Your shelf holds ${SHELF_CAP} resources. Take one down to add another.`);
  }

  /* The credit chain, flattened to one hop on purpose. A → B → C stores "via B"
     on C's row, not the whole path: the useful claim is who *you* got it from,
     and a chain rendered in full turns a card into a changelog. */
  const via = source
    ? { mentorId: String(source.mentorId), name: (await namesFor(db, [source.mentorId])).get(String(source.mentorId)) || null }
    : null;

  const doc = {
    mentorId: user.id,
    url,
    domain: meta.domain,
    platform: meta.platform,
    kind: KINDS.has(body.kind) ? body.kind : (source?.kind || meta.kind),
    title,
    creator: trim(source ? source.creator : body.creator, MAX.creator) || null,
    /* Never inherited. The note is the mentor's own reason for vouching, and
       copying it would put words in the mouth of whoever re-promoted it. */
    note: trim(body.note, MAX.note) || null,
    thumbnailUrl: meta.thumbnailUrl,
    visibility: VISIBILITY.has(body.visibility) ? body.visibility : "public",
    pinned: false,
    clicks: 0,
    saves: 0,
    via,
    originId: source ? (source.originId ?? source._id) : null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  let insertedId;
  try {
    ({ insertedId } = await rows.insertOne(doc));
  } catch (err) {
    /* The unique (mentorId, url) index. A shelf with the same link on it twice
       is not a curation, and a mentor who taps promote twice meant it once. */
    if (err?.code === 11000) return fail(409, "already_promoted", "That’s already on your shelf.");
    throw err;
  }

  const impact = IMPACT.promote;
  await Promise.all([
    db.collection(collections.profiles).updateOne({ userId: user.id }, { $inc: { impact } }),
    db.collection(collections.xpEvents).insertOne({
      userId: user.id, kind: "impact", amount: impact,
      reason: source ? "repromoted_resource" : "promoted_resource",
      resourceId: insertedId, createdAt: new Date(),
    }),
    /* The original curator gets something back when their pick travels. This is
       the loop the feature exists for: a mentor whose shelf is worth relaying
       watches that happen, which is a far better reason to keep curating than a
       reminder email. */
    source
      ? Promise.all([
          db.collection(collections.profiles).updateOne({ userId: String(source.mentorId) }, { $inc: { impact: IMPACT.repromoted } }),
          db.collection(collections.xpEvents).insertOne({
            userId: String(source.mentorId), kind: "impact", amount: IMPACT.repromoted,
            reason: "resource_repromoted", resourceId: source._id, createdAt: new Date(),
          }),
        ])
      : null,
  ]);

  return json({ resource: shape({ ...doc, _id: insertedId }), impact }, 201);
}

/**
 * open / save / unsave, and the owner's own edits.
 *
 * The engagement writes are idempotent by index: the second open is a no-op that
 * still answers 200, because from the caller's side it *is* success — they have
 * already collected the XP and the counter has already moved.
 */
async function patch(db, user, body) {
  const rows = db.collection(collections.resources);
  let _id;
  try { _id = new ObjectId(String(body.id)); } catch { return fail(400, "bad_request", "Which resource?"); }

  const row = await rows.findOne({ _id, deletedAt: null });
  if (!row) return fail(404, "not_found", "That resource is gone.");

  const mine = String(row.mentorId) === String(user.id);
  const allowed = mine
    || row.visibility === "public"
    || (await hasAcceptedPair({ menteeId: user.id, mentorId: row.mentorId }));

  if (body.action === "open" || body.action === "save" || body.action === "unsave") {
    if (!allowed) return fail(403, "not_yours", "That isn’t a resource you can open.");

    if (body.action === "unsave") {
      const res = await db.collection(collections.resourceEvents).deleteOne({ resourceId: _id, userId: String(user.id), type: "save" });
      if (res.deletedCount) await rows.updateOne({ _id }, { $inc: { saves: -1 } });
      return json({ ok: true, saved: false });
    }

    const type = body.action;
    try {
      await db.collection(collections.resourceEvents).insertOne({
        resourceId: _id, userId: String(user.id), type, createdAt: new Date(),
      });
    } catch (err) {
      if (err?.code === 11000) return json({ ok: true, already: true, xp: 0, url: row.url });
      throw err;
    }
    await rows.updateOne({ _id }, { $inc: { [type === "open" ? "clicks" : "saves"]: 1 } });

    // A mentor opening their own link is not engagement with it.
    const xp = type === "open" && !mine ? XP_OPEN : 0;
    if (xp) {
      await Promise.all([
        db.collection(collections.profiles).updateOne({ userId: user.id }, { $inc: { xp } }),
        db.collection(collections.xpEvents).insertOne({
          userId: user.id, kind: "xp", amount: xp, reason: "opened_resource", resourceId: _id, createdAt: new Date(),
        }),
        db.collection(collections.profiles).updateOne({ userId: String(row.mentorId) }, { $inc: { impact: IMPACT.opened } }),
        db.collection(collections.xpEvents).insertOne({
          userId: String(row.mentorId), kind: "impact", amount: IMPACT.opened,
          reason: "resource_opened", resourceId: _id, createdAt: new Date(),
        }),
      ]);
    }
    return json({ ok: true, xp, saved: type === "save", url: row.url });
  }

  if (!mine) return fail(403, "not_yours", "That isn’t your resource.");

  const $set = { updatedAt: new Date() };
  if (typeof body.pinned === "boolean") $set.pinned = body.pinned;
  if (VISIBILITY.has(body.visibility)) $set.visibility = body.visibility;
  if (KINDS.has(body.kind)) $set.kind = body.kind;
  if (typeof body.title === "string") {
    const title = trim(body.title, MAX.title);
    if (!title) return fail(400, "no_title", "A resource needs a title.");
    $set.title = title;
  }
  if (typeof body.note === "string") $set.note = trim(body.note, MAX.note) || null;
  if (typeof body.creator === "string") $set.creator = trim(body.creator, MAX.creator) || null;
  if (Object.keys($set).length === 1) return fail(400, "bad_request", "Nothing to change.");

  await rows.updateOne({ _id }, { $set });
  return json({ resource: shape({ ...row, ...$set }) });
}

/**
 * Take it back down.
 *
 * A hard delete, unlike a post. A post is authored here and a soft delete keeps
 * an audit trail of what was published; this row is only ever a pointer at
 * somebody else's page, so there is nothing to preserve — and the unique
 * (mentorId, url) index means a tombstone would block the mentor from ever
 * promoting that link again.
 */
async function remove(db, user, request) {
  let _id;
  try { _id = new ObjectId(String(new URL(request.url).searchParams.get("id"))); }
  catch { return fail(400, "bad_request", "Which resource?"); }

  const res = await db.collection(collections.resources).deleteOne({ _id, mentorId: user.id });
  if (!res.deletedCount) return fail(404, "not_found", "That resource is gone, or it isn’t yours.");
  db.collection(collections.resourceEvents).deleteMany({ resourceId: _id })
    .catch((err) => console.error("[resources] event cleanup:", err));
  return json({ ok: true });
}

/**
 * The whole surface, mounted on /api/profile?resources=1.
 *
 * It rides on an existing function rather than taking one of its own for the
 * reason api/profile.js already carries export, deletion and upload tokens:
 * Vercel counts functions per deployment and this project sits near the ceiling.
 * A profile is also where a shelf belongs — this is a thing people write about
 * themselves, in the same sense a headline is.
 */
export async function handleResources(request, user, db) {
  if (request.method === "GET") return read(db, request, user);

  if (request.method === "POST" || request.method === "PATCH") {
    let body = {};
    try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

    if (request.method === "POST") {
      /* Mentors only, on the write side alone. Everyone reads a shelf; putting
         your name behind something is the mentor's half of the relationship,
         and a mentee's endorsement would carry a weight the product hasn't
         earned them yet. */
      if (sideOf(user) !== "mentor") return fail(403, "mentors_only", "Only mentors promote resources.");
      return create(db, user, body);
    }
    return patch(db, user, body);
  }

  if (request.method === "DELETE") return remove(db, user, request);

  return fail(405, "method_not_allowed", "Use GET, POST, PATCH or DELETE.");
}
