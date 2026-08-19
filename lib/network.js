import { ObjectId } from "mongodb";
import { collections } from "./db.js";

/**
 * The mentor network, mentor ↔ mentor, as distinct from mentor ↔ mentee.
 *
 * Two separate ideas live here and they are deliberately not the same thing:
 *
 *   follow     one-sided and needs no handshake. A match is a commitment two
 *              people make to each other and /api/matches guards it as one;
 *              following a peer commits nobody to anything, so it is a single
 *              document written by the follower and revoked by them alone.
 *
 *   amplify    a mentor putting another mentor's post into their own Orbit, so
 *              their cohort reads it. Also a pointer, never a copy: the post
 *              keeps one author, one set of counters and one place to be
 *              edited or deleted. The alternative, duplicating the row, would
 *              leave a mentee reading a version of a post its author had
 *              already taken down.
 *
 * Only `public` posts can be amplified. A `cohort` post is written for one
 * mentor's mentees, and the pairing check is the only thing carrying it to
 * them; letting a peer relay it into a different cohort would be exactly the
 * back door /api/posts refuses to open for org feeds and share links.
 */

/** Everyone this user follows. Capped, the network feed reads from this. */
export async function followingIds(db, userId) {
  const rows = await db
    .collection(collections.follows)
    .find({ followerId: String(userId) }, { projection: { followingId: 1 } })
    .limit(500)
    .toArray();
  return rows.map((r) => r.followingId);
}

/**
 * Both directions at once for a page of people: who the caller follows, and who
 * follows the caller back. Two indexed reads rather than one per row, the
 * directory renders a button per person and each needs the answer.
 */
export async function followEdges(db, userId, otherIds) {
  const ids = otherIds.map(String);
  if (!ids.length) return { following: new Set(), followers: new Set() };
  const follows = db.collection(collections.follows);
  const [out, back] = await Promise.all([
    follows.find({ followerId: String(userId), followingId: { $in: ids } }, { projection: { followingId: 1 } }).toArray(),
    follows.find({ followingId: String(userId), followerId: { $in: ids } }, { projection: { followerId: 1 } }).toArray(),
  ]);
  return {
    following: new Set(out.map((r) => r.followingId)),
    followers: new Set(back.map((r) => r.followerId)),
  };
}

/** How many people follow each of these mentors. */
export async function followerCounts(db, ids) {
  const list = ids.map(String);
  if (!list.length) return new Map();
  const rows = await db
    .collection(collections.follows)
    .aggregate([{ $match: { followingId: { $in: list } } }, { $group: { _id: "$followingId", n: { $sum: 1 } } }])
    .toArray();
  return new Map(rows.map((r) => [r._id, r.n]));
}

/**
 * Follow / unfollow, idempotent.
 *
 * The upsert rather than an insert is what makes a double tap a no-op even in
 * a database whose unique index hasn't been created yet, scripts/db-setup.mjs
 * is run by hand, so correctness cannot depend on it having run.
 */
export async function setFollow(db, followerId, followingId, on) {
  const key = { followerId: String(followerId), followingId: String(followingId) };
  if (!on) {
    const res = await db.collection(collections.follows).deleteOne(key);
    return { following: false, changed: res.deletedCount > 0 };
  }
  const res = await db
    .collection(collections.follows)
    .updateOne(key, { $setOnInsert: { ...key, createdAt: new Date() } }, { upsert: true });
  return { following: true, changed: !!res.upsertedCount };
}

/* ----- amplification ----- */

/** The amplification records a mentor owns, newest first. */
export async function amplifiedBy(db, mentorId, limit = 50) {
  return db
    .collection(collections.amplified)
    .find({ mentorId: String(mentorId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/** Which of these posts the caller has already put in their own Orbit. */
export async function amplifiedSet(db, mentorId, postIds) {
  const ids = postIds.filter((id) => ObjectId.isValid(String(id))).map((id) => new ObjectId(String(id)));
  if (!ids.length) return new Set();
  const rows = await db
    .collection(collections.amplified)
    .find({ mentorId: String(mentorId), postId: { $in: ids } }, { projection: { postId: 1 } })
    .toArray();
  return new Set(rows.map((r) => String(r.postId)));
}

/**
 * Has any of these mentors carried this post into their Orbit?
 *
 * The read behind a mentee's access to an amplified post: they are paired with
 * the mentor, the mentor amplified it, so it is theirs to read. One query for
 * the whole set of their mentors rather than one per mentor.
 */
export async function amplifiedByAny(db, postId, mentorIds) {
  const ids = mentorIds.map(String);
  if (!ids.length) return null;
  return db.collection(collections.amplified).findOne({ postId, mentorId: { $in: ids } });
}
