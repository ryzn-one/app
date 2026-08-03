import { ObjectId } from "mongodb";
import { handleUpload } from "@vercel/blob/client";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser, getUser } from "../lib/http.js";
import { sideOf, hasAcceptedPair } from "../lib/matches.js";
import { orgContext, orgMemberIds } from "../lib/orgs.js";

/**
 * /api/posts — mentor content, and the only thing that carries it to a mentee.
 *
 *   GET    /api/posts                own posts (mentor)
 *   GET    /api/posts?mentorId=…     that mentor's cohort posts (mentee, paired only)
 *   GET    /api/posts?id=…           one post (access-checked; for share deep links)
 *   GET    /api/posts?id=…&comments=1  comment thread for that post
 *   POST   /api/posts                publish
 *   POST   /api/posts?upload=1       Vercel Blob upload token
 *   PATCH  /api/posts {id, action}   record a view, reaction, or comment
 *   PATCH  /api/posts {id, …fields}  edit / pin / change visibility (author only)
 *   DELETE /api/posts?id=…           soft delete (author only)
 *
 * Everything used to live in one React useState array. A mentor's post survived
 * until they refreshed, and no mentee ever saw one — OrbitScreen was handed the
 * mentor's own local state, which is always empty for a mentee. That's the loop
 * this closes.
 *
 * One file rather than a directory of them because Vercel counts functions per
 * deployment and this project is close to the ceiling. Method plus one query
 * param is enough of a router for six operations.
 */

const KINDS = new Set(["status", "photo", "video", "resource"]);
const VISIBILITY = new Set(["cohort", "public"]);
const MAX_TEXT = 4000;
const MAX_TITLE = 160;
const MAX_COMMENT = 500;

/* Impact is awarded server-side, on the write. It used to be a number in React
   state that reset on refresh, so the "+10 Impact" toast was describing
   something that never happened. */
const IMPACT = { post: 10, greeting: 25 };

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const FILE_LABEL = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
};

/**
 * Media arrives from the browser after it uploads straight to Blob storage —
 * `onUploadCompleted` never fires on localhost, so the create call can't wait
 * for it. That means the client is telling us the URL, and an unchecked client
 * could name any URL on the internet as its "upload". These two checks are what
 * make that claim safe: right host, and a path inside the author's own prefix.
 */
function cleanMedia(media, userId) {
  if (!media || typeof media !== "object") return null;
  const url = String(media.url || "");
  const pathname = String(media.pathname || "");
  let host;
  try { host = new URL(url).host; } catch { return null; }
  if (!host.endsWith(".public.blob.vercel-storage.com")) return null;
  if (!pathname.startsWith(`posts/${userId}/`)) return null;

  const contentType = String(media.contentType || "");
  return {
    url,
    pathname,
    contentType,
    size: Number(media.size) || 0,
    durationSec: Number(media.durationSec) > 0 ? Math.round(Number(media.durationSec)) : null,
  };
}

/** 84 -> "1:24". The chip PostCard renders under a video. */
const asMins = (sec) =>
  sec > 0 ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}` : null;

const shape = (p) => ({
  id: String(p._id),
  authorId: p.authorId,
  kind: p.kind,
  text: p.text ?? null,
  title: p.title ?? null,
  media: p.media ?? null,
  mins: p.media?.durationSec ? asMins(p.media.durationSec) : null,
  fileKind: p.fileKind ?? null,
  visibility: p.visibility,
  pinned: !!p.pinned,
  greeting: !!p.greeting,
  xp: p.xp ?? 5,
  views: p.views ?? 0,
  reactions: p.reactions ?? 0,
  comments: p.comments ?? 0,
  // ISO, not "2d ago": a relative string computed here would be wrong for
  // anyone in another timezone and impossible to cache. The client formats it.
  createdAt: p.createdAt,
});

/**
 * Author, accepted mentee of the author, or org peer reading a profile-visible
 * post. Same gate for deep links, reactions, and comments — a share link is not
 * a back door around pairing.
 */
async function canAccessPost(db, user, post) {
  if (!post || post.deletedAt) return false;
  if (String(post.authorId) === String(user.id)) return true;
  if (await hasAcceptedPair({ menteeId: user.id, mentorId: post.authorId })) return true;
  if (post.visibility === "public") {
    const ctx = await orgContext(db, user.id);
    if (ctx?.org?.orbitActive) {
      const members = await orgMemberIds(db, ctx.org._id);
      if (members.includes(String(post.authorId))) return true;
    }
  }
  return false;
}

const shapeComment = (c, nameById) => ({
  id: String(c._id),
  postId: String(c.postId),
  authorId: c.authorId,
  authorName: nameById.get(String(c.authorId)) || "—",
  text: c.text,
  createdAt: c.createdAt,
});

async function loadComments(db, postId) {
  const rows = await db
    .collection(collections.postComments)
    .find({ postId })
    .sort({ createdAt: 1 })
    .limit(100)
    .toArray();
  const authorIds = [...new Set(rows.map((r) => String(r.authorId)))].filter(ObjectId.isValid);
  const authors = authorIds.length
    ? await db.collection(collections.user)
        .find({ _id: { $in: authorIds.map((id) => new ObjectId(id)) } }, { projection: { name: 1 } })
        .toArray()
    : [];
  const nameById = new Map(authors.map((a) => [String(a._id), a.name]));
  return rows.map((c) => shapeComment(c, nameById));
}

/** The caller's own view/react history for these posts, so a refresh doesn't
    re-offer XP they already collected. */
async function viewerState(db, userId, postIds) {
  if (!postIds.length) return { watched: [], reacted: [] };
  const rows = await db
    .collection(collections.postEvents)
    .find({ userId: String(userId), postId: { $in: postIds } })
    .toArray();
  return {
    watched: rows.filter((r) => r.type === "view").map((r) => String(r.postId)),
    reacted: rows.filter((r) => r.type === "react").map((r) => String(r.postId)),
  };
}

async function readFeed(db, { authorId, viewer, cohortOnly }) {
  const filter = { authorId: String(authorId), deletedAt: null };
  if (cohortOnly) filter.visibility = { $in: ["cohort", "public"] };
  const rows = await db
    .collection(collections.posts)
    .find(filter)
    // Pinned first — that's what the greeting video is, and it's meant to be
    // the first thing a new mentee sees.
    .sort({ pinned: -1, createdAt: -1 })
    .limit(100)
    .toArray();

  const posts = rows.map(shape);
  return { posts, viewerState: await viewerState(db, viewer, rows.map((r) => r._id)) };
}

async function handler(request, user) {
  const url = new URL(request.url);
  const db = await getDb();
  const posts = db.collection(collections.posts);
  const isMentor = sideOf(user) === "mentor";

  /* ————— read ————— */
  if (request.method === "GET") {
    const mentorId = url.searchParams.get("mentorId");
    const scope = url.searchParams.get("scope");
    const postIdParam = url.searchParams.get("id");

    /* Deep-link / share target: one post the caller is allowed to see. */
    if (postIdParam) {
      let _id;
      try { _id = new ObjectId(String(postIdParam)); } catch { return fail(400, "bad_request", "Which post?"); }
      const post = await posts.findOne({ _id, deletedAt: null });
      if (!post || !(await canAccessPost(db, user, post))) {
        return fail(404, "not_found", "That post isn’t available.");
      }
      if (url.searchParams.get("comments") === "1") {
        return json({ comments: await loadComments(db, _id) });
      }
      return json({ post: shape(post), viewerState: await viewerState(db, user.id, [_id]) });
    }

    /* The org Orbit: everything the org's people have put on their profile, in
       one feed. Deliberately `public` only — a cohort post is written for that
       mentor's mentees, and an org feed must not be a back door around the
       pairing check that carries it. Closed until the owner opens it. */
    if (scope === "org") {
      const empty = { watched: [], reacted: [] };
      const ctx = await orgContext(db, user.id);
      if (!ctx) return fail(404, "no_org", "You're not in an organisation yet.");
      if (!ctx.org.orbitActive) {
        return json({ posts: [], viewerState: empty, orbit: { active: false, org: ctx.org.name } });
      }

      const memberIds = await orgMemberIds(db, ctx.org._id);
      const rows = memberIds.length
        ? await posts
            .find({ authorId: { $in: memberIds }, deletedAt: null, visibility: "public" })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray()
        : [];

      const authorIds = [...new Set(rows.map((r) => String(r.authorId)))].filter(ObjectId.isValid);
      const authors = authorIds.length
        ? await db.collection(collections.user)
            .find({ _id: { $in: authorIds.map((id) => new ObjectId(id)) } }, { projection: { name: 1 } })
            .toArray()
        : [];
      const nameById = new Map(authors.map((a) => [String(a._id), a.name]));

      return json({
        posts: rows.map((p) => ({ ...shape(p), authorName: nameById.get(String(p.authorId)) || "—" })),
        viewerState: await viewerState(db, user.id, rows.map((r) => r._id)),
        orbit: { active: true, org: ctx.org.name, members: memberIds.length },
      });
    }

    if (mentorId) {
      const paired = mentorId === user.id || (await hasAcceptedPair({ menteeId: user.id, mentorId }));
      /* Profile previews (match deck / explore) can read posts marked public
         without a pair. Full Orbit still requires an accepted match. */
      if (!paired && scope === "profile") {
        const filter = { authorId: String(mentorId), deletedAt: null, visibility: "public" };
        const rows = await posts
          .find(filter)
          .sort({ pinned: -1, createdAt: -1 })
          .limit(50)
          .toArray();
        return json({
          posts: rows.map(shape),
          viewerState: await viewerState(db, user.id, rows.map((r) => r._id)),
        });
      }
      if (!paired) {
        return fail(403, "not_paired", "You can only read the feed of a mentor you're working with.");
      }
      return json(await readFeed(db, { authorId: mentorId, viewer: user.id, cohortOnly: mentorId !== user.id }));
    }
    if (!isMentor) return json({ posts: [], viewerState: { watched: [], reacted: [] } });
    return json(await readFeed(db, { authorId: user.id, viewer: user.id, cohortOnly: false }));
  }

  /* ————— write ————— */
  if (request.method === "POST") {
    if (!isMentor) return fail(403, "mentors_only", "Only mentors publish to a feed.");

    let body = {};
    try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

    const kind = KINDS.has(body.kind) ? body.kind : "status";
    const text = String(body.text || "").trim().slice(0, MAX_TEXT);
    const title = String(body.title || "").trim().slice(0, MAX_TITLE);
    const media = cleanMedia(body.media, user.id);
    if (!text && !title && !media) return fail(400, "empty_post", "Write something or attach a file.");
    if (kind !== "status" && !media) return fail(400, "missing_media", "That post type needs a file attached.");

    const greeting = !!body.greeting && kind === "video";
    const visibility = VISIBILITY.has(body.visibility) ? body.visibility : "cohort";

    // One greeting per mentor: a second one demotes the first rather than
    // leaving two videos both claiming to be the introduction.
    if (greeting) {
      await posts.updateMany(
        { authorId: user.id, greeting: true, deletedAt: null },
        { $set: { greeting: false, pinned: false, updatedAt: new Date() } }
      );
    }

    const doc = {
      authorId: user.id,
      kind,
      text: text || null,
      title: title || null,
      media,
      fileKind: media ? FILE_LABEL[media.contentType] || null : null,
      visibility,
      pinned: greeting || !!body.pinned,
      greeting,
      xp: 5,
      views: 0,
      reactions: 0,
      comments: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const { insertedId } = await posts.insertOne(doc);

    const impact = greeting ? IMPACT.greeting : IMPACT.post;
    await Promise.all([
      db.collection(collections.profiles).updateOne(
        { userId: user.id },
        { $inc: { impact }, ...(greeting ? { $set: { greetingUploaded: true } } : {}) }
      ),
      // xp_events has existed and been indexed since the first migration and
      // nothing had ever written to it. This is the ledger it was built for.
      db.collection(collections.xpEvents).insertOne({
        userId: user.id, kind: "impact", amount: impact,
        reason: greeting ? "greeting_video" : "feed_post",
        postId: insertedId, createdAt: new Date(),
      }),
    ]);

    return json({ post: shape({ ...doc, _id: insertedId }), impact }, 201);
  }

  /* ————— view / react / comment / edit ————— */
  if (request.method === "PATCH") {
    let body = {};
    try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

    let _id;
    try { _id = new ObjectId(String(body.id)); } catch { return fail(400, "bad_request", "Which post?"); }

    const post = await posts.findOne({ _id, deletedAt: null });
    if (!post) return fail(404, "not_found", "That post is gone.");

    if (body.action === "comment") {
      if (!(await canAccessPost(db, user, post))) {
        return fail(403, "not_paired", "That isn’t a post you can comment on.");
      }
      const text = String(body.text || "").trim().slice(0, MAX_COMMENT);
      if (!text) return fail(400, "empty_comment", "Write a comment first.");

      const doc = {
        postId: _id,
        authorId: user.id,
        text,
        createdAt: new Date(),
      };
      const { insertedId } = await db.collection(collections.postComments).insertOne(doc);
      await posts.updateOne({ _id }, { $inc: { comments: 1 } });

      const nameById = new Map([[String(user.id), user.name || "—"]]);
      return json({
        comment: shapeComment({ ...doc, _id: insertedId }, nameById),
        comments: (post.comments ?? 0) + 1,
      }, 201);
    }

    if (body.action === "view" || body.action === "react") {
      if (!(await canAccessPost(db, user, post))) {
        return fail(403, "not_paired", "That isn’t a post you can engage with.");
      }
      // Authors don’t collect view XP / self-likes on their own posts.
      if (String(post.authorId) === String(user.id) && body.action === "react") {
        return json({ ok: true, already: true, xp: 0 });
      }
      // Insert-then-increment: the unique index makes the second attempt fail,
      // so the counter only moves the first time. A duplicate is success, not
      // an error — the caller already has the XP.
      try {
        await db.collection(collections.postEvents).insertOne({
          postId: _id, userId: user.id, type: body.action, createdAt: new Date(),
        });
      } catch (err) {
        if (err?.code === 11000) return json({ ok: true, already: true, xp: 0 });
        throw err;
      }
      const field = body.action === "view" ? "views" : "reactions";
      await posts.updateOne({ _id }, { $inc: { [field]: 1 } });

      const xp = body.action === "view" && String(post.authorId) !== String(user.id) ? (post.xp ?? 5) : 0;
      if (xp) {
        await Promise.all([
          db.collection(collections.profiles).updateOne({ userId: user.id }, { $inc: { xp } }),
          db.collection(collections.xpEvents).insertOne({
            userId: user.id, kind: "xp", amount: xp, reason: "watched_content", postId: _id, createdAt: new Date(),
          }),
        ]);
      }
      return json({ ok: true, xp });
    }

    // Everything below edits the post itself.
    if (post.authorId !== user.id) return fail(403, "not_yours", "That isn't your post.");

    const $set = { updatedAt: new Date() };
    if (typeof body.pinned === "boolean") $set.pinned = body.pinned;
    if (VISIBILITY.has(body.visibility)) $set.visibility = body.visibility;
    if (typeof body.title === "string") $set.title = body.title.trim().slice(0, MAX_TITLE) || null;
    if (typeof body.text === "string") $set.text = body.text.trim().slice(0, MAX_TEXT) || null;
    if (Object.keys($set).length === 1) return fail(400, "bad_request", "Nothing to change.");

    await posts.updateOne({ _id }, { $set });
    return json({ post: shape({ ...post, ...$set }) });
  }

  /* ————— delete ————— */
  if (request.method === "DELETE") {
    let _id;
    try { _id = new ObjectId(String(url.searchParams.get("id"))); } catch { return fail(400, "bad_request", "Which post?"); }
    const res = await posts.updateOne(
      { _id, authorId: user.id, deletedAt: null },
      { $set: { deletedAt: new Date(), pinned: false, greeting: false } }
    );
    if (!res.matchedCount) return fail(404, "not_found", "That post is gone, or it isn't yours.");
    return json({ ok: true });
  }

  return fail(405, "method_not_allowed", "Use GET, POST, PATCH or DELETE.");
}

/**
 * Blob upload tokens.
 *
 * Sits outside withUser because handleUpload owns the request body and needs
 * the raw request; the session is resolved inside onBeforeGenerateToken instead.
 *
 * The upload goes browser → Blob directly, never through here. A Vercel function
 * caps a request body at 4.5 MB and a greeting video is comfortably past that,
 * so a server-side upload route could not work even if it were tidier.
 */
async function upload(request) {
  const body = await request.json();
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getUser(request);
        if (!user) throw new Error("Sign in to upload.");
        if (sideOf(user) !== "mentor") throw new Error("Only mentors upload content.");

        /* This hook cannot rewrite the destination — it can only approve it —
           so the client proposes the path and we reject anything outside the
           caller's own folder. Without this check a mentor could write into
           another mentor's prefix and then claim the file as theirs. */
        if (!String(pathname).startsWith(`posts/${user.id}/`)) {
          throw new Error("Bad upload path.");
        }

        const wantsVideo = String(clientPayload || "").startsWith("video");
        return {
          allowedContentTypes: [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOC_TYPES],
          maximumSizeInBytes: wantsVideo ? 200 * 1024 * 1024 : 12 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async () => {
        /* Never fires on localhost — there's no public URL to call back to.
           Deliberately does nothing so the flow behaves the same either way;
           the post is created by the client's follow-up POST. */
      },
    });
    return json(result);
  } catch (err) {
    return fail(400, "upload_failed", err?.message || "Couldn't start that upload.");
  }
}

export default {
  fetch: (request) =>
    request.method === "POST" && new URL(request.url).searchParams.get("upload") === "1"
      ? upload(request)
      : withUser(handler)(request),
};
