import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, withUser, ageFrom } from "../lib/http.js";
import { acceptedFor, sideOf } from "../lib/matches.js";

/**
 * GET /api/me — session user + Ryzn profile + live pairings.
 *
 * Bootstraps the profile row on first call so Google OAuth signups (which never
 * hit our register endpoint) still get one.
 *
 * The mentee's mentor and the mentor's cohort are read from the matches
 * collection on every call rather than stored on the profile. One source, so
 * the two sides cannot drift apart, and no denormalised copy to keep in sync.
 */

/** Names and headline details for a set of user ids. */
async function peopleById(db, ids) {
  if (!ids.length) return { users: new Map(), profiles: new Map() };
  const [users, profiles] = await Promise.all([
    db.collection(collections.user)
      .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, { projection: { name: 1, image: 1 } })
      .toArray(),
    db.collection(collections.profiles).find({ userId: { $in: ids } }).toArray(),
  ]);
  return {
    users: new Map(users.map((u) => [String(u._id), u])),
    profiles: new Map(profiles.map((p) => [p.userId, p])),
  };
}

async function handler(request, user) {
  const db = await getDb();
  const profiles = db.collection(collections.profiles);

  const base = {
    userId: user.id,
    role: user.role || "mentee",
    createdAt: new Date(),
    updatedAt: new Date(),
    fresh: true,
    onboardingComplete: false,
    ...(user.role === "mentor"
      ? { impact: 0, tier: "Scout", mentorRank: null, cohort: [], greetingUploaded: false }
      : { week: 1, streak: 0, xp: 0, rank: null, mentorUserId: null, supportMentorIds: [], earned: {} }),
  };

  // Upsert-on-read: $setOnInsert means an existing profile is never clobbered.
  await profiles.updateOne(
    { userId: user.id },
    { $setOnInsert: base },
    { upsert: true }
  );
  const profile = await profiles.findOne({ userId: user.id });

  const age = ageFrom(user.dateOfBirth);
  const isMinor = age !== null && age < 18;

  /* ————— live pairings ————— */
  const side = sideOf(user);
  const accepted = await acceptedFor(user.id, side);
  const otherIds = accepted.map((m) => (side === "mentor" ? m.menteeId : m.mentorId));
  const { users: otherUsers, profiles: otherProfiles } = await peopleById(db, otherIds);

  let mentor = null;
  let supportMentors = [];
  let cohort = [];

  if (side === "mentee") {
    const shape = (m) => {
      const u = otherUsers.get(m.mentorId);
      const p = otherProfiles.get(m.mentorId) || {};
      return {
        matchId: String(m._id),
        id: m.mentorId,
        name: u?.name || "—",
        headline: p.headline ?? null,
        tier: p.tier ?? "Scout",
        seat: m.seat,
      };
    };
    mentor = accepted.filter((m) => m.seat === "active").map(shape)[0] ?? null;
    supportMentors = accepted.filter((m) => m.seat !== "active").map(shape);
  } else {
    cohort = accepted.map((m) => {
      const u = otherUsers.get(m.menteeId);
      const p = otherProfiles.get(m.menteeId) || {};
      return {
        matchId: String(m._id),
        id: m.menteeId,
        name: u?.name || "—",
        track: p.track ?? null,
        goals: p.goals ?? [],
        week: p.week ?? 1,
        streak: p.streak ?? 0,
        badges: Object.keys(p.earned || {}).length,
        // Stage 1 is the first exercise. Nothing writes it yet, so it reads
        // false rather than defaulting to "done".
        stage1: !!p.stage1Complete,
        status: "active",
      };
    });
  }

  return json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      role: user.role || "mentee",
      emailVerified: user.emailVerified,
      onboardingComplete: user.onboardingComplete ?? false,
    },
    profile: { ...profile, _id: undefined },
    mentor,
    supportMentors,
    cohort,
    compliance: {
      age,
      isMinor,
      // Under-18 signups need guardian consent before any mentor contact opens.
      // The client should route these to a consent screen rather than the app.
      needsDateOfBirth: age === null,
      needsGuardianConsent: isMinor && !user.guardianConsentAt,
    },
  });
}

export default { fetch: withUser(handler) };
