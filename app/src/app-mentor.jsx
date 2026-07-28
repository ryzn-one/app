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
import { BADGE_DEFS, STATUS } from "./data.js";

/* ————————————————— APP: MENTOR ————————————————— */

export const MentorDash = ({ u, name, openOverlay, addsLeft }) => {
  const isDesktop = useIsDesktop();
  const firstName = (name || "").split(" ")[0];
  return (
  <div style={{ padding: "18px 20px 20px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <Label>Founding cohort</Label>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, marginTop: 4 }}>{firstName ? `${firstName}.` : "Welcome."}</div>
      </div>
      <button onClick={() => openOverlay("notifs")} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 10, cursor: "pointer" }}><Bell size={18} color={C.ink} /></button>
    </div>
    <Card onClick={() => openOverlay("board")} style={{ marginTop: 16, background: C.ink, border: "none", color: C.white }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Label color="#9C93E8">Impact Score</Label>
          <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: -2, color: "#B7AFF2", lineHeight: 1.05, marginTop: 4 }}>{u.impact}</div>
          {/* Was "RANK #12 OF 214" against a 214-mentor platform that does not
              exist. Rank renders only once the server has one. */}
          <div style={{ fontFamily: F.mono, fontSize: 10, color: "#8B8985", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            {u.mentorRank ? `RANK #${u.mentorRank}` : "RANKING OPENS THIS QUARTER"}
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
    {u.cohort.length === 0 && (
      <Card style={{ marginTop: 10 }}>
        <div style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.55 }}>
          Your cohort is empty. Mentee applications are still open — you’ll be notified when someone matches your profile. Building out your feed in the meantime is what makes mentees pick you.
        </div>
      </Card>
    )}
  </div>
  );
};

export const MenteeDetailScreen = ({ u, mentee, back, openDm }) => {
  const [noteMode, setNoteMode] = useState("text");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const st = STATUS[mentee.status];
  const goal = mentee.goals?.[0] ?? null;
  return (
    <div>
      <HeaderRow title={mentee.name} onBack={back}
        right={<span style={{ fontFamily: F.mono, fontSize: 9.5, background: st.bg, color: st.c, padding: "5px 9px" }}>{st.label.toUpperCase()}</span>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[[`Wk ${mentee.week}`, "program"], [`${mentee.streak}`, "streak"], [`${mentee.badges ?? 0}`, "badges"]].map(([n, l]) => (
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
        {/* Milestone timeline reads the mentee's real badge count. The old
            version hard-coded three earned badges for one named person and
            derived the rest from week number, so a mentor was shown progress
            their mentee had not made. */}
        <Card>
          <Label>Milestone timeline</Label>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {BADGE_DEFS.map((b, i) => {
              const hit = i < (mentee.badges ?? 0);
              return <div key={b.id} title={b.name} style={{ flex: 1, height: 26, background: hit ? TIER_COLOR[b.tier] : "#E6E5E1", display: "flex", alignItems: "center", justifyContent: "center" }}>{hit && <Check size={12} color={C.white} strokeWidth={3} />}</div>;
            })}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gray, marginTop: 8 }}>{(mentee.badges ?? 0) === 0 ? "NO MILESTONES YET" : `${mentee.badges} OF ${BADGE_DEFS.length} EARNED`}</div>
        </Card>
        {/* Journal entries are the mentee's own writing. Nothing is shown until
            they've written something — the two invented reflections that used
            to sit here were attributed to a real person in the mentor's UI. */}
        <Card>
          <Label>Their goals</Label>
          {goal ? (
            <div style={{ borderLeft: `2px solid ${C.purple}`, paddingLeft: 12, marginTop: 12 }}>
              <div style={{ fontFamily: F.mono, fontSize: 9.5, color: "#A5A39D" }}>GOAL 1</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 3, fontStyle: "italic" }}>“{goal}”</div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: C.gray, marginTop: 10, lineHeight: 1.5 }}>Nothing written yet. Their first exercise lands here.</div>
          )}
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

/* Sessions are derived from the real cohort, one opening session per mentee.
   Scheduling doesn't exist yet, so no date is claimed — the old version printed
   fixed calendar slots ("Tue Jul 21 · 5:00 PM") for meetings nobody had booked,
   including for two mentees who weren't real. */
export const MentorSessions = ({ u, toast }) => {
  const [done, setDone] = useState({});
  const [assigned, setAssigned] = useState({});
  const [noted, setNoted] = useState({});
  const sessions = u.cohort.map((m, i) => ({
    id: m.id || i + 1,
    mentee: m.name,
    week: m.week || 1,
    agenda: ["Intro: walk through their goals", "Set the weekly cadence and channel", "Assign the Week 1 exercise track"],
  }));
  if (sessions.length === 0) return (
    <div>
      <HeaderRow title="Sessions" />
      <div style={{ padding: "0 20px 20px" }}>
        <Card style={{ border: "1.5px dashed #CFCDC7", background: "#EFEEEA" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, background: "#E2E1DC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Calendar size={18} color={C.gray} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>No sessions yet</div>
              <div style={{ fontSize: 12.5, color: C.gray, marginTop: 3, lineHeight: 1.45 }}>An opening session appears here for each mentee who joins your cohort.</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
  return (
    <div>
      <HeaderRow title="Sessions" right={<Label>{sessions.length} SCHEDULED</Label>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {sessions.map(s => (
          <Card key={s.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Monogram name={s.mentee} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.mentee}</div>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: C.purple, marginTop: 2 }}>OPENING SESSION · WEEK {s.week} · NOT YET BOOKED</div>
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

/* The quarterly board. Every competitor row was invented — named mentors with
   Impact scores in the 800–1200 range, which also set the implied bar for a
   real mentor's own number. There is no cross-mentor ranking service yet, so
   this shows the caller's own quarter and says plainly that the board is not
   open. */
export const MentorBoard = ({ u, back }) => (
  <div>
    <HeaderRow title="Impact" onBack={back} right={<Label>THIS QUARTER</Label>} />
    <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ background: C.ink, border: "none", color: C.white, padding: 20 }}>
        <Label color="#9C93E8">Your Impact Score</Label>
        <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: -1.8, color: "#B7AFF2", marginTop: 6 }}>{u.impact}</div>
        <div style={{ fontFamily: F.mono, fontSize: 10, color: "#8B8985", marginTop: 4 }}>{(u.tier || "Scout").toUpperCase()} · {u.mentorRank ? `RANK #${u.mentorRank}` : "UNRANKED"}</div>
        <div style={{ marginTop: 14 }}><Bar pct={Math.min(1, u.impact / 400)} color={C.purple} h={5} /></div>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: "#8B8985", marginTop: 5 }}>{u.impact}/400 → PATHFINDER</div>
      </Card>
      <Card>
        <Label>Your quarter breakdown</Label>
        {[
          ["Mentees in your cohort", `${u.cohort.length}`, C.teal],
          ["Cohort capacity", `${u.capacity ?? "—"}`, C.purple],
          ["Graduations", u.cohort.length ? "First cohort in progress" : "None yet", C.amber],
        ].map(([l, v, c]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <span style={{ fontSize: 13.5 }}>{l}</span>
            <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: c, textAlign: "right" }}>{v}</span>
          </div>
        ))}
      </Card>
      <Card style={{ border: "1.5px dashed #CFCDC7", background: "#EFEEEA" }}>
        <div style={{ fontSize: 13, color: C.gray, lineHeight: 1.55 }}>
          The quarterly leaderboard opens once the founding roster is complete. Until then your Impact Score stands on its own — sessions, milestones and graduations all count toward it.
        </div>
      </Card>
    </div>
  </div>
);

export const MentorProfile = ({ u, name, openOverlay, toast, feed, go, greetingUp }) => {
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
            <Monogram name={name || "—"} size={68} bg={C.purple} color={C.white} radius={0} />
            <div style={{ fontSize: 21, fontWeight: 700, marginTop: 12 }}>{name || "Your profile"}</div>
            {(u.headline || u.industry) && (
              <div style={{ fontSize: 13, color: "#B5B3AE", marginTop: 2 }}>{[u.headline, u.industry].filter(Boolean).join(" · ")}</div>
            )}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.purple, padding: "6px 12px", marginTop: 12, fontFamily: F.mono, fontSize: 10, letterSpacing: 1 }}><Crown size={12} /> {(u.tier || "Scout").toUpperCase()} MENTOR</div>
            {/* "GRADUATED 11 · COHORTS 4" rendered for a mentor on day one.
                These come off the real cohort now. */}
            <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 18 }}>
              {[[u.impact, "IMPACT SCORE"], [u.cohort.length, "MENTEES"], [u.capacity ?? "—", "CAPACITY"]].map(([n, l]) => (
                <div key={l}><div style={{ fontSize: 26, fontWeight: 700, color: "#B7AFF2" }}>{n}</div><div style={{ fontFamily: F.mono, fontSize: 8.5, color: "#8B8985", letterSpacing: 1 }}>{l}</div></div>
              ))}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "#8B8985", marginTop: 16, letterSpacing: 0.6 }}>{greetingUp ? "GREETING VIDEO · LIVE" : "NO GREETING YET"} · {feed.length} FEED POST{feed.length === 1 ? "" : "S"}</div>
          </Card>
          {u.why && (
            <Card>
              <Label>Why you mentor</Label>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>{u.why}</div>
            </Card>
          )}
          {/* Public mentor pages and verification QRs aren't built. The card
              that was here printed a fixed ID (RYZ-M-2026-0087) and a
              ryzn.one/m/jclarke URL that resolves to nothing. */}
          <Btn kind="ghost" onClick={() => toast("Public mentor pages open when the founding roster is complete.")}><ExternalLink size={15} /> Share link</Btn>
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

