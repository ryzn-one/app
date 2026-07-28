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
import { useIsDesktop } from "./useIsDesktop.js";
import {
  BADGE_DEFS, GENERAL_INFLUENCERS, INFLUENCERS_BY_CATEGORY, MENTEE_SCRIPT, MENTOR_SCRIPT,
  MENTOR_MATCHES, MENTEE_MATCHES, EXTRA_MENTEES, MENTEE_POOL, RETURNING_MENTEES, STATUS,
  EXERCISES_RETURNING, EXERCISES_FRESH, COHORT_BOARD_STATIC, SCHOOL_BOARD, MENTOR_BOARD_TOP,
  EVENT, FEED_SEED
} from "./data.js";

/* ————————————————— APP: MENTOR ————————————————— */

export const MentorDash = ({ u, openOverlay, addsLeft }) => {
  const isDesktop = useIsDesktop();
  return (
  <div style={{ padding: "18px 20px 20px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <Label>Q3 2026 · Cohort 7</Label>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, marginTop: 4 }}>Jordan.</div>
      </div>
      <button onClick={() => openOverlay("notifs")} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 10, cursor: "pointer" }}><Bell size={18} color={C.ink} /></button>
    </div>
    <Card onClick={() => openOverlay("board")} style={{ marginTop: 16, background: C.ink, border: "none", color: C.white }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Label color="#9C93E8">Impact Score</Label>
          <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: -2, color: "#B7AFF2", lineHeight: 1.05, marginTop: 4 }}>{u.impact}</div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: "#8B8985", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            {u.fresh ? `▲ ${u.impact} THIS QUARTER · RANK #${u.mentorRank} OF 214` : "▲ 63 THIS QUARTER · RANK #12 OF 214"}
            <ChevronRight size={11} color="#8B8985" />
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, background: C.purple, display: "flex", alignItems: "center", justifyContent: "center" }}><Crown size={28} color={C.white} /></div>
          <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 1, marginTop: 6, color: "#B7AFF2" }}>{u.tier.toUpperCase()}</div>
        </div>
      </div>
      {u.fresh && <div style={{ marginTop: 12 }}><Bar pct={u.impact / 400} color={C.purple} h={5} /><div style={{ fontFamily: F.mono, fontSize: 9, color: "#8B8985", marginTop: 5 }}>{u.impact}/400 → PATHFINDER</div></div>}
    </Card>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "18px 2px 10px" }}>
      <Label>Your cohort · {u.cohort.length} mentee{u.cohort.length === 1 ? "" : "s"}</Label>
      <div style={{ display: "flex", gap: 10 }}>
        {Object.values(STATUS).map(s => <span key={s.label} style={{ fontFamily: F.mono, fontSize: 8.5, color: s.c, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 7, height: 7, background: s.c, display: "inline-block" }} />{s.label.toUpperCase()}</span>)}
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(auto-fill, minmax(200px,1fr))" : "1fr 1fr", gap: 10 }}>
      {u.cohort.map(m => {
        const st = STATUS[m.status];
        return (
          <Card key={m.name} onClick={() => openOverlay({ mentee: m })} style={{ padding: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Monogram name={m.name} size={38} bg={st.bg} color={st.c} />
              <span style={{ width: 9, height: 9, background: st.c }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 9 }}>{m.name}</div>
            <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.gray, marginTop: 3 }}>WK {m.week} · <Flame size={9} style={{ display: "inline", verticalAlign: -1 }} color={m.streak ? C.coral : "#B9B7B1"} /> {m.streak}</div>
          </Card>
        );
      })}
      {addsLeft > 0 && (
        <Card onClick={() => openOverlay("addmentee")} style={{ padding: 13, border: "1.5px dashed #CFCDC7", background: "#EFEEEA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 110 }}>
          <div style={{ width: 32, height: 32, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={16} color={C.purple} /></div>
          <div style={{ fontSize: 12.5, color: C.ink, marginTop: 8, textAlign: "center", fontWeight: 700 }}>Add mentees</div>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.gray, marginTop: 3, letterSpacing: 0.5 }}>{addsLeft}/3 ADDS LEFT · +30 IMPACT EACH</div>
        </Card>
      )}
    </div>
  </div>
  );
};

export const MenteeDetailScreen = ({ u, mentee, back, openDm }) => {
  const [noteMode, setNoteMode] = useState("text");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const st = STATUS[mentee.status];
  const goal = MENTEE_POOL.find(m => m.name === mentee.name)?.goal;
  return (
    <div>
      <HeaderRow title={mentee.name} onBack={back}
        right={<span style={{ fontFamily: F.mono, fontSize: 9.5, background: st.bg, color: st.c, padding: "5px 9px" }}>{st.label.toUpperCase()}</span>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[[`Wk ${mentee.week}`, "program"], [`${mentee.streak}`, "streak"], [u.fresh ? "1" : mentee.name === "Alex Reyes" ? "3" : "2", "badges"]].map(([n, l]) => (
            <Card key={l} style={{ padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{n}</div>
              <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.gray, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>{l}</div>
            </Card>
          ))}
        </div>
        <Card style={mentee.stage1 ? { background: C.tealTint, border: "none" } : { border: "1.5px dashed #CFCDC7", background: "#EFEEEA" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: mentee.stage1 ? C.teal : "#E2E1DC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {mentee.stage1 ? <MessageCircle size={15} color={C.white} /> : <Lock size={15} color={C.gray} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: mentee.stage1 ? C.teal : C.ink }}>{mentee.stage1 ? "Direct line open" : "Chat unlocks at their Stage 1"}</div>
              <div style={{ fontSize: 12, color: mentee.stage1 ? C.teal : C.gray, marginTop: 2, opacity: mentee.stage1 ? 0.85 : 1, lineHeight: 1.4 }}>{mentee.stage1 ? `${mentee.name.split(" ")[0]} earned Direct Connect — message any time.` : "They earn it by finishing their first exercise. You’ll get a nudge the moment it opens."}</div>
            </div>
            {mentee.stage1 && <Btn small style={{ background: C.teal }} onClick={() => openDm(mentee)}><MessageCircle size={13} /> Message</Btn>}
          </div>
        </Card>
        <Card>
          <Label>Exercise completion · {u.fresh ? "week 1" : "last 6 weeks"}</Label>
          <div style={{ marginTop: 12 }}><Heatmap weeks={u.fresh ? 1 : 6} /></div>
        </Card>
        <Card>
          <Label>Milestone timeline</Label>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {BADGE_DEFS.map((b, i) => {
              const hit = i < (u.fresh ? 1 : mentee.name === "Alex Reyes" ? 3 : Math.max(1, Math.floor(mentee.week / 2)));
              return <div key={b.id} title={b.name} style={{ flex: 1, height: 26, background: hit ? TIER_COLOR[b.tier] : "#E6E5E1", display: "flex", alignItems: "center", justifyContent: "center" }}>{hit && <Check size={12} color={C.white} strokeWidth={3} />}</div>;
            })}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gray, marginTop: 8 }}>{u.fresh ? "NEXT: FIRST SESSION · WEEK 1" : "NEXT: MIDWAY · 2 OF 3 MILESTONE EXERCISES DONE"}</div>
        </Card>
        <Card>
          <Label>Recent journal entries</Label>
          {(u.fresh
            ? [["Day 1", goal ? `Goal 1: “${goal}”` : "Set 3 program goals in onboarding."]]
            : [["Jul 14", "Mapped 11 second-degree contacts. Two of them work in product. Didn’t expect that."], ["Jul 11", "Rewrote my headline four times. The specific version feels riskier but truer."]]
          ).map(([d, t]) => (
            <div key={d} style={{ borderLeft: `2px solid ${C.purple}`, paddingLeft: 12, marginTop: 12 }}>
              <div style={{ fontFamily: F.mono, fontSize: 9.5, color: "#A5A39D" }}>{d.toUpperCase()}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 3 }}>{t}</div>
            </div>
          ))}
        </Card>
        <Card>
          <Label>Leave a note</Label>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {[["text", Type, "Text"], ["audio", Mic, "Audio"]].map(([m, Icon, l]) => (
              <button key={m} onClick={() => setNoteMode(m)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${noteMode === m ? C.purple : C.line}`, background: noteMode === m ? C.purpleTint : C.white, color: noteMode === m ? C.purple : C.gray, fontFamily: F.sans, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon size={14} />{l}</button>
            ))}
          </div>
          {noteMode === "text" ? (
            <textarea value={note} onChange={e => { setNote(e.target.value); setSent(false); }} rows={3} placeholder={u.fresh ? "Welcome aboard. Before Monday, think about…" : "Sharp work this week. For Tuesday, bring…"}
              style={{ width: "100%", marginTop: 10, borderRadius: 12, border: `1px solid ${C.line}`, padding: 12, fontFamily: F.sans, fontSize: 14, resize: "none", background: C.surface, boxSizing: "border-box", outline: "none" }} />
          ) : (
            <div style={{ marginTop: 10, borderRadius: 12, border: `1px dashed ${C.line}`, padding: 18, textAlign: "center", background: C.surface }}>
              <Mic size={20} color={C.purple} /><div style={{ fontSize: 12, color: C.gray, marginTop: 5 }}>Hold to record · 2 minutes max</div>
            </div>
          )}
          <Btn style={{ marginTop: 10 }} onClick={() => setSent(true)}>{sent ? <><Check size={16} /> Sent to {mentee.name.split(" ")[0]}</> : "Send note"}</Btn>
        </Card>
      </div>
    </div>
  );
};

export const MentorSessions = ({ u, toast }) => {
  const [done, setDone] = useState({});
  const [assigned, setAssigned] = useState({});
  const [noted, setNoted] = useState({});
  const sessions = u.fresh
    ? u.cohort.map((m, i) => ({ id: i + 1, mentee: m.name, date: ["Mon Jul 20 · 5:00 PM", "Tue Jul 21 · 6:00 PM", "Wed Jul 22 · 5:30 PM", "Thu Jul 23 · 7:00 PM"][i] || "Fri Jul 24 · 5:00 PM", week: 1, agenda: ["Intro: goals walkthrough (they wrote 3)", "Set the weekly cadence and channel", "Assign the Week 1 exercise track"] }))
    : [
      { id: 1, mentee: "Alex Reyes", date: "Tue Jul 21 · 5:00 PM", week: 6, agenda: ["Review Midway milestone work", "Week 6 focus: positioning your story", "Set two intro targets for Week 7"] },
      { id: 2, mentee: "Mia Tran", date: "Wed Jul 22 · 6:30 PM", week: 6, agenda: ["Re-engage: 5-day streak recovery", "Week 6 focus: positioning your story", "Agree a lighter cadence for exam weeks"] },
      { id: 3, mentee: "Leo Kim", date: "Thu Jul 23 · 7:00 PM", week: 2, agenda: ["Week 2 check-in: goals review", "First exercise track walkthrough", "Book Week 3 session"] },
    ];
  return (
    <div>
      <HeaderRow title="Sessions" right={<Label>WEEK OF JUL 20</Label>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {sessions.map(s => (
          <Card key={s.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Monogram name={s.mentee} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.mentee}</div>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: C.purple, marginTop: 2 }}>{s.date.toUpperCase()} · WEEK {s.week}</div>
              </div>
              <Calendar size={16} color={C.gray} />
            </div>
            <div style={{ marginTop: 12, background: C.surface, borderRadius: 12, padding: 12 }}>
              <Label>Agenda · auto-built from Week {s.week}</Label>
              {s.agenda.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 13, lineHeight: 1.45 }}>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.purple, marginTop: 2 }}>{String(i + 1).padStart(2, "0")}</span>{a}
                </div>
              ))}
            </div>
            {!done[s.id] ? (
              <Btn kind="dark" style={{ marginTop: 12 }} onClick={() => { setDone(d => ({ ...d, [s.id]: true })); toast("+15 Impact · session logged"); }}><Check size={16} /> Mark session complete</Btn>
            ) : (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Btn small kind={assigned[s.id] ? "primary" : "soft"} style={{ flex: 1 }} onClick={() => { setAssigned(a => ({ ...a, [s.id]: true })); toast(`Bonus exercise assigned to ${s.mentee.split(" ")[0]}`); }}>{assigned[s.id] ? <><Check size={14} /> Assigned</> : <><Plus size={14} /> Bonus exercise</>}</Btn>
                <Btn small kind="ghost" style={{ flex: 1 }} onClick={() => { setNoted(n => ({ ...n, [s.id]: true })); toast(`Note sent to ${s.mentee.split(" ")[0]}`); }}>{noted[s.id] ? <><Check size={14} /> Note sent</> : <><MessageCircle size={14} /> Leave a note</>}</Btn>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export const MentorBoard = ({ u, back }) => {
  const rows = u.fresh
    ? [...MENTOR_BOARD_TOP, { rank: 12, name: "Jordan Reeve", tier: "Pathfinder", score: 847 }, { gap: true }, { rank: u.mentorRank, name: "Jordan Clarke", tier: "Scout", score: u.impact, me: true }, { rank: u.mentorRank + 1, name: "Grace Liu", tier: "Scout", score: Math.max(40, u.impact - 60) }]
    : [...MENTOR_BOARD_TOP, { rank: 12, name: "Jordan Clarke", tier: "Pathfinder", score: 847, me: true }, { rank: 13, name: "Omar Farah", tier: "Pathfinder", score: 811 }, { rank: 14, name: "Grace Liu", tier: "Scout", score: 763 }];
  return (
    <div>
      <HeaderRow title="Mentor leaderboard" onBack={back} right={<Label>Q3 2026</Label>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}` }}><Label>Quarterly ranking · by Impact Score</Label></div>
          {rows.map((r, i) => r.gap ? (
            <div key={`gap-${i}`} style={{ textAlign: "center", fontFamily: F.mono, fontSize: 11, color: "#A5A39D", padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>· · ·</div>
          ) : (
            <div key={r.rank} style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: r.me ? C.purple : "transparent", color: r.me ? C.white : C.ink, borderBottom: `1px solid ${r.me ? C.purple : C.line}` }}>
              <span style={{ fontFamily: F.mono, fontSize: 12, width: 32, opacity: r.me ? 0.85 : 0.5 }}>{String(r.rank).padStart(2, "0")}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: r.me ? 700 : 500, fontSize: 14 }}>{r.name}{r.me && " · you"}</div>
                <div style={{ fontFamily: F.mono, fontSize: 9, opacity: r.me ? 0.8 : 0.55, marginTop: 1 }}>{r.tier.toUpperCase()}</div>
              </div>
              <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700 }}>{r.score.toLocaleString()}</span>
            </div>
          ))}
        </Card>
        <Card>
          <Label>Your quarter breakdown</Label>
          {(u.fresh
            ? [["Mentees active", `${u.cohort.length} of ${u.cohort.length}`, C.teal], ["Milestones unlocked by cohort", `${u.cohort.length}`, C.purple], ["Graduation rate", "First cohort in progress", C.amber]]
            : [["Mentees active", "5 of 6", C.teal], ["Milestones unlocked by cohort", "14", C.purple], ["Graduation rate (all-time)", "92%", C.amber]]
          ).map(([l, v, c]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <span style={{ fontSize: 13.5 }}>{l}</span>
              <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: c, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </Card>
        <Card style={{ background: C.purpleTint, border: "none" }}>
          <div style={{ fontSize: 13.5, color: C.deep, lineHeight: 1.5 }}>
            {u.fresh
              ? <><b>Pathfinder is the next tier.</b> Reach 400 Impact — sessions, milestones, and graduations all count.</>
              : <><b>Architect is in reach.</b> Two more cohort graduations and one co-designed track qualify you for review.</>}
          </div>
        </Card>
      </div>
    </div>
  );
};

export const MentorProfile = ({ u, openOverlay, toast, feed, go, greetingUp }) => {
  const [view, setView] = useState(u.fresh ? "studio" : "preview");
  const checklist = [
    ["Greeting video for new mentees", greetingUp, "+15 Impact"],
    ["Why-I-mentor statement", true, "done in setup"],
    ["First feed post", feed.length >= 1, "+10 Impact"],
    ["3+ pieces of content", feed.length >= 3, "3× more requests"],
  ];
  const strength = checklist.reduce((a, [, ok]) => a + (ok ? 25 : 0), 0);
  return (
    <div>
      <HeaderRow title="Your profile" right={
        <button onClick={() => openOverlay("settings")} style={{ background: "none", border: "none", cursor: "pointer" }}><Settings size={20} color={C.ink} /></button>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", background: "#EFEEEA", borderRadius: 12, padding: 4 }}>
          {[["studio", "Profile strength"], ["preview", "Public view"]].map(([id, l]) => (
            <button key={id} onClick={() => setView(id)} style={{ flex: 1, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontFamily: F.sans, fontWeight: 600, fontSize: 13, background: view === id ? C.white : "transparent", color: view === id ? C.ink : C.gray }}>{l}</button>
          ))}
        </div>

        {view === "preview" ? (<>
          <Card style={{ background: C.ink, border: "none", color: C.white, textAlign: "center", padding: 24 }}>
            <Monogram name="Jordan Clarke" size={68} bg={C.purple} color={C.white} radius={0} />
            <div style={{ fontSize: 21, fontWeight: 700, marginTop: 12 }}>Jordan Clarke</div>
            <div style={{ fontSize: 13, color: "#B5B3AE", marginTop: 2 }}>VP of Product · Harbourline · Technology</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.purple, padding: "6px 12px", marginTop: 12, fontFamily: F.mono, fontSize: 10, letterSpacing: 1 }}><Crown size={12} /> {u.tier.toUpperCase()} MENTOR</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 18 }}>
              {[[u.impact, "IMPACT SCORE"], [u.fresh ? 0 : 11, "GRADUATED"], [u.fresh ? 1 : 4, "COHORTS"]].map(([n, l]) => (
                <div key={l}><div style={{ fontSize: 26, fontWeight: 700, color: "#B7AFF2" }}>{n}</div><div style={{ fontFamily: F.mono, fontSize: 8.5, color: "#8B8985", letterSpacing: 1 }}>{l}</div></div>
              ))}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "#8B8985", marginTop: 16, letterSpacing: 0.6 }}>{greetingUp ? "GREETING VIDEO · LIVE" : "NO GREETING YET"} · {feed.length} FEED POST{feed.length === 1 ? "" : "S"}</div>
          </Card>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="primary" style={{ flex: 1 }} onClick={() => toast("Link copied · ryzn.one/m/jclarke")}><ExternalLink size={15} /> Share link</Btn>
            <Btn kind="ghost" style={{ flex: 1 }} onClick={() => toast("Opening LinkedIn embed…")}><Linkedin size={15} /> Embed</Btn>
          </div>
          <Card>
            <Label>Verification</Label>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 10 }}>
              <QR seed="jordan-clarke-847" size={84} />
              <div style={{ fontFamily: F.mono, fontSize: 11, color: C.gray, lineHeight: 1.7 }}>MENTOR ID<br /><span style={{ color: C.ink, fontWeight: 700 }}>RYZ-M-2026-0087</span><br />ryzn.one/m/jclarke</div>
            </div>
          </Card>
        </>) : (<>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label>Profile strength</Label>
              <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: strength === 100 ? C.teal : C.purple }}>{strength}%</span>
            </div>
            <div style={{ marginTop: 8 }}><Bar pct={strength / 100} color={strength === 100 ? C.teal : C.purple} /></div>
            {checklist.map(([l, ok, hint]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 11 }}>
                <div style={{ width: 20, height: 20, background: ok ? C.tealTint : "#EFEEEA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {ok ? <Check size={12} color={C.teal} strokeWidth={3} /> : <div style={{ width: 6, height: 6, background: "#C9C6C0" }} />}
                </div>
                <span style={{ flex: 1, fontSize: 13.5, color: ok ? C.ink : C.gray }}>{l}</span>
                <span style={{ fontFamily: F.mono, fontSize: 8.5, color: ok ? C.teal : "#A5A39D", letterSpacing: 0.5 }}>{ok ? "DONE" : hint.toUpperCase()}</span>
              </div>
            ))}
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 12 }}>STRONG PROFILES GET 3× MORE MENTEE REQUESTS</div>
          </Card>

          <Card style={{ border: `1.5px solid ${feed.length ? C.teal : C.purple}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label color={feed.length ? C.teal : C.purple}>Your feed · {feed.length} live</Label>
              <Label color={C.teal}>+10 IMPACT EACH</Label>
            </div>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 8, lineHeight: 1.5 }}>
              {greetingUp
                ? "Everything you post lands in every mentee’s Orbit — no meeting required. Status, photo, video or resource."
                : "Start with a greeting video, then post status, photos, videos and resources. It all lands in your mentees’ Orbit."}
            </div>
            <Btn style={{ marginTop: 12 }} onClick={() => go("feed")}><Upload size={15} /> {feed.length ? "Open your feed" : "Post your first update"}</Btn>
          </Card>
        </>)}
      </div>
    </div>
  );
};

