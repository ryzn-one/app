import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, withUser, ageFrom } from "../lib/http.js";
import { acceptedFor, sideOf, orbitOfMatch } from "../lib/matches.js";
import { isAdmin, canAccessAdminConsole } from "../lib/admin.js";
import { isMentorRole } from "../lib/roles.js";
import { asLabel } from "../lib/scalars.js";
import { orgContext, publicOrg } from "../lib/orgs.js";
import { prefsOf } from "../lib/prefs.js";
import { ensureHandle } from "../lib/handles.js";

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
      : { week: 1, streak: 0, xp: 0, rank: null, earned: {} }),
  };

  // Upsert-on-read: $setOnInsert means an existing profile is never clobbered.
  await profiles.updateOne(
    { userId: user.id },
    { $setOnInsert: base },
    { upsert: true }
  );
  let profile = await profiles.findOne({ userId: user.id });
  profile = await ensureHandle(db, user, profile);
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

  /* Every accepted mentor, oldest pairing first — a flat list, because each one
     opens its own Orbit and none of them outranks the others. This used to be
     `mentor` plus `supportMentors`, and only `mentor` had a product behind it. */
  let mentors = [];
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
        since: m.respondedAt ?? m.createdAt ?? null,
        /* Which orbit this pairing was formed in — the client counts seats
           against the *active* orbit's cap, so a mentor held in a circle must
           not occupy a seat at work. Pairings older than orbits belong to the
           public orbit, which is where Ryzn was. */
        orbitId: orbitOfMatch(m),
      };
    };
    mentors = accepted
      .slice()
      .sort((a, b) => new Date(a.respondedAt ?? a.createdAt ?? 0) - new Date(b.respondedAt ?? b.createdAt ?? 0))
      .map(shape);
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
        // Which orbit this mentee sits in for this mentor — a cohort spans
        // orbits, and a console may only see the people in its own.
        orbitId: orbitOfMatch(m),
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

  /* ————— at risk —————
   *
   * Days since the last exercise, computed rather than stored. It has two
   * consumers and they must read the same number: the HR console's at-risk
   * count, and the mentee's own Home, where it becomes a nudge **attributed to
   * their mentor** — "Jordan noticed…", never "your programme administrator
   * noticed". Social accountability outperforms administrative email, and a
   * person who feels monitored by HR closes the app rather than opening the
   * exercise.
   *
   * Three days is the threshold: two is a weekend, four is a habit already lost.
   * A mentee with no mentor yet is not at risk — there is nobody for the nudge
   * to come from, and the unlock track is already the thing asking them to move.
   */
  /* How many people follow this mentor. Portable, like everything else on the
     identity: a follower earned in a circle still counts in a company orbit,
     because they followed the person and not the space. One indexed count. */
  let followers = 0;
  if (side === "mentor") {
    followers = await db.collection(collections.follows).countDocuments({ followingId: user.id });
  }

  let atRisk = null;
  if (side === "mentee" && mentors.length) {
    const last = profile?.lastExerciseDay || null;
    const days = last
      ? Math.floor((Date.parse(`${utcDayKey()}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) / 86_400_000)
      : null;
    // Never written one at all is a different state from having stopped: the
    // track is still asking for the first, so Home doesn't also nudge for it.
    if (days !== null && days >= 3) {
      atRisk = { daysSince: days, lastDay: last, mentorId: mentors[0].id, mentorName: mentors[0].name };
    }
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
      /* Resolved with defaults filled in. A preference added after someone
         signed up must read as its default here, not as `undefined` — a Settings
         toggle bound to `undefined` renders off and then silently turns a live
         notification stream off the first time it's touched. */
      prefs: prefsOf(profile),
      _id: undefined,
    },
    mentors,
    cohort,
    exercise,
    followers,
    // Non-null only when a mentee has stopped. Home turns it into a nudge from
    // their mentor; the console counts it. One number, two consumers.
    atRisk,
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
