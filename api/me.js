import { getDb, collections } from "../lib/db.js";
import { json, withUser, ageFrom } from "../lib/http.js";

/**
 * GET /api/me — session user + Ryzn profile.
 *
 * Bootstraps the profile row on first call so Google OAuth signups (which never
 * hit our register endpoint) still get one. Shaped to match the `user` object
 * RyznApp.jsx already builds, so the screens need no changes.
 */
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
