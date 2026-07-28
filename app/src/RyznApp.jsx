import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search, Newspaper
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Monogram, Field, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots, ModalShell, Sidebar, AuthCardShell } from "./ui.jsx";
import { useIsDesktop } from "./useIsDesktop.js";
import {
  BADGE_DEFS, GENERAL_INFLUENCERS, INFLUENCERS_BY_CATEGORY, MENTEE_SCRIPT, MENTOR_SCRIPT,
  MENTOR_MATCHES, MENTEE_MATCHES, EXTRA_MENTEES, MENTEE_POOL, RETURNING_MENTEES, STATUS,
  EXERCISES_RETURNING, EXERCISES_FRESH, COHORT_BOARD_STATIC, SCHOOL_BOARD, MENTOR_BOARD_TOP,
  EVENT, FEED_SEED
} from "./data.js";
import { Splash, RoleSelect, Welcome, Register, Login, Forgot } from "./auth.jsx";
import { ChatScreen, UnlockScreen, MatchesScreen, RequestsScreen } from "./chatmatch.jsx";
import { AddMentorScreen, AddMenteeScreen } from "./adddecks.jsx";
import { MenteeHome, MenteeExercises, MenteeBadges, CohortScreen, DMScreen, MenteeProfile } from "./app-mentee.jsx";
import { MentorDash, MenteeDetailScreen, MentorSessions, MentorBoard, MentorProfile } from "./app-mentor.jsx";
import { MeetsScreen, NotifsScreen, SettingsScreen, BadgeModal, MidwayUnlock } from "./app-shared.jsx";
import { MentorFeed, OrbitScreen } from "./feed.jsx";

/* ————————————————— ROOT SHELL ————————————————— */

const DEMO = false; // flip to true to show internal QA chrome (role switcher, stage tracker, caption)

export const JOURNEY_STAGES = ["splash", "role", "welcome", "auth", "chat", "unlock", "matches", "app"];
export const STAGE_LABEL = { splash: "Splash", role: "Role", welcome: "Welcome", auth: "Auth", chat: "AI Setup", unlock: "Unlock", matches: "Match", app: "App" };

export const makeMenteeBadges = (earned, fresh) => BADGE_DEFS.map(b => {
  const out = { ...b, earned: earned[b.id] || null };
  if (b.id === "midway" && !out.earned) { out.progress = fresh ? [0, 3] : [2, 3]; out.progressLabel = fresh ? "0 of 3 milestone exercises" : "2 of 3 milestone exercises"; }
  if (b.id === "first" && !out.earned && fresh) { out.progress = [0, 1]; out.progressLabel = "Session booked · Mon 5:00 PM"; }
  if (b.id === "streak100" && !out.earned) { out.progress = fresh ? [1, 100] : [34, 100]; out.progressLabel = fresh ? "1 of 100 days" : "34 of 100 days"; }
  return out;
});

export default function RyznComplete() {
  const [role, setRole] = useState("mentee");
  const [phase, setPhase] = useState("journey");        // journey | app
  const [stage, setStage] = useState("splash");         // splash welcome register login forgot chat unlock matches
  const [xp, setXp] = useState(0);                      // journey XP / Impact
  const [user, setUser] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // app state
  const [tab, setTab] = useState("home");
  const [overlay, setOverlay] = useState(null);         // 'cohort' | 'notifs' | 'settings' | 'dm' | {mentee}
  const [badgeModal, setBadgeModal] = useState(null);
  const [todayDone, setTodayDone] = useState(false);
  const [pickedUp, setPickedUp] = useState(false);
  const [midwayEarned, setMidwayEarned] = useState(false);
  const [showMidway, setShowMidway] = useState(false);
  const [justEarnedId, setJustEarnedId] = useState(null);
  const [watched, setWatched] = useState({});
  const [reacted, setReacted] = useState({});           // mentee → posts they've hearted
  const [mentorFeed, setMentorFeed] = useState([]);
  const [greetingUp, setGreetingUp] = useState(false);
  const [extraMentors, setExtraMentors] = useState([]);
  const [menteeAdds, setMenteeAdds] = useState(0);

  const toast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2000); };
  const addXp = (n) => { setXp(x => x + n); toast(`+${n} ${role === "mentee" ? "XP" : "IMPACT"}`); };
  const addUserXp = (n) => setUser(u => u && u.xp !== undefined ? { ...u, xp: u.xp + n } : u);
  const addUserImpact = (n) => setUser(u => u && u.impact !== undefined ? { ...u, impact: u.impact + n } : u);

  const resetAppState = () => { setTab("home"); setOverlay(null); setBadgeModal(null); setTodayDone(false); setPickedUp(false); setMidwayEarned(false); setShowMidway(false); setJustEarnedId(null); setWatched({}); setReacted({}); setExtraMentors([]); setMenteeAdds(0); };

  const restart = (r = role) => { setRole(r); setPhase("journey"); setStage("splash"); setXp(0); setUser(null); resetAppState(); };

  /* — entry points into the app — */
  const enterAsReturning = () => {
    resetAppState();
    if (role === "mentee") setUser({
      fresh: false, week: 6, streak: 34, xp: 2140, rank: 4,
      mentorName: "Jordan Clarke", mentorTitle: "VP of Product, Harbourline", mentorTier: "Pathfinder",
      earned: { goal: "Jun 8", first: "Jun 12", momentum: "Jul 6" },
    });
    else { setUser({ fresh: false, impact: 847, tier: "Pathfinder", mentorRank: 12, cohort: RETURNING_MENTEES.map(m => ({ ...m, stage1: true })) }); setMentorFeed(FEED_SEED.filter(p => !p.pinned)); setGreetingUp(true); }
    setPhase("app");
  };
  const enterAsFreshMentee = (mentorFullName) => {
    resetAppState();
    const m = MENTOR_MATCHES.find(x => x.name === mentorFullName) || MENTOR_MATCHES[0];
    setUser({
      fresh: true, week: 1, streak: 1, xp, rank: 18,
      mentorName: m.name, mentorTitle: `${m.title}, ${m.company}`, mentorTier: m.tier,
      earned: { goal: "Today" },
    });
    setPhase("app");
  };
  const enterAsFreshMentor = (acceptedNames) => {
    resetAppState();
    setUser({
      fresh: true, impact: xp, tier: "Scout", mentorRank: 58,
      cohort: acceptedNames.map((n, i) => ({ name: n, week: 1, streak: 1, status: "active", stage1: i === 0 })),
    });
    setMentorFeed([]); setGreetingUp(false);
    setPhase("app");
  };

  const logout = () => { setPhase("journey"); setStage("welcome"); setXp(0); setUser(null); resetAppState(); };

  const badges = user && role === "mentee"
    ? makeMenteeBadges(midwayEarned ? { ...user.earned, midway: "Today" } : user.earned, user.fresh)
    : [];

  const submitToday = () => {
    if (todayDone) return;
    setTodayDone(true);
    if (role === "mentee" && user) {
      if (!user.fresh && !midwayEarned) {
        addUserXp(40); toast("+40 XP · milestone 3 of 3");
        setTimeout(() => { setMidwayEarned(true); setShowMidway(true); setJustEarnedId("midway"); }, 900);
      } else { addUserXp(30); toast("+30 XP · streak day " + (user.streak + 1)); if (user.fresh) setTimeout(() => toast(`Direct Connect unlocked · message ${user.mentorName.split(" ")[0]}`), 2300); }
    }
  };
  const pickup = () => { if (!pickedUp) { setPickedUp(true); addUserXp(20); toast("+20 XP · picked up"); } };

  /* — gamified content + connect — */
  const stage1 = role === "mentee" && user ? (user.fresh ? todayDone : true) : true;
  const watchContent = (id, xpGain) => { if (watched[id]) return; setWatched(w => ({ ...w, [id]: true })); addUserXp(xpGain); toast(`+${xpGain} XP · reviewed`); };
  const publishPost = ({ kind, text, title }) => {
    setMentorFeed(f => [{
      id: "u" + Date.now(), kind, text, title: title || undefined,
      mins: kind === "video" ? "0:00" : undefined,
      fileKind: kind === "resource" ? "FILE" : undefined,
      when: "now", views: 0, reactions: 0, xp: 5, isNew: true,
    }, ...f]);
    addUserImpact(10);
    toast(`+10 Impact · live in ${user?.cohort?.length || 0} mentee orbit${user?.cohort?.length === 1 ? "" : "s"}`);
  };
  const reactToPost = (id) => { if (reacted[id]) return; setReacted(r => ({ ...r, [id]: true })); toast("Reaction sent · your mentor sees it"); };
  const uploadGreeting = () => { if (greetingUp) return; setGreetingUp(true); addUserImpact(15); toast("+15 Impact · greeting pinned to your Orbit"); };
  const addMentor = (name) => {
    setExtraMentors(a => (a.includes(name) || 1 + a.length >= 3) ? a : [...a, name]);
    addUserXp(15);
    toast(`${name.split(" ")[0]} joined as a support mentor · +15 XP`);
  };
  const promoteMentor = (name) => {
    const m = MENTOR_MATCHES.find(x => x.name === name); if (!m || !user) return;
    const prevActive = user.mentorName;
    setUser(u => ({ ...u, mentorName: m.name, mentorTitle: `${m.title}, ${m.company}`, mentorTier: m.tier }));
    setExtraMentors(a => [prevActive, ...a.filter(n => n !== name)]);
    toast(`${m.name.split(" ")[0]} is now your active mentor · ${prevActive.split(" ")[0]} moved to support`);
  };
  const dropMentor = (name) => { setExtraMentors(a => a.filter(n => n !== name)); toast(`${name.split(" ")[0]} dropped · seat opened`); };
  const addMentee = (m) => {
    setUser(u => u && u.cohort ? { ...u, cohort: [...u.cohort, { name: m.name, week: 1, streak: 1, status: "active", stage1: false }] } : u);
    setMenteeAdds(n => n + 1);
    addUserImpact(30);
    toast(`${m.name.split(" ")[0]} joined your cohort · +30 Impact`);
  };

  /* — notification deep links — */
  const navTo = (to) => {
    setOverlay(null);
    if (["cohort", "dm", "orbit", "board"].includes(to)) setTimeout(() => setOverlay(to), 60);
    else setTab(to);
  };

  /* — journey content — */
  const journeyContent = () => {
    switch (stage) {
      case "role": return <RoleSelect onPick={(r) => { setRole(r); setStage("welcome"); }} />;
      case "welcome": return <Welcome role={role} go={setStage} />;
      case "register": return <Register role={role} go={setStage} onDone={() => { addXp(10); setStage("chat"); }} />;
      case "login": return <Login role={role} go={setStage} onDone={enterAsReturning} />;
      case "forgot": return <Forgot go={setStage} />;
      case "chat": return <ChatScreen role={role} xp={xp} addXp={addXp} onComplete={() => setStage("unlock")} />;
      case "matches": return role === "mentee"
        ? <MatchesScreen xp={xp} addXp={addXp} toast={toast} onEnterApp={enterAsFreshMentee} />
        : <RequestsScreen xp={xp} addXp={addXp} toast={toast} onEnterApp={enterAsFreshMentor} />;
      default: return null;
    }
  };

  /* — overlay content (rendered inline on mobile, in a modal on desktop) — */
  const overlayContent = () => {
    if (!user || !overlay) return null;
    if (overlay === "notifs") return <NotifsScreen role={role} u={user} back={() => setOverlay(null)} navTo={navTo} />;
    if (overlay === "settings") return <SettingsScreen role={role} back={() => setOverlay(null)} toast={toast} onLogout={logout} />;
    if (overlay === "cohort") return <CohortScreen u={user} back={() => setOverlay(null)} />;
    if (overlay === "addmentor") return <AddMentorScreen candidates={MENTOR_MATCHES.filter(x => x.name !== user.mentorName && !extraMentors.includes(x.name))} used={1 + extraMentors.length} onAdd={addMentor} back={() => setOverlay(null)} toast={toast} />;
    if (overlay === "addmentee") return <AddMenteeScreen candidates={MENTEE_POOL.filter(x => !user.cohort.some(c => c.name === x.name))} addsUsed={menteeAdds} onAdd={addMentee} back={() => setOverlay(null)} toast={toast} />;
    if (overlay === "orbit") return <OrbitScreen u={user} stage1={stage1} feed={FEED_SEED} back={() => setOverlay(null)} watched={watched} onWatch={watchContent} reacted={reacted} onReact={reactToPost} openDm={() => setOverlay("dm")} go={() => { setOverlay(null); setTab("exercises"); }} />;
    if (overlay === "board") return <MentorBoard u={user} back={() => setOverlay(null)} />;
    if (overlay === "dm") return <DMScreen name={user.mentorName} sub="DIRECT CONNECT · EARNED AT STAGE 1" back={() => setOverlay(null)} placeholder={`Message ${user.mentorName.split(" ")[0]}…`}
      seed={user.fresh
        ? [{ who: "them", text: "Welcome aboard, Alex. Read your three goals — strong start. I’m here before Monday if anything comes up." }]
        : [{ who: "them", text: "Your headline rewrite was sharp. Bring the cold open Tuesday." }, { who: "me", text: "Will do — drafting it today." }]}
      reply={user.fresh ? "Love that energy. Bring it Monday." : "Good. Specific beats vague — see you Tuesday."} />;
    if (overlay.dm) return <DMScreen name={overlay.dm} sub="YOUR MENTEE · STAGE 1 COMPLETE ✓" back={() => setOverlay(overlay.from || null)} placeholder={`Message ${overlay.dm.split(" ")[0]}…`}
      seed={[{ who: "them", text: `Hi Jordan — excited to get started. First goal: “${(MENTEE_POOL.find(m => m.name === overlay.dm) || {}).goal || "make these 12 weeks count"}.”` }]}
      reply="Will do — thank you!" />;
    if (overlay.mentee) return <MenteeDetailScreen u={user} mentee={overlay.mentee} back={() => setOverlay(null)} openDm={(m) => setOverlay({ dm: m.name, from: { mentee: m } })} />;
    return null;
  };

  /* — current tab content (always the active tab, regardless of overlay) — */
  const tabContent = () => {
    if (!user) return null;
    if (role === "mentee") {
      switch (tab) {
        case "home": return <MenteeHome u={user} badges={badges} go={setTab} openOverlay={setOverlay} todayDone={todayDone} stage1={stage1} mentorSeats={1 + extraMentors.length} toast={toast} feed={FEED_SEED} watched={watched} />;
        case "exercises": return <MenteeExercises u={user} todayDone={todayDone} onSubmit={submitToday} pickedUp={pickedUp} onPickup={pickup} />;
        case "badges": return <MenteeBadges badges={badges} openBadge={(b, i) => setBadgeModal({ b, i })} justEarnedId={justEarnedId} />;
        case "meets": return <MeetsScreen role={role} u={user} toast={toast} />;
        case "profile": return <MenteeProfile u={user} badges={badges} openBadge={(b, i) => setBadgeModal({ b, i })} openOverlay={setOverlay} extraMentors={extraMentors} onPromote={promoteMentor} onDrop={dropMentor} />;
        default: return null;
      }
    }
    switch (tab) {
      case "home": return <MentorDash u={user} openOverlay={setOverlay} addsLeft={3 - menteeAdds} />;
      case "feed": return <MentorFeed u={user} name="Jordan Clarke" feed={mentorFeed} publish={publishPost} greetingUp={greetingUp} uploadGreeting={uploadGreeting} />;
      case "sessions": return <MentorSessions u={user} toast={(m) => { toast(m); if (m.startsWith("+15")) addUserImpact(15); }} />;
      case "meets": return <MeetsScreen role={role} u={user} toast={toast} />;
      case "profile": return <MentorProfile u={user} openOverlay={setOverlay} toast={toast} feed={mentorFeed} go={setTab} greetingUp={greetingUp} />;
      default: return null;
    }
  };

  const menteeNav = [["home", Home, "Home"], ["exercises", Zap, "Exercises"], ["badges", Award, "Badges"], ["meets", MapPin, "Meets"], ["profile", User, "Profile"]];
  const mentorNav = [["home", LayoutGrid, "Cohort"], ["feed", Newspaper, "Feed"], ["sessions", Calendar, "Sessions"], ["meets", MapPin, "Meets"], ["profile", User, "Profile"]];
  const nav = role === "mentee" ? menteeNav : mentorNav;
  const isDesktop = useIsDesktop();

  const stageGroup = phase === "app" ? "app" : ["register", "login", "forgot"].includes(stage) ? "auth" : stage;
  const fullScreenOverlay = Boolean(overlay === "dm" || (overlay && overlay.dm));
  const chatLike = phase === "journey" && ["chat", "matches"].includes(stage);
  const useAuthCard = isDesktop && phase === "journey" && ["role", "welcome", "register", "login", "forgot"].includes(stage);

  const overlayEl = overlayContent();

  return (
    <div className="full-h" style={{ fontFamily: F.sans, color: C.ink, overflow: "hidden" }}>

      {DEMO && (
        <div style={{ position: "fixed", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, padding: 5, boxShadow: "0 8px 20px rgba(26,26,26,.12)" }}>
            {[["mentee", "Mentee · Alex"], ["mentor", "Mentor · Jordan"]].map(([r, l]) => (
              <button key={r} onClick={() => restart(r)} style={{ border: "none", cursor: "pointer", borderRadius: 10, padding: "8px 16px", fontFamily: F.sans, fontWeight: 600, fontSize: 13, background: role === r ? C.ink : "transparent", color: role === r ? C.white : C.gray }}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center", background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: "6px 10px" }}>
            {JOURNEY_STAGES.map((s, i) => (
              <React.Fragment key={s}>
                <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 0.6, color: stageGroup === s ? C.purple : "#A5A39D", fontWeight: stageGroup === s ? 700 : 400, textTransform: "uppercase" }}>{STAGE_LABEL[s]}</span>
                {i < JOURNEY_STAGES.length - 1 && <span style={{ width: 10, height: 1, background: "#C9C6C0" }} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {phase === "journey" && (
        <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
          {stage === "splash" && <Splash onEnter={() => setStage("role")} isDesktop={isDesktop} />}
          {stage === "unlock" && <UnlockScreen role={role} onNext={() => setStage("matches")} toast={toast} />}
          {useAuthCard ? (
            <AuthCardShell>
              <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>{journeyContent()}</div>
            </AuthCardShell>
          ) : (
            <div className="app-scroll" style={{
              height: "100%", boxSizing: "border-box", overflowY: chatLike ? "hidden" : "auto",
              paddingTop: isDesktop ? 0 : "env(safe-area-inset-top, 0px)",
            }}>{journeyContent()}</div>
          )}
        </div>
      )}

      {phase === "app" && user && (
        isDesktop ? (
          <div style={{ display: "flex", height: "100%" }}>
            <Sidebar nav={nav} tab={tab} overlay={overlay} role={role}
              onSelect={(id) => { setOverlay(null); setTab(id); }}
              onSettings={() => setOverlay("settings")} onLogout={logout} />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
                <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 40px" }}>{tabContent()}</div>
              </div>
            </div>
            {overlayEl && <ModalShell onClose={() => setOverlay(null)}>{overlayEl}</ModalShell>}
          </div>
        ) : (
          <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div className="app-scroll" style={{
                height: "100%", boxSizing: "border-box", overflowY: fullScreenOverlay ? "hidden" : "auto",
                paddingTop: "env(safe-area-inset-top, 0px)",
              }}>{overlayEl || tabContent()}</div>
            </div>
            {!fullScreenOverlay && (
              <div style={{ display: "flex", borderTop: `1px solid ${C.line}`, background: C.white, padding: "8px 6px", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}>
                {nav.map(([id, Icon, label]) => {
                  const active = tab === id && !overlay;
                  return (
                    <button key={id} onClick={() => { setOverlay(null); setTab(id); }} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0" }}>
                      <Icon size={20} color={active ? C.purple : "#A5A39D"} strokeWidth={active ? 2.4 : 2} />
                      <span style={{ fontFamily: F.mono, fontSize: 8.5, letterSpacing: 0.6, color: active ? C.purple : "#A5A39D", fontWeight: active ? 700 : 400 }}>{label.toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {phase === "app" && badgeModal && <BadgeModal badge={badgeModal.b} index={badgeModal.i} close={() => setBadgeModal(null)} toast={toast} />}
      {phase === "app" && showMidway && <MidwayUnlock onClose={() => setShowMidway(false)} toast={toast} />}

      {toastMsg && (
        <div className="sheet-up" style={{ position: "fixed", top: "calc(18px + env(safe-area-inset-top, 0px))", left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#B7AFF2", fontFamily: F.mono, fontSize: 12, fontWeight: 700, padding: "9px 16px", borderRadius: 12, zIndex: 90, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis" }}>
          <Zap size={12} /> {toastMsg}
        </div>
      )}

      {DEMO && <div style={{ position: "fixed", bottom: 8, left: "50%", transform: "translateX(-50%)", zIndex: 200, fontFamily: F.mono, fontSize: 9, color: "#A5A39D", letterSpacing: 1, textAlign: "center", background: C.white, border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 10px", maxWidth: "94vw" }}>RYZN COMPLETE · SWIPE TO MATCH · ADD MENTORS/MENTEES IN-APP (MAX 3) · STAGE 1 EARNS DIRECT CONNECT</div>}
    </div>
  );
}
