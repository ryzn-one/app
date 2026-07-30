import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search, Pin, Trash2, Building2
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Monogram, Field, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots, ProgramTimeline, labelOf } from "./ui.jsx";
import { useIsDesktop } from "./useIsDesktop.js";
import { BADGE_DEFS, STATUS } from "./data.js";
import { KIND_META, ContentTabs, ContentTabBar, relTime } from "./feed.jsx";
import { TagRow } from "./chatmatch.jsx";
import { fetchMenteeExercises, fetchProgram, setPhaseComplete } from "./lib/auth-client.js";

/* Suggested starter phases — one tap seeds a course so mentors aren't staring
   at a blank timeline wondering what "phase" means. */
const STARTER_PHASES = [
  { title: "Kickoff & goals", duration: "Week 1", description: "Align on career goals, set a weekly cadence, and share your first intro." },
  { title: "Skill building", duration: "Weeks 2–6", description: "Work through targeted exercises and feedback loops on the skills that matter most." },
  { title: "Network & practice", duration: "Weeks 7–10", description: "Intros, mock interviews, and real-world practice with your mentor in the loop." },
  { title: "Graduation", duration: "Weeks 11–12", description: "Ship a final artifact, reflect on wins, and lock next steps after the program." },
];

/**
 * Full-screen course designer. Studio only shows a door into this — the phases
 * live here so "design your course" feels like opening a workspace, not editing
 * a card buried under profile strength.
 */
export const CourseDesigner = ({ phases = [], onSaveProgram, back }) => {
  const list = phases || [];
  const savePhase = (phase) => {
    const exists = phase.id && list.some((p) => p.id === phase.id);
    const next = exists ? list.map((p) => (p.id === phase.id ? { ...p, ...phase } : p)) : [...list, phase];
    onSaveProgram(next);
  };
  const deletePhase = (id) => onSaveProgram(list.filter((p) => p.id !== id));
  const movePhase = (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[index], next[j]] = [next[j], next[index]];
    onSaveProgram(next);
  };
  const seedStarter = () => {
    if (list.length > 0 && !window.confirm("Replace your current phases with the starter course?")) return;
    onSaveProgram(STARTER_PHASES.map((p) => ({ ...p, id: null, reward: null })));
  };

  return (
    <div>
      <HeaderRow title="Design your course" onBack={back} />
      <div style={{ padding: "0 20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Card className="fade-up" style={{ background: C.ink, border: "none", color: C.white, padding: 22 }}>
          <Label color="#9C93E8">Your mentorship course</Label>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 6, lineHeight: 1.25 }}>
            Kickoff to graduation, in phases.
          </div>
          <div style={{ fontSize: 13, color: "#B5B3AE", marginTop: 8, lineHeight: 1.55 }}>
            Build the roadmap mentees follow. Each phase can unlock a certificate or reward when they finish it.
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#B7AFF2", lineHeight: 1 }}>{list.length}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: "#8B8985", letterSpacing: 0.8, marginTop: 4 }}>PHASES</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#B7AFF2", lineHeight: 1 }}>{list.filter((p) => p.reward).length}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: "#8B8985", letterSpacing: 0.8, marginTop: 4 }}>REWARDS</div>
            </div>
          </div>
        </Card>

        {list.length === 0 && (
          <Card className="fade-up" style={{ border: `1.5px dashed ${C.purple}`, background: C.purpleTint }}>
            <Label color={C.purple}>Start here</Label>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>Add your first phase</div>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 6, lineHeight: 1.5 }}>
              Or drop in a 4-phase starter (kickoff → skills → network → graduation) and edit from there.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <Btn small style={{ width: "auto" }} onClick={seedStarter}><Sparkles size={14} /> Use starter course</Btn>
            </div>
          </Card>
        )}

        <Card className="fade-up" data-tour="mentor-course-phases">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <Label>Phases</Label>
            {list.length > 0 && <Label color={C.teal}>{list.length} STEP{list.length === 1 ? "" : "S"}</Label>}
          </div>
          <div style={{ fontSize: 12.5, color: C.gray, marginBottom: 14, lineHeight: 1.5 }}>
            Order matters — mentees see this as their roadmap. Drag isn’t here yet; use the arrows to reorder.
          </div>
          <ProgramTimeline
            phases={list}
            editable
            autoOpenNew={list.length === 0}
            emptyText="No phases yet. Tap Add phase below, or use the starter course above."
            onSave={savePhase}
            onDelete={deletePhase}
            onMove={movePhase}
          />
        </Card>
      </div>
    </div>
  );
};

/* ————————————————— APP: MENTOR ————————————————— */

export const MentorDash = ({ u, name, openOverlay, addsLeft, org }) => {
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
    {/* Same door as the desktop sidebar — mobile has no sidebar, so Teams has
        to live on Cohort or it stays buried in Settings. */}
    <Card onClick={() => { window.location.hash = "#/teams"; }} style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Building2 size={16} color={C.purple} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {org?.name || "Ryzn for Teams"}
          </div>
          <div style={{ fontSize: 11.5, color: C.gray, marginTop: 2 }}>
            {org ? "Roster, invites, and Orbit" : "Create an organisation for your company"}
          </div>
        </div>
        <ExternalLink size={15} color={C.gray} />
      </div>
    </Card>
    <Card data-tour="mentor-home-impact" onClick={() => openOverlay("board")} style={{ marginTop: 16, background: C.ink, border: "none", color: C.white }}>
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
          <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 1, marginTop: 6, color: "#B7AFF2" }}>{(u.tier || "Scout").toUpperCase()}</div>
        </div>
      </div>
      {u.fresh && <div style={{ marginTop: 12 }}><Bar pct={u.impact / 400} color={C.purple} h={5} /><div style={{ fontFamily: F.mono, fontSize: 9, color: "#8B8985", marginTop: 5 }}>{u.impact}/400 → PATHFINDER</div></div>}
    </Card>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "18px 2px 10px" }}>
      <Label>Your cohort · {(u.cohort || []).length} mentee{(u.cohort || []).length === 1 ? "" : "s"}</Label>
      <div style={{ display: "flex", gap: 10 }}>
        {Object.values(STATUS).map(s => <span key={s.label} style={{ fontFamily: F.mono, fontSize: 8.5, color: s.c, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 7, height: 7, background: s.c, display: "inline-block" }} />{s.label.toUpperCase()}</span>)}
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(auto-fill, minmax(200px,1fr))" : "1fr 1fr", gap: 10 }}>
      {(u.cohort || []).map(m => {
        const st = STATUS[m.status] || STATUS.active;
        return (
          <Card key={m.id || m.name} onClick={() => openOverlay({ mentee: m })} style={{ padding: 13 }}>
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
    {/* The directory, as distinct from the add deck: search everyone who's
        onboarded, including the mentees already in your cohort. */}
    <Card onClick={() => openOverlay("explore")} style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Search size={16} color={C.purple} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Explore mentees</div>
          <div style={{ fontSize: 11.5, color: C.gray, marginTop: 2 }}>Search by name, track, or goal</div>
        </div>
        <ChevronRight size={16} color={C.gray} />
      </div>
    </Card>
    {!(u.cohort || []).length && (
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
  const st = STATUS[mentee.status] || STATUS.active;
  const goals = Array.isArray(mentee.goals) ? mentee.goals : [];
  const skills = Array.isArray(mentee.skills) ? mentee.skills : [];
  const interests = Array.isArray(mentee.interests) ? mentee.interests : [];
  const track = labelOf(mentee.track);
  const [exercises, setExercises] = useState([]);
  const [exLoading, setExLoading] = useState(true);
  const [phases, setPhases] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);

  useEffect(() => {
    if (!mentee.id) { setExLoading(false); return; }
    let cancelled = false;
    (async () => {
      setExLoading(true);
      try {
        const { exercises: rows } = await fetchMenteeExercises(mentee.id);
        if (!cancelled) setExercises(rows || []);
      } catch {
        if (!cancelled) setExercises([]);
      } finally {
        if (!cancelled) setExLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mentee.id]);

  /* This mentor's own phases, plus this specific mentee's progress against
     them — fetched here rather than lifted to root state, same as the
     exercise journal above. */
  useEffect(() => {
    if (!mentee.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { phases: rows, completedPhaseIds } = await fetchProgram({ menteeId: mentee.id });
        if (!cancelled) { setPhases(rows || []); setCompletedIds(completedPhaseIds || []); }
      } catch {
        if (!cancelled) { setPhases([]); setCompletedIds([]); }
      }
    })();
    return () => { cancelled = true; };
  }, [mentee.id]);

  const togglePhase = async (phase, completed) => {
    const prev = completedIds;
    setCompletedIds(completed ? [...prev, phase.id] : prev.filter((id) => id !== phase.id));
    try {
      const { completedPhaseIds } = await setPhaseComplete({ menteeId: mentee.id, phaseId: phase.id, completed });
      setCompletedIds(completedPhaseIds || []);
    } catch {
      setCompletedIds(prev);
    }
  };

  return (
    <div>
      <HeaderRow title={mentee.name} onBack={back}
        right={<span style={{ fontFamily: F.mono, fontSize: 9.5, background: st.bg, color: st.c, padding: "5px 9px" }}>{st.label.toUpperCase()}</span>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Card style={{ background: C.deep, border: "none", color: C.white, padding: 20 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Monogram name={mentee.name} size={58} bg={C.purple} color={C.white} radius={0} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 19, fontWeight: 700 }}>{mentee.name}</div>
              {track && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.14)", padding: "4px 9px", marginTop: 7, fontFamily: F.mono, fontSize: 9, letterSpacing: 1 }}>
                  <School size={11} /> {track.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </Card>
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
        {phases.length > 0 && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label>Your program</Label>
              <Label color={C.teal}>{completedIds.length} OF {phases.length} DONE</Label>
            </div>
            <div style={{ marginTop: 12 }}>
              <ProgramTimeline phases={phases} completedIds={completedIds} onToggle={togglePhase} />
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D" }}>TAP A STEP TO MARK IT DONE FOR {mentee.name.split(" ")[0].toUpperCase()}</div>
          </Card>
        )}
        <Card>
          <Label color={C.purple}>Their program goals</Label>
          {goals.length > 0 ? goals.map((g, i) => (
            <div key={`${i}-${g}`} style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "flex-start" }}>
              <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.purple, marginTop: 1 }}>0{i + 1}</span>
              <div style={{ fontSize: 13, lineHeight: 1.45, fontStyle: "italic" }}>“{g}”</div>
            </div>
          )) : (
            <div style={{ fontSize: 13, color: C.gray, marginTop: 10, lineHeight: 1.5 }}>Nothing written yet.</div>
          )}
        </Card>
        {skills.length > 0 && (
          <Card>
            <Label color={C.teal}>Skills they claim today</Label>
            <div style={{ marginTop: 10 }}><TagRow items={skills} bg={C.tealTint} color={C.teal} border={false} /></div>
          </Card>
        )}
        {interests.length > 0 && (
          <Card>
            <Label color={C.amber}>What pulls at them</Label>
            <div style={{ marginTop: 10 }}><TagRow items={interests} /></div>
          </Card>
        )}
        {Array.isArray(mentee.influences) && mentee.influences.length > 0 && (
          <Card>
            <Label>Who they follow</Label>
            <div style={{ marginTop: 10 }}><TagRow items={mentee.influences} /></div>
          </Card>
        )}
        {mentee.education && (
          <Card>
            <Label>Education</Label>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>{mentee.education}</div>
          </Card>
        )}
        {mentee.experience && (
          <Card>
            <Label>Experience & projects</Label>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>{mentee.experience}</div>
          </Card>
        )}
        <Card>
          <Label>Exercise journal</Label>
          {exLoading && <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gray, marginTop: 12, letterSpacing: 0.6 }}>LOADING…</div>}
          {!exLoading && exercises.length === 0 && (
            <div style={{ fontSize: 13, color: C.gray, marginTop: 10, lineHeight: 1.5 }}>
              Nothing submitted yet. Their first exercise lands here the moment they write it.
            </div>
          )}
          {exercises.map((ex) => (
            <div key={ex.id} style={{ borderLeft: `2px solid ${C.purple}`, paddingLeft: 12, marginTop: 14 }}>
              <div style={{ fontFamily: F.mono, fontSize: 9.5, color: "#A5A39D" }}>
                {(ex.title || "Exercise").toUpperCase()}
                {ex.dayKey ? ` · ${ex.dayKey}` : ""}
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 3, fontStyle: "italic" }}>“{ex.text}”</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

/* Sessions moved to sessions.jsx and became real: /api/sessions holds one
   document per booking, both sides read it, and a date only appears once the
   other side has picked one of the proposed times. What used to be here derived
   a card per mentee, printed "NOT YET BOOKED" under every one, and told mentors
   to agree a time in their thread because nothing could be booked at all. */

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
          ["Mentees in your cohort", `${(u.cohort || []).length}`, C.teal],
          ["Cohort capacity", `${u.capacity ?? "—"}`, C.purple],
          ["Graduations", (u.cohort || []).length ? "First cohort in progress" : "None yet", C.amber],
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

/**
 * The mentor's own profile: Studio (manage) and Public view (what a mentee
 * sees).
 *
 * The toggle used to read "Profile strength | Public view" and defaulted a
 * returning mentor straight to the preview — which is how "where is the content
 * studio?" happened. The word came back, the pane became a real management
 * surface, and the composer deliberately stayed in the Feed tab: Feed is where
 * you write, Studio is where you curate. Two composers is the confusion that
 * started this.
 */
export const MentorProfile = ({ u, name, openOverlay, feed = [], go, greetingUp, onPin, onDelete, program, onUpdateProfile }) => {
  // Always lands on Studio: this is your own profile, so the thing you act on
  // comes first and the preview is one tap away.
  const [view, setView] = useState("studio");
  const [contentTab, setContentTab] = useState("feed");
  const [editMode, setEditMode] = useState(null);
  const [editValues, setEditValues] = useState({});
  const posts = Array.isArray(feed) ? feed : [];
  const cohort = u?.cohort || [];
  const phases = program?.phases || [];
  const checklist = [
    ["Greeting video for new mentees", greetingUp, "+25 Impact", () => go("feed")],
    ["Why-I-mentor statement", !!u?.why, "done in setup", null],
    ["First feed post", posts.length >= 1, "+10 Impact", () => go("feed")],
    ["3+ pieces of content", posts.length >= 3, "3× more requests", () => go("feed")],
  ];
  const strength = checklist.reduce((a, [, ok]) => a + (ok ? 25 : 0), 0);
  const resourceCount = posts.filter(p => p.kind === "video" || p.kind === "resource").length;

  const startEdit = (field) => {
    setEditMode(field);
    setEditValues({ [field]: u?.[field] || "" });
  };

  const cancelEdit = () => {
    setEditMode(null);
    setEditValues({});
  };
  return (
    <div>
      <HeaderRow title="Your profile" right={
        <button data-tour="mentor-profile-settings" onClick={() => openOverlay("settings")} style={{ background: "none", border: "none", cursor: "pointer" }}><Settings size={20} color={C.ink} /></button>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", background: "#EFEEEA", borderRadius: 12, padding: 4 }}>
          {[["studio", "Studio"], ["preview", "Public view"]].map(([id, l]) => (
            <button key={id} onClick={() => setView(id)} style={{ flex: 1, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontFamily: F.sans, fontWeight: 600, fontSize: 13, background: view === id ? C.white : "transparent", color: view === id ? C.ink : C.gray }}>{l}</button>
          ))}
        </div>

        {view === "preview" ? (<>
          <Card style={{ background: C.ink, border: "none", color: C.white, textAlign: "center", padding: 24 }}>
            <Monogram name={name || "—"} size={68} bg={C.purple} color={C.white} radius={0} />
            <div style={{ fontSize: 21, fontWeight: 700, marginTop: 12 }}>{name || "Your profile"}</div>
            {(u?.headline || u?.industry) && (
              <div style={{ fontSize: 13, color: "#B5B3AE", marginTop: 2 }}>{[u.headline, u.industry].filter(Boolean).join(" · ")}</div>
            )}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.purple, padding: "6px 12px", marginTop: 12, fontFamily: F.mono, fontSize: 10, letterSpacing: 1 }}><Crown size={12} /> {(u?.tier || "Scout").toUpperCase()} MENTOR</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 18 }}>
              {[[u?.impact ?? 0, "IMPACT SCORE"], [cohort.length, "MENTEES"], [u?.capacity ?? "—", "CAPACITY"]].map(([n, l]) => (
                <div key={l}><div style={{ fontSize: 26, fontWeight: 700, color: "#B7AFF2" }}>{n}</div><div style={{ fontFamily: F.mono, fontSize: 8.5, color: "#8B8985", letterSpacing: 1 }}>{l}</div></div>
              ))}
            </div>
          </Card>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", letterSpacing: 0.5, textAlign: "center" }}>
            EXACTLY WHAT A MENTEE IN YOUR COHORT SEES
          </div>
          {u?.why && (
            <Card>
              <Label>Why you mentor</Label>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>{u.why}</div>
            </Card>
          )}
          {u?.expertise?.length > 0 && (
            <Card>
              <Label>What you can teach</Label>
              <div style={{ marginTop: 10 }}><TagRow items={u.expertise} /></div>
            </Card>
          )}
          {u?.menteeFit?.length > 0 && (
            <Card>
              <Label>Who you want to work with</Label>
              <div style={{ marginTop: 10 }}><TagRow items={u.menteeFit} /></div>
            </Card>
          )}
          {u?.education && (
            <Card>
              <Label>Education</Label>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>{u.education}</div>
            </Card>
          )}
          {u?.experience && (
            <Card>
              <Label>Current role</Label>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>{u.experience}</div>
            </Card>
          )}
          {phases.length > 0 && (
            <Card>
              <Label>The program</Label>
              <div style={{ marginTop: 12 }}><ProgramTimeline phases={phases} /></div>
            </Card>
          )}
          <ContentTabBar view={contentTab} setView={setContentTab} count={resourceCount} />
          <ContentTabs feed={posts} authorName={name} view={contentTab} readOnly
            emptyText="Nothing on your profile yet. What you post in Feed shows up here." />
        </>) : (<>
          <Card data-tour="mentor-profile-studio">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label>Profile strength</Label>
              <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: strength === 100 ? C.teal : C.purple }}>{strength}%</span>
            </div>
            <div style={{ marginTop: 8 }}><Bar pct={strength / 100} color={strength === 100 ? C.teal : C.purple} /></div>
            {checklist.map(([l, ok, hint, jump]) => (
              <div key={l} onClick={!ok && jump ? jump : undefined}
                style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 11, cursor: !ok && jump ? "pointer" : "default" }}>
                <div style={{ width: 20, height: 20, background: ok ? C.tealTint : "#EFEEEA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {ok ? <Check size={12} color={C.teal} strokeWidth={3} /> : <div style={{ width: 6, height: 6, background: "#C9C6C0" }} />}
                </div>
                <span style={{ flex: 1, fontSize: 13.5, color: ok ? C.ink : C.gray }}>{l}</span>
                <span style={{ fontFamily: F.mono, fontSize: 8.5, color: ok ? C.teal : "#A5A39D", letterSpacing: 0.5 }}>{ok ? "DONE" : hint.toUpperCase()}</span>
                {!ok && jump && <ChevronRight size={14} color="#C9C6C0" />}
              </div>
            ))}
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 12 }}>STRONG PROFILES GET 3× MORE MENTEE REQUESTS</div>
          </Card>

          {/* Door into the course designer — not an inline editor. Mentors open
              a dedicated workspace to author phases, then come back here. */}
          <Card data-tour="mentor-profile-program" onClick={() => openOverlay("course")}
            style={{ border: `1.5px solid ${C.teal}`, cursor: "pointer", padding: 18, background: C.tealTint }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <LayoutGrid size={20} color={C.white} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Label color={C.teal}>Course design</Label>
                <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4, letterSpacing: -0.2, color: C.teal }}>
                  {phases.length ? `${phases.length} phase${phases.length === 1 ? "" : "s"} · edit course` : "Design your course"}
                </div>
              </div>
              <ChevronRight size={18} color={C.teal} style={{ marginTop: 10, flexShrink: 0 }} />
            </div>
            {phases.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                <ProgramTimeline phases={phases.slice(0, 3)} />
                {phases.length > 3 && (
                  <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 4 }}>+{phases.length - 3} MORE · OPEN TO EDIT</div>
                )}
              </div>
            )}
          </Card>

          <Card>
            <Label>Background</Label>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 8, lineHeight: 1.5 }}>Add your education, current role, or other details to complete your profile.</div>

            {editMode === "education" ? (
              <div style={{ marginTop: 12 }}>
                <textarea value={editValues.education || ""} onChange={e => setEditValues({ ...editValues, education: e.target.value })} placeholder="e.g., Stanford University, Computer Science (2015)"
                  style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.line}`, padding: 12, fontFamily: F.sans, fontSize: 14, resize: "none", background: C.surface, outline: "none", boxSizing: "border-box", minHeight: 60 }} rows={2} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Btn small kind="ghost" style={{ flex: 1, borderColor: C.line, color: C.gray }} onClick={cancelEdit}>Cancel</Btn>
                  <Btn small style={{ flex: 1 }} onClick={() => { if (onUpdateProfile) onUpdateProfile("education", editValues.education); setEditMode(null); }}>Save</Btn>
                </div>
              </div>
            ) : (
              <div onClick={() => startEdit("education")} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 12, cursor: "pointer", padding: 10, borderRadius: 10, background: C.surface }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gray, letterSpacing: 0.5 }}>EDUCATION</div>
                  <div style={{ fontSize: 13.5, marginTop: 4, color: u?.education ? C.ink : C.gray, fontStyle: u?.education ? "normal" : "italic" }}>{u?.education || "Add your education"}</div>
                </div>
                <ChevronRight size={16} color={C.gray} style={{ marginTop: 2 }} />
              </div>
            )}

            {editMode === "experience" ? (
              <div style={{ marginTop: 12 }}>
                <textarea value={editValues.experience || ""} onChange={e => setEditValues({ ...editValues, experience: e.target.value })} placeholder="e.g., Senior Product Manager at Meta (2019–present)"
                  style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.line}`, padding: 12, fontFamily: F.sans, fontSize: 14, resize: "none", background: C.surface, outline: "none", boxSizing: "border-box", minHeight: 60 }} rows={2} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Btn small kind="ghost" style={{ flex: 1, borderColor: C.line, color: C.gray }} onClick={cancelEdit}>Cancel</Btn>
                  <Btn small style={{ flex: 1 }} onClick={() => { if (onUpdateProfile) onUpdateProfile("experience", editValues.experience); setEditMode(null); }}>Save</Btn>
                </div>
              </div>
            ) : (
              <div onClick={() => startEdit("experience")} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 10, cursor: "pointer", padding: 10, borderRadius: 10, background: C.surface }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gray, letterSpacing: 0.5 }}>CURRENT ROLE</div>
                  <div style={{ fontSize: 13.5, marginTop: 4, color: u?.experience ? C.ink : C.gray, fontStyle: u?.experience ? "normal" : "italic" }}>{u?.experience || "Add your current role"}</div>
                </div>
                <ChevronRight size={16} color={C.gray} style={{ marginTop: 2 }} />
              </div>
            )}
          </Card>

          <Card style={{ border: `1.5px solid ${posts.length ? C.teal : C.purple}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label color={posts.length ? C.teal : C.purple}>Your content · {posts.length}</Label>
              <Label color={C.teal}>+10 IMPACT EACH</Label>
            </div>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 8, lineHeight: 1.5 }}>
              {greetingUp
                ? "Everything here lands in every mentee’s Orbit — no meeting required. Pin what they should see first."
                : "Start with a greeting video, then post status, photos, videos and resources. It all lands in your mentees’ Orbit."}
            </div>
            <Btn style={{ marginTop: 12 }} onClick={() => go("feed")}><Upload size={15} /> {posts.length ? "Post something new" : "Post your first update"}</Btn>
          </Card>

          {posts.map(p => {
            const m = KIND_META[p.kind] || KIND_META.status, Icon = m.icon;
            return (
              <Card key={p.id} style={{ padding: 13 }}>
                <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <div style={{ width: 34, height: 34, background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={15} color={m.c} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: p.title ? 700 : 400, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title || p.text}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 8.5, color: "#A5A39D", marginTop: 4, letterSpacing: 0.5 }}>
                      {relTime(p.createdAt).toUpperCase()} · {p.views} VIEWS · {p.reactions} REACTIONS{p.greeting ? " · GREETING" : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Btn small kind={p.pinned ? "primary" : "ghost"} style={{ flex: 1, ...(p.pinned ? null : { borderColor: C.line, color: C.gray }) }}
                    onClick={() => onPin(p.id, !p.pinned)}><Pin size={13} /> {p.pinned ? "Pinned" : "Pin"}</Btn>
                  <Btn small kind="ghost" style={{ flex: 1, borderColor: C.coralTint, color: C.coral }}
                    onClick={() => { if (window.confirm("Delete this post? Your mentees will stop seeing it.")) onDelete(p.id); }}>
                    <Trash2 size={13} /> Delete
                  </Btn>
                </div>
              </Card>
            );
          })}
        </>)}
      </div>
    </div>
  );
};

