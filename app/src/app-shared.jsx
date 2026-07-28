import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Monogram, Field, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots } from "./ui.jsx";
import {
  BADGE_DEFS, GENERAL_INFLUENCERS, INFLUENCERS_BY_CATEGORY, MENTEE_SCRIPT, MENTOR_SCRIPT,
  MENTOR_MATCHES, MENTEE_MATCHES, EXTRA_MENTEES, MENTEE_POOL, RETURNING_MENTEES, STATUS,
  EXERCISES_RETURNING, EXERCISES_FRESH, COHORT_BOARD_STATIC, SCHOOL_BOARD, MENTOR_BOARD_TOP,
  EVENT, FEED_SEED
} from "./data.js";

/* ————————————————— APP: SHARED ————————————————— */

export const MeetsScreen = ({ role, u, toast }) => (
  <div>
    <HeaderRow title="Mentor Meets" right={<Label color={C.coral}>QUARTERLY</Label>} />
    <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ background: C.coral, border: "none", color: C.white, padding: 20 }}>
        <Label color="#F6D3C4">Next event</Label>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 6 }}>{EVENT.city}</div>
        <div style={{ fontSize: 13.5, marginTop: 2, opacity: 0.9 }}>{EVENT.date} · {EVENT.venue}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 16 }}>
          <span style={{ fontFamily: F.mono, fontSize: 34, fontWeight: 700 }}>{EVENT.days}</span>
          <span style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 1.5 }}>DAYS OUT · LIMITED SEATS</span>
        </div>
      </Card>
      {role === "mentee" ? (
        <Card style={{ border: `1.5px dashed #CFCDC7`, background: "#EFEEEA" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, background: "#E2E1DC", display: "flex", alignItems: "center", justifyContent: "center" }}><Lock size={18} color={C.gray} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Your ticket is locked — for now</div>
              <div style={{ fontSize: 12.5, color: C.gray, marginTop: 3, lineHeight: 1.45 }}>Unlocks with <b>Mentor Approved</b> at Week 8. You’re in Week {u.week}. {8 - u.week} week{8 - u.week === 1 ? "" : "s"} of showing up is all it takes.</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}><Bar pct={u.week / 8} color={C.coral} /></div>
          <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.gray, marginTop: 5 }}>WEEK {u.week} OF 8 · ON TRACK</div>
        </Card>
      ) : (
        <Card style={{ border: `1.5px solid ${C.teal}` }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <QR seed="jclarke-meets-toronto" size={84} />
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: F.mono, fontSize: 9.5, background: C.tealTint, color: C.teal, padding: "4px 8px" }}>{u.fresh ? "CONFIRMED · MENTOR" : "CONFIRMED · SPEAKER"}</span>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>Jordan Clarke</div>
              <div style={{ fontFamily: F.mono, fontSize: 10.5, color: C.gray, marginTop: 3 }}>TKT RYZ-TOR-0087<br />DOORS 8:30 AM</div>
            </div>
          </div>
        </Card>
      )}
      <Card>
        <Label>Speaker lineup · Toronto</Label>
        {EVENT.speakers.map(s => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <Monogram name={s.name} size={38} bg={C.coralTint} color={C.coral} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: C.gray }}>{s.role}</div>
            </div>
            <span style={{ fontFamily: F.mono, fontSize: 8.5, color: C.purple, letterSpacing: 0.8 }}>{s.tier.toUpperCase()}</span>
          </div>
        ))}
      </Card>
      <Card>
        <Label>Past events</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          {EVENT.past.map(p => (
            <div key={p.city} onClick={() => toast(`${p.city} gallery — ${p.n} photos`)} style={{ background: C.ink, color: C.white, padding: 14, aspectRatio: "1.5", display: "flex", flexDirection: "column", justifyContent: "flex-end", cursor: "pointer" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{p.city}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9.5, color: "#B5B3AE", marginTop: 2 }}>{p.when.toUpperCase()} · {p.n} ATTENDED</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>
);

export const NotifsScreen = ({ role, u, back, navTo }) => {
  const items = role === "mentee"
    ? (u.fresh ? [
        { icon: Check, c: C.teal, bg: C.tealTint, t: `${u.mentorName.split(" ")[0]} accepted your request`, d: "You’re matched. First session Monday 5:00 PM.", when: "Just now", to: "home" },
        { icon: Award, c: C.purple, bg: C.purpleTint, t: "Badge unlocked: Goal Setter", d: "Verified and shareable. 7 more to go.", when: "Today", to: "badges" },
        { icon: Play, c: C.purple, bg: C.purpleTint, t: "Jordan recorded a greeting for you", d: "1:24 video + starter resources in his Orbit. Watching earns +10 XP.", when: "Today", to: "orbit" },
        { icon: Flame, c: C.coral, bg: C.coralTint, t: "Streak: Day 1", d: "Today’s exercise takes 6 minutes. Keep it alive. Finishing it unlocks Direct Connect with Jordan.", when: "Today", to: "exercises" },
      ] : [
        { icon: Flame, c: C.coral, bg: C.coralTint, t: "Keep the streak alive", d: "No activity yet today. Today’s exercise takes 8 minutes.", when: "7:00 PM", to: "exercises" },
        { icon: MessageCircle, c: C.purple, bg: C.purpleTint, t: "Note from Jordan", d: "“Your headline rewrite was sharp. Bring the cold open Tuesday.”", when: "Yesterday", to: "dm" },
        { icon: Award, c: C.teal, bg: C.tealTint, t: "Badge unlocked: Momentum", d: "4 straight weeks. Priority replies from Jordan unlocked.", when: "Jul 6", to: "badges" },
        { icon: Play, c: C.purple, bg: C.purpleTint, t: "New on Jordan’s feed", d: "“How I read a portfolio in 90 seconds” — 6:03 video. Review for +5 XP.", when: "Jul 13", to: "orbit" },
        { icon: Calendar, c: C.purple, bg: C.purpleTint, t: "Session in 24 hours", d: "Jordan Clarke · Tue Jul 21, 5:00 PM. Agenda is ready.", when: "Jul 20", to: "home" },
        { icon: TrendingUp, c: C.amber, bg: C.amberTint, t: "You moved up", d: "Now #4 in Cohort 7. R-0472 is 250 XP ahead.", when: "Jul 12", to: "cohort" },
      ])
    : (u.fresh ? [
        { icon: Users, c: C.purple, bg: C.purpleTint, t: "Cohort forming", d: `${u.cohort.length} mentee${u.cohort.length === 1 ? "" : "s"} accepted. Intro sessions auto-scheduled for next week.`, when: "Just now", to: "sessions" },
        { icon: Crown, c: C.amber, bg: C.amberTint, t: "Tier confirmed: Scout", d: `Impact Score live at ${u.impact}. Pathfinder at 400.`, when: "Today", to: "board" },
      ] : [
        { icon: Flame, c: C.coral, bg: C.coralTint, t: "Mia Tran is at risk", d: "5-day streak drop. A note from you doubles re-engagement odds.", when: "Today", to: "home" },
        { icon: Calendar, c: C.purple, bg: C.purpleTint, t: "3 sessions this week", d: "Alex Tue, Mia Wed, Leo Thu. Agendas are ready.", when: "Today", to: "sessions" },
        { icon: TrendingUp, c: C.amber, bg: C.amberTint, t: "Impact +15", d: "Alex completed a milestone exercise. Rank #12 holds.", when: "Jul 14", to: "board" },
      ]);
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

export const SettingsScreen = ({ back, role, toast, onLogout }) => {
  const [prefs, setPrefs] = useState({ streak: true, notes: true, sessions: true, board: false });
  const Toggle = ({ k }) => (
    <button onClick={() => setPrefs(p => ({ ...p, [k]: !p[k] }))} style={{ width: 42, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: prefs[k] ? C.purple : "#D8D6D0", position: "relative", transition: "background .2s" }}>
      <span style={{ position: "absolute", top: 3, left: prefs[k] ? 21 : 3, width: 18, height: 18, borderRadius: 9, background: C.white, transition: "left .2s" }} />
    </button>
  );
  return (
    <div>
      <HeaderRow title="Settings" onBack={back} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Card>
          <Label>Notifications</Label>
          {[["streak", "Streak reminder · daily 7 PM"], ["notes", role === "mentee" ? "Mentor notes" : "Mentee activity"], ["sessions", "Session reminders · 24h and 1h"], ["board", "Leaderboard movement"]].map(([k, l]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <span style={{ fontSize: 14 }}>{l}</span><Toggle k={k} />
            </div>
          ))}
        </Card>
        <Card>
          <Label>Linked accounts</Label>
          <div onClick={() => toast("LinkedIn connected · badge sharing on")} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, cursor: "pointer" }}>
            <div style={{ width: 36, height: 36, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center" }}><Linkedin size={16} color={C.deep} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>LinkedIn</div>
              <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.teal }}>CONNECTED · BADGE SHARING ON</div>
            </div>
            <ChevronRight size={16} color={C.gray} />
          </div>
        </Card>
        {[[role === "mentee" ? "Program track · University" : "Mentor tier & payouts", "Managed with your program lead — message them to change it"], ["Account and privacy", "Data export, visibility, and deletion"]].map(([l, d]) => (
          <Card key={l} onClick={() => toast(d)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{l}</span><ChevronRight size={16} color={C.gray} />
          </Card>
        ))}
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
        <Btn style={{ flex: 1 }} onClick={() => toast("Opening LinkedIn share…")}><Linkedin size={15} /> Share to LinkedIn</Btn>
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
      <Btn kind="dark" onClick={() => toast("Opening LinkedIn share…")}><Linkedin size={15} /> Share to LinkedIn</Btn>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#DDD9F6", fontFamily: F.sans, fontWeight: 600, fontSize: 14, cursor: "pointer", padding: 10 }}>Keep going</button>
    </div>
  </div>
);

