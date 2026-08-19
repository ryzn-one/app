import { collections } from "./db.js";

/**
 * Stage 1, the unlock track.
 *
 * Three steps, and finishing them opens Chat. It is the most load-bearing loop
 * in the product: a new person has no habit, no mentor relationship and no
 * reason to come back tomorrow, and this is the thing that gives them one.
 *
 * **Scoped to the orbit, not to the person.** Someone can be six weeks into
 * their company's programme and brand new in a circle they joined yesterday,
 * and both must be true at once. That is why this is a document per
 * (userId, orbitId) and not a boolean on the profile, a boolean would tell the
 * circle they were already finished there, hand them a mentor's inbox they had
 * never earned, and skip the only onboarding that orbit has.
 *
 * Two of the three steps are *derived* rather than recorded. Onboarding being
 * done and holding a mentor are already facts with a single source elsewhere;
 * copying them into a checklist would create a second answer that can drift
 * from the first. Only the exercise is written here, because "wrote their first
 * paragraph *in this orbit*" is not recorded anywhere else.
 */

/**
 * The steps, in order. `xp` is what the step pays, and it is shown on the button
 * before it is tapped, never only in the toast afterwards.
 *
 * The unlock card renders exactly one of these at a time. A flat list of
 * everything remaining is the thing it exists not to be: three tasks at once
 * reads as a chore, one task with the prize named reads as a next move.
 */
export const STAGE1_STEPS = [
  {
    id: "setup",
    title: "Finish your setup",
    sub: "Five questions. It's what your mentor reads first.",
    xp: 15,
  },
  {
    id: "mentor",
    title: "Find your mentor",
    sub: "One person who has done the thing you're trying to do.",
    xp: 15,
  },
  {
    id: "first-exercise",
    title: "Write your first paragraph",
    sub: "One honest answer. Your mentor reads this one, that's the whole point.",
    xp: 30,
  },
];

export const STAGE1_TOTAL_XP = STAGE1_STEPS.reduce((n, s) => n + s.xp, 0);

/** The badge minted for finishing the track. Guide §8. */
export const CONNECT_BADGE = "connect";

/**
 * Which steps are done in this orbit.
 *
 *   done       ids, in step order
 *   current    the step to show on the card, or null when the track is finished
 *   complete   all three
 *   index      1-based position of `current`, for "STEP n OF 3"
 *
 * `recorded` is what the stage_progress document holds; the rest is derived from
 * facts that already have an owner.
 */
export function resolveStage({ recorded = [], onboardingComplete = false, hasMentor = false }) {
  const done = new Set(recorded);
  if (onboardingComplete) done.add("setup");
  if (hasMentor) done.add("mentor");

  const ordered = STAGE1_STEPS.filter((s) => done.has(s.id)).map((s) => s.id);
  const current = STAGE1_STEPS.find((s) => !done.has(s.id)) || null;

  return {
    done: ordered,
    current,
    complete: ordered.length === STAGE1_STEPS.length,
    index: current ? STAGE1_STEPS.indexOf(current) + 1 : STAGE1_STEPS.length,
    total: STAGE1_STEPS.length,
    remainingXp: STAGE1_STEPS.filter((s) => !done.has(s.id)).reduce((n, s) => n + s.xp, 0),
  };
}

/**
 * Is Chat open for this person in this orbit?
 *
 * A policy question, asked in exactly one place so the padlock on the tab, the
 * locked screen, and the endpoint that refuses to deliver the message can never
 * disagree. `chatGate: false` means chat was never gated here, which is a real
 * configuration and not an oversight, some orbits want people talking on day
 * one.
 */
export const chatUnlocked = (policy, stage) => !policy?.chatGate || !!stage?.complete;

/** The recorded half of the track for one (person, orbit). */
export async function recordedSteps(db, userId, orbitId) {
  const doc = await db.collection(collections.stageProgress).findOne({
    userId: String(userId),
    orbitId: String(orbitId),
  });
  return Array.isArray(doc?.steps) ? doc.steps : [];
}

/** Recorded steps for one person across every orbit, keyed by orbit id. One read
    for the whole switcher rather than one per orbit. */
export async function recordedByOrbit(db, userId) {
  const rows = await db
    .collection(collections.stageProgress)
    .find({ userId: String(userId) })
    .toArray();
  return new Map(rows.map((r) => [r.orbitId, Array.isArray(r.steps) ? r.steps : []]));
}

/**
 * Mark a step done in an orbit. Idempotent, `$addToSet` means a double submit
 * records one step, which matters because the caller awards XP on the result.
 * Returns whether this call is the one that changed anything.
 */
export async function recordStep(db, userId, orbitId, stepId) {
  if (!STAGE1_STEPS.some((s) => s.id === stepId)) return { changed: false };
  const res = await db.collection(collections.stageProgress).updateOne(
    { userId: String(userId), orbitId: String(orbitId) },
    {
      $addToSet: { steps: stepId },
      $setOnInsert: { userId: String(userId), orbitId: String(orbitId), createdAt: new Date() },
      $set: { updatedAt: new Date() },
    },
    { upsert: true }
  );
  return { changed: res.modifiedCount > 0 || res.upsertedCount > 0 };
}
