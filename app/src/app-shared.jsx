import React, { useEffect, useRef, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search, Building2
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Monogram, Field, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots } from "./ui.jsx";
import { BADGE_DEFS } from "./data.js";
import { shareToLinkedIn } from "./lib/share.js";
import { isMentorRole } from "./lib/roles.js";
import { EventComposer, EventCard } from "./events.jsx";

/* ————————————————— APP: SHARED ————————————————— */

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
export const NotifsScreen = ({ role, u, matches = [], sessions = [], back, navTo, onRespond, busy }) => {
  const inbox = (Array.isArray(matches) ? matches : []).filter(m => m.awaitingYou);
  const items = [];
  /* A proposed session is a real thing waiting on this person — it belongs at
     the top of the list, above the derived progress items. */
  const sessionsToAnswer = (Array.isArray(sessions) ? sessions : []).filter(s => s.awaitingYou);
  if (sessionsToAnswer.length > 0) {
    const first = (sessionsToAnswer[0].person?.name || "Someone").split(" ")[0];
    items.push({
      icon: Calendar, c: C.amber, bg: C.amberTint,
      t: sessionsToAnswer.length === 1 ? `${first} proposed a session` : `${sessionsToAnswer.length} sessions need a time`,
      d: "Pick one of the times they offered — that books it for both of you.",
      when: "New", to: "sessions",
    });
  }
  if (role === "mentee") {
    if (u.mentorName) items.push({ icon: Check, c: C.teal, bg: C.tealTint, t: `${u.mentorName.split(" ")[0]} accepted your request`, d: "You’re matched. Their Orbit is open to you now.", when: "Recent", to: "home" });
    if (u.earned?.goal) items.push({ icon: Award, c: C.purple, bg: C.purpleTint, t: "Badge unlocked: Goal Setter", d: `Verified and shareable. ${BADGE_DEFS.length - 1} more to go.`, when: u.earned.goal, to: "badges" });
    items.push({ icon: Flame, c: C.coral, bg: C.coralTint, t: u.streak > 0 ? `Streak: day ${u.streak}` : "Start your streak", d: "Today’s exercise takes a few minutes. Finishing it earns XP and unlocks Direct Connect.", when: "Today", to: "exercises" });
  } else {
    if ((u.cohort || []).length > 0) items.push({ icon: Users, c: C.purple, bg: C.purpleTint, t: "Cohort forming", d: `${u.cohort.length} mentee${u.cohort.length === 1 ? "" : "s"} joined. Propose times for their opening session.`, when: "Recent", to: "sessions" });
    items.push({ icon: Crown, c: C.amber, bg: C.amberTint, t: `Tier: ${u.tier || "Scout"}`, d: `Impact Score live at ${u.impact ?? 0}. Pathfinder at 400.`, when: "Today", to: "board" });
  }
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
        {items.map((n, i) => (
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

export const BadgeModal = ({ badge, index, close, toast }) => badge && (
  <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(26,26,26,.5)", zIndex: 40, display: "flex", alignItems: "flex-end" }}>
    <div onClick={e => e.stopPropagation()} className="sheet-up" style={{ background: C.white, width: "100%", borderRadius: "22px 22px 0 0", padding: "20px 22px 26px", boxSizing: "border-box" }}>
      <div style={{ width: 38, height: 4, background: "#D8D6D0", borderRadius: 2, margin: "0 auto 16px" }} />
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <BadgeTile badge={badge} i={index} size={76} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{badge.name}</div>
          <div style={{ fontFamily: F.mono, fontSize: 10.5, color: TIER_COLOR[badge.tier], marginTop: 3 }}>EARNED {badge.earned?.toUpperCase()} · VERIFIED</div>
          <div style={{ fontSize: 12.5, color: C.gray, marginTop: 4 }}>Unlocked: {badge.unlocks}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 18, background: C.surface, padding: 14, borderRadius: 14 }}>
        <QR seed={badge.code || badge.id} size={96} />
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.gray, lineHeight: 1.8 }}>
          VERIFICATION<br /><span style={{ color: C.ink, fontWeight: 700 }}>{badge.code || "RYZ-2026-00000"}</span><br />ryzn.one/v/{(badge.code || "00000").slice(-5)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Btn style={{ flex: 1 }} onClick={() => shareToLinkedIn(`I earned the ${badge.name} badge on Ryzn. ${badge.unlocks}`)}><Linkedin size={15} /> Share to LinkedIn</Btn>
        <Btn kind="ghost" onClick={close} style={{ flex: 0.6 }}>Done</Btn>
      </div>
    </div>
  </div>
);

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

