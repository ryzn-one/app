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
import { EXERCISE_TRACK } from "./data.js";

/* ————————————————— APP: MENTEE ————————————————— */

export const MenteeHome = ({ u, name, badges, go, openOverlay, todayDone, stage1, mentorSeats, toast, feed = [], watched = {} }) => {
  const nextBadge = badges.find(b => !b.earned);
  const nextIdx = badges.indexOf(nextBadge);
  const todayEx = EXERCISE_TRACK[0];
  const msgUnlocked = stage1;
  const firstName = (name || "").split(" ")[0];
  const latest = feed.find(p => !p.pinned);
  const unread = feed.filter(p => (p.kind === "video" || p.kind === "resource") && !watched[p.id]).length;
  return (
    <div style={{ padding: "18px 20px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <Label>Founding cohort</Label>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.8, marginTop: 4 }}>{firstName ? `${firstName}.` : "Welcome."}</div>
          <div style={{ color: C.gray, fontSize: 14, marginTop: 2 }}>{u.fresh ? "Day 1. It starts now." : `Week ${u.week} of the Program. Keep moving.`}</div>
        </div>
        <button onClick={() => openOverlay("notifs")} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 10, cursor: "pointer", position: "relative" }}>
          <Bell size={18} color={C.ink} />
          <div style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 4, background: C.coral }} />
        </button>
      </div>

      <Card style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 18 }}>
        <Ring pct={u.fresh ? 0.03 : u.week / 12}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{u.fresh ? "3%" : `${Math.round((u.week / 12) * 100)}%`}</div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gray }}>{u.fresh ? "DAY 1/84" : `WK ${u.week}/12`}</div>
        </Ring>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Flame size={22} color={C.coral} fill={C.coral} />
            <span style={{ fontSize: 26, fontWeight: 700 }}>{u.streak + (todayDone ? 1 : 0)}</span>
            <span style={{ color: C.gray, fontSize: 13, fontWeight: 600 }}>day streak</span>
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 11, color: C.gray, marginTop: 8 }}>{u.xp.toLocaleString()} XP{u.rank ? ` · #${u.rank} in cohort` : ""}</div>
          <div style={{ marginTop: 8 }}><Bar pct={(u.streak + (todayDone ? 1 : 0)) / 100} color={C.teal} /></div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 4 }}>{u.streak + (todayDone ? 1 : 0)}/100 → 100-DAY STREAK</div>
        </div>
      </Card>

      <Card onClick={() => go("exercises")} style={{ marginTop: 12, background: todayDone ? C.tealTint : C.ink, border: "none", color: todayDone ? C.teal : C.white }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Label color={todayDone ? C.teal : "#B9B3E8"}>Today’s exercise · {todayEx.mins} min</Label>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{todayDone ? `${todayEx.title} — done.` : todayEx.title}</div>
            <div style={{ fontSize: 13, marginTop: 4, opacity: 0.75 }}>{todayDone ? `+${todayEx.xp} XP banked. Back tomorrow.` : u.fresh ? "One honest paragraph. Your mentor reads it." : "3 sentences. Your dream industry. No filler."}</div>
          </div>
          {todayDone ? <Check size={26} /> : <div style={{ background: C.purple, borderRadius: 12, padding: 10 }}><Zap size={18} color={C.white} /></div>}
        </div>
      </Card>

      {nextBadge && (
        <Card onClick={() => go("badges")} style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <BadgeTile badge={nextBadge} i={nextIdx} size={56} />
            <div style={{ flex: 1 }}>
              <Label>Next milestone</Label>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 3 }}>{nextBadge.name} — {nextBadge.unlocks.toLowerCase()}</div>
              {nextBadge.progress ? <>
                <div style={{ marginTop: 8 }}><Bar pct={nextBadge.progress[0] / nextBadge.progress[1]} /></div>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gray, marginTop: 5 }}>{nextBadge.progressLabel}</div>
              </> : <div style={{ fontSize: 12.5, color: C.gray, marginTop: 4 }}>{nextBadge.req}</div>}
            </div>
            <ChevronRight size={18} color={C.gray} />
          </div>
        </Card>
      )}

      {/* No mentor is a real state in an early cohort — it renders as itself
          rather than borrowing a name. Session times will live here once
          scheduling exists; inventing "MON 5:00 PM · CONFIRMED" for a session
          nobody booked is what this card used to do. */}
      {u.mentorName ? (
        <Card onClick={() => openOverlay("orbit")} style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Monogram name={u.mentorName} size={48} bg={C.purple} color={C.white} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{u.mentorName}</div>
              {u.mentorTitle && <div style={{ fontSize: 12, color: C.gray }}>{u.mentorTitle}</div>}
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.purple, marginTop: 3 }}>YOUR ACTIVE MENTOR</div>
            </div>
            {msgUnlocked
              ? <Btn small kind="soft" onClick={(e) => { e.stopPropagation(); openOverlay("dm"); }}><MessageCircle size={14} /> Message</Btn>
              : <span style={{ fontFamily: F.mono, fontSize: 9, background: "#EFEEEA", color: C.gray, padding: "7px 10px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 5 }}><Lock size={10} /> STAGE 1</span>}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 10 }}>{msgUnlocked ? "DIRECT CONNECT EARNED · TAP FOR THEIR ORBIT" : "ORBIT IS OPEN NOW · FINISH STAGE 1 TO EARN DIRECT CONNECT"}</div>
        </Card>
      ) : (
        <Card onClick={() => openOverlay("addmentor")} style={{ marginTop: 12, border: `1.5px dashed #CFCDC7`, background: "#EFEEEA" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, background: "#E2E1DC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Users size={20} color={C.gray} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>No mentor matched yet</div>
              <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2, lineHeight: 1.45 }}>Mentors are still being onboarded. Your exercises are open now — the work counts either way.</div>
            </div>
            <ChevronRight size={16} color={C.gray} />
          </div>
        </Card>
      )}

      {latest && u.mentorName && (
        <Card onClick={() => openOverlay("orbit")} style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Label color={C.purple}>Latest in {u.mentorName.split(" ")[0]}’s Orbit</Label>
            {unread > 0 && <span style={{ fontFamily: F.mono, fontSize: 8.5, background: C.purple, color: C.white, padding: "3px 7px", fontWeight: 700 }}>{unread} NEW</span>}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 10 }}>
            <div style={{ width: 36, height: 36, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {latest.kind === "video" ? <Play size={15} color={C.purple} /> : latest.kind === "resource" ? <FileText size={15} color={C.purple} /> : <MessageCircle size={15} color={C.purple} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: C.ink, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{latest.title || latest.text}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 4 }}>{String(latest.when || "NOW").toUpperCase()} · TAP TO READ, REACT + EARN XP</div>
            </div>
            <ChevronRight size={16} color={C.gray} />
          </div>
        </Card>
      )}

      {/* The directory, as distinct from the deck below it: search the whole
          Roster and see who you've already asked, rather than being handed one
          card at a time. */}
      <Card onClick={() => openOverlay("explore")} style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Search size={16} color={C.purple} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Explore mentors</div>
            <div style={{ fontSize: 11.5, color: C.gray, marginTop: 2 }}>Search the whole Roster by name, role, or expertise</div>
          </div>
          <ChevronRight size={16} color={C.gray} />
        </div>
      </Card>

      {mentorSeats < 3 && (
        <Card onClick={() => openOverlay("addmentor")} style={{ marginTop: 12, border: "1.5px dashed #CFCDC7", background: "#EFEEEA" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Plus size={16} color={C.purple} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Add another mentor</div>
              <div style={{ fontSize: 11.5, color: C.gray, marginTop: 2 }}>Different strength, same corner · {mentorSeats}/3 seats used · +15 XP</div>
            </div>
            <ChevronRight size={16} color={C.gray} />
          </div>
        </Card>
      )}

      <Card onClick={() => openOverlay("cohort")} style={{ marginTop: 12, background: C.purpleTint, border: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Users size={20} color={C.deep} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.deep }}>Cohort standings</div>
            <div style={{ fontSize: 12, color: C.deep, opacity: 0.7 }}>{u.rank ? `You’re #${u.rank}.` : "Rankings open once the cohort is running."}</div>
          </div>
          <ChevronRight size={18} color={C.deep} />
        </div>
      </Card>
    </div>
  );
};

export const MenteeExercises = ({ u, todayDone, onSubmit }) => {
  const [text, setText] = useState("");
  const list = EXERCISE_TRACK;
  return (
    <div>
      <HeaderRow title="Exercises" right={<Label>WEEK {u.week || 1}</Label>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {list.map((ex, i) => {
          if (ex.state === "open" && !todayDone) return (
            <Card key={i} style={{ border: `1.5px solid ${C.purple}` }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Label color={C.purple}>{ex.day} · {ex.mins} min</Label>
                {ex.milestone && <Label color={C.amber}>Milestone 3/3</Label>}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{ex.title}</div>
              <div style={{ fontSize: 13.5, color: C.gray, marginTop: 6, lineHeight: 1.5 }}>{ex.prompt}</div>
              {/* A Write/Speak toggle sat above this. "Speak" showed a dashed
                  box reading "Hold to record · 90 seconds max" over nothing —
                  there is no MediaRecorder call anywhere in the app. */}
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="I’m here because…" rows={4}
                style={{ width: "100%", marginTop: 12, borderRadius: 12, border: `1px solid ${C.line}`, padding: 12, fontFamily: F.sans, fontSize: 14, resize: "none", background: C.surface, boxSizing: "border-box", outline: "none" }} />
              <Btn style={{ marginTop: 12 }} onClick={onSubmit}>Submit · +{ex.xp} XP</Btn>
            </Card>
          );
          const done = ex.state === "open" && todayDone;
          const upcoming = ex.state === "upcoming";
          return (
            <Card key={i} style={{ opacity: upcoming ? 0.85 : 1, background: upcoming ? "#EFEEEA" : C.white }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: done ? C.tealTint : "#E2E1DC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {done ? <Check size={17} color={C.teal} strokeWidth={3} /> : upcoming ? <Lock size={14} color="#A5A39D" /> : <Zap size={15} color="#A5A39D" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.mono, fontSize: 9.5, color: "#A5A39D" }}>{ex.day.toUpperCase()}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{ex.title}</div>
                  {upcoming && <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>Unlocks at 7 AM. One a day keeps the streak alive.</div>}
                </div>
                {done ? <span style={{ fontFamily: F.mono, fontSize: 11, color: C.teal, fontWeight: 700 }}>+{ex.xp} XP</span>
                  : <span style={{ fontFamily: F.mono, fontSize: 10, color: "#A5A39D" }}>+{ex.xp} XP</span>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export const MenteeBadges = ({ badges, openBadge, justEarnedId }) => (
  <div>
    <HeaderRow title="Milestones" right={<Label>{badges.filter(b => b.earned).length} OF 8 EARNED</Label>} />
    <div style={{ padding: "0 20px 20px" }}>
      {badges.map((b, i) => {
        const earned = !!b.earned, color = TIER_COLOR[b.tier];
        return (
          <div key={b.id} style={{ display: "flex", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14 }}>
              <div style={{ width: 12, height: 12, background: earned ? color : "#D8D6D0", marginTop: 26, transform: "rotate(45deg)" }} />
              {i < badges.length - 1 && <div style={{ width: 2, flex: 1, background: earned ? color : "#DEDDD7", opacity: earned ? 0.35 : 1 }} />}
            </div>
            <Card onClick={earned ? () => openBadge(b, i) : undefined} style={{ flex: 1, marginBottom: 12, border: `1px solid ${earned ? color : C.line}` }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <BadgeTile badge={b} i={i} size={54} justEarned={justEarnedId === b.id} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{b.name}</div>
                  {earned ? <>
                    <div style={{ fontFamily: F.mono, fontSize: 10, color, marginTop: 2 }}>EARNED {b.earned.toUpperCase()} · VERIFIED</div>
                    <div style={{ fontSize: 11.5, color: C.gray, marginTop: 3 }}>Tap for QR verification + LinkedIn share</div>
                  </> : <>
                    <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2 }}>{b.req}</div>
                    {b.progress && <><div style={{ marginTop: 7 }}><Bar pct={b.progress[0] / b.progress[1]} color={color} /></div>
                      <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.gray, marginTop: 4 }}>{b.progressLabel.toUpperCase()}</div></>}
                  </>}
                </div>
                {earned && <ChevronRight size={16} color={C.gray} />}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  </div>
);

/* The cohort board. Every row here used to be invented — six anonymous handles
   with XP totals, plus a school-vs-school table — sitting under the heading
   "Anonymised leaderboard" where a user would reasonably read them as peers.
   There is no XP ledger yet (see docs/PRODUCTION.md), so the only honest board
   is the caller's own standing. */
export const CohortScreen = ({ u, back }) => (
  <div>
    <HeaderRow title="Cohort" onBack={back} right={<Label>FOUNDING</Label>} />
    <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ background: C.purple, border: "none", color: C.white, padding: 20 }}>
        <Label color="#C9C3F2">Your standing</Label>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
          <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1.5 }}>{u.xp.toLocaleString()}</span>
          <span style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1 }}>XP</span>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 10, color: "#DDD9F6", marginTop: 6, letterSpacing: 0.6 }}>
          {u.rank ? `RANK #${u.rank}` : "RANK OPENS WHEN THE COHORT IS FULL"} · {u.streak} DAY STREAK
        </div>
      </Card>
      <Card style={{ border: "1.5px dashed #CFCDC7", background: "#EFEEEA" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 44, height: 44, background: "#E2E1DC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Users size={18} color={C.gray} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>The board opens with the cohort</div>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 3, lineHeight: 1.45 }}>Anonymised rankings appear once enough of the founding cohort is active. Until then the only number worth watching is your own.</div>
          </div>
        </div>
      </Card>
    </div>
  </div>
);

/* Messages are local to the session — there is no message store yet. The
   scripted "them" replies that used to fire 1.4s after you sent anything are
   gone: a mentee reading a canned line as their mentor answering is the worst
   version of this whole problem. */
export const DMScreen = ({ name, sub, back, seed = [], placeholder }) => {
  const [msgs, setMsgs] = useState(seed);
  const [text, setText] = useState("");
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);
  const send = () => {
    const t = text.trim(); if (!t) return;
    setMsgs(m => [...m, { who: "me", text: t }]); setText("");
  };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${C.line}`, background: C.white }}>
        <button onClick={back} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, margin: -4 }}><ChevronLeft size={22} color={C.ink} /></button>
        <Monogram name={name} size={36} bg={C.purple} color={C.white} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.teal, letterSpacing: 0.8 }}>{sub}</div>
        </div>
      </div>
      <div ref={scrollRef} className="app-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: 240 }}>
            <MessageCircle size={26} color="#C9C6C0" />
            <div style={{ fontSize: 13, color: C.gray, marginTop: 10, lineHeight: 1.5 }}>No messages yet. Say the first thing.</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className="msg-in" style={{
            alignSelf: m.who === "them" ? "flex-start" : "flex-end", maxWidth: "80%",
            background: m.who === "them" ? C.white : C.purple, color: m.who === "them" ? C.ink : C.white,
            border: m.who === "them" ? `1px solid ${C.line}` : "none",
            borderRadius: m.who === "them" ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
            padding: "11px 14px", fontSize: 14, lineHeight: 1.5,
          }}>{m.text}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, padding: "10px 14px 16px", borderTop: `1px solid ${C.line}`, background: C.white }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={placeholder}
          style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 20, padding: "11px 16px", fontFamily: F.sans, fontSize: 14, outline: "none", background: C.surface, minWidth: 0 }} />
        <button onClick={send} style={{ width: 42, height: 42, borderRadius: 21, border: "none", background: C.purple, color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Send size={16} /></button>
      </div>
    </div>
  );
};

export const MenteeProfile = ({ u, name, badges, openBadge, openOverlay, extraMentors, onPromote, onDrop }) => (
  <div>
    <HeaderRow title="Profile" right={
      <button onClick={() => openOverlay("settings")} style={{ background: "none", border: "none", cursor: "pointer" }}><Settings size={20} color={C.ink} /></button>} />
    <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Monogram name={name || "—"} size={62} bg={C.ink} color={C.white} radius={16} />
        <div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{name || "Your profile"}</div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.purple, marginTop: 3 }}>{u.track ? `TRACK · ${u.track.toUpperCase()} · ` : ""}WEEK {u.week}</div>
        </div>
      </Card>
      {u.goals?.length > 0 && (
        <Card>
          <Label color={C.purple}>Your program goals</Label>
          {u.goals.map((g, i) => (
            <div key={g} style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "flex-start" }}>
              <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.purple, marginTop: 1 }}>0{i + 1}</span>
              <div style={{ fontSize: 13, lineHeight: 1.45, fontStyle: "italic" }}>“{g}”</div>
            </div>
          ))}
        </Card>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[[u.xp.toLocaleString(), "total XP", C.purple], [`${u.streak}`, "day streak", C.coral], [`${u.week}/12`, "program wk", C.teal]].map(([n, l, c]) => (
          <Card key={l} style={{ padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: c }}>{n}</div>
            <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.gray, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>{l}</div>
          </Card>
        ))}
      </div>
      <Card>
        <Label>Badge wall</Label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          {badges.filter(b => b.earned).map((b) => (
            <BadgeTile key={b.id} badge={b} i={badges.indexOf(b)} size={62} onClick={() => openBadge(b, badges.indexOf(b))} />
          ))}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 9.5, color: "#A5A39D", marginTop: 12 }}>EVERY BADGE VERIFIABLE · SHARE TO LINKEDIN FROM DETAIL</div>
      </Card>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Label>Your mentors</Label>
          <Label color={(u.mentorName ? 1 : 0) + extraMentors.length >= 3 ? C.teal : C.purple}>{(u.mentorName ? 1 : 0) + extraMentors.length}/3 SEATS</Label>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 8.5, color: "#A5A39D", marginTop: 6, letterSpacing: 0.5 }}>ONE ACTIVE ENGAGEMENT AT A TIME — KEEPS IT AUTHENTIC. SUPPORTS STAY IN YOUR CORNER.</div>
        {u.mentorName ? (
          <div onClick={() => openOverlay("orbit")} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, cursor: "pointer" }}>
            <Monogram name={u.mentorName} size={40} bg={C.purple} color={C.white} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{u.mentorName}</div>
              {u.mentorTitle && <div style={{ fontSize: 11.5, color: C.gray }}>{u.mentorTitle}</div>}
            </div>
            <span style={{ fontFamily: F.mono, fontSize: 8.5, background: C.tealTint, color: C.teal, fontWeight: 700, padding: "5px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}><Crown size={10} /> ACTIVE</span>
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: C.gray, marginTop: 12, lineHeight: 1.5 }}>No active mentor yet.</div>
        )}
        {extraMentors.map(m => (
          <div key={m.id} style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Monogram name={m.name} size={40} bg={C.purpleTint} color={C.deep} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                {m.headline && <div style={{ fontSize: 11.5, color: C.gray }}>{m.headline}</div>}
              </div>
              <span style={{ fontFamily: F.mono, fontSize: 8.5, background: C.surface, color: C.gray, padding: "5px 8px" }}>SUPPORT</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, marginLeft: 52 }}>
              <button onClick={() => onPromote(m)} style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 11.5, cursor: "pointer", padding: "6px 11px", borderRadius: 10, border: `1.5px solid ${C.purple}`, background: C.purpleTint, color: C.purple }}>Make active</button>
              <button onClick={() => onDrop(m)} style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 11.5, cursor: "pointer", padding: "6px 11px", borderRadius: 10, border: `1.5px solid ${C.coral}`, background: C.white, color: C.coral }}>Drop</button>
            </div>
          </div>
        ))}
        {(u.mentorName ? 1 : 0) + extraMentors.length < 3 && (() => {
          const open = 3 - (u.mentorName ? 1 : 0) - extraMentors.length;
          return (
            <div onClick={() => openOverlay("addmentor")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, padding: "10px 0", border: "1.5px dashed #CFCDC7", borderRadius: 12, cursor: "pointer", color: C.purple, fontWeight: 600, fontSize: 13 }}>
              <Plus size={14} /> Add a mentor · {open} seat{open === 1 ? "" : "s"} open
            </div>
          );
        })()}
      </Card>
    </div>
  </div>
);

