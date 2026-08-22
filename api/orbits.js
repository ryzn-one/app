import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { rateLimit } from "../lib/ratelimit.js";
import { isMentorRole } from "../lib/roles.js";
import { setFollow } from "../lib/network.js";
import { sideOf, acceptedFor, orbitOfMatch } from "../lib/matches.js";
import { recordedByOrbit, resolveStage, chatUnlocked } from "../lib/stage.js";
import { cleanName, cleanShort, cleanDivision, freeSlug } from "../lib/orgs.js";
import { resolveDomainJoin, seatByDomain } from "../lib/domains.js";
import {
  PUBLIC_ORBIT_ID, DEFAULT_COMMUNITY_POLICY, cleanPolicy, cleanLevel, publicOrbit,
  myOrbits, orbitContext, memberCounts, kindOf,
} from "../lib/orbits.js";

/**
 * /api/orbits, the spaces one identity moves through.
 *
 *   GET                                        every orbit I'm in, policy resolved
 *   GET  ?slug=…                               a circle's join page, membership not required
 *   POST { name, tagline }                     open a community circle (creators)
 *   PATCH { action: "policy", orbitId, … }     write the policy, managers only
 *   PATCH { action: "settings", orbitId, … }   circle/orbit identity, managers only
 *   PATCH { action: "join", orbitId | slug }   join a circle
 *   PATCH { action: "join-domain" }            take the orbit your work email belongs to
 *   PATCH { action: "leave", orbitId }         leave an orbit, identity survives
 *
 * This is the endpoint the whole client shell is built on: it answers the orbit
 * switcher, and the policy it returns is what every screen branches on. The
 * resolution order lives in lib/orbits.js and runs *here*, once, on the way out.
 * No client merges defaults, two implementations of the resolution order is how
 * a console and a phone start disagreeing about what the rules are.
 *
 * The public orbit is in every answer and is in no collection. It cannot be
 * joined (everyone is already in it), left (there is nowhere below it), or
 * configured (nobody administers Ryzn's own orbit), all three are rejected
 * here rather than being allowed to write a document that shouldn't exist.
 */

const MAX_TAGLINE = 80;

/** A circle as a stranger sees it before joining: enough to decide, nothing more.
    No member list, no policy internals, a join page is not a roster leak. */
const joinCard = (orbit, memberCount) => ({
  id: String(orbit._id),
  kind: kindOf(orbit),
  name: orbit.name,
  tag: orbit.tagline || "Circle",
  slug: orbit.slug ?? null,
  accent: orbit.accent || "#00B894",
  coverUrl: orbit.coverUrl ?? null,
  ownerId: orbit.ownerId,
  memberCount,
});

/**
 * Attaches each orbit's Stage 1 standing and whether Chat is open there.
 *
 * It rides on the orbit payload because that is where `policy` already is, and
 * the two are read together everywhere: the padlock on the Chat tab is
 * `policy.chatGate && !stage.complete`, and asking that question in two places
 * is how a tab ends up padlocked over a screen that lets you type.
 *
 * Three reads for every orbit at once rather than per-orbit round trips -
 * the switcher renders progress on every row.
 */
async function withStage(db, user, list) {
  if (sideOf(user) !== "mentee") {
    /* Mentors have no unlock track. Their Chat is open the moment a mentee they
       accepted has earned it, the gate is the mentee's to clear, and putting a
       padlock on a mentor's tab would gate the wrong person. */
    return list.map((o) => ({ ...o, stage: null, chatOpen: true }));
  }

  const [recorded, accepted, profile] = await Promise.all([
    recordedByOrbit(db, user.id),
    acceptedFor(user.id, "mentee"),
    db.collection(collections.profiles).findOne(
      { userId: user.id },
      { projection: { onboardingComplete: 1, stage1Complete: 1 } }
    ),
  ]);

  const mentorOrbits = new Set(accepted.map(orbitOfMatch));
  const onboardingComplete = !!(user.onboardingComplete || profile?.onboardingComplete);

  return list.map((o) => {
    const steps = recorded.get(o.id) || [];
    /* Bridge for anyone who finished Stage 1 before it was orbit-scoped: their
       one completion belongs to the public orbit, which is where Ryzn was. It is
       not spread across the orbits they have joined since, those each start at
       step one, which is the whole reason progress is scoped. */
    const legacy = o.id === PUBLIC_ORBIT_ID && profile?.stage1Complete ? ["first-exercise"] : [];
    const stage = resolveStage({
      recorded: [...steps, ...legacy],
      onboardingComplete,
      hasMentor: mentorOrbits.has(o.id),
    });
    return { ...o, stage, chatOpen: chatUnlocked(o.policy, stage) };
  });
}

async function handler(request, user) {
  const db = await getDb();
  const orbits = db.collection(collections.orbits);
  const members = db.collection(collections.orbitMembers);
  const url = new URL(request.url);

  /* ----- read ----- */
  if (request.method === "GET") {
    const slug = String(url.searchParams.get("slug") || "").trim().toLowerCase();
    if (slug) {
      const doc = await orbits.findOne({ slug });
      /* Circles only. A company orbit's existence is not something a slug guess
         should confirm, private orbits are joined with a code, never a link. */
      if (!doc || kindOf(doc) !== "community") {
        return fail(404, "no_circle", "No circle with that link.");
      }
      const id = String(doc._id);
      const mine = await members.findOne({ orgId: id, userId: user.id }, { projection: { _id: 1 } });
      const count = (await memberCounts(db, [id])).get(id) ?? 0;
      return json({ circle: joinCard(doc, count), joined: !!mine });
    }
    return json({ orbits: await withStage(db, user, await myOrbits(db, user.id)) });
  }

  /* ----- open a circle ----- */
  if (request.method === "POST") {
    /* Same gate as creating an org: the mentor role is what says someone is here
       to run a space rather than move through one, and it still only comes from
       claiming an invite. Opening a circle hands out no platform privilege, a
       creator runs their own audience, not Ryzn. */
    if (!isMentorRole(user.role)) {
      return fail(403, "mentors_only", "Circles are opened by mentors. Claim a mentor invitation first.");
    }
    const limit = await rateLimit(`circle-create:${user.id}`, { limit: 5 });
    if (!limit.ok) return fail(429, "rate_limited", "Too many attempts. Try again later.");

    let body = {};
    try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }

    const name = cleanName(body.name);
    if (name.length < 2) return fail(400, "bad_name", "Give the circle a name.");

    const now = new Date();
    const base = {
      name,
      kind: "community",
      ownerId: user.id,
      tagline: cleanShort(body.tagline).slice(0, MAX_TAGLINE) || null,
      accent: "#00B894",
      coverUrl: null,
      policy: { ...DEFAULT_COMMUNITY_POLICY },
      /* A circle exists to be read. Unlike a company orbit, whose feed HR opens
         once there is a roster, a circle with a closed feed is nothing at all. */
      orbitActive: true,
      allowExternal: true,
      createdAt: now,
      updatedAt: now,
    };

    let inserted;
    for (let attempt = 0; attempt < 2 && !inserted; attempt++) {
      const slug = await freeSlug(db, attempt === 0 ? name : `${name}-${Math.random().toString(36).slice(2, 6)}`);
      try {
        const res = await orbits.insertOne({ ...base, slug });
        inserted = { _id: res.insertedId, ...base, slug };
      } catch (err) {
        if (err?.code !== 11000) throw err; // slug taken between check and insert, retry
      }
    }
    if (!inserted) return fail(409, "name_taken", "Couldn't reserve that name. Try a slightly different one.");

    await members.updateOne(
      { orgId: String(inserted._id), userId: user.id },
      { $setOnInsert: { orgId: String(inserted._id), userId: user.id, orgRole: "owner", division: null, level: null, joinedAt: now, invitedBy: null } },
      { upsert: true }
    );
    return json({ orbits: await withStage(db, user, await myOrbits(db, user.id)), created: String(inserted._id) }, 201);
  }

  if (request.method !== "PATCH") return fail(405, "method_not_allowed", "Use GET, POST or PATCH.");

  let body = {};
  try { body = await request.json(); } catch { return fail(400, "bad_request", "Expected a JSON body."); }
  const action = String(body.action || "");

  /* ----- join a circle ----- */
  if (action === "join") {
    const bySlug = String(body.slug || "").trim().toLowerCase();
    const byId = String(body.orbitId || "");
    const query = bySlug ? { slug: bySlug } : ObjectId.isValid(byId) ? { _id: new ObjectId(byId) } : null;
    if (!query) return fail(400, "bad_request", "Which circle?");

    const doc = await orbits.findOne(query);
    /* Circles are the only orbit you can walk into. A company orbit is entered by
       claiming an invite code, which is where the platform role is decided -
       routing around that here would be a way to seat yourself at an employer. */
    if (!doc || kindOf(doc) !== "community") {
      return fail(404, "no_circle", "That's not a circle you can join.");
    }

    const orbitId = String(doc._id);
    const now = new Date();
    const res = await members.updateOne(
      { orgId: orbitId, userId: user.id },
      { $setOnInsert: { orgId: orbitId, userId: user.id, orgRole: "member", division: null, level: null, joinedAt: now, invitedBy: null } },
      { upsert: true }
    );

    /* Joining a circle follows its creator. The follow is the reach mechanic -
       it is the reason the creator's next post reaches this person in *every*
       orbit they are in, not only this one, and a circle you joined but whose
       creator you don't follow is an empty room. Unfollowing afterwards is
       theirs to do; this only seeds it, and only on the first join. */
    if (res.upsertedCount && doc.ownerId !== user.id) {
      await setFollow(db, user.id, doc.ownerId, true);
    }
    return json({ orbits: await withStage(db, user, await myOrbits(db, user.id)), joined: orbitId });
  }

  /* ----- take the orbit your address belongs to ----- */
  if (action === "join-domain") {
    /**
     * Accepting the offer /api/me made. Note what is *not* read here: the
     * client's `orbitId`. The whole question is re-answered from the caller's
     * own session — their verified address, the org that proved that domain,
     * and that org's switch — so a hand-rolled PATCH naming somebody else's
     * company orbit resolves to their own or to nothing at all.
     *
     * "suggest" and "auto" both accept. Somebody sitting on a stale client
     * whose admin turned the switch up mid-session is answering yes to an offer
     * that has since become automatic, and refusing them for that would be
     * refusing the more permissive of two settings.
     */
    const pending = await resolveDomainJoin(db, user);
    if (!pending) {
      return fail(404, "no_domain_orbit", "There's no company orbit waiting on your email address.");
    }
    const { seated } = await seatByDomain(db, pending.org, user, pending.domain);
    return json({
      orbits: await withStage(db, user, await myOrbits(db, user.id)),
      joined: String(pending.org._id),
      seated,
    });
  }

  /* Everything below is scoped to one orbit the caller is actually in. */
  const ctx = await orbitContext(db, user.id, body.orbitId);
  if (!ctx) return fail(404, "no_orbit", "That's not one of your orbits.");
  if (ctx.orbit.id === PUBLIC_ORBIT_ID) {
    /* Not a permission error dressed up: there is genuinely no document. The
       public orbit has no membership to end and no policy to write. */
    return fail(400, "public_orbit", "The public orbit isn't configured or left, it's where everyone starts.");
  }

  const orbitId = ctx.orbit.id;
  const manages = ctx.orbit.canManage;
  const isOwner = ctx.membership.orgRole === "owner";

  if (action === "leave") {
    if (isOwner) {
      return fail(400, "owner_cannot_leave", ctx.orbit.kind === "community"
        ? "Hand the circle to someone else before you leave it."
        : "Hand the orbit to someone else before you leave it.");
    }
    await members.deleteOne({ orgId: orbitId, userId: user.id });
    /* Only the membership goes. XP, tier, badges, streak and follows are
       identity-level and stay exactly where they were, the Settings copy
       promises this, and this delete is the promise. Orbit-scoped progress is
       what ends, and it ends by having nowhere to be read from. */
    return json({ orbits: await withStage(db, user, await myOrbits(db, user.id)), left: orbitId });
  }

  if (!manages) return fail(403, "not_a_manager", "Only the owner and admins can change an orbit.");

  if (action === "policy") {
    /* Merged onto what's stored and clamped to what the kind can mean, so a
       console that knows four switches can't blank the other two and no patch
       can set a board scope this kind of orbit has no field for. */
    const policy = cleanPolicy(body.policy ?? body, ctx.doc);
    const $set = { policy, updatedAt: new Date() };
    /* The old Teams console still edits `rules.crossDivision`, and /api/roster
       still reads it. Mirrored so one switch stays one switch. */
    $set["rules.crossDivision"] = policy.crossDiv;
    await orbits.updateOne({ _id: ctx.doc._id }, { $set });
    return json({ orbits: await withStage(db, user, await myOrbits(db, user.id)), orbit: publicOrbit({ ...ctx.doc, policy }, {
      orgRole: ctx.membership.orgRole,
      division: ctx.membership.division ?? null,
      level: ctx.membership.level ?? null,
      memberCount: ctx.orbit.memberCount,
    }) });
  }

  if (action === "settings") {
    const $set = { updatedAt: new Date() };
    if (body.name !== undefined) {
      const name = cleanName(body.name);
      if (name.length < 2) return fail(400, "bad_name", "Give it a name.");
      $set.name = name;
    }
    if (body.tagline !== undefined) $set.tagline = cleanShort(body.tagline).slice(0, MAX_TAGLINE) || null;
    if (body.accent !== undefined) $set.accent = /^#[0-9a-f]{6}$/i.test(String(body.accent)) ? String(body.accent) : ctx.doc.accent;
    if (body.coverUrl !== undefined) $set.coverUrl = String(body.coverUrl || "").slice(0, 500) || null;
    /* §6.5 / open decision 4, whether posts by mentors a member follows outside
       this orbit may appear inside it. The enterprise answer to content leakage,
       and meaningless in a circle, which is nothing *but* external reach. */
    if (body.allowExternal !== undefined && ctx.orbit.kind === "private") {
      $set.allowExternal = !!body.allowExternal;
    }
    // The slug is the circle's link and may already be in circulation, renaming
    // does not silently move it.
    await orbits.updateOne({ _id: ctx.doc._id }, { $set });
    return json({ orbits: await withStage(db, user, await myOrbits(db, user.id)) });
  }

  if (action === "seat") {
    /* One write for the two things a seat records: which team someone sits in
       and how senior they are. `crossDiv` reads the first, `levelGate` the
       second, both are policy fields, so both need a real field to filter on. */
    const userId = String(body.userId || "");
    const $set = {};
    if (body.division !== undefined) $set.division = cleanDivision(body.division);
    if (body.level !== undefined) $set.level = cleanLevel(body.level);
    if (!Object.keys($set).length) return fail(400, "bad_request", "Nothing to set.");
    const res = await members.updateOne({ orgId: orbitId, userId }, { $set });
    if (!res.matchedCount) return fail(404, "not_a_member", "They're not in this orbit.");
    return json({ orbits: await withStage(db, user, await myOrbits(db, user.id)) });
  }

  return fail(400, "bad_request", "Unknown action.");
}

export default { fetch: withUser(handler) };
