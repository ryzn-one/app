import { ObjectId } from "mongodb";
import { getDb, collections } from "../lib/db.js";
import { json, fail, withUser } from "../lib/http.js";
import { rateLimit } from "../lib/ratelimit.js";
import { isMentorRole } from "../lib/roles.js";
import { isAdmin } from "../lib/admin.js";
import { acceptedFor } from "../lib/matches.js";

/**
 * /api/events — Mentor Meets scheduling
 *
 *   GET               visible events for the caller + their own response/votes
 *   GET ?hostId=me    the caller's own hosted events
 *   POST              create an event (mentor/admin only)
 *   PATCH {id,action} rsvp | vote | finalize | cancel
 */

const RSVP_STATUS = { GOING: "going", DECLINED: "declined", WAITLIST: "waitlist" };
const EVENT_KIND = { QUARTERLY: "quarterly", EVENT: "event" };
const EVENT_MODE = { FIXED: "fixed", POLL: "poll" };
const EVENT_STATUS = { OPEN: "open", CANCELED: "canceled" };

const shape = (doc, viewerResponse) => ({
  id: String(doc._id),
  kind: doc.kind,
  title: doc.title,
  description: doc.description || null,
  hostId: doc.hostId,
  hostName: doc.hostName,
  audience: doc.audience || "all",
  mode: doc.mode,
  location: doc.location || {},
  capacity: doc.capacity || null,
  slots: doc.slots || [],
  confirmedSlotId: doc.confirmedSlotId || null,
  status: doc.status,
  createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
  updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
  // Merge viewer's own response (RSVP or poll votes)
  viewerRsvp: viewerResponse?.rsvp || null,
  viewerAvailableSlotIds: viewerResponse?.availableSlotIds || [],
});

async function getEvents(request, user) {
  const db = await getDb();
  const col = db.collection(collections.events);
  const responseCol = db.collection(collections.eventResponses);
  const url = new URL(request.url);
  const hostIdParam = url.searchParams.get("hostId");

  let filter = { status: EVENT_STATUS.OPEN };

  // ?hostId=me — show caller's own hosted events only
  if (hostIdParam === "me") {
    filter.hostId = user.id;
  } else {
    // Show all visible events: quarterly + events scoped to the caller
    const quarterlyFilter = { kind: EVENT_KIND.QUARTERLY };
    const publicEventFilter = { kind: EVENT_KIND.EVENT, audience: "all" };
    const menteeEventFilter = { kind: EVENT_KIND.EVENT, audience: "mentees" };

    let menteePairIds = [];
    if (isMentorRole(user.role)) {
      // Mentors see events from mentees they're paired with (not directly used in audience:"mentees" scope)
    } else {
      // Mentees: find their accepted mentors to scope audience:"mentees" events
      const pairs = await acceptedFor(user.id, "mentee");
      menteePairIds = pairs.map(p => p.mentorId);
    }

    // Complex filter: quarterly OR (event + audience:all) OR (event + audience:mentees + host in mentee's pairs)
    // We can't express this perfectly in a single Mongo filter without $or, so fetch and post-filter
    filter = {
      $or: [
        quarterlyFilter,
        publicEventFilter,
        ...(menteePairIds.length > 0 ? [{ ...menteeEventFilter, hostId: { $in: menteePairIds } }] : []),
        // Hosts always see their own events
        { hostId: user.id },
      ],
      ...filter,
    };
  }

  const events = await col.find(filter).sort({ createdAt: -1 }).toArray();

  // Fetch viewer's responses for all events
  const eventIds = events.map(e => String(e._id));
  const responses = await responseCol
    .find({ eventId: { $in: eventIds }, userId: user.id })
    .toArray();
  const responseById = new Map(responses.map(r => [r.eventId, r]));

  // For each event, compute aggregate counts (goingCount for fixed, vote counts for poll)
  const shaped = await Promise.all(
    events.map(async e => {
      const base = shape(e, responseById.get(String(e._id)));

      if (e.mode === EVENT_MODE.FIXED) {
        const goingCount = await responseCol.countDocuments({
          eventId: String(e._id),
          rsvp: RSVP_STATUS.GOING,
        });
        base.goingCount = goingCount;
        base.waitlistCount = await responseCol.countDocuments({
          eventId: String(e._id),
          rsvp: RSVP_STATUS.WAITLIST,
        });
      } else if (e.mode === EVENT_MODE.POLL) {
        base.slotVoteCounts = {};
        for (const slot of e.slots) {
          base.slotVoteCounts[slot.id] = await responseCol.countDocuments({
            eventId: String(e._id),
            availableSlotIds: slot.id,
          });
        }
      }

      return base;
    })
  );

  return json({ events: shaped });
}

async function createEvent(request, user) {
  const rl = await rateLimit(`event-create:${user.id}`, { limit: 20 });
  if (!rl.ok) return fail(429, "rate_limited", "Slow down — try again in a bit.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad_request", "Expected JSON.");
  }

  const { title, description, kind, audience, mode, location, capacity, slots } = body;

  // Validate kind and role
  if (kind === EVENT_KIND.QUARTERLY) {
    if (!isAdmin(user)) return fail(403, "admin_only", "Only admins can create quarterly Meets.");
  } else if (kind === EVENT_KIND.EVENT) {
    if (!isMentorRole(user.role)) return fail(403, "mentors_only", "Only mentors can create events.");
  } else {
    return fail(400, "bad_kind", "Unknown event kind.");
  }

  // Validate basic fields
  if (typeof title !== "string" || !title.trim()) {
    return fail(400, "missing_title", "Event needs a title.");
  }

  if (!Object.values(EVENT_MODE).includes(mode)) {
    return fail(400, "bad_mode", "Mode must be 'fixed' or 'poll'.");
  }

  if (audience && !["all", "mentees"].includes(audience)) {
    return fail(400, "bad_audience", "Audience must be 'all' or 'mentees'.");
  }

  if (audience === "mentees" && kind !== EVENT_KIND.EVENT) {
    return fail(400, "bad_audience_kind", "Only events can be scoped to mentees.");
  }

  // Validate slots
  if (!Array.isArray(slots) || slots.length === 0) {
    return fail(400, "missing_slots", "Event needs at least one slot.");
  }

  const validatedSlots = [];
  for (const slot of slots) {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return fail(400, "bad_slot", "Each slot needs valid start < end times.");
    }
    validatedSlots.push({
      id: `slot-${Math.random().toString(36).slice(2, 11)}`,
      start,
      end,
    });
  }

  if (mode === EVENT_MODE.FIXED && validatedSlots.length !== 1) {
    return fail(400, "fixed_one_slot", "Fixed events must have exactly one slot.");
  }

  if (mode === EVENT_MODE.POLL && validatedSlots.length > 8) {
    return fail(400, "poll_too_many", "Polls can have at most 8 proposed slots.");
  }

  const now = new Date();
  const doc = {
    kind: kind || EVENT_KIND.EVENT,
    title: title.trim(),
    description: description ? String(description).trim() : null,
    hostId: user.id,
    hostName: user.name || "Anonymous",
    audience: audience || "all",
    mode,
    location: location || {},
    capacity: capacity ? Number(capacity) : null,
    slots: validatedSlots,
    confirmedSlotId: null,
    status: EVENT_STATUS.OPEN,
    createdAt: now,
    updatedAt: now,
  };

  const col = await (await getDb()).collection(collections.events);
  const res = await col.insertOne(doc);

  const created = await col.findOne({ _id: res.insertedId });
  return json({ event: shape(created, null) }, 201);
}

async function patchEvent(request, user) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad_request", "Expected JSON.");
  }

  const { id, action } = body;
  if (!id || !ObjectId.isValid(id)) return fail(400, "bad_request", "Invalid event id.");

  const db = await getDb();
  const col = db.collection(collections.events);
  const event = await col.findOne({ _id: new ObjectId(id), status: EVENT_STATUS.OPEN });
  if (!event) return fail(404, "not_found", "Event not found.");

  // RSVP: mentee/mentor marks themselves as going/declined for a fixed event
  if (action === "rsvp") {
    if (event.mode !== EVENT_MODE.FIXED) {
      return fail(400, "rsvp_poll_only", "RSVP is only for fixed events.");
    }

    const { status } = body;
    if (!Object.values(RSVP_STATUS).includes(status) || status === RSVP_STATUS.WAITLIST) {
      return fail(400, "bad_rsvp", "Status must be 'going' or 'declined'.");
    }

    // Visibility check: mentee can't RSVP to an event scoped away from them
    if (event.audience === "mentees" && !isMentorRole(user.role)) {
      const pairs = await acceptedFor(user.id, "mentee");
      const pairIds = pairs.map(p => p.mentorId);
      if (event.hostId !== user.id && !pairIds.includes(event.hostId)) {
        return fail(403, "forbidden", "You can't RSVP to this event.");
      }
    }

    // Capacity check: if at/over capacity, mark as waitlist instead
    const responseCol = db.collection(collections.eventResponses);
    let finalStatus = status;
    if (status === RSVP_STATUS.GOING && event.capacity) {
      const goingCount = await responseCol.countDocuments({
        eventId: String(event._id),
        rsvp: RSVP_STATUS.GOING,
      });
      if (goingCount >= event.capacity) {
        finalStatus = RSVP_STATUS.WAITLIST;
      }
    }

    const now = new Date();
    const updated = await responseCol.findOneAndUpdate(
      { eventId: String(event._id), userId: user.id },
      {
        $set: {
          eventId: String(event._id),
          userId: user.id,
          userName: user.name || "Anonymous",
          rsvp: finalStatus,
          availableSlotIds: [],
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" }
    );

    return json({ ok: true, status: finalStatus, response: updated });
  }

  // VOTE: mentee/mentor marks which poll slots work for them
  if (action === "vote") {
    if (event.mode !== EVENT_MODE.POLL) {
      return fail(400, "vote_fixed_only", "Votes are only for poll events.");
    }

    const { availableSlotIds } = body;
    if (!Array.isArray(availableSlotIds)) {
      return fail(400, "bad_slots", "availableSlotIds must be an array.");
    }

    const validSlotIds = new Set(event.slots.map(s => s.id));
    for (const slotId of availableSlotIds) {
      if (!validSlotIds.has(slotId)) {
        return fail(400, "bad_slot", `Unknown slot: ${slotId}`);
      }
    }

    const responseCol = db.collection(collections.eventResponses);
    const now = new Date();
    await responseCol.findOneAndUpdate(
      { eventId: String(event._id), userId: user.id },
      {
        $set: {
          eventId: String(event._id),
          userId: user.id,
          userName: user.name || "Anonymous",
          rsvp: null,
          availableSlotIds,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return json({ ok: true });
  }

  // FINALIZE: host turns a poll into a fixed event by picking a slot
  if (action === "finalize") {
    if (event.mode !== EVENT_MODE.POLL) {
      return fail(400, "finalize_poll_only", "Can only finalize polls.");
    }

    if (event.hostId !== user.id && !isAdmin(user)) {
      return fail(403, "host_only", "Only the host can finalize.");
    }

    const { slotId } = body;
    const slot = event.slots.find(s => s.id === slotId);
    if (!slot) return fail(400, "bad_slot", "Invalid slot.");

    const now = new Date();
    const updated = await col.findOneAndUpdate(
      { _id: event._id },
      {
        $set: {
          mode: EVENT_MODE.FIXED,
          confirmedSlotId: slotId,
          slots: [slot], // Keep only the confirmed slot
          updatedAt: now,
        },
      },
      { returnDocument: "after" }
    );

    const responseCol = db.collection(collections.eventResponses);
    const response = await responseCol.findOne({ eventId: String(event._id), userId: user.id });

    return json({ ok: true, event: shape(updated, response) });
  }

  // CANCEL: host or admin cancels the event
  if (action === "cancel") {
    if (event.hostId !== user.id && !isAdmin(user)) {
      return fail(403, "host_only", "Only the host can cancel.");
    }

    const now = new Date();
    const updated = await col.findOneAndUpdate(
      { _id: event._id },
      { $set: { status: EVENT_STATUS.CANCELED, updatedAt: now } },
      { returnDocument: "after" }
    );

    return json({ ok: true, status: EVENT_STATUS.CANCELED });
  }

  return fail(400, "bad_action", "Unknown action.");
}

async function handler(request, user) {
  if (request.method === "GET") return getEvents(request, user);
  if (request.method === "POST") return createEvent(request, user);
  if (request.method === "PATCH") return patchEvent(request, user);
  return fail(405, "method_not_allowed", "Use GET, POST or PATCH.");
}

export default { fetch: withUser(handler) };
