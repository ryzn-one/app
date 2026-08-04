import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, withUser, ageFrom } from "../lib/http.js";
import { acceptedFor, sideOf } from "../lib/matches.js";
import { isAdmin, canAccessAdminConsole } from "../lib/admin.js";
import { isMentorRole } from "../lib/roles.js";
import { asLabel } from "../lib/scalars.js";
import { orgContext, publicOrg } from "../lib/orgs.js";

const utcDayKey = (d = new Date()) => d.toISOString().slice(0, 10);

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

/**
 * Authoritative "setup already done" — never trust Better Auth cookieCache alone.
 * Order: profile flags → saved answers → fresh user doc → founders always done.
 * Backfills the profile flag so the next boot is a single read.
 */
async function resolveOnboarding(db, user, profile) {
  if (user.role === "admin") {
    if (!profile?.onboardingComplete) {
      const now = new Date();
      await db.collection(collections.profiles).updateOne(
        { userId: user.id },
        { $set: { onboardingComplete: true, onboardingCompletedAt: profile?.onboardingCompletedAt || now, updatedAt: now } }
      );
    }
    return true;
  }

  let done = !!(profile?.onboardingComplete || profile?.onboardingCompletedAt);

  if (!done) {
    const answers = await db.collection(collections.onboardingAnswers).findOne(
      { userId: user.id },
      { projection: { _id: 1 } }
    );
    if (answers) done = true;
  }

  if (!done) {
    const fresh = await db.collection(collections.user).findOne(
      { _id: new ObjectId(user.id) },
      { projection: { onboardingComplete: 1 } }
    );
    if (fresh?.onboardingComplete) done = true;
  }

  if (done && !profile?.onboardingComplete) {
    const now = new Date();
    await db.collection(collections.profiles).updateOne(
      { userId: user.id },
      { $set: { onboardingComplete: true, onboardingCompletedAt: profile?.onboardingCompletedAt || now, updatedAt: now } }
    );
  }

  return done;
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
    // Founders (`admin`) get a mentor-shaped profile — they never sit on the mentee side.
    ...(isMentorRole(user.role)
      ? { impact: 0, tier: "Scout", mentorRank: null, cohort: [], greetingUploaded: false }
      : { week: 1, streak: 0, xp: 0, rank: null, mentorUserId: null, supportMentorIds: [], earned: {} }),
  };

  // Upsert-on-read: $setOnInsert means an existing profile is never clobbered.
  await profiles.updateOne(
    { userId: user.id },
    { $setOnInsert: base },
    { upsert: true }
  );
  let profile = await profiles.findOne({ userId: user.id });
  const onboardingComplete = await resolveOnboarding(db, user, profile);
  if (onboardingComplete && !profile?.onboardingComplete) {
    profile = await profiles.findOne({ userId: user.id });
  }

  const age = ageFrom(user.dateOfBirth);
  const isMinor = age !== null && age < 18;

  /* ————— organisation ————— */
  const orgCtx = await orgContext(db, user.id);
  const org = orgCtx
    ? publicOrg(orgCtx.org, { orgRole: orgCtx.membership.orgRole })
    : null;

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
        avatarUrl: p.avatarUrl ?? u?.image ?? null,
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
        headline: p.headline ?? null,
        avatarUrl: p.avatarUrl ?? u?.image ?? null,
        track: asLabel(p.track),
        goals: p.goals ?? [],
        skills: p.skills ?? [],
        interests: p.interests ?? [],
        influences: p.influences ?? [],
        education: p.education ?? null,
        experience: p.experience ?? null,
        week: p.week ?? 1,
        streak: p.streak ?? 0,
        badges: Object.keys(p.earned || {}).length,
        // Stage 1 flips when /api/exercises records their first submission.
        stage1: !!p.stage1Complete,
        status: "active",
      };
    });
  }

  /* Today's exercise — so the mentee home card survives a refresh without a
     second round-trip, and so "done" isn't a useState that dies on reload. */
  let exercise = null;
  if (side === "mentee") {
    const today = await db.collection(collections.exercises).findOne(
      { userId: user.id, dayKey: utcDayKey() },
      { projection: { text: 1, title: 1, exerciseId: 1, xpAwarded: 1, createdAt: 1, dayKey: 1 } }
    );
    exercise = {
      todayDone: !!today,
      today: today
        ? {
            id: String(today._id),
            exerciseId: today.exerciseId,
            title: today.title,
            text: today.text,
            xpAwarded: today.xpAwarded ?? 0,
            dayKey: today.dayKey,
            createdAt: today.createdAt?.toISOString?.() ?? today.createdAt,
          }
        : null,
    };
  }

  return json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      role: user.role || "mentee",
      /* Capability flag (ADMIN_EMAILS or role:admin). Not enough alone to open
         the console — mentees on the env list must not see founder tools. */
      isAdmin: isAdmin(user),
      /* Door into the founder console. Mentees never get this, even when their
         email is in ADMIN_EMAILS — promote via admin invite or `admin:grant`. */
      adminConsole: canAccessAdminConsole(user),
      emailVerified: user.emailVerified,
      /* Resolved from profile / answers / fresh user doc — not cookieCache. */
      onboardingComplete,
    },
    /* Collapse single-select arrays left over from the chat submit bug so the
       client never sees track/industry as ["University"] and crashes on
       `.toUpperCase()`. */
    profile: {
      ...profile,
      track: asLabel(profile?.track) ?? profile?.track ?? null,
      industry: asLabel(profile?.industry) ?? profile?.industry ?? null,
      onboardingComplete,
      _id: undefined,
    },
    mentor,
    supportMentors,
    cohort,
    exercise,
    /* Their organisation, if they're in one — two indexed reads, and it's what
       lets the app show a way into the org console instead of the Teams pitch.
       The console itself still reads /api/orgs for the roster and codes. */
    org,
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
