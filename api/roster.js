import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { listMatches, MATCH_STATUS, sideOf, mentorLoads, DEFAULT_MENTOR_CAPACITY } from "../lib/matches.js";
import { isMentorRole } from "../lib/roles.js";
import { asLabel } from "../lib/scalars.js";
import { followEdges, followerCounts, setFollow } from "../lib/network.js";
import { orgContext, orgSeats, orgRules, divisionsOf, DEFAULT_ORG_RULES } from "../lib/orgs.js";

/**
 * /api/roster — the people directory.
 *
 *   GET  /api/roster                    the other side of the platform
 *   GET  /api/roster?side=mentors       mentor peers (mentors only)
 *   POST /api/roster {mentorId, action} follow / unfollow a peer (mentors only)
 *
 * Mentees get mentors, mentors get mentees. Never a mentee-to-mentee listing:
 * this is the only endpoint that hands one user another user's profile, and
 * that listing would turn a platform full of minors into a browsable directory
 * of them. The role check below is the whole guard.
 *
 * `?side=mentors` is the one same-side view, and it is the mentor side only.
 * Mentors are adults on invite-only accounts who already appear in every
 * mentee's deck, so a peer directory exposes nothing new — it just gives a
 * mentor somewhere to find the other mentors, follow them, and read what they
 * publish. A mentee asking for it gets the ordinary mentor roster, which is the
 * same list; the branch exists for the follow state, not for access.
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
 *   ?scope=org     only the caller's own organisation, under that org's
 *                  programme rules. See below.
 *
 * ————— org scope —————
 *
 * The Teams surface is not the platform deck with a different header: an
 * employee browsing mentors is browsing *their company*, under rules their HR
 * set. `?scope=org` is that read.
 *
 * It is opt-in rather than implied by membership, because the two decks answer
 * different questions and a person in an org can legitimately be asked both —
 * "who at Northbound can mentor me" and "who on Ryzn can". The client picks;
 * the server decides whether it may have it.
 *
 * Scoping only ever narrows. The candidate id list *is* the org's membership,
 * so no rule applied afterwards can re-admit somebody from outside the company,
 * and a caller with no org gets a 403 rather than an empty list — answering []
 * would read as "nobody from your company is on Ryzn", which is a different and
 * much worse claim than "you asked the wrong question".
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

/**
 * Overlap between two mentors — shared expertise, or the same industry.
 *
 * `affinity` above is written around the mentee-wants / mentor-teaches
 * asymmetry, which has no meaning between two peers. Same honest shape: a real
 * count of things both profiles actually say, never a score.
 */
function peerAffinity(viewerProfile, candidateProfile) {
  const mine = new Set((viewerProfile.expertise || []).map((s) => s.toLowerCase()));
  const theirs = (candidateProfile.expertise || []).map((s) => s.toLowerCase());
  if (!mine.size || !theirs.length) return null;
  const hits = theirs.filter((t) => mine.has(t)).length;
  return { shared: hits, of: Math.max(mine.size, theirs.length) };
}

/** POST /api/roster — follow or unfollow another mentor. */
async function follow(request, user) {
  if (sideOf(user) !== "mentor") {
    return fail(403, "mentors_only", "Following is between mentors.");
  }
  let body = {};
  try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

  const mentorId = String(body.mentorId || "").trim();
  if (!ObjectId.isValid(mentorId)) return fail(400, "bad_request", "Which mentor?");
  if (mentorId === user.id) return fail(400, "self_follow", "You already read your own posts.");
  if (body.action !== "follow" && body.action !== "unfollow") {
    return fail(400, "bad_request", "action must be follow or unfollow.");
  }

  const db = await getDb();
  const target = await db
    .collection(collections.user)
    .findOne({ _id: new ObjectId(mentorId) }, { projection: { role: 1, name: 1 } });
  // Mentors follow mentors. A mentee's profile is not something to subscribe to,
  // and this is the check that keeps it that way.
  if (!target || !isMentorRole(target.role)) {
    return fail(404, "not_found", "That mentor isn’t on the roster.");
  }

  const res = await setFollow(db, user.id, mentorId, body.action === "follow");
  return json({ ok: true, ...res, mentorId, name: target.name ?? null });
}

async function handler(request, user) {
  if (request.method === "POST") return follow(request, user);
  if (request.method !== "GET") return fail(405, "method_not_allowed", "Use GET or POST.");

  const viewerRole = sideOf(user);
  const url = new URL(request.url);
  /* Peer mode: a mentor looking at other mentors. For a mentee this is already
     the default list, so the flag is simply ignored rather than refused. */
  const peers = viewerRole === "mentor" && url.searchParams.get("side") === "mentors";
  const wanted = peers || viewerRole === "mentee" ? "mentor" : "mentee";

  const includeAll = url.searchParams.get("include") === "all";
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const orgScoped = url.searchParams.get("scope") === "org";

  const db = await getDb();

  /* Org context, resolved before anything else — everything below narrows
     against it. `seats` is the membership, and it doubles as the candidate id
     list and the division lookup for each card. */
  let seats = null;
  let rules = DEFAULT_ORG_RULES;
  let orgPayload = null;
  let mySeat = {};
  if (orgScoped) {
    const ctx = await orgContext(db, user.id);
    if (!ctx) return fail(403, "no_org", "You're not in an organisation yet.");
    seats = await orgSeats(db, ctx.org._id);
    mySeat = seats.get(user.id) || {};
    rules = orgRules(ctx.org);
    orgPayload = {
      id: String(ctx.org._id),
      name: ctx.org.name,
      slug: ctx.org.slug,
      division: mySeat.division ?? null,
      divisions: divisionsOf(seats),
    };
  }

  // Anyone already requested, paired with, or passed on drops out of the deck.
  // Without this the deck re-offers people the caller has already answered for,
  // and a second request would just 409. Explore keeps them and shows the state.
  // A peer list has no matches to answer for — mentors don't pair with mentors.
  const answered = peers ? [] : await listMatches(user, {
    statuses: [MATCH_STATUS.PENDING, MATCH_STATUS.ACCEPTED, MATCH_STATUS.DECLINED],
  });
  const otherIdOf = (m) => (viewerRole === "mentor" ? m.menteeId : m.mentorId);
  const answeredIds = new Set(answered.map(otherIdOf));
  const matchByUser = new Map(answered.map((m) => [otherIdOf(m), m]));

  /* What the caller can do about this person right now. `pending_them` is the
     one that matters: they asked first, so the action is accept/decline, not
     request. `requestedBy` is the side ("mentee"|"mentor"), not a user id —
     comparing it to user.id made every pending match look like "asked for you". */
  const stateOf = (id) => {
    if (peers) return {};
    const m = matchByUser.get(id);
    if (!m) return { matchState: "none", matchId: null };
    if (m.status === MATCH_STATUS.ACCEPTED) return { matchState: "accepted", matchId: String(m._id) };
    if (m.status === MATCH_STATUS.DECLINED) return { matchState: "declined", matchId: String(m._id) };
    const theyAsked = m.requestedBy !== viewerRole;
    return { matchState: theyAsked ? "pending_them" : "pending_you", matchId: String(m._id) };
  };

  // Mentees are the default role and may predate the field being written, so
  // match on absent-or-"mentee" rather than an exact equality that would miss them.
  // Admins count as mentors (isMentorRole) so they surface in mentor search too.
  const roleFilter =
    wanted === "mentee" ? { role: { $in: [null, "mentee"] } } : { role: { $in: ["mentor", "admin"] } };

  /* Search spans two collections — name lives on `user`, everything else on
     `profiles`. Two indexed queries and a union of ids beats a $lookup here,
     and stays readable. */
  let idFilter = null;
  if (q) {
    const rx = { $regex: escapeRe(q), $options: "i" };
    const profileFields = wanted === "mentor"
      ? [{ headline: rx }, { industry: rx }, { expertise: rx }, { menteeFit: rx }]
      : [{ headline: rx }, { track: rx }, { interests: rx }, { skills: rx }, { goals: rx }];
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

  /* The hard boundary of a scoped read. `idFilter` puts its own clause under
     `$or`, so this top-level `_id` intersects with it rather than replacing it:
     a search inside an org still cannot reach past the org. */
  const orgFilter = orgScoped
    ? { _id: { $in: [...seats.keys()].filter(ObjectId.isValid).map((id) => new ObjectId(id)) } }
    : null;

  const users = await db
    .collection(collections.user)
    .find(
      { ...roleFilter, ...(idFilter || {}), ...(orgFilter || {}) },
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

  /* Division rule. Only bites on a matching deck — two mentors browsing each
     other is not a pairing, so an org that keeps mentees in their own division
     has said nothing about who its mentors may know.

     It is also skipped when the viewer's own seat has no division: an
     unassigned employee would otherwise match nobody and be shown an empty
     deck they have no way to explain or fix. */
  const divisionOk = (id) =>
    !orgScoped || peers || rules.crossDivision || !mySeat.division ||
    (seats.get(id)?.division ?? null) === mySeat.division;

  const eligible = users
    .filter((u) => String(u._id) !== user.id && (includeAll || !answeredIds.has(String(u._id))))
    .filter((u) => ready(u, byUser.get(String(u._id)) || {}))
    .filter((u) => divisionOk(String(u._id)));

  /* Capacity rule. A mentor whose cohort is already full is not an option, and
     offering them anyway costs the mentee three written answers before
     api/matches.js turns it down with `at_capacity`. Filtered before the slice,
     so a full mentor gives up their place on the page rather than occupying it. */
  let full = new Set();
  if (orgScoped && rules.capacityGate && wanted === "mentor" && !peers) {
    const loads = await mentorLoads(eligible.map((u) => String(u._id)));
    full = new Set(
      eligible
        .filter((u) => {
          const declared = Number(byUser.get(String(u._id))?.capacity);
          const cap = Number.isFinite(declared) && declared > 0 ? declared : DEFAULT_MENTOR_CAPACITY;
          return (loads.get(String(u._id)) ?? 0) >= cap;
        })
        .map((u) => String(u._id))
    );
  }

  const shortlist = eligible.filter((u) => !full.has(String(u._id))).slice(0, LIMIT);

  /* Follow state, for a peer directory that has to render a button per row.
     Two indexed reads for the whole page rather than one per person. */
  const shortlistIds = shortlist.map((u) => String(u._id));
  const [edges, followers] = peers
    ? await Promise.all([followEdges(db, user.id, shortlistIds), followerCounts(db, shortlistIds)])
    : [null, null];

  const people = shortlist
    .map((u) => {
      const p = byUser.get(String(u._id)) || {};
      // No email, ever. These profiles cross the boundary between two users who
      // have not agreed to talk yet; contact details are what accepting is for.
      const base = {
        id: String(u._id),
        name: u.name || "—",
        image: u.image ?? null,
        // The picture they set on Ryzn, falling back to whatever Google gave us
        // at sign-in. Every card that shows a face reads this one field.
        avatarUrl: p.avatarUrl ?? u.image ?? null,
        bannerUrl: p.bannerUrl ?? null,
        affinity: peers ? peerAffinity(viewerProfile, p) : affinity(viewerProfile, p, viewerRole),
        ...stateOf(String(u._id)),
        // Only on a scoped read: outside an org this is not a fact about the
        // person, and a null column on every platform card invites the client
        // to render an empty label.
        ...(orgScoped ? { division: seats.get(String(u._id))?.division ?? null } : {}),
        ...(peers
          ? {
              following: edges.following.has(String(u._id)),
              followsYou: edges.followers.has(String(u._id)),
              followers: followers.get(String(u._id)) ?? 0,
            }
          : {}),
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
            education: p.education ?? null,
            experience: p.experience ?? null,
          }
        : {
            ...base,
            headline: p.headline ?? null,
            track: asLabel(p.track),
            interests: p.interests ?? [],
            skills: p.skills ?? [],
            goals: p.goals ?? [],
            influences: p.influences ?? [],
            education: p.education ?? null,
            experience: p.experience ?? null,
          };
    });

  /* `rules` and `org` ride along on a scoped read so the deck can say why it is
     narrower than the platform one — the prototype's "PRODUCT ONLY" chip needs
     to come from the rule that was actually applied, not from a copy of the
     setting kept in the client. */
  return json({
    role: wanted,
    peers,
    scope: orgScoped ? "org" : "platform",
    ...(orgScoped ? { org: orgPayload, rules } : {}),
    people,
  });
}

export default { fetch: withUser(handler) };
