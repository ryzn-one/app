import { randomUUID } from "crypto";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { sideOf, hasAcceptedPair, matchesCollection } from "../lib/matches.js";

/**
 * /api/program — a mentor's authored program (phases a mentee moves through,
 * each with an optional reward/certificate), and a mentee's progress against it.
 *
 *   GET   /api/program                own phases (mentor)
 *   GET   /api/program?mentorId=…     that mentor's phases + my progress (mentee, paired only)
 *   GET   /api/program?menteeId=…     my own phases + that mentee's progress (mentor, paired only)
 *   PUT   /api/program {phases}       replace the whole phase list (mentor only)
 *   PATCH /api/program {menteeId, phaseId, completed}   mark a phase done/undone for a mentee (mentor only)
 *
 * Phases live in their own collection, one doc per mentor — the same shape
 * every mentee reads. Progress rides on the `matches` doc instead of a new
 * collection, following the rule /api/me already documents for cohort state:
 * one shared record, so neither side can drift from the other.
 */

const MAX_PHASES = 20;
const MAX_TITLE = 100;
const MAX_DESC = 1000;
const MAX_DURATION = 40;
const MAX_REWARD_LABEL = 80;
const MAX_REWARD_DESC = 300;
const REWARD_COLORS = new Set(["purple", "teal", "coral", "amber"]);
const PHASE_XP = 20;

const cleanReward = (r) => {
  if (!r || typeof r !== "object") return null;
  const label = String(r.label || "").trim().slice(0, MAX_REWARD_LABEL);
  if (!label) return null;
  return {
    label,
    description: String(r.description || "").trim().slice(0, MAX_REWARD_DESC),
    color: REWARD_COLORS.has(r.color) ? r.color : "purple",
  };
};

const cleanPhases = (input) => {
  const arr = Array.isArray(input) ? input.slice(0, MAX_PHASES) : [];
  return arr
    .map((p, i) => {
      const title = String(p?.title || "").trim().slice(0, MAX_TITLE);
      if (!title) return null;
      return {
        id: typeof p?.id === "string" && p.id ? p.id.slice(0, 60) : randomUUID(),
        title,
        description: String(p?.description || "").trim().slice(0, MAX_DESC),
        duration: String(p?.duration || "").trim().slice(0, MAX_DURATION),
        order: i,
        reward: cleanReward(p?.reward),
      };
    })
    .filter(Boolean);
};

async function ownPhases(db, mentorId) {
  const doc = await db.collection(collections.programs).findOne({ mentorId });
  return doc?.phases || [];
}

async function progressFor(mentorId, menteeId) {
  const col = await matchesCollection();
  const m = await col.findOne(
    { mentorId, menteeId, status: "accepted" },
    { projection: { programProgress: 1 } }
  );
  return m?.programProgress?.completedPhaseIds || [];
}

async function handler(request, user) {
  const url = new URL(request.url);
  const db = await getDb();
  const isMentor = sideOf(user) === "mentor";

  if (request.method === "GET") {
    const mentorId = url.searchParams.get("mentorId");
    const menteeId = url.searchParams.get("menteeId");

    if (mentorId) {
      if (!(await hasAcceptedPair({ menteeId: user.id, mentorId }))) {
        return fail(403, "not_paired", "You can only read the program of a mentor you're working with.");
      }
      const [phases, completedPhaseIds] = await Promise.all([
        ownPhases(db, mentorId),
        progressFor(mentorId, user.id),
      ]);
      return json({ phases, completedPhaseIds });
    }

    if (menteeId) {
      if (!isMentor) return fail(403, "mentors_only", "Only mentors read a mentee's progress.");
      if (!(await hasAcceptedPair({ menteeId, mentorId: user.id }))) {
        return fail(403, "not_paired", "That mentee isn't in your cohort.");
      }
      const [phases, completedPhaseIds] = await Promise.all([
        ownPhases(db, user.id),
        progressFor(user.id, menteeId),
      ]);
      return json({ phases, completedPhaseIds });
    }

    if (!isMentor) return fail(400, "missing_mentor", "Pass ?mentorId= to read a mentor's program.");
    return json({ phases: await ownPhases(db, user.id) });
  }

  if (request.method === "PUT") {
    if (!isMentor) return fail(403, "mentors_only", "Only mentors author a program.");
    let body = {};
    try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

    const phases = cleanPhases(body.phases);
    const now = new Date();
    await db.collection(collections.programs).updateOne(
      { mentorId: user.id },
      { $set: { mentorId: user.id, phases, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
    return json({ phases });
  }

  if (request.method === "PATCH") {
    if (!isMentor) return fail(403, "mentors_only", "Only mentors mark a phase complete.");
    let body = {};
    try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

    const menteeId = String(body.menteeId || "");
    const phaseId = String(body.phaseId || "");
    const completed = !!body.completed;
    if (!menteeId || !phaseId) return fail(400, "bad_request", "menteeId and phaseId are required.");

    if (!(await hasAcceptedPair({ menteeId, mentorId: user.id }))) {
      return fail(403, "not_paired", "That mentee isn't in your cohort.");
    }
    const phases = await ownPhases(db, user.id);
    if (!phases.some((p) => p.id === phaseId)) {
      return fail(404, "not_found", "That phase isn't part of your program.");
    }

    const col = await matchesCollection();
    const already = (await progressFor(user.id, menteeId)).includes(phaseId);

    await col.updateOne(
      { mentorId: user.id, menteeId, status: "accepted" },
      completed
        ? { $addToSet: { "programProgress.completedPhaseIds": phaseId } }
        : { $pull: { "programProgress.completedPhaseIds": phaseId } }
    );

    // XP is awarded once, the first time a phase is completed — never clawed
    // back on un-mark, same posture the post view/react counters already take.
    if (completed && !already) {
      await Promise.all([
        db.collection(collections.profiles).updateOne({ userId: menteeId }, { $inc: { xp: PHASE_XP } }),
        db.collection(collections.xpEvents).insertOne({
          userId: menteeId, kind: "xp", amount: PHASE_XP, reason: "phase_complete", phaseId, createdAt: new Date(),
        }),
      ]);
    }

    return json({ completedPhaseIds: await progressFor(user.id, menteeId) });
  }

  return fail(405, "method_not_allowed", "Use GET, PUT or PATCH.");
}

export default { fetch: withUser(handler) };
