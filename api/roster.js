import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { listMatches, MATCH_STATUS, sideOf } from "../lib/matches.js";
import { isMentorRole } from "../lib/roles.js";
import { asLabel } from "../lib/scalars.js";

/**
 * GET /api/roster — the people on the other side of the platform.
 *
 * Mentees get mentors, mentors get mentees. Never the same side as the caller:
 * this is the only endpoint that hands one user another user's profile, and a
 * mentee-to-mentee listing would turn a platform full of minors into a
 * browsable directory of them. The role check below is the whole guard.
 *
 * Replaces the hard-coded MENTOR_MATCHES / MENTEE_MATCHES fixtures the match
 * decks used to render. An empty roster is a real answer — early cohorts start
 * empty, and the deck shows an empty state rather than invented people. Invited
 * mentors appear even before they finish the AI chat; mentees only appear once
 * setup is done.
 *
 * Query params:
 *   ?include=all   keep people the caller has already answered for, tagged with
 *                  a matchState, instead of dropping them. Explore needs this;
 *                  the onboarding decks must not have it, or they re-offer
 *                  someone already decided and the second request just 409s.
 *   ?q=            name / headline / industry / track / goals search.
 */

const LIMIT = 50;

/** Mongo's regex is a real regex — an unescaped query is a DoS waiting to be
    pasted. Same escaping as api/admin/users.js. */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Overlap between what a mentee wants and what a mentor teaches.
 *
 *  Deliberately transparent rather than clever: there is no matching engine yet,
 *  and a made-up "96%" next to someone's face is a claim the product can't back.
 *  This is a real count of shared answers, normalised — nothing more is implied.
 */
function affinity(viewerProfile, candidateProfile, viewerRole) {
  const mine = new Set(
    (viewerRole === "mentee"
      ? [...(viewerProfile.interests || []), ...(viewerProfile.skills || [])]
      : [...(candidateProfile.interests || []), ...(candidateProfile.skills || [])]
    ).map((s) => s.toLowerCase())
  );
  const theirs = (
    viewerRole === "mentee"
      ? [...(candidateProfile.expertise || []), ...(candidateProfile.menteeFit || [])]
      : [...(viewerProfile.expertise || []), ...(viewerProfile.menteeFit || [])]
  ).map((s) => s.toLowerCase());

  if (!mine.size || !theirs.length) return null;
  const hits = theirs.filter((t) => mine.has(t)).length;
  return { shared: hits, of: Math.max(mine.size, theirs.length) };
}

async function handler(request, user) {
  if (request.method !== "GET") return fail(405, "method_not_allowed", "Use GET.");

  const viewerRole = sideOf(user);
  const wanted = viewerRole === "mentee" ? "mentor" : "mentee";

  const url = new URL(request.url);
  const includeAll = url.searchParams.get("include") === "all";
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);

  const db = await getDb();

  // Anyone already requested, paired with, or passed on drops out of the deck.
  // Without this the deck re-offers people the caller has already answered for,
  // and a second request would just 409. Explore keeps them and shows the state.
  const answered = await listMatches(user, {
    statuses: [MATCH_STATUS.PENDING, MATCH_STATUS.ACCEPTED, MATCH_STATUS.DECLINED],
  });
  const otherIdOf = (m) => (viewerRole === "mentor" ? m.menteeId : m.mentorId);
  const answeredIds = new Set(answered.map(otherIdOf));
  const matchByUser = new Map(answered.map((m) => [otherIdOf(m), m]));

  /* What the caller can do about this person right now. `pending_them` is the
     one that matters: they asked first, so the action is accept/decline, not
     request. */
  const stateOf = (id) => {
    const m = matchByUser.get(id);
    if (!m) return { matchState: "none", matchId: null };
    if (m.status === MATCH_STATUS.ACCEPTED) return { matchState: "accepted", matchId: String(m._id) };
    if (m.status === MATCH_STATUS.DECLINED) return { matchState: "declined", matchId: String(m._id) };
    const theyAsked = String(m.requestedBy) !== String(user.id);
    return { matchState: theyAsked ? "pending_them" : "pending_you", matchId: String(m._id) };
  };

  // Mentees are the default role and may predate the field being written, so
  // match on absent-or-"mentee" rather than an exact equality that would miss them.
  const roleFilter =
    wanted === "mentee" ? { role: { $in: [null, "mentee"] } } : { role: "mentor" };

  /* Search spans two collections — name lives on `user`, everything else on
     `profiles`. Two indexed queries and a union of ids beats a $lookup here,
     and stays readable. */
  let idFilter = null;
  if (q) {
    const rx = { $regex: escapeRe(q), $options: "i" };
    const profileFields = wanted === "mentor"
      ? [{ headline: rx }, { industry: rx }, { expertise: rx }, { menteeFit: rx }]
      : [{ track: rx }, { interests: rx }, { skills: rx }, { goals: rx }];
    const hits = await db
      .collection(collections.profiles)
      .find({ $or: profileFields }, { projection: { userId: 1 } })
      .limit(200)
      .toArray();
    idFilter = {
      $or: [
        { name: rx },
        { _id: { $in: hits.map((h) => { try { return new ObjectId(h.userId); } catch { return null; } }).filter(Boolean) } },
      ],
    };
  }

  const users = await db
    .collection(collections.user)
    .find(
      { ...roleFilter, ...(idFilter || {}) },
      { projection: { name: 1, image: 1, role: 1, createdAt: 1, onboardingComplete: 1 } }
    )
    .sort({ createdAt: 1 })
    .limit(LIMIT * 2) // over-fetch a little; readiness filter below may drop some
    .toArray();

  const ids = users.map((u) => String(u._id));
  const profiles = await db
    .collection(collections.profiles)
    .find({ userId: { $in: [...ids, user.id] } })
    .toArray();
  const byUser = new Map(profiles.map((p) => [p.userId, p]));
  const viewerProfile = byUser.get(user.id) || {};

  /* Who belongs on the deck:
       - finished setup (user flag OR profile flag — they can drift briefly), or
       - an invited mentor: redeeming a code puts them on the Roster, and hiding
         them until the AI chat finishes made mentees see "No mentors yet" while
         the admin People table already listed MENTOR accounts.
     Mentees still need setup done — a half-signed-up student shouldn't land in
     a mentor's swipe deck. */
  const ready = (u, p) =>
    Boolean(u.onboardingComplete || p.onboardingComplete) ||
    (wanted === "mentor" && isMentorRole(u.role));

  const people = users
    .filter((u) => String(u._id) !== user.id && (includeAll || !answeredIds.has(String(u._id))))
    .filter((u) => ready(u, byUser.get(String(u._id)) || {}))
    .slice(0, LIMIT)
    .map((u) => {
      const p = byUser.get(String(u._id)) || {};
      // No email, ever. These profiles cross the boundary between two users who
      // have not agreed to talk yet; contact details are what accepting is for.
      const base = {
        id: String(u._id),
        name: u.name || "—",
        image: u.image ?? null,
        affinity: affinity(viewerProfile, p, viewerRole),
        ...stateOf(String(u._id)),
      };
      return wanted === "mentor"
        ? {
            ...base,
            headline: p.headline ?? null,
            industry: asLabel(p.industry),
            tier: p.tier ?? "Scout",
            impact: p.impact ?? 0,
            expertise: p.expertise ?? [],
            menteeFit: p.menteeFit ?? [],
            why: p.why ?? null,
            capacity: p.capacity ?? null,
          }
        : {
            ...base,
            track: asLabel(p.track),
            interests: p.interests ?? [],
            skills: p.skills ?? [],
            goals: p.goals ?? [],
          };
    });

  return json({ role: wanted, people });
}

export default { fetch: withUser(handler) };
