import React, { useEffect, useRef, useMemo } from "react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Monogram, Field, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots } from "./ui.jsx";
import { BADGE_DEFS } from "./data.js";
import { shareToLinkedIn } from "./lib/share.js";

/* ————————————————— APP: SHARED ————————————————— */

/* Mentor Meets. The whole screen used to describe an event that has not been
   scheduled: a dated Toronto venue with a live countdown, a three-person
   speaker lineup, a confirmed ticket with a QR and a seat number, and two past
   events with attendance figures. None of it existed. What remains is the
   badge-gated eligibility rule, which is real program design. */
export const MeetsScreen = ({ role, u, name, toast }) => (
  <div>
    <HeaderRow title="Mentor Meets" right={<Label color={C.coral}>QUARTERLY</Label>} />
    <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ background: C.coral, border: "none", color: C.white, padding: 20 }}>
        <Label color="#F6D3C4">Next event</Label>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, marginTop: 6 }}>Not scheduled yet</div>
        <div style={{ fontSize: 13.5, marginTop: 6, opacity: 0.92, lineHeight: 1.5 }}>
          Meets run quarterly, in person, once the founding cohort is underway. Date and city land here — and in your inbox — as soon as they're set.
        </div>
      </Card>
      {role === "mentee" ? (
        <Card style={{ border: `1.5px dashed #CFCDC7`, background: "#EFEEEA" }}>
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
        <Card>
          <Label color={C.teal}>Your place</Label>
          <div style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.5 }}>
            Every mentor on the Roster has a seat at Meets. {name ? `We'll confirm yours, ${name.split(" ")[0]}, ` : "Yours will be confirmed "}once a date is set.
          </div>
        </Card>
      )}
    </div>
  </div>
);

/* Derived from state the client actually holds — a real match, a real badge, a
   real cohort. There is no notification service yet, so nothing is invented to
   fill the list: it previously shipped a six-item history including messages
   quoted from a mentor who didn't exist and a session on a date nobody set. */
export const NotifsScreen = ({ role, u, back, navTo }) => {
  const items = [];
  if (role === "mentee") {
    if (u.mentorName) items.push({ icon: Check, c: C.teal, bg: C.tealTint, t: `${u.mentorName.split(" ")[0]} accepted your request`, d: "You’re matched. Their Orbit is open to you now.", when: "Recent", to: "home" });
    if (u.earned?.goal) items.push({ icon: Award, c: C.purple, bg: C.purpleTint, t: "Badge unlocked: Goal Setter", d: `Verified and shareable. ${BADGE_DEFS.length - 1} more to go.`, when: u.earned.goal, to: "badges" });
    items.push({ icon: Flame, c: C.coral, bg: C.coralTint, t: u.streak > 0 ? `Streak: day ${u.streak}` : "Start your streak", d: "Today’s exercise takes a few minutes. Finishing it earns XP and unlocks Direct Connect.", when: "Today", to: "exercises" });
  } else {
    if (u.cohort.length > 0) items.push({ icon: Users, c: C.purple, bg: C.purpleTint, t: "Cohort forming", d: `${u.cohort.length} mentee${u.cohort.length === 1 ? "" : "s"} joined. Their opening sessions are ready to book.`, when: "Recent", to: "sessions" });
    items.push({ icon: Crown, c: C.amber, bg: C.amberTint, t: `Tier: ${u.tier || "Scout"}`, d: `Impact Score live at ${u.impact}. Pathfinder at 400.`, when: "Today", to: "board" });
  }
  return (
    <div>
      <HeaderRow title="Notifications" onBack={back} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
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

/* The notification card that used to open this screen had four toggles —
   streak reminders, mentee activity, session reminders, leaderboard movement.
   None of them persisted, and there is no notification pipeline for them to
   configure, so every switch promised mail that could never arrive. Gone until
   something actually sends. */
export const SettingsScreen = ({ back, role, toast, onLogout, user }) => {
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
        {/* "Mentor tier & payouts" and "Account and privacy" sat here with a
            chevron each and toasted their own subtitle when tapped. There are no
            payouts, and the export/visibility/deletion the second one promised
            doesn't exist either. This is the one that leads somewhere real. */}
        <Card onClick={() => window.open("/privacy.html", "_blank", "noopener")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Privacy policy</span><ChevronRight size={16} color={C.gray} />
        </Card>
        {/* Founders only. isAdmin covers both routes into the console — the role
            flag and the ADMIN_EMAILS allowlist — so the person bootstrapping it
            can still see this. Opens in its own window, as asked. */}
        {user?.isAdmin && (
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

