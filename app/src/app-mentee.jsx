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

/* ————————————————— APP: MENTEE ————————————————— */

export const MenteeHome = ({ u, badges, go, openOverlay, todayDone, stage1, mentorSeats, toast, feed = [], watched = {} }) => {
  const nextBadge = badges.find(b => !b.earned);
  const nextIdx = badges.indexOf(nextBadge);
  const todayEx = (u.fresh ? EXERCISES_FRESH : EXERCISES_RETURNING)[0];
  const msgUnlocked = stage1;
  const latest = feed.find(p => !p.pinned);
  const unread = feed.filter(p => (p.kind === "video" || p.kind === "resource") && !watched[p.id]).length;
  return (
    <div style={{ padding: "18px 20px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <Label>Cohort 7 · Spring ’26</Label>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.8, marginTop: 4 }}>Alex.</div>
          <div style={{ color: C.gray, fontSize: 14, marginTop: 2 }}>{u.fresh ? "Day 1. It starts now." : "Week 6 of the Program. Keep moving."}</div>
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
          <div style={{ fontFamily: F.mono, fontSize: 11, color: C.gray, marginTop: 8 }}>{u.xp.toLocaleString()} XP · #{u.rank} in cohort</div>
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

      <Card onClick={() => openOverlay("orbit")} style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Monogram name={u.mentorName} size={48} bg={C.purple} color={C.white} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{u.mentorName}</div>
            <div style={{ fontSize: 12, color: C.gray }}>{u.mentorTitle}</div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.purple, marginTop: 3 }}>{u.fresh ? "FIRST SESSION · MON 5:00 PM · CONFIRMED" : "NEXT SESSION · TUE JUL 21 · 5:00 PM"}</div>
          </div>
          {msgUnlocked
            ? <Btn small kind="soft" onClick={(e) => { e.stopPropagation(); openOverlay("dm"); }}><MessageCircle size={14} /> Message</Btn>
            : <span style={{ fontFamily: F.mono, fontSize: 9, background: "#EFEEEA", color: C.gray, padding: "7px 10px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 5 }}><Lock size={10} /> STAGE 1</span>}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 10 }}>{msgUnlocked ? "DIRECT CONNECT EARNED · TAP FOR THEIR ORBIT" : "ORBIT IS OPEN NOW · FINISH STAGE 1 TO EARN DIRECT CONNECT"}</div>
      </Card>

      {latest && (
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
            <div style={{ fontWeight: 700, fontSize: 14, color: C.deep }}>Cohort 7 standings</div>
            <div style={{ fontSize: 12, color: C.deep, opacity: 0.7 }}>{u.fresh ? "You’re #18 of 24. Everyone starts here." : "You’re #4. R-0472 is 250 XP ahead."}</div>
          </div>
          <ChevronRight size={18} color={C.deep} />
        </div>
      </Card>
    </div>
  );
};

export const MenteeExercises = ({ u, todayDone, onSubmit, pickedUp, onPickup }) => {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("text");
  const list = u.fresh ? EXERCISES_FRESH : EXERCISES_RETURNING;
  return (
    <div>
      <HeaderRow title="Exercises" right={<Label>{u.fresh ? "WEEK 1" : "WEEK 6"}</Label>} />
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
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {[["text", Type, "Write"], ["voice", Mic, "Speak"]].map(([m, Icon, l]) => (
                  <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${mode === m ? C.purple : C.line}`, background: mode === m ? C.purpleTint : C.white, color: mode === m ? C.purple : C.gray, fontFamily: F.sans, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon size={14} />{l}</button>
                ))}
              </div>
              {mode === "text" ? (
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder={u.fresh ? "I’m here because…" : "Hi — I’m Alex, a second-year at TMU…"} rows={4}
                  style={{ width: "100%", marginTop: 10, borderRadius: 12, border: `1px solid ${C.line}`, padding: 12, fontFamily: F.sans, fontSize: 14, resize: "none", background: C.surface, boxSizing: "border-box", outline: "none" }} />
              ) : (
                <div style={{ marginTop: 10, borderRadius: 12, border: `1px dashed ${C.line}`, padding: 20, textAlign: "center", background: C.surface }}>
                  <Mic size={22} color={C.purple} />
                  <div style={{ fontSize: 12, color: C.gray, marginTop: 6 }}>Hold to record · 90 seconds max</div>
                </div>
              )}
              <Btn style={{ marginTop: 12 }} onClick={onSubmit}>Submit · +{ex.xp} XP</Btn>
            </Card>
          );
          const done = ex.state === "done" || (ex.state === "open" && todayDone) || (ex.state === "missed" && pickedUp);
          const missed = ex.state === "missed" && !pickedUp;
          const upcoming = ex.state === "upcoming";
          return (
            <Card key={i} style={{ opacity: missed || upcoming ? 0.85 : 1, background: missed || upcoming ? "#EFEEEA" : C.white }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: done ? C.tealTint : "#E2E1DC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {done ? <Check size={17} color={C.teal} strokeWidth={3} /> : upcoming ? <Lock size={14} color="#A5A39D" /> : <Zap size={15} color="#A5A39D" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.mono, fontSize: 9.5, color: "#A5A39D" }}>{ex.day.toUpperCase()}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{ex.title}</div>
                  {missed && <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>Missed days happen. Pick up here anytime.</div>}
                  {upcoming && <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>Unlocks at 7 AM. One a day keeps the streak alive.</div>}
                </div>
                {done ? <span style={{ fontFamily: F.mono, fontSize: 11, color: C.teal, fontWeight: 700 }}>+{ex.xp} XP</span>
                  : missed ? <Btn small kind="ghost" style={{ borderColor: C.line, color: C.gray }} onClick={onPickup}>Pick up</Btn>
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

export const CohortScreen = ({ u, back }) => {
  const rows = [...COHORT_BOARD_STATIC, { rank: u.rank, handle: "You · Alex R.", xp: u.xp, me: true }].sort((a, b) => a.rank - b.rank);
  return (
    <div>
      <HeaderRow title="Cohort 7" onBack={back} right={<Label>SPRING ’26</Label>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[["11.4", "avg streak"], ["96", "badges earned"], ["70", "days to Meets"]].map(([n, l]) => (
            <Card key={l} style={{ padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{n}</div>
              <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.gray, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>{l}</div>
            </Card>
          ))}
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}` }}><Label>Anonymised leaderboard · by XP</Label></div>
          {rows.map(r => (
            <div key={r.rank + r.handle} style={{ display: "flex", alignItems: "center", padding: "11px 16px", background: r.me ? C.purple : "transparent", color: r.me ? C.white : C.ink, borderBottom: `1px solid ${r.me ? C.purple : C.line}` }}>
              <span style={{ fontFamily: F.mono, fontSize: 12, width: 30, opacity: r.me ? 0.85 : 0.5 }}>{String(r.rank).padStart(2, "0")}</span>
              <span style={{ flex: 1, fontWeight: r.me ? 700 : 500, fontSize: 14 }}>{r.handle}</span>
              <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700 }}>{r.xp.toLocaleString()}</span>
            </div>
          ))}
          {u.fresh && <div style={{ padding: "10px 16px", fontFamily: F.mono, fontSize: 9.5, color: C.gray }}>FULL BOARD VISIBLE AT MIDWAY (WEEK 6) · KEEP CLIMBING</div>}
        </Card>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 8 }}>
            <School size={14} color={C.amber} /><Label color={C.amber}>School vs school · badges this cohort</Label>
          </div>
          {SCHOOL_BOARD.map(r => (
            <div key={r.rank} style={{ display: "flex", alignItems: "center", padding: "11px 16px", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontFamily: F.mono, fontSize: 12, width: 30, opacity: 0.5 }}>{String(r.rank).padStart(2, "0")}</span>
              <span style={{ flex: 1, fontWeight: r.me ? 700 : 500, fontSize: 14, color: r.me ? C.purple : C.ink }}>{r.school}{r.me && " · yours"}</span>
              <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700 }}>{r.badges}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

export const DMScreen = ({ name, sub, back, seed, reply, placeholder }) => {
  const [msgs, setMsgs] = useState(seed);
  const [text, setText] = useState("");
  const [replied, setReplied] = useState(false);
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);
  const send = () => {
    const t = text.trim(); if (!t) return;
    setMsgs(m => [...m, { who: "me", text: t }]); setText("");
    if (!replied && reply) { setReplied(true); setTimeout(() => setMsgs(m => [...m, { who: "them", text: reply }]), 1400); }
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

export const MenteeProfile = ({ u, badges, openBadge, openOverlay, extraMentors, onPromote, onDrop }) => (
  <div>
    <HeaderRow title="Profile" right={
      <button onClick={() => openOverlay("settings")} style={{ background: "none", border: "none", cursor: "pointer" }}><Settings size={20} color={C.ink} /></button>} />
    <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Monogram name="Alex Reyes" size={62} bg={C.ink} color={C.white} radius={16} />
        <div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>Alex Reyes</div>
          <div style={{ fontSize: 12.5, color: C.gray }}>Toronto Metropolitan University</div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.purple, marginTop: 3 }}>TRACK · UNIVERSITY · WEEK {u.week}</div>
        </div>
      </Card>
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
          <Label color={1 + extraMentors.length >= 3 ? C.teal : C.purple}>{1 + extraMentors.length}/3 SEATS</Label>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 8.5, color: "#A5A39D", marginTop: 6, letterSpacing: 0.5 }}>ONE ACTIVE ENGAGEMENT AT A TIME — KEEPS IT AUTHENTIC. SUPPORTS STAY IN YOUR CORNER.</div>
        <div onClick={() => openOverlay("orbit")} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, cursor: "pointer" }}>
          <Monogram name={u.mentorName} size={40} bg={C.purple} color={C.white} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{u.mentorName}</div>
            <div style={{ fontSize: 11.5, color: C.gray }}>{u.mentorTitle}</div>
          </div>
          <span style={{ fontFamily: F.mono, fontSize: 8.5, background: C.tealTint, color: C.teal, fontWeight: 700, padding: "5px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}><Crown size={10} /> ACTIVE</span>
        </div>
        {extraMentors.map(name => {
          const m = MENTOR_MATCHES.find(x => x.name === name) || {};
          return (
            <div key={name} style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Monogram name={name} size={40} bg={C.purpleTint} color={C.deep} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
                  <div style={{ fontSize: 11.5, color: C.gray }}>{m.title} · {m.company}</div>
                </div>
                <span style={{ fontFamily: F.mono, fontSize: 8.5, background: C.surface, color: C.gray, padding: "5px 8px" }}>SUPPORT</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, marginLeft: 52 }}>
                <button onClick={() => onPromote(name)} style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 11.5, cursor: "pointer", padding: "6px 11px", borderRadius: 10, border: `1.5px solid ${C.purple}`, background: C.purpleTint, color: C.purple }}>Make active</button>
                <button onClick={() => onDrop(name)} style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 11.5, cursor: "pointer", padding: "6px 11px", borderRadius: 10, border: `1.5px solid ${C.coral}`, background: C.white, color: C.coral }}>Drop</button>
              </div>
            </div>
          );
        })}
        {1 + extraMentors.length < 3 && (
          <div onClick={() => openOverlay("addmentor")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, padding: "10px 0", border: "1.5px dashed #CFCDC7", borderRadius: 12, cursor: "pointer", color: C.purple, fontWeight: 600, fontSize: 13 }}>
            <Plus size={14} /> Add a mentor · {3 - 1 - extraMentors.length} seat{3 - 1 - extraMentors.length === 1 ? "" : "s"} open
          </div>
        )}
      </Card>
    </div>
  </div>
);

