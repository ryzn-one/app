import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { sideOf, hasAcceptedPair } from "../lib/matches.js";
import { rateLimit } from "../lib/ratelimit.js";

/**
 * /api/exercises — daily mentee writing, with XP/streak that survive a refresh.
 *
 *   GET  /api/exercises                 mentee: today + recent own submissions
 *   GET  /api/exercises?menteeId=…      mentor: that mentee's submissions (paired)
 *   POST /api/exercises { text }        mentee: submit today's paragraph
 *
 * The home card promised "Your mentor reads it." Nothing stored the paragraph
 * before — submitToday only flipped React state. This is the store.
 */

const MAX_TEXT = 4000;
const MIN_TEXT = 20;

/** Authored track. XP is server-owned so the client can't invent a reward. */
const TRACK = {
  "write-your-why": {
    id: "write-your-why",
    title: "Write your why",
    xp: 30,
    prompt: "One honest paragraph: why are you here, really?",
  },
};

const utcDayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const utcYesterdayKey = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

const shape = (doc, viewerId) => ({
  id: String(doc._id),
  exerciseId: doc.exerciseId,
  title: doc.title,
  text: doc.text,
  dayKey: doc.dayKey,
  xpAwarded: doc.xpAwarded ?? 0,
  createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
  mine: doc.userId === viewerId,
});

async function handler(request, user) {
  const db = await getDb();
  const col = db.collection(collections.exercises);
  const profiles = db.collection(collections.profiles);
  const side = sideOf(user);

  if (request.method === "GET") {
    const url = new URL(request.url);
    const menteeId = url.searchParams.get("menteeId");

    if (menteeId) {
      if (!/^[a-f\d]{24}$/i.test(menteeId)) return fail(400, "bad_request", "menteeId looks wrong.");
      if (side !== "mentor") return fail(403, "forbidden", "Only mentors can read a mentee's exercises.");
      if (!(await hasAcceptedPair({ menteeId, mentorId: user.id }))) {
        return fail(403, "forbidden", "You can only read exercises from mentees in your cohort.");
      }
      const rows = await col.find({ userId: String(menteeId) }).sort({ createdAt: -1 }).limit(30).toArray();
      return json({ exercises: rows.map((r) => shape(r, user.id)) });
    }

    if (side !== "mentee") return fail(403, "forbidden", "Mentors don't submit daily exercises.");

    const dayKey = utcDayKey();
    const [today, recent] = await Promise.all([
      col.findOne({ userId: user.id, dayKey }),
      col.find({ userId: user.id }).sort({ createdAt: -1 }).limit(14).toArray(),
    ]);
    return json({
      today: today ? shape(today, user.id) : null,
      todayDone: !!today,
      open: TRACK["write-your-why"],
      exercises: recent.map((r) => shape(r, user.id)),
    });
  }

  if (request.method === "POST") {
    if (side !== "mentee") return fail(403, "forbidden", "Only mentees submit daily exercises.");

    const rl = await rateLimit(`exercise-submit:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 });
    if (!rl.ok) return fail(429, "rate_limited", "Slow down — try again in a bit.");

    let body;
    try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected JSON."); }

    const text = String(body?.text || "").trim();
    if (text.length < MIN_TEXT) {
      return fail(400, "too_short", `Write at least ${MIN_TEXT} characters — one honest paragraph.`);
    }
    if (text.length > MAX_TEXT) return fail(400, "too_long", "That paragraph is too long.");

    const exerciseId = String(body?.exerciseId || "write-your-why");
    const def = TRACK[exerciseId];
    if (!def) return fail(400, "unknown_exercise", "That exercise isn't open yet.");

    const dayKey = utcDayKey();
    const existing = await col.findOne({ userId: user.id, dayKey });
    if (existing) {
      return fail(409, "already_submitted", "You already did today's exercise. Come back tomorrow.");
    }

    const now = new Date();
    let insertedId;
    try {
      const { insertedId: id } = await col.insertOne({
        userId: user.id,
        exerciseId: def.id,
        title: def.title,
        text,
        dayKey,
        xpAwarded: def.xp,
        createdAt: now,
        updatedAt: now,
      });
      insertedId = id;
    } catch (err) {
      if (err?.code === 11000) {
        return fail(409, "already_submitted", "You already did today's exercise. Come back tomorrow.");
      }
      throw err;
    }

    const profile = await profiles.findOne({ userId: user.id });
    const last = profile?.lastExerciseDay || null;
    let streak = 1;
    if (last === utcYesterdayKey()) streak = (profile?.streak || 0) + 1;
    else if (last === dayKey) streak = profile?.streak || 1;

    await Promise.all([
      profiles.updateOne(
        { userId: user.id },
        {
          $inc: { xp: def.xp },
          $set: {
            streak,
            lastExerciseDay: dayKey,
            stage1Complete: true,
            updatedAt: now,
          },
        }
      ),
      db.collection(collections.xpEvents).insertOne({
        userId: user.id,
        kind: "xp",
        amount: def.xp,
        reason: "daily_exercise",
        exerciseId: def.id,
        dayKey,
        createdAt: now,
      }),
    ]);

    const updated = await profiles.findOne({ userId: user.id }, { projection: { xp: 1, streak: 1, stage1Complete: 1 } });
    const doc = await col.findOne({ _id: insertedId });

    return json({
      exercise: shape(doc, user.id),
      xp: updated?.xp ?? def.xp,
      streak: updated?.streak ?? streak,
      stage1Complete: true,
      awarded: def.xp,
    });
  }

  return fail(405, "method_not_allowed", "Use GET or POST.");
}

export default { fetch: withUser(handler) };
