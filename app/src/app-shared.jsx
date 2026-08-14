import React, { useEffect, useRef, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search, Building2, Camera
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Monogram, Avatar, Banner, FormError, Field, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots } from "./ui.jsx";
import { BADGE_DEFS } from "./data.js";
import { shareToLinkedIn } from "./lib/share.js";
import { isMentorRole } from "./lib/roles.js";
import { uploadProfileImage, ACCEPT } from "./lib/upload.js";
import { EventComposer, EventCard } from "./events.jsx";

/* ————————————————— APP: SHARED ————————————————— */

/**
 * One tap-to-edit line on a profile: label, current value, and a textarea that
 * takes its place. Both profile screens had this written out per field, so the
 * mentee and mentor copies had already drifted on which fields they offered.
 *
 * `maxLength` mirrors the cap /api/profile enforces — the server is still the
 * one that truncates, this just stops people writing past it blind.
 */
export const EditableRow = ({ label, value, placeholder, emptyText, maxLength, rows = 2, onSave }) => {
  const [draft, setDraft] = useState(null);   // null when not editing

  if (draft !== null) {
    const left = maxLength ? maxLength - draft.length : null;
    return (
      <div style={{ marginTop: 12 }}>
        <Label>{label}</Label>
        <textarea value={draft} autoFocus rows={rows} maxLength={maxLength}
          onChange={e => setDraft(e.target.value)} placeholder={placeholder}
          style={{ width: "100%", marginTop: 8, borderRadius: 12, border: `1px solid ${C.line}`, padding: 12, fontFamily: F.sans, fontSize: 14, resize: "none", background: C.surface, outline: "none", boxSizing: "border-box", minHeight: 60 }} />
        {maxLength && (
          <div style={{ fontFamily: F.mono, fontSize: 9, color: left <= 20 ? C.coral : "#A5A39D", textAlign: "right", marginTop: 4 }}>{left} LEFT</div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Btn small kind="ghost" style={{ flex: 1, borderColor: C.line, color: C.gray }} onClick={() => setDraft(null)}>Cancel</Btn>
          <Btn small style={{ flex: 1 }} onClick={() => { onSave(draft.trim()); setDraft(null); }}>Save</Btn>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => setDraft(value || "")}
      style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginTop: 10, cursor: "pointer", padding: 10, borderRadius: 10, background: C.surface }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gray, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
        <div style={{ fontSize: 13.5, marginTop: 4, lineHeight: 1.45, color: value ? C.ink : C.gray, fontStyle: value ? "normal" : "italic" }}>{value || emptyText}</div>
      </div>
      <ChevronRight size={16} color={C.gray} style={{ marginTop: 2, flexShrink: 0 }} />
    </div>
  );
};

/**
 * The cover-image + profile-picture block at the top of both profile screens.
 *
 * One component for two quite different heroes (a mentee's white card, a
 * mentor's dark public-view card) because the part that differs is layout —
 * passed in as children — and the part that's identical is the upload: pick a
 * file, push it to Blob storage, then PATCH the URL onto the profile. That
 * sequence written twice is the version that drifts.
 *
 * `editable` is off in the mentor's Public view, which is a preview of what a
 * mentee sees and must not offer buttons a mentee wouldn't have.
 */
export const ProfileHeader = ({
  name, headline, avatarUrl, bannerUrl, userId,
  editable = false, onSaveImage, align = "left", dark = false, children,
}) => {
  const [busy, setBusy] = useState(null);   // "avatar" | "banner" while uploading
  const [err, setErr] = useState(null);
  const avatarInput = useRef(null);
  const bannerInput = useRef(null);

  const pick = async (kind, file) => {
    if (!file) return;
    setBusy(kind); setErr(null);
    try {
      const url = await uploadProfileImage(file, kind, null, userId);
      await onSaveImage(kind === "avatar" ? "avatarUrl" : "bannerUrl", url);
    } catch (e) {
      setErr(e?.message || "That image didn’t upload.");
    } finally {
      setBusy(null);
    }
  };

  const centred = align === "center";
  const AVATAR = 76;

  /* Sits on the cover, so it has to stay legible over whatever someone uploads —
     hence the scrim rather than a flat brand colour. */
  const camera = (onClick, label, loading, style) => (
    <button onClick={onClick} disabled={!!busy} aria-label={label} title={label}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
        border: "none", borderRadius: 999, cursor: busy ? "default" : "pointer",
        background: "rgba(26,26,26,.62)", color: C.white, backdropFilter: "blur(4px)",
        fontFamily: F.mono, fontSize: 9, letterSpacing: 0.6, padding: "7px 10px", ...style,
      }}>
      {loading ? <span style={{ fontFamily: F.mono, fontSize: 9 }}>…</span> : <Camera size={13} />}
    </button>
  );

  return (
    <Card style={{ padding: 0, overflow: "hidden", background: dark ? C.ink : C.white, color: dark ? C.white : C.ink, ...(dark && { border: "none" }) }}>
      <Banner src={bannerUrl} height={112}>
        {editable && camera(() => bannerInput.current?.click(), "Change cover image", busy === "banner", { position: "absolute", top: 10, right: 10 })}
      </Banner>

      {/* Pulled up over the cover so the picture straddles the two, the way
          every profile people already use puts it. */}
      <div style={{
        padding: centred ? "0 18px 20px" : "0 16px 16px", marginTop: -(AVATAR / 2),
        display: "flex", flexDirection: "column", alignItems: centred ? "center" : "flex-start",
        textAlign: centred ? "center" : "left",
      }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ padding: 3, background: dark ? C.ink : C.white, borderRadius: 22, display: "inline-flex" }}>
            <Avatar src={avatarUrl} name={name} size={AVATAR} radius={19} bg={dark ? C.purple : C.ink} color={C.white} />
          </div>
          {editable && camera(() => avatarInput.current?.click(), "Change profile picture", busy === "avatar", { position: "absolute", right: -2, bottom: -2, padding: 8 })}
        </div>

        <div style={{ fontSize: centred ? 21 : 19, fontWeight: 700, marginTop: 10, letterSpacing: -0.2 }}>{name || "Your profile"}</div>
        {headline && (
          <div style={{ fontSize: 13.5, lineHeight: 1.45, marginTop: 3, color: dark ? "#B5B3AE" : C.gray }}>{headline}</div>
        )}
        {children}
      </div>

      {err && <div style={{ padding: "0 16px 14px", marginTop: -6 }}><FormError>{err}</FormError></div>}

      {editable && (<>
        <input ref={avatarInput} type="file" accept={ACCEPT.photo} hidden
          onChange={e => { pick("avatar", e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={bannerInput} type="file" accept={ACCEPT.photo} hidden
          onChange={e => { pick("banner", e.target.files?.[0]); e.target.value = ""; }} />
      </>)}
    </Card>
  );
};

export const MeetsScreen = ({ role, u, name, toast, events = [], eventsLoading, eventsError, isAdmin, userId, onCreateEvent, onEventAction }) => {
  const quarterlyEvent = events?.find(e => e.kind === "quarterly");
  const otherEvents = events?.filter(e => e.kind !== "quarterly") || [];

  const handleRsvp = async (eventId, status) => {
    try {
      await onEventAction(eventId, "rsvp", { status });
      toast(`RSVP: ${status}`);
    } catch (e) {
      toast(e?.message || "Couldn’t RSVP.");
    }
  };

  const handleVote = async (eventId, slotIds) => {
    try {
      await onEventAction(eventId, "vote", { availableSlotIds: slotIds });
      toast("Availability saved");
    } catch (e) {
      toast(e?.message || "Couldn’t save availability.");
    }
  };

  const handleFinalize = async (eventId, slotId) => {
    try {
      await onEventAction(eventId, "finalize", { slotId });
      toast("Time finalized");
    } catch (e) {
      toast(e?.message || "Couldn’t finalize.");
    }
  };

  const handleCancel = async (eventId) => {
    try {
      await onEventAction(eventId, "cancel", {});
      toast("Event canceled");
    } catch (e) {
      toast(e?.message || "Couldn’t cancel event.");
    }
  };

  return (
    <div>
      <HeaderRow title="Mentor Meets" right={<Label color={C.coral}>QUARTERLY</Label>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Featured quarterly event or placeholder */}
        <Card style={{ background: C.coral, border: "none", color: C.white, padding: 20 }}>
          <Label color="#F6D3C4">Next event</Label>
          {quarterlyEvent ? (
            <>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, marginTop: 6 }}>{quarterlyEvent.title}</div>
              {quarterlyEvent.location?.label && (
                <div style={{ fontSize: 13.5, marginTop: 4, opacity: 0.9 }}>{quarterlyEvent.location.label}</div>
              )}
              {quarterlyEvent.slots?.[0] && (
                <div style={{ fontSize: 13.5, marginTop: 2, opacity: 0.9 }}>
                  {new Date(quarterlyEvent.slots[0].start).toLocaleDateString()}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, marginTop: 6 }}>Not scheduled yet</div>
              <div style={{ fontSize: 13.5, marginTop: 6, opacity: 0.92, lineHeight: 1.5 }}>
                Meets run quarterly, in person, once the founding cohort is underway. Date and city land here — and in your inbox — as soon as they’re set.
              </div>
            </>
          )}
        </Card>

        {/* Ticket eligibility cards */}
        {role === "mentee" ? (
          <Card data-tour="meets-ticket-mentee" style={{ border: `1.5px dashed #CFCDC7`, background: "#EFEEEA" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, background: "#E2E1DC", display: "flex", alignItems: "center", justifyContent: "center" }}><Lock size={18} color={C.gray} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Tickets unlock at Week 8</div>
                <div style={{ fontSize: 12.5, color: C.gray, marginTop: 3, lineHeight: 1.45 }}>Eligibility comes with the <b>Mentor Approved</b> badge. You’re in Week {u.week} of 12.</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}><Bar pct={Math.min(1, (u.week || 1) / 8)} color={C.coral} /></div>
            <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.gray, marginTop: 5 }}>WEEK {u.week} OF 8</div>
          </Card>
        ) : (
          <Card data-tour="meets-ticket-mentor">
            <Label color={C.teal}>Your place</Label>
            <div style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.5 }}>
              Every mentor on the Roster has a seat at Meets. {name ? `We’ll confirm yours, ${name.split(" ")[0]}, ` : "Yours will be confirmed "}once a date is set.
            </div>
          </Card>
        )}

        {/* Event composer for mentors/admins */}
        {isMentorRole(role) && (
          <EventComposer
            isAdmin={isAdmin}
            onCreateEvent={onCreateEvent}
            onError={e => toast(e?.message || "Error creating event")}
          />
        )}

        {/* Other events list */}
        {eventsLoading && <div style={{ padding: "20px", textAlign: "center", color: C.gray }}>Loading events…</div>}
        {eventsError && <div style={{ padding: "20px", textAlign: "center", color: C.coral }}>Couldn’t load events</div>}

        {otherEvents.length > 0 && (
          <div>
            <Label style={{ paddingLeft: 4, marginBottom: 12 }}>Upcoming</Label>
            {otherEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                userId={userId}
                isAdmin={isAdmin}
                onRsvp={status => handleRsvp(event.id, status)}
                onVote={slotIds => handleVote(event.id, slotIds)}
                onFinalize={slotId => handleFinalize(event.id, slotId)}
                onCancel={() => handleCancel(event.id)}
              />
            ))}
          </div>
        )}

        {!eventsLoading && otherEvents.length === 0 && !isMentorRole(role) && (
          <Card style={{ textAlign: "center", padding: 20, background: C.surface }}>
            <div style={{ fontSize: 13, color: C.gray }}>No upcoming events yet</div>
          </Card>
        )}
      </div>
    </div>
  );
};

/* Derived from state the client actually holds — a real match, a real badge, a
   real cohort. There is no notification service yet, so nothing is invented to
   fill the list: it previously shipped a six-item history including messages
   quoted from a mentor who didn't exist and a session on a date nobody set.

   Pending invites (`awaitingYou`) are the one thing that used to go missing:
   a mentor could invite a mentee and the mentee had no surface that showed it. */
/**
 * The notification centre.
 *
 * Every row carries the preference that admits it (`pref`), and a row whose
 * preference is off is not rendered. That is the whole reason preferences ship
 * alongside the loop rather than after it: a switch labelled "leaderboard
 * movement" that goes on turning up in the centre teaches people their settings
 * are decorative, and nothing they set afterwards is believed.
 *
 * Rows with no `pref` are not preferences — they are things waiting on this
 * person. A pending invitation and a session proposal are somebody else's action
 * blocked on an answer; muting those would lose the answer, not the noise.
 */
export const NotifsScreen = ({ role, u, matches = [], sessions = [], back, navTo, onRespond, busy, prefs = {}, nudge = null }) => {
  const inbox = (Array.isArray(matches) ? matches : []).filter(m => m.awaitingYou);
  const items = [];
  /* A proposed session is a real thing waiting on this person — it belongs at
     the top of the list, above the derived progress items. */
  const sessionsToAnswer = (Array.isArray(sessions) ? sessions : []).filter(s => s.awaitingYou);
  if (sessionsToAnswer.length > 0) {
    const first = (sessionsToAnswer[0].person?.name || "Someone").split(" ")[0];
    items.push({
      icon: Calendar, c: C.amber, bg: C.amberTint, pref: "sessions",
      t: sessionsToAnswer.length === 1 ? `${first} proposed a session` : `${sessionsToAnswer.length} sessions need a time`,
      d: "Pick one of the times they offered — that books it for both of you.",
      when: "New", to: "sessions",
    });
  }
  if (role === "mentee") {
    /* A nudge comes from the mentor, never from the system or the console that
       detected it. Social accountability outperforms administrative email, and
       "your programme administrator noticed" is the sentence that makes someone
       close the app. */
    if (nudge) {
      items.push({
        icon: MessageCircle, c: C.purple, bg: C.purpleTint, pref: "notes",
        t: `${nudge.from} noticed`, d: nudge.text, when: "Today", to: nudge.to || "exercises",
      });
    }
    /* One line per mentor — the mentee may hold three, and "they accepted"
       naming only the first would drop the other two off the list entirely. */
    (u.mentors || []).forEach(m => items.push({ icon: Check, c: C.teal, bg: C.tealTint, pref: "notes", t: `${m.name.split(" ")[0]} accepted your request`, d: "You’re matched. Their Orbit is open to you now.", when: "Recent", to: "home" }));
    if (u.earned?.goal) items.push({ icon: Award, c: C.purple, bg: C.purpleTint, t: "Badge unlocked: Goal Setter", d: `Verified and shareable. ${BADGE_DEFS.length - 1} more to go.`, when: u.earned.goal, to: "badges" });
    items.push({ icon: Flame, c: C.coral, bg: C.coralTint, pref: "streak", t: u.streak > 0 ? `Streak: day ${u.streak}` : "Start your streak", d: "Today’s exercise takes a few minutes. Finishing it earns XP and unlocks Direct Connect.", when: "Today", to: "exercises" });
  } else {
    if ((u.cohort || []).length > 0) items.push({ icon: Users, c: C.purple, bg: C.purpleTint, pref: "notes", t: "Cohort forming", d: `${u.cohort.length} mentee${u.cohort.length === 1 ? "" : "s"} joined. Propose times for their opening session.`, when: "Recent", to: "sessions" });
    items.push({ icon: Crown, c: C.amber, bg: C.amberTint, pref: "board", t: `Tier: ${u.tier || "Scout"}`, d: `Impact Score live at ${u.impact ?? 0}. Pathfinder at 400.`, when: "Today", to: "board" });
  }

  /* A row with no `pref` is always shown; one with a `pref` obeys it. Defaulting
     an unknown key to *shown* rather than hidden is deliberate — a preference
     that hasn't loaded yet must not silently swallow a notification. */
  const visible = items.filter((n) => !n.pref || prefs[n.pref] !== false);
  const muted = items.length - visible.length;

  return (
    <div>
      <HeaderRow title="Notifications" onBack={back} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {inbox.map(m => {
          const first = (m.person?.name || "Someone").split(" ")[0];
          return (
            <Card key={m.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Users size={16} color={C.purple} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{role === "mentee" ? `${first} invited you` : `${first} asked to join`}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", whiteSpace: "nowrap" }}>NEW</span>
                </div>
                <div style={{ fontSize: 12.5, color: C.gray, marginTop: 3, lineHeight: 1.45 }}>
                  {role === "mentee" ? "Accept to open their Orbit and take a mentor seat." : "Accept to add them to your cohort."}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Btn small kind="ghost" style={{ borderColor: C.line, color: C.gray }} disabled={busy} onClick={() => onRespond?.(m.id, "decline")}>Pass</Btn>
                  <Btn small disabled={busy} onClick={() => onRespond?.(m.id, "accept")}>Accept {first}</Btn>
                </div>
              </div>
            </Card>
          );
        })}
        {visible.map((n, i) => (
          <Card key={i} onClick={() => navTo(n.to)} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 36, background: n.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><n.icon size={16} color={n.c} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>{n.t}</span>
                <span style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", whiteSpace: "nowrap" }}>{n.when.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 12.5, color: C.gray, marginTop: 3, lineHeight: 1.45 }}>{n.d}</div>
            </div>
            <ChevronRight size={14} color="#C9C6C0" style={{ marginTop: 4 }} />
          </Card>
        ))}
        {/* Says the switches are working rather than leaving someone to wonder
            whether the app is quiet or broken. */}
        {muted > 0 && (
          <div style={{ fontFamily: F.mono, fontSize: 9.5, letterSpacing: 0.6, color: "#A5A39D", textAlign: "center", padding: "6px 0" }}>
            {muted} MUTED BY YOUR NOTIFICATION SETTINGS
          </div>
        )}
      </div>
    </div>
  );
};

/* Fixed top-right invite alert. Stays put until Accept or Pass — no auto-dismiss,
   no X. Hidden only while the full Notifications overlay is already open. */
export const InviteAlert = ({ role, invites = [], busy, onRespond }) => {
  const inbox = (Array.isArray(invites) ? invites : []).filter(m => m.awaitingYou);
  if (inbox.length === 0) return null;
  const m = inbox[0];
  const first = (m.person?.name || "Someone").split(" ")[0];
  const more = inbox.length - 1;
  return (
    <motion.div
      initial={{ opacity: 0, x: 28, y: -8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      style={{
        position: "fixed",
        top: "calc(14px + env(safe-area-inset-top, 0px))",
        right: 14,
        zIndex: 95,
        width: "min(340px, calc(100vw - 28px))",
        background: C.ink,
        color: C.white,
        borderRadius: 18,
        padding: "16px 16px 14px",
        boxShadow: "0 18px 48px rgba(26,26,26,.35)",
      }}
      role="alertdialog"
      aria-label={role === "mentee" ? `${first} invited you` : `${first} asked to join`}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: C.purple, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Bell size={20} color={C.white} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: "#B7AFF2" }}>
            {role === "mentee" ? "MENTOR INVITE" : "MENTEE REQUEST"}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3, marginTop: 4, lineHeight: 1.25 }}>
            {role === "mentee" ? `${first} invited you` : `${first} asked to join`}
          </div>
          <div style={{ fontSize: 13, color: "#C9C6C0", marginTop: 4, lineHeight: 1.4 }}>
            {role === "mentee"
              ? "Accept to open their Orbit and take a mentor seat."
              : "Accept to add them to your cohort."}
            {more > 0 ? ` · ${more} more waiting` : ""}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => onRespond?.(m.id, "decline")}
          style={{
            flex: 0.7, border: "1.5px solid rgba(255,255,255,.22)", background: "transparent",
            color: "#C9C6C0", borderRadius: 12, padding: "11px 12px", fontFamily: F.sans,
            fontWeight: 700, fontSize: 13.5, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
          }}
        >
          Pass
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onRespond?.(m.id, "accept")}
          style={{
            flex: 1.3, border: "none", background: C.purple, color: C.white, borderRadius: 12,
            padding: "11px 12px", fontFamily: F.sans, fontWeight: 700, fontSize: 13.5,
            cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
          }}
        >
          Accept {first}
        </button>
      </div>
    </motion.div>
  );
};

/* The notification card that used to open this screen had four toggles —
   streak reminders, mentee activity, session reminders, leaderboard movement.
   None of them persisted, and there is no notification pipeline for them to
   configure, so every switch promised mail that could never arrive. Gone until
   something actually sends. */
export const SettingsScreen = ({ back, role, toast, onLogout, user, org, onRedoTour, onResetTabHints }) => {
  return (
    <div>
      <HeaderRow title="Settings" onBack={back} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* The account you're actually signed in as. This screen previously
            reported LinkedIn as "CONNECTED · BADGE SHARING ON" for every user,
            with no LinkedIn integration behind it. */}
        <Card>
          <Label>Account</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <Monogram name={user?.name || "—"} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.name || "—"}</div>
              <div style={{ fontSize: 12, color: C.gray, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email || ""}</div>
            </div>
            <span style={{ fontFamily: F.mono, fontSize: 8.5, color: user?.emailVerified ? C.teal : C.amber, letterSpacing: 0.6 }}>
              {user?.emailVerified ? "VERIFIED" : "UNVERIFIED"}
            </span>
          </div>
        </Card>
        {(onRedoTour || onResetTabHints) && (
          <Card>
            <Label>Tutorial</Label>
            {onRedoTour && (
              <div onClick={onRedoTour} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Sparkles size={16} color={C.purple} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Redo the tour</span>
                </div>
                <ChevronRight size={16} color={C.gray} />
              </div>
            )}
            {onResetTabHints && (
              <div onClick={onResetTabHints} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <RotateCcw size={16} color={C.purple} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Reset tab tips</span>
                </div>
                <ChevronRight size={16} color={C.gray} />
              </div>
            )}
          </Card>
        )}
        {/* "Mentor tier & payouts" and "Account and privacy" sat here with a
            chevron each and toasted their own subtitle when tapped. There are no
            payouts, and the export/visibility/deletion the second one promised
            doesn't exist either. This is the one that leads somewhere real. */}
        <Card onClick={() => window.open("/privacy.html", "_blank", "noopener")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Privacy policy</span><ChevronRight size={16} color={C.gray} />
        </Card>
        {/* The org console, for whoever has one — and the way in for a mentor
            who doesn't. A mentee sees neither: organisations are created from
            the mentor side, and offering the link here would only dead-end. */}
        {(org || role === "mentor") && (
          <Card onClick={() => window.open("/app/#/teams", "_blank", "noopener")}
            style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Building2 size={16} color={C.purple} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {org ? org.name : "Create an organisation"}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 8.5, color: "#A5A39D", letterSpacing: 0.6, marginTop: 2 }}>
                {org
                  ? `RYZN FOR TEAMS · ${String(org.orgRole || "member").toUpperCase()}${org.orbitActive ? " · ORBIT OPEN" : ""}`
                  : "RYZN FOR TEAMS · YOUR OWN ROSTER"}
              </div>
            </div>
            <ExternalLink size={15} color={C.gray} />
          </Card>
        )}
        {/* Founders only — mentees never get this link (see adminConsole). */}
        {user?.adminConsole && (
          <Card onClick={() => window.open("/app/#/admin", "_blank", "noopener")}
            style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.amberTint}`, background: C.amberTint }}>
            <Shield size={16} color={C.amber} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.amber }}>Founder console</span>
            <ExternalLink size={15} color={C.amber} />
          </Card>
        )}
        <Card onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.coralTint}`, background: C.coralTint }}>
          <LogOut size={16} color={C.coral} />
          <span style={{ fontSize: 14, fontWeight: 700, color: C.coral }}>Log out</span>
        </Card>
        <div style={{ textAlign: "center", fontFamily: F.mono, fontSize: 9.5, color: "#A5A39D", marginTop: 6 }}>RYZN · RYZN.ONE · RISE NOW.</div>
        <div style={{ textAlign: "center", fontFamily: F.mono, fontSize: 9.5, color: "#A5A39D", marginTop: 4 }}>
          BUILT BY <a href="https://runbos.ai" target="_blank" rel="noopener noreferrer" style={{ color: C.ink, fontWeight: 700, textDecoration: "none" }}>BOS</a>
        </div>
      </div>
    </div>
  );
};

/**
 * Badge detail.
 *
 * Two states, and the unearned one is not a lesser version of the earned one —
 * it is the goal gradient. A locked badge that says nothing about how to get it
 * is decoration; one that names the remaining distance is a reason to open the
 * app tomorrow. So an unearned badge shows the condition and the progress, and
 * withholds only the things that would be lies: the verification code, the date,
 * and the share buttons.
 */
export const BadgeModal = ({ badge, index, close, toast }) => {
  if (!badge) return null;
  const earned = !!badge.earned;
  const verifyUrl = `https://ryzn.one/v/${(badge.code || "00000").slice(-5)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast?.("Verification link copied");
    } catch {
      toast?.("Couldn't copy that link");
    }
  };

  return (
    <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(26,26,26,.5)", zIndex: 40, display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} className="sheet-up" style={{ background: C.white, width: "100%", borderRadius: "22px 22px 0 0", padding: "20px 22px 26px", boxSizing: "border-box" }}>
        <div style={{ width: 38, height: 4, background: "#D8D6D0", borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <BadgeTile badge={badge} i={index} size={76} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{badge.name}</div>
            <div style={{ fontFamily: F.mono, fontSize: 10.5, color: earned ? TIER_COLOR[badge.tier] : C.mute, marginTop: 3 }}>
              {earned ? `EARNED ${badge.earned?.toUpperCase()} · VERIFIED` : "NOT EARNED YET"}
            </div>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 4 }}>
              {earned ? `Unlocked: ${badge.unlocks}` : badge.unlocks}
            </div>
          </div>
        </div>

        {earned ? (
          <>
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 18, background: C.surface, padding: 14, borderRadius: 14 }}>
              <QR seed={badge.code || badge.id} size={96} />
              <div style={{ fontFamily: F.mono, fontSize: 11, color: C.gray, lineHeight: 1.8 }}>
                VERIFICATION<br /><span style={{ color: C.ink, fontWeight: 700 }}>{badge.code || "RYZ-2026-00000"}</span><br />ryzn.one/v/{(badge.code || "00000").slice(-5)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Btn style={{ flex: 1 }} onClick={() => shareToLinkedIn(`I earned the ${badge.name} badge on Ryzn. ${badge.unlocks}`)}><Linkedin size={15} /> Share to LinkedIn</Btn>
              <Btn kind="ghost" small onClick={copyLink} style={{ flex: 0.5 }}>Copy link</Btn>
            </div>
            <Btn kind="ghost" small onClick={close} style={{ width: "100%", marginTop: 8 }}>Done</Btn>
          </>
        ) : (
          <>
            {/* How to earn it, and how far off it is. This is the whole reason
                the locked state is worth rendering at all. */}
            <div style={{ marginTop: 18, background: C.surface, padding: 14, borderRadius: 14 }}>
              <Label color={C.purple}>How you earn it</Label>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 6 }}>{badge.how || badge.unlocks}</div>
              {badge.progress && (
                <div style={{ marginTop: 11 }}>
                  <Bar pct={badge.progress[1] ? badge.progress[0] / badge.progress[1] : 0} />
                  <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.gray, marginTop: 6, letterSpacing: 0.6 }}>
                    {(badge.progressLabel || `${badge.progress[0]} of ${badge.progress[1]}`).toUpperCase()}
                  </div>
                </div>
              )}
            </div>
            <Btn kind="ghost" onClick={close} style={{ width: "100%", marginTop: 16 }}>Close</Btn>
          </>
        )}
      </div>
    </div>
  );
};

export const MidwayUnlock = ({ onClose, toast }) => (
  <div style={{ position: "absolute", inset: 0, background: C.purple, zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30, textAlign: "center", color: C.white }}>
    <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 2.5, color: "#C9C3F2" }}>MILESTONE 4 OF 8</div>
    <div className="badge-pop" style={{ width: 118, height: 118, background: C.white, margin: "26px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <BadgeGlyph i={3} color={C.purple} size={54} />
    </div>
    <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.8 }}>Midway.</div>
    <div style={{ fontSize: 14.5, marginTop: 8, lineHeight: 1.55, maxWidth: 250, color: "#DDD9F6" }}>Halfway through the Program, zero shortcuts. The cohort board can see you now.</div>
    <div style={{ fontFamily: F.mono, fontSize: 10.5, marginTop: 14, color: "#C9C3F2" }}>RYZ-2026-00734 · VERIFIED</div>
    <div style={{ width: "100%", maxWidth: 280, marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
      <Btn kind="dark" onClick={() => shareToLinkedIn("Halfway through my Ryzn program — four milestones down, four to go.")}><Linkedin size={15} /> Share to LinkedIn</Btn>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#DDD9F6", fontFamily: F.sans, fontWeight: 600, fontSize: 14, cursor: "pointer", padding: 10 }}>Keep going</button>
    </div>
  </div>
);

