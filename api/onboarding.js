import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { appSide } from "../lib/roles.js";

/**
 * POST /api/onboarding — persist the Ryzn AI setup answers.
 *
 * Until this existed the answers were collected in the chat and thrown away on
 * refresh, so a returning user was asked the same six questions forever and had
 * no profile for the other side to match against. The chat is one-time-only by
 * design; that promise only holds if the answers survive the session.
 *
 * Writes twice, deliberately:
 *   onboarding_answers  the raw record, one doc per user, kept verbatim
 *   profiles            the denormalised fields the roster and match cards read
 */

/* Whitelisted per role. Anything not listed here is dropped rather than stored:
   the chat lets people type free text, and this is the boundary where it stops
   being arbitrary client input. */
const FIELDS = {
  mentee: ["track", "interests", "skills", "influence", "goals"],
  mentor: ["role", "industry", "expertise", "menteefit", "capacity", "why"],
};

const MAX_ITEMS = 24;      // a multi-select answer
const MAX_LEN = 400;       // one written answer or goal

/* Single-select / write answers. Chat used to submit `sel` (an array) for
   every non-write step, so track/industry landed on profiles as ["University"]
   and any `.toUpperCase()` in the UI threw during render. */
const SCALAR = new Set(["track", "industry", "capacity", "role", "why"]);

const cleanString = (v) => (typeof v === "string" ? v.trim().slice(0, MAX_LEN) : null);

const cleanList = (v) =>
  Array.isArray(v)
    ? v.map(cleanString).filter(Boolean).slice(0, MAX_ITEMS)
    : [];

/** First usable string — arrays from single-select chat answers collapse here. */
const asScalar = (v) => (Array.isArray(v) ? cleanString(v[0]) : cleanString(v));

/** Answers arrive as string | string[] depending on the question type. */
function sanitise(answers, role) {
  const allowed = FIELDS[role] || FIELDS.mentee;
  const out = {};
  for (const key of allowed) {
    const v = answers?.[key];
    if (v === undefined || v === null) continue;
    if (SCALAR.has(key)) {
      const s = asScalar(v);
      if (s) out[key] = s;
      continue;
    }
    if (Array.isArray(v)) {
      const list = cleanList(v);
      if (list.length) out[key] = list;
    } else {
      const s = cleanString(v);
      if (s) out[key] = [s];
    }
  }
  return out;
}

/** The subset the match cards and roster actually render. */
function profileFields(answers, role) {
  if (role === "mentor") {
    return {
      headline: answers.role || null,
      industry: answers.industry || null,
      expertise: answers.expertise || [],
      menteeFit: answers.menteefit || [],
      // "4 mentees" → 4. Falls back to 2 rather than 0 so a mentor is never
      // silently capped out of their own cohort by a parsing miss.
      capacity: Number.parseInt(answers.capacity, 10) || 2,
      why: answers.why || null,
    };
  }
  return {
    track: answers.track || null,
    interests: answers.interests || [],
    skills: answers.skills || [],
    influences: answers.influence || [],
    goals: answers.goals || [],
  };
}

async function handler(request, user) {
  if (request.method !== "POST") return fail(405, "method_not_allowed", "POST only.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad_request", "Expected a JSON body.");
  }

  const role = appSide(user.role);
  const answers = sanitise(body?.answers, role);
  if (!Object.keys(answers).length) {
    return fail(400, "bad_request", "No usable answers in that submission.");
  }

  const db = await getDb();
  const now = new Date();

  await db.collection(collections.onboardingAnswers).updateOne(
    { userId: user.id },
    {
      $set: { userId: user.id, role, answers, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  await db.collection(collections.profiles).updateOne(
    { userId: user.id },
    {
      $set: {
        ...profileFields(answers, role),
        onboardingComplete: true,
        onboardingCompletedAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  // Mirrored onto the auth user so /api/me can answer "has this person set up
  // yet?" without a second round trip on every app load.
  await db.collection(collections.user).updateOne(
    { _id: new ObjectId(user.id) },
    { $set: { onboardingComplete: true, updatedAt: now } }
  );

  return json({ ok: true, onboardingComplete: true });
}

export default { fetch: withUser(handler) };
