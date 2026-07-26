import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Monogram, Field, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots, StatusBar } from "./ui.jsx";
import {
  BADGE_DEFS, GENERAL_INFLUENCERS, INFLUENCERS_BY_CATEGORY, MENTEE_SCRIPT, MENTOR_SCRIPT,
  MENTOR_MATCHES, MENTEE_MATCHES, EXTRA_MENTEES, MENTEE_POOL, RETURNING_MENTEES, STATUS,
  EXERCISES_RETURNING, EXERCISES_FRESH, COHORT_BOARD_STATIC, SCHOOL_BOARD, MENTOR_BOARD_TOP,
  EVENT, MENTOR_CONTENT, MENTOR_FEED_SEED
} from "./data.js";
import { Splash, Welcome, Register, Login, Forgot } from "./auth.jsx";
import { ChatScreen, UnlockScreen, MatchesScreen, RequestsScreen } from "./chatmatch.jsx";
import { AddMentorScreen, AddMenteeScreen } from "./adddecks.jsx";
import { MenteeHome, MenteeExercises, MenteeBadges, CohortScreen, DMScreen, MentorPublicView, MenteeProfile } from "./app-mentee.jsx";
import { MentorDash, MenteeDetailScreen, MentorSessions, MentorBoard, MentorProfile } from "./app-mentor.jsx";
import { MeetsScreen, NotifsScreen, SettingsScreen, BadgeModal, MidwayUnlock } from "./app-shared.jsx";

/* ————————————————— ROOT SHELL ————————————————— */

const DEMO = true; // flip to false to hide prototype chrome (role switcher, stage tracker, caption)

export const JOURNEY_STAGES = ["splash", "welcome", "auth", "chat", "unlock", "matches", "app"];
export const STAGE_LABEL = { splash: "Splash", welcome: "Welcome", auth: "Auth", chat: "AI Setup", unlock: "Unlock", matches: "Match", app: "App" };

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
  const [mentorFeed, setMentorFeed] = useState([]);
  const [greetingUp, setGreetingUp] = useState(false);
  const [extraMentors, setExtraMentors] = useState([]);
  const [menteeAdds, setMenteeAdds] = useState(0);

  const toast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2000); };
  const addXp = (n) => { setXp(x => x + n); toast(`+${n} ${role === "mentee" ? "XP" : "IMPACT"}`); };
  const addUserXp = (n) => setUser(u => u && u.xp !== undefined ? { ...u, xp: u.xp + n } : u);
  const addUserImpact = (n) => setUser(u => u && u.impact !== undefined ? { ...u, impact: u.impact + n } : u);

  const resetAppState = () => { setTab("home"); setOverlay(null); setBadgeModal(null); setTodayDone(false); setPickedUp(false); setMidwayEarned(false); setShowMidway(false); setJustEarnedId(null); setWatched({}); setExtraMentors([]); setMenteeAdds(0); };

  const restart = (r = role) => { setRole(r); setPhase("journey"); setStage("splash"); setXp(0); setUser(null); resetAppState(); };

  /* — entry points into the app — */
  const enterAsReturning = () => {
    resetAppState();
    if (role === "mentee") setUser({
      fresh: false, week: 6, streak: 34, xp: 2140, rank: 4,
      mentorName: "Jordan Clarke", mentorTitle: "VP of Product, Harbourline", mentorTier: "Pathfinder",
      earned: { goal: "Jun 8", first: "Jun 12", momentum: "Jul 6" },
    });
    else { setUser({ fresh: false, impact: 847, tier: "Pathfinder", mentorRank: 12, cohort: RETURNING_MENTEES.map(m => ({ ...m, stage1: true })) }); setMentorFeed(MENTOR_FEED_SEED); setGreetingUp(true); }
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
  const publishPost = (type, t) => { setMentorFeed(f => [{ id: "u" + Date.now(), type, title: type === "post" ? undefined : t, text: type === "post" ? t : undefined, views: 0, reactions: 0, mins: type === "video" ? "0:00" : undefined, kind: type === "resource" ? "PDF" : undefined, isNew: true }, ...f]); addUserImpact(10); toast("+10 Impact · live on your feed"); };
  const uploadGreeting = () => { if (greetingUp) return; setGreetingUp(true); addUserImpact(15); toast("+15 Impact · greeting live for new mentees"); };
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
    if (to === "cohort" || to === "dm" || to === "mentorprofile") setTimeout(() => setOverlay(to), 60);
    else if (to === "sessions" || to === "board") setTab(to);
    else setTab(to);
  };

  /* — journey content — */
  const journeyContent = () => {
    switch (stage) {
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

  /* — app content — */
  const appContent = () => {
    if (!user) return null;
    if (overlay === "notifs") return <NotifsScreen role={role} u={user} back={() => setOverlay(null)} navTo={navTo} />;
    if (overlay === "settings") return <SettingsScreen role={role} back={() => setOverlay(null)} toast={toast} onLogout={logout} />;
    if (overlay === "cohort") return <CohortScreen u={user} back={() => setOverlay(null)} />;
    if (overlay === "addmentor") return <AddMentorScreen candidates={MENTOR_MATCHES.filter(x => x.name !== user.mentorName && !extraMentors.includes(x.name))} used={1 + extraMentors.length} onAdd={addMentor} back={() => setOverlay(null)} toast={toast} />;
    if (overlay === "addmentee") return <AddMenteeScreen candidates={MENTEE_POOL.filter(x => !user.cohort.some(c => c.name === x.name))} addsUsed={menteeAdds} onAdd={addMentee} back={() => setOverlay(null)} toast={toast} />;
    if (overlay === "mentorprofile") return <MentorPublicView u={user} stage1={stage1} back={() => setOverlay(null)} watched={watched} onWatch={watchContent} openDm={() => setOverlay("dm")} go={() => { setOverlay(null); setTab("exercises"); }} />;
    if (overlay === "dm") return <DMScreen name={user.mentorName} sub="DIRECT CONNECT · EARNED AT STAGE 1" back={() => setOverlay(null)} placeholder={`Message ${user.mentorName.split(" ")[0]}…`}
      seed={user.fresh
        ? [{ who: "them", text: "Welcome aboard, Alex. Read your three goals — strong start. I’m here before Monday if anything comes up." }]
        : [{ who: "them", text: "Your headline rewrite was sharp. Bring the cold open Tuesday." }, { who: "me", text: "Will do — drafting it today." }]}
      reply={user.fresh ? "Love that energy. Bring it Monday." : "Good. Specific beats vague — see you Tuesday."} />;
    if (overlay && overlay.dm) return <DMScreen name={overlay.dm} sub="YOUR MENTEE · STAGE 1 COMPLETE ✓" back={() => setOverlay(overlay.from || null)} placeholder={`Message ${overlay.dm.split(" ")[0]}…`}
      seed={[{ who: "them", text: `Hi Jordan — excited to get started. First goal: “${(MENTEE_POOL.find(m => m.name === overlay.dm) || {}).goal || "make these 12 weeks count"}.”` }]}
      reply="Will do — thank you!" />;
    if (overlay && overlay.mentee) return <MenteeDetailScreen u={user} mentee={overlay.mentee} back={() => setOverlay(null)} openDm={(m) => setOverlay({ dm: m.name, from: { mentee: m } })} />;
    if (role === "mentee") {
      switch (tab) {
        case "home": return <MenteeHome u={user} badges={badges} go={setTab} openOverlay={setOverlay} todayDone={todayDone} stage1={stage1} mentorSeats={1 + extraMentors.length} toast={toast} />;
        case "exercises": return <MenteeExercises u={user} todayDone={todayDone} onSubmit={submitToday} pickedUp={pickedUp} onPickup={pickup} />;
        case "badges": return <MenteeBadges badges={badges} openBadge={(b, i) => setBadgeModal({ b, i })} justEarnedId={justEarnedId} />;
        case "meets": return <MeetsScreen role={role} u={user} toast={toast} />;
        case "profile": return <MenteeProfile u={user} badges={badges} openBadge={(b, i) => setBadgeModal({ b, i })} openOverlay={setOverlay} extraMentors={extraMentors} onPromote={promoteMentor} onDrop={dropMentor} />;
        default: return null;
      }
    }
    switch (tab) {
      case "home": return <MentorDash u={user} openOverlay={setOverlay} addsLeft={3 - menteeAdds} />;
      case "sessions": return <MentorSessions u={user} toast={(m) => { toast(m); if (m.startsWith("+15")) addUserImpact(15); }} />;
      case "board": return <MentorBoard u={user} />;
      case "meets": return <MeetsScreen role={role} u={user} toast={toast} />;
      case "profile": return <MentorProfile u={user} openOverlay={setOverlay} toast={toast} feed={mentorFeed} publish={publishPost} greetingUp={greetingUp} uploadGreeting={uploadGreeting} />;
      default: return null;
    }
  };

  const menteeNav = [["home", Home, "Home"], ["exercises", Zap, "Exercises"], ["badges", Award, "Badges"], ["meets", MapPin, "Meets"], ["profile", User, "Profile"]];
  const mentorNav = [["home", LayoutGrid, "Cohort"], ["sessions", Calendar, "Sessions"], ["board", TrendingUp, "Ranking"], ["meets", MapPin, "Meets"], ["profile", User, "Profile"]];
  const nav = role === "mentee" ? menteeNav : mentorNav;

  const stageGroup = phase === "app" ? "app" : ["register", "login", "forgot"].includes(stage) ? "auth" : stage;
  const fullScreenOverlay = Boolean(overlay === "dm" || (overlay && overlay.dm));
  const chatLike = phase === "journey" && ["chat", "matches"].includes(stage);
  const lightStatus = (phase === "journey" && (stage === "splash" || stage === "unlock")) || (phase === "app" && showMidway);

  return (
    <div style={{
      minHeight: "100vh", fontFamily: F.sans, color: C.ink, display: "flex", flexDirection: "column",
      alignItems: "center", padding: "26px 12px 40px",
      background: "radial-gradient(120% 100% at 50% -10%, #F2F1EE 0%, #E9E8E4 45%, #DEDCD6 100%)",
    }}>


      {DEMO && <>
      {/* demo controls */}
      <div style={{ display: "flex", gap: 6, background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, padding: 5, marginBottom: 10 }}>
        {[["mentee", "Mentee · Alex"], ["mentor", "Mentor · Jordan"]].map(([r, l]) => (
          <button key={r} onClick={() => restart(r)} style={{ border: "none", cursor: "pointer", borderRadius: 10, padding: "8px 16px", fontFamily: F.sans, fontWeight: 600, fontSize: 13, background: role === r ? C.ink : "transparent", color: role === r ? C.white : C.gray }}>{l}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" }}>
        {JOURNEY_STAGES.map((s, i) => (
          <React.Fragment key={s}>
            <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 0.6, color: stageGroup === s ? C.purple : "#A5A39D", fontWeight: stageGroup === s ? 700 : 400, textTransform: "uppercase" }}>{STAGE_LABEL[s]}</span>
            {i < JOURNEY_STAGES.length - 1 && <span style={{ width: 10, height: 1, background: "#C9C6C0" }} />}
          </React.Fragment>
        ))}
      </div>

      </>}

      {/* phone */}
      <div style={{
        width: 384, maxWidth: "100%", padding: "14px 12px", background: "linear-gradient(160deg, #38383d, #0b0b0d 60%)",
        borderRadius: 48, boxShadow: "0 34px 74px rgba(15,10,35,.28), 0 2px 0 rgba(255,255,255,.06) inset, 0 0 0 1px rgba(0,0,0,.4)",
        position: "relative",
      }}>
        <div style={{ height: 780, background: C.surface, borderRadius: 36, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
          <StatusBar dark={!lightStatus} />
          <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 100, height: 24, background: "#0b0b0d", borderRadius: 13, zIndex: 92 }} />

          {phase === "journey" && stage === "splash" && <Splash onEnter={() => setStage("welcome")} />}
          {phase === "journey" && stage === "unlock" && <UnlockScreen role={role} onNext={() => setStage("matches")} toast={toast} />}
          {phase === "app" && showMidway && <MidwayUnlock onClose={() => setShowMidway(false)} toast={toast} />}

          {phase === "journey" ? (
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div className="app-scroll" style={{ height: "100%", overflowY: chatLike ? "hidden" : "auto", paddingTop: 46 }}>{journeyContent()}</div>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div className="app-scroll" style={{ height: "100%", overflowY: fullScreenOverlay ? "hidden" : "auto", paddingTop: 46 }}>{appContent()}</div>
              </div>
              {!fullScreenOverlay && (
                <div style={{ display: "flex", borderTop: `1px solid ${C.line}`, background: C.white, padding: "8px 6px 22px" }}>
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
            </>
          )}

          {phase === "app" && badgeModal && <BadgeModal badge={badgeModal.b} index={badgeModal.i} close={() => setBadgeModal(null)} toast={toast} />}
          {toastMsg && (
            <div className="sheet-up" style={{ position: "absolute", top: 56, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#B7AFF2", fontFamily: F.mono, fontSize: 12, fontWeight: 700, padding: "9px 16px", borderRadius: 12, zIndex: 70, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis" }}>
              <Zap size={12} /> {toastMsg}
            </div>
          )}

          <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", width: 120, height: 4, borderRadius: 3, background: lightStatus ? "rgba(255,255,255,.65)" : "rgba(26,26,26,.28)", zIndex: 93, pointerEvents: "none" }} />
        </div>
      </div>

      {DEMO && <div style={{ fontFamily: F.mono, fontSize: 10, color: "#A5A39D", marginTop: 16, letterSpacing: 1, textAlign: "center" }}>RYZN COMPLETE · SWIPE TO MATCH · ADD MENTORS/MENTEES IN-APP (MAX 3) · STAGE 1 EARNS DIRECT CONNECT</div>}
    </div>
  );
}
