import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search, Pin, Trash2, Building2, Repeat2
} from "lucide-react";
import { C, F, S, SP, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Chip, Seg, Monogram, Avatar, Field, XPPill, Ring, Bar, Sparkline, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots, ProgramTimeline, ModalShell, ModalActions, labelOf } from "./ui.jsx";
import { ProfileHeader, EditableRow } from "./app-shared.jsx";
import { useIsDesktop } from "./useIsDesktop.js";
import { BADGE_DEFS, STATUS } from "./data.js";
import { KIND_META, ContentTabs, ContentTabBar, PostCard, GreetingCard, relTime } from "./feed.jsx";
import { PostOverflow } from "./studio.jsx";
import { MyShelf, MentorShelf } from "./resources.jsx";
import { TagRow } from "./chatmatch.jsx";
import { fetchMenteeExercises, fetchProgram, setPhaseComplete, fetchImpactHistory, draftPhaseWithAI, draftCourseWithAI } from "./lib/auth-client.js";

/* Suggested starter phases, one tap seeds a course so mentors aren't staring
   at a blank timeline wondering what "phase" means. */
const STARTER_PHASES = [
  { title: "Kickoff & goals", duration: "Week 1", description: "Align on career goals, set a weekly cadence, and share your first intro." },
  { title: "Skill building", duration: "Weeks 2–6", description: "Work through targeted exercises and feedback loops on the skills that matter most." },
  { title: "Network & practice", duration: "Weeks 7–10", description: "Intros, mock interviews, and real-world practice with your mentor in the loop." },
  { title: "Graduation", duration: "Weeks 11–12", description: "Ship a final artifact, reflect on wins, and lock next steps after the program." },
];

/**
 * The confirm step for a whole AI-drafted course.
 *
 * A drafted course is never added on arrival. It lands here first: every phase
 * shown, each one keepable or droppable, and one explicit press to commit the
 * ones that survive. Editing happens afterwards through the normal pencil, so
 * this stays a yes/no screen rather than four forms stacked in a modal.
 */
const CourseDraftReview = ({ phases, keep, onToggle, onConfirm, onRetry, onClose, busy }) => {
  const kept = phases.filter((_, i) => keep[i]).length;
  return (
    <ModalShell onClose={onClose}>
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ fontFamily: F.sans, fontSize: 18, fontWeight: 700 }}>Review your draft course</div>
        <div style={{ fontSize: 12.5, color: C.gray, lineHeight: 1.5, marginTop: 6 }}>
          Nothing is saved yet. Untick anything you don't want, then add the rest — you can edit every phase afterwards.
        </div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {phases.map((p, i) => (
            <div key={i} onClick={() => onToggle(i)} style={{
              display: "flex", gap: 11, padding: 12, borderRadius: 14, cursor: "pointer",
              background: keep[i] ? C.white : "transparent",
              border: `1px solid ${keep[i] ? C.line : "transparent"}`,
              opacity: keep[i] ? 1 : 0.45,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                background: keep[i] ? C.teal : "#E6E5E1",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {keep[i] && <Check size={12} color={C.white} strokeWidth={3} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>{p.title}</div>
                {p.duration && <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", letterSpacing: 0.5, marginTop: 3 }}>{p.duration.toUpperCase()}</div>}
                {p.description && <div style={{ fontSize: 12.5, color: C.gray, lineHeight: 1.5, marginTop: 6 }}>{p.description}</div>}
                {p.reward && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.purpleTint, color: C.purple, padding: "5px 9px", borderRadius: 10, marginTop: 8 }}>
                    <Award size={11} /><span style={{ fontFamily: F.sans, fontSize: 11.5, fontWeight: 700 }}>{p.reward.label}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <ModalActions>
          <Btn kind="ghost" style={{ flex: 1 }} disabled={busy} onClick={onRetry}>
            <Sparkles size={14} /> {busy ? "Drafting…" : "Draft again"}
          </Btn>
          <Btn style={{ flex: 1 }} disabled={!kept || busy} onClick={onConfirm}>
            Add {kept} phase{kept === 1 ? "" : "s"}
          </Btn>
        </ModalActions>
      </div>
    </ModalShell>
  );
};

/**
 * Full-screen course designer. Studio only shows a door into this, the phases
 * live here so "design your course" feels like opening a workspace, not editing
 * a card buried under profile strength.
 */
export const CourseDesigner = ({ phases = [], onSaveProgram, back }) => {
  const list = phases || [];
  /* Course-level drafting. The single-phase equivalent lives in the phase form
     itself (see ProgramTimeline's onDraft), because that is where a mentor is
     already standing when they want a phase written for them. */
  const [draft, setDraft] = useState(null);      // { phases, keep: boolean[] }
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState("");

  const runCourseDraft = async () => {
    if (drafting) return;
    setDrafting(true);
    setDraftError("");
    try {
      const { phases: drafted } = await draftCourseWithAI();
      setDraft({ phases: drafted, keep: drafted.map(() => true) });
    } catch (err) {
      setDraftError(err?.message || "Couldn't draft a course just then. Try again.");
    } finally {
      setDrafting(false);
    }
  };

  /* The only place a drafted course becomes real, and it takes a press to get
     here. Ids are dropped so the server mints them, same as the starter list. */
  const acceptDraft = () => {
    const kept = draft.phases.filter((_, i) => draft.keep[i]).map((p) => ({ ...p, id: null }));
    setDraft(null);
    onSaveProgram([...list, ...kept]);
  };

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
      <div style={{ padding: "0 14px 20px", display: "flex", flexDirection: "column", gap: SP.gap }}>
        <Card className="fade-up" style={{ background: C.ink, border: "none", color: C.white, padding: 22 }}>
          <Label color="#9C93E8">Your mentorship course</Label>
          <div style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 6, lineHeight: 1.25 }}>
            Kickoff to graduation, in phases.
          </div>
          <div style={{ fontSize: 13, color: "#B5B3AE", marginTop: 8, lineHeight: 1.55 }}>
            Each phase can unlock a certificate or reward.
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 16 }}>
            <div>
              <div style={{ fontFamily: F.sans, fontSize: 28, fontWeight: 700, color: "#B7AFF2", lineHeight: 1 }}>{list.length}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: "#8B8985", letterSpacing: 0.8, marginTop: 4 }}>PHASES</div>
            </div>
            <div>
              <div style={{ fontFamily: F.sans, fontSize: 28, fontWeight: 700, color: "#B7AFF2", lineHeight: 1 }}>{list.filter((p) => p.reward).length}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: "#8B8985", letterSpacing: 0.8, marginTop: 4 }}>REWARDS</div>
            </div>
          </div>
        </Card>

        {list.length === 0 && (
          <Card className="fade-up" style={{ border: "1px solid transparent", background: C.purpleTint }}>
            <Label color={C.purple}>Start here</Label>
            <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 15, marginTop: 8 }}>Add your first phase</div>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 6, lineHeight: 1.5 }}>
              Let AI draft one from your profile, or start from a 4-phase starter and edit from there.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <Btn small style={{ width: "auto" }} disabled={drafting} onClick={runCourseDraft}>
                <Sparkles size={14} /> {drafting ? "Drafting…" : "Fill it out with AI"}
              </Btn>
              <Btn kind="ghost" small style={{ width: "auto" }} onClick={seedStarter}>Use starter course</Btn>
            </div>
            {draftError && <div style={{ fontSize: 11.5, color: C.coral, marginTop: 10, lineHeight: 1.4 }}>{draftError}</div>}
          </Card>
        )}

        <Card className="fade-up" data-tour="mentor-course-phases">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <Label>Phases</Label>
            {list.length > 0 && <Label color={C.teal}>{list.length} STEP{list.length === 1 ? "" : "S"}</Label>}
          </div>
          {list.length > 0 && (
            <div style={{ fontSize: 12.5, color: C.gray, marginBottom: 14, lineHeight: 1.5 }}>
              Order matters, use the arrows to reorder.
            </div>
          )}
          <ProgramTimeline
            phases={list}
            editable
            autoOpenNew={list.length === 0}
            emptyText=""
            onSave={savePhase}
            onDelete={deletePhase}
            onMove={movePhase}
            onDraft={(args) => draftPhaseWithAI(args).then((r) => r.phase)}
          />
        </Card>
      </div>
      {draft && (
        <CourseDraftReview
          phases={draft.phases}
          keep={draft.keep}
          busy={drafting}
          onToggle={(i) => setDraft((d) => ({ ...d, keep: d.keep.map((k, j) => (j === i ? !k : k)) }))}
          onConfirm={acceptDraft}
          onRetry={runCourseDraft}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  );
};

/* ----------------- APP: MENTOR ----------------- */

/**
 * Cohort.
 *
 * One search box over two segments: the people you mentor, and the mentors you
 * stand beside. The Roster was a row buried at the bottom of this screen that
 * opened a modal, so the half of the tab that is about your peers was invisible
 * until you scrolled past your own cohort and found a chevron.
 */
export const MentorDash = ({ u, name, openOverlay, addsLeft, org, renderMentors }) => {
  const isDesktop = useIsDesktop();
  const [view, setView] = useState("mentees");
  const [q, setQ] = useState("");
  const firstName = (name || "").split(" ")[0];
  const cohortCount = (u.cohort || []).length;
  const cohort = (u.cohort || []).filter(m =>
    !q || m.name?.toLowerCase().includes(q.toLowerCase()) || (m.headline || "").toLowerCase().includes(q.toLowerCase()));

  /* Trend line for the hero card, real points from the xp_events ledger,
     not a fabricated curve. Fetched here rather than lifted to root state,
     same as the mentee exercise journal and program timeline below. */
  const [impactPoints, setImpactPoints] = useState([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { points } = await fetchImpactHistory();
        if (!cancelled) setImpactPoints((points || []).map((p) => p.cumulative));
      } catch {
        if (!cancelled) setImpactPoints([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
  <div style={{ padding: "14px 14px 14px" }}>
    {/* The bell moved to the top bar, where every tab can reach it. */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "2px 2px 0" }}>
      <div style={{ minWidth: 0 }}>
        <div style={S.mono(7.5, C.mute)}>FOUNDING COHORT · MENTOR</div>
        <div style={S.h(22)}>{firstName ? `${firstName}.` : "Welcome."}</div>
      </div>
      <Btn small kind="tint" style={{ flexShrink: 0 }} onClick={() => { window.location.hash = "#/teams"; }}>
        <Building2 size={13} /> Genie AI
      </Btn>
    </div>

    {/* One box searching both segments, the way the reference does it — you
        look for a person, not for which list they happen to be on. */}
    <div style={{ display: "flex", alignItems: "center", gap: 9, background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, padding: "11px 13px", marginTop: 12 }}>
      <Search size={15} color={C.mute} />
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search mentees, mentors, posts"
        style={{ flex: 1, border: "none", outline: "none", fontFamily: F.sans, fontSize: 13, background: "transparent", minWidth: 0 }} />
      {q && <button onClick={() => setQ("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex" }}><X size={14} color={C.mute} /></button>}
    </div>
    <div style={{ marginTop: 11 }}>
      <Seg small options={[["mentees", "Mentees"], ["mentors", "Mentors"]]} value={view} onChange={setView} />
    </div>

    {view === "mentors" ? (
      <div style={{ marginTop: 11 }}>
        {renderMentors ? renderMentors(q) : (
          <Card onClick={() => openOverlay("network")} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: C.tealTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Repeat2 size={14} color={C.teal} /></div>
            <div style={{ flex: 1, ...S.sb(13) }}>The Roster</div>
            <ChevronRight size={15} color={C.mute} />
          </Card>
        )}
      </div>
    ) : (<>
    <Card data-tour="mentor-home-impact" onClick={() => openOverlay("board")} style={{ marginTop: 11, background: C.ink, border: "none", color: C.white, position: "relative", overflow: "hidden" }}>
      {/* Dynamic impact graph, pinned to the corner, real cumulative Impact
          points from the xp_events ledger, not a decorative fake curve. */}
      <div style={{ position: "absolute", top: 18, right: 18 }}>
        <Sparkline points={impactPoints} color="#B7AFF2" />
      </div>
      <Label color="#9C93E8">Your cohort impact</Label>
      <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 6 }}>
        <div style={{ fontFamily: F.sans, fontSize: 40, fontWeight: 700, letterSpacing: -1.6, color: C.white, lineHeight: 1 }}>{cohortCount}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#B5B3AE" }}>mentee{cohortCount === 1 ? "" : "s"} impacted</div>
      </div>
      {/* One meta line, not three stacked ones. Impact, tier and rank are the
          same fact at three resolutions, so they read as a single run, and
          rank still only renders once the server has one, rather than printing
          "RANKING OPENS THIS QUARTER" as though it were a stat. */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: F.mono, fontSize: 9.5, letterSpacing: 0.5, color: "#8B8985", marginTop: 14 }}>
        <span style={{ color: "#B7AFF2", fontWeight: 700 }}>{u.impact} IMPACT</span>
        <span>· {(u.tier || "Scout").toUpperCase()}</span>
        {u.mentorRank ? <span>· #{u.mentorRank}</span> : null}
        <ChevronRight size={11} color="#8B8985" style={{ marginLeft: -1 }} />
      </div>
    </Card>
    {/* Seats and the joining rule, one line, the way the reference states it. */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "14px 2px 0" }}>
      <div style={S.mono(8, C.gray)}>{cohortCount}/{u.capacity ?? "—"} SEATS</div>
      {cohortCount > 0 && (
        <div style={{ display: "flex", gap: 10 }}>
          {Object.values(STATUS).map(s => (
            <span key={s.label} style={{ fontFamily: F.mono, fontSize: 8, color: s.c, display: "flex", alignItems: "center", gap: 4, letterSpacing: 0.6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: s.c, display: "inline-block" }} />{s.label.toUpperCase()}
            </span>
          ))}
        </div>
      )}
    </div>
    {cohortCount === 0 && (
      <Card style={{ marginTop: 10, background: C.purpleTint, border: "1px solid #DDD9F6" }}>
        <div style={S.sb(13.5, C.deep)}>No mentees yet.</div>
        <div style={{ ...S.b(12.5, C.gray), marginTop: 3 }}>Your feed is what makes a mentee pick you. Post today, get picked this week.</div>
      </Card>
    )}
    {cohortCount > 0 && cohort.length === 0 && (
      <div style={{ ...S.b(12.5, C.gray), textAlign: "center", padding: 14 }}>No one matches your search.</div>
    )}
    <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(auto-fill, minmax(200px,1fr))" : "1fr", gap: 10, marginTop: 10 }}>
      {cohort.map(m => {
        const st = STATUS[m.status] || STATUS.active;
        return (
          <Card key={m.id || m.name} onClick={() => openOverlay({ mentee: m })}>
            <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Avatar src={m.avatarUrl} name={m.name} size={42} />
                <span style={{ position: "absolute", bottom: -2, right: -2, width: 11, height: 11, borderRadius: 6, background: st.c, border: `2px solid ${C.white}` }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.sb(13.5)}>{m.name}</div>
                <div style={S.b(11.5, C.gray)}>
                  Wk {m.week} · <Flame size={9} style={{ verticalAlign: -1 }} color={m.streak ? C.coral : "#B9B7B1"} /> {m.streak}
                </div>
              </div>
              {m.status === "at-risk" && <Chip c={C.amber} bg={C.amberTint}>AT RISK</Chip>}
              <ChevronRight size={15} color={C.mute} />
            </div>
          </Card>
        );
      })}
    </div>
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <Btn kind="ghost" style={{ flex: 1 }} onClick={() => openOverlay("mentees")}><Search size={13} /> Find mentees</Btn>
      {addsLeft > 0 && (
        <Btn kind="ghost" style={{ flex: 1 }} onClick={() => openOverlay("addmentee")}><Plus size={13} /> Add · {addsLeft} left</Btn>
      )}
    </div>
    </>)}
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
     them, fetched here rather than lifted to root state, same as the
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
      <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Card style={{ background: C.deep, border: "none", color: C.white, padding: 20 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Avatar src={mentee.avatarUrl} name={mentee.name} size={58} bg={C.purple} color={C.white} radius={0} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.sans, fontSize: 19, fontWeight: 700 }}>{mentee.name}</div>
              {mentee.headline && <div style={{ fontSize: 12.5, color: "#B5B3AE", marginTop: 2, lineHeight: 1.4 }}>{mentee.headline}</div>}
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
              <div style={{ fontFamily: F.sans, fontSize: 18, fontWeight: 700 }}>{n}</div>
              <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.gray, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>{l}</div>
            </Card>
          ))}
        </div>
        <Card style={mentee.stage1 ? { background: C.tealTint, border: "1px solid transparent" } : { background: C.ghost, border: "1px solid transparent" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <IconTile size={36} radius={10} bg={mentee.stage1 ? C.teal : C.ghostTile}>
              {mentee.stage1 ? <MessageCircle size={15} color={C.white} /> : <Lock size={15} color={C.gray} />}
            </IconTile>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14, color: mentee.stage1 ? C.teal : C.ink }}>{mentee.stage1 ? "Direct line open" : "Chat unlocks at their Stage 1"}</div>
              <div style={{ fontSize: 12, color: mentee.stage1 ? C.teal : C.gray, marginTop: 2, opacity: mentee.stage1 ? 0.85 : 1, lineHeight: 1.4 }}>{mentee.stage1 ? `${mentee.name.split(" ")[0]} earned Direct Connect, message any time.` : "They earn it by finishing their first exercise. You’ll get a nudge the moment it opens."}</div>
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

/* The quarterly board. Every competitor row was invented, named mentors with
   Impact scores in the 800–1200 range, which also set the implied bar for a
   real mentor's own number. There is no cross-mentor ranking service yet, so
   this shows the caller's own quarter and says plainly that the board is not
   open. */
export const MentorBoard = ({ u, back }) => (
  <div>
    <HeaderRow title="Impact" onBack={back} right={<Label>THIS QUARTER</Label>} />
    <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ background: C.ink, border: "none", color: C.white, padding: 20 }}>
        <Label color="#9C93E8">Your Impact Score</Label>
        <div style={{ fontFamily: F.sans, fontSize: 46, fontWeight: 700, letterSpacing: -1.8, color: "#B7AFF2", marginTop: 6 }}>{u.impact}</div>
        <div style={{ fontFamily: F.mono, fontSize: 10, color: "#8B8985", marginTop: 4 }}>{(u.tier || "Scout").toUpperCase()} · {u.mentorRank ? `RANK #${u.mentorRank}` : "UNRANKED"}</div>
        <div style={{ marginTop: 14 }}><Bar pct={Math.min(1, u.impact / 400)} color={C.purple} h={5} /></div>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: "#8B8985", marginTop: 5 }}>{u.impact}/400 → PATHFINDER</div>
      </Card>
      <Card>
        <Label>Your quarter breakdown</Label>
        {[
          ["Mentees in your cohort", `${(u.cohort || []).length}`, C.teal],
          ["Cohort capacity", `${u.capacity ?? "-"}`, C.purple],
          ["Graduations", (u.cohort || []).length ? "First cohort in progress" : "None yet", C.amber],
        ].map(([l, v, c]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <span style={{ fontSize: 13.5 }}>{l}</span>
            <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: c, textAlign: "right" }}>{v}</span>
          </div>
        ))}
      </Card>
      <GhostCard>
        <div style={{ fontSize: 13, color: C.gray, lineHeight: 1.55 }}>
          The quarterly leaderboard opens once the founding roster is complete. Until then your Impact Score stands on its own, sessions, milestones and graduations all count toward it.
        </div>
      </GhostCard>
    </div>
  </div>
);

/**
 * The mentor's own profile: Studio (manage) and Public view (what a mentee
 * sees).
 *
 * The toggle used to read "Profile strength | Public view" and defaulted a
 * returning mentor straight to the preview, which is how "where is the content
 * studio?" happened. The word came back, the pane became a real management
 * surface, and the composer deliberately stayed in the Feed tab: Feed is where
 * you write, Studio is where you curate. Two composers is the confusion that
 * started this.
 */
export const MentorProfile = ({ u, name, userId, openOverlay, feed = [], go, greetingUp, uploadGreeting, onPin, onDelete, program, onUpdateProfile, toast, onVisibility, highlightPostId }) => {
  // Always lands on Studio: this is your own profile, so the thing you act on
  // comes first and the preview is one tap away.
  const [view, setView] = useState("studio");
  const [contentTab, setContentTab] = useState("feed");
  /* Lifted out of MyShelf so the checklist below can count it. The shelf owns
     the rows; this is only how many there are. */
  const [shelfCount, setShelfCount] = useState(0);
  /* The recorder itself, opened from the checklist row that was already the
     thing tracking it. It used to sit as a card in the Feed brief; the row here
     linked across to it, which meant the one item on this list you couldn't act
     on from this list was the one worth the most Impact. */
  const [greetingOpen, setGreetingOpen] = useState(false);
  const posts = Array.isArray(feed) ? feed : [];
  const cohort = u?.cohort || [];
  const phases = program?.phases || [];
  const checklist = [
    ["Greeting video for new mentees", greetingUp, "+25 Impact", uploadGreeting ? () => setGreetingOpen(true) : null],
    ["Why-I-mentor statement", !!u?.why, "done in setup", null],
    ["First feed post", posts.length >= 1, "+10 Impact", () => go("feed")],
    ["3+ pieces of content", posts.length >= 3, "3× more requests", () => go("feed")],
    /* Promoting costs a mentor nothing they haven't already done, they have
       read the thing, which is exactly why it belongs on the list beside items
       that ask them to record a video. */
    ["Something promoted to Ryzn", shelfCount >= 1, "+5 Impact", null],
  ];
  const strength = Math.round((checklist.filter(([, ok]) => ok).length / checklist.length) * 100);
  const resourceCount = posts.filter(p => p.kind === "video" || p.kind === "resource").length;

  return (
    <div>
      <HeaderRow title="Your profile" right={
        <button data-tour="mentor-profile-settings" onClick={() => openOverlay("settings")} style={{ background: "none", border: "none", cursor: "pointer" }}><Settings size={20} color={C.ink} /></button>} />
      <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", background: C.ghost, borderRadius: 12, padding: 4 }}>
          {[["studio", "Studio"], ["preview", "Public view"]].map(([id, l]) => (
            <button key={id} onClick={() => setView(id)} style={{ flex: 1, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontFamily: F.sans, fontWeight: 600, fontSize: 13, background: view === id ? C.white : "transparent", color: view === id ? C.ink : C.gray }}>{l}</button>
          ))}
        </div>

        {view === "preview" ? (<>
          {/* Read-only on purpose: this tab is the mentee's view of the profile,
              so it must not offer edit affordances a mentee wouldn't have. */}
          <ProfileHeader name={name} headline={[u?.headline, u?.industry].filter(Boolean).join(" · ") || null}
            avatarUrl={u?.avatarUrl} bannerUrl={u?.bannerUrl} linkedinUrl={u?.linkedinUrl} align="center" dark>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.purple, padding: "6px 12px", marginTop: 12, fontFamily: F.mono, fontSize: 10, letterSpacing: 1 }}><Crown size={12} /> {(u?.tier || "Scout").toUpperCase()} MENTOR</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 18 }}>
              {[[u?.impact ?? 0, "IMPACT SCORE"], [cohort.length, "MENTEES"], [u?.capacity ?? "-", "CAPACITY"]].map(([n, l]) => (
                <div key={l}><div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 700, color: "#B7AFF2" }}>{n}</div><div style={{ fontFamily: F.mono, fontSize: 8.5, color: "#8B8985", letterSpacing: 1 }}>{l}</div></div>
              ))}
            </div>
          </ProfileHeader>
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
          {/* The shelf, read exactly as a mentee reads it, including the cohort-
              only picks, because that is who this preview is for. Its own section
              above the tabs rather than inside Resources: what you made and what
              you vouch for are different claims, and a mentee scanning a profile
              is looking for the second one. */}
          <MentorShelf mentorId={userId} mentorName={name} toast={toast}
            emptyText="Nothing promoted yet. Anything you promote shows here, above your posts." />
          <ContentTabBar view={contentTab} setView={setContentTab} count={resourceCount} />
          <ContentTabs feed={posts} authorName={name} authorId={u?.id} view={contentTab} readOnly
            emptyText="Nothing on your profile yet. What you post in Feed shows up here." />
        </>) : (<>
          {/* Studio is the editing surface, the pictures are changed here and
              previewed in the other tab, not edited in both places. */}
          <ProfileHeader name={name} headline={[u?.headline, u?.industry].filter(Boolean).join(" · ") || null}
            avatarUrl={u?.avatarUrl} bannerUrl={u?.bannerUrl} linkedinUrl={u?.linkedinUrl}
            userId={userId} editable onSaveImage={onUpdateProfile} />

          <Card data-tour="mentor-profile-studio">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label>Profile strength</Label>
              <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: strength === 100 ? C.teal : C.purple }}>{strength}%</span>
            </div>
            <div style={{ marginTop: 8 }}><Bar pct={strength / 100} color={strength === 100 ? C.teal : C.purple} /></div>
            {checklist.map(([l, ok, hint, jump]) => (
              <div key={l} onClick={!ok && jump ? jump : undefined}
                style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 11, cursor: !ok && jump ? "pointer" : "default" }}>
                <div style={{ width: 20, height: 20, borderRadius: 7, background: ok ? C.tealTint : C.ghost, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {ok ? <Check size={12} color={C.teal} strokeWidth={3} /> : <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9C6C0" }} />}
                </div>
                <span style={{ flex: 1, fontSize: 13.5, color: ok ? C.ink : C.gray }}>{l}</span>
                <span style={{ fontFamily: F.mono, fontSize: 8.5, color: ok ? C.teal : "#A5A39D", letterSpacing: 0.5 }}>{ok ? "DONE" : hint.toUpperCase()}</span>
                {!ok && jump && <ChevronRight size={14} color="#C9C6C0" />}
              </div>
            ))}
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 12 }}>STRONG PROFILES GET 3× MORE MENTEE REQUESTS</div>
          </Card>

          {greetingOpen && (
            <ModalShell onClose={() => setGreetingOpen(false)}>
              <div style={{ padding: "20px 24px 24px" }}>
                <GreetingCard userId={userId}
                  onDone={async (media) => { await uploadGreeting(media); setGreetingOpen(false); }} />
              </div>
            </ModalShell>
          )}

          {/* Door into the course designer, not an inline editor. Mentors open
              a dedicated workspace to author phases, then come back here. */}
          <Card data-tour="mentor-profile-program" onClick={() => openOverlay("course")}
            style={{ border: `1px solid ${C.teal}`, cursor: "pointer", padding: 18, background: C.tealTint }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <LayoutGrid size={20} color={C.white} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Label color={C.teal}>Course design</Label>
                <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 16, marginTop: 4, letterSpacing: -0.2, color: C.teal }}>
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
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 8, lineHeight: 1.5 }}>Your headline is the line every mentee reads under your name, in the match deck, in Explore, and on your profile.</div>
            <EditableRow label="Headline" value={u?.headline} maxLength={220}
              placeholder="e.g., Senior Product Manager at Meta · ex-Stripe · I coach PMs into their first role"
              emptyText="Add a headline" onSave={v => onUpdateProfile("headline", v)} />
            <EditableRow label="Education" value={u?.education} maxLength={600}
              placeholder="e.g., Stanford University, Computer Science (2015)"
              emptyText="Add your education" onSave={v => onUpdateProfile("education", v)} />
            <EditableRow label="Current role" value={u?.experience} maxLength={600} rows={3}
              placeholder="e.g., Senior Product Manager at Meta (2019–present)"
              emptyText="Add your current role" onSave={v => onUpdateProfile("experience", v)} />
            {/* Typed in, not imported. LinkedIn's sign-in returns a name, a
                photo and an email and nothing else, so this is the only way the
                link gets here — for a mentor it's the credential a mentee goes
                looking for before they spend a seat on you. */}
            <EditableRow label="LinkedIn" value={u?.linkedinUrl} maxLength={200} rows={1}
              placeholder="linkedin.com/in/your-handle"
              emptyText="Add your LinkedIn" onSave={v => onUpdateProfile("linkedinUrl", v)} />
          </Card>

          <Card style={{ border: `1px solid ${posts.length ? C.teal : C.purple}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label color={posts.length ? C.teal : C.purple}>Your content · {posts.length}</Label>
              <Label color={C.teal}>+10 IMPACT EACH</Label>
            </div>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 8, lineHeight: 1.5 }}>
              {greetingUp
                ? "Everything here lands in every mentee’s Orbit, no meeting required. Pin what they should see first."
                : "Start with a greeting video, then post status, photos, videos and resources. It all lands in your mentees’ Orbit."}
            </div>
            <Btn style={{ marginTop: 12 }} onClick={() => go("feed")}><Upload size={15} /> {posts.length ? "Post something new" : "Post your first update"}</Btn>
          </Card>

          {/* The other half of a profile: what you didn't make but will vouch
              for. Sits directly under "Your content" because the two answer the
              same question a mentee is asking, is this person worth my time -
              and only one of them requires the mentor to produce anything. */}
          <Card style={{ border: `1px solid ${shelfCount ? C.teal : C.hair}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label color={shelfCount ? C.teal : C.purple}>Your shelf · {shelfCount}</Label>
              <Label color={C.teal}>+5 IMPACT EACH</Label>
            </div>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 8, lineHeight: 1.5 }}>
              The TikToks, shorts, books and papers you’d tell a mentee to go and read. The link stays
              where it lives, what lands on your profile is your name behind it, and the reason.
            </div>
          </Card>
          <MyShelf toast={toast} onChange={setShelfCount} />

          {/* Your posts, as your mentees actually see them, with Pin and Delete
              behind the overflow. It used to be a two-line summary with a colour
              swatch and two buttons stapled underneath — a management list that
              gave a mentor no way to check what they had actually published. */}
          {posts.map(p => (
            <div key={p.id} style={{ position: "relative" }}>
              {(onPin || onDelete) && (
                <div style={{ position: "absolute", top: 12, right: 12, zIndex: 5 }}>
                  <PostOverflow post={p} onPin={onPin} onDelete={onDelete} />
                </div>
              )}
              <PostCard post={p} author={name} authorId={userId} avatarUrl={u?.avatarUrl} tier mine
                toast={toast} onVisibility={onVisibility} highlight={highlightPostId === p.id} />
            </div>
          ))}
        </>)}
      </div>
    </div>
  );
};

