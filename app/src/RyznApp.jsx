import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search, Newspaper
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Monogram, Field, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots, ModalShell, Sidebar, AuthCardShell, SectionBoundary } from "./ui.jsx";
import { useIsDesktop } from "./useIsDesktop.js";
import { BADGE_DEFS, STATUS, EXERCISE_TRACK } from "./data.js";
import { fetchMe, fetchRoster, fetchMatches, requestMatch, respondToMatch, saveOnboarding, signOut, fetchPosts, createPost, postAction, updatePost, deletePost, submitExercise } from "./lib/auth-client.js";
import { Splash, RoleSelect, Welcome, Register, Login, Forgot } from "./auth.jsx";
import { ChatScreen, UnlockScreen, MatchesScreen, RequestsScreen } from "./chatmatch.jsx";
import { AddMentorScreen, AddMenteeScreen } from "./adddecks.jsx";
import { MenteeHome, MenteeExercises, MenteeBadges, CohortScreen, DMScreen, MenteeProfile } from "./app-mentee.jsx";
import { MentorDash, MenteeDetailScreen, MentorSessions, MentorBoard, MentorProfile } from "./app-mentor.jsx";
import { ExploreScreen } from "./explore.jsx";
import { MeetsScreen, NotifsScreen, SettingsScreen, BadgeModal, MidwayUnlock } from "./app-shared.jsx";
import { MentorFeed, OrbitScreen } from "./feed.jsx";

/* ————————————————— ROOT SHELL —————————————————

   Identity comes from the server. On mount this asks /api/me who the caller is
   and builds the whole app state from the answer; there are no hard-coded
   users, no seeded cohorts and no demo role switcher. If /api/me 401s you are
   in the signed-out journey, and that is the only way into it.

   The session is also what decides where a signed-in user lands: no profile
   answers yet means the Ryzn AI setup, otherwise straight into the app. */

/**
 * A mentor arriving from the invitation email: /app/#/join?code=RYZ-INV-…
 *
 * The invite page confirms the code against /api/invites/validate and then
 * hands it over here so it never has to be retyped. The code alone grants
 * nothing — it is still claimed atomically server-side at sign-up.
 */
function inviteFromHash() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  if (!hash.startsWith("#/join")) return null;
  const code = new URLSearchParams(hash.split("?")[1] || "").get("code");
  return code ? code.trim().toUpperCase() : null;
}

export const JOURNEY_STAGES = ["splash", "role", "welcome", "auth", "chat", "unlock", "matches", "app"];
export const STAGE_LABEL = { splash: "Splash", role: "Role", welcome: "Welcome", auth: "Auth", chat: "AI Setup", unlock: "Unlock", matches: "Match", app: "App" };

/** Progress figures read from the caller's own record. They used to be fixed
    ("34 of 100 days", "2 of 3 milestone exercises") regardless of who was
    looking. */
export const makeMenteeBadges = (earned = {}, streak = 0, milestones = 0) => BADGE_DEFS.map(b => {
  const out = { ...b, earned: earned[b.id] || null };
  if (b.id === "midway" && !out.earned) { out.progress = [milestones, 3]; out.progressLabel = `${milestones} of 3 milestone exercises`; }
  if (b.id === "first" && !out.earned) { out.progress = [0, 1]; out.progressLabel = "Not booked yet"; }
  if (b.id === "streak100" && !out.earned) { out.progress = [streak, 100]; out.progressLabel = `${streak} of 100 days`; }
  return out;
});

/** Shapes an /api/me payload into the object every screen already reads.
 *
 *  `me.mentor`, `me.supportMentors` and `me.cohort` are derived server-side
 *  from the matches collection, so both halves of a pairing read the same
 *  record and neither is invented locally. */
function toAppUser(me) {
  const p = me.profile || {};
  const isMentor = (me.user.role || "mentee") === "mentor";
  // "fresh" means day one: no history to show, so screens render first-run copy
  // rather than a fabricated six weeks of it.
  const fresh = !p.onboardingCompletedAt || (p.week ?? 1) <= 1;
  if (isMentor) {
    return {
      fresh,
      impact: p.impact ?? 0,
      tier: p.tier || "Scout",
      mentorRank: p.mentorRank ?? null,
      cohort: me.cohort ?? [],
      capacity: p.capacity ?? 4,
      greetingUploaded: !!p.greetingUploaded,
      headline: p.headline ?? null,
      industry: p.industry ?? null,
      why: p.why ?? null,
      // Already shown to strangers in MentorDetailSheet; the mentor's own
      // profile was the one place they weren't rendered.
      expertise: p.expertise ?? [],
      menteeFit: p.menteeFit ?? [],
    };
  }
  return {
    fresh,
    week: p.week ?? 1,
    streak: p.streak ?? 0,
    xp: p.xp ?? 0,
    rank: p.rank ?? null,
    stage1Complete: !!p.stage1Complete,
    todayExercise: me.exercise?.today ?? null,
    // Null until a mentor actually accepts. Screens must handle "no mentor yet"
    // rather than falling back to a name.
    mentorName: me.mentor?.name ?? null,
    mentorTitle: me.mentor?.headline ?? null,
    mentorTier: me.mentor?.tier ?? null,
    mentorMatchId: me.mentor?.matchId ?? null,
    // The mentor's *user* id, not the match id — it's what /api/posts needs to
    // fetch their feed. Only the match id was exposed before, so a mentee had
    // no way to ask for their own mentor's content.
    mentorId: me.mentor?.id ?? null,
    supportMentors: me.supportMentors ?? [],
    track: p.track ?? null,
    goals: p.goals ?? [],
    earned: p.earned || {},
  };
}

export default function RyznComplete() {
  const [inviteCode] = useState(inviteFromHash);
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState(null);          // /api/me payload, or null when signed out
  // An invited mentor is a mentor: skip the role picker they were never meant
  // to see, and open on the claim form rather than the splash.
  const [role, setRole] = useState(inviteCode ? "mentor" : "mentee");
  const [phase, setPhase] = useState("journey");         // journey | app
  const [stage, setStage] = useState(inviteCode ? "register" : "splash");
  const [xp, setXp] = useState(0);                       // session-local setup XP
  const [user, setUser] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // roster for the match decks
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState(null);
  const [matches, setMatches] = useState([]);

  // app state
  const [tab, setTab] = useState("home");
  const [overlay, setOverlay] = useState(null);
  const [badgeModal, setBadgeModal] = useState(null);
  const [todayDone, setTodayDone] = useState(false);
  const [submittingExercise, setSubmittingExercise] = useState(false);
  const [midwayEarned, setMidwayEarned] = useState(false);
  const [showMidway, setShowMidway] = useState(false);
  const [justEarnedId, setJustEarnedId] = useState(null);
  const [watched, setWatched] = useState({});
  const [reacted, setReacted] = useState({});
  const [mentorFeed, setMentorFeed] = useState([]);
  const [menteeAdds, setMenteeAdds] = useState(0);

  const toast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2000); };
  const addXp = (n) => { setXp(x => x + n); toast(`+${n} ${role === "mentee" ? "XP" : "IMPACT"}`); };
  const addUserXp = (n) => setUser(u => u && u.xp !== undefined ? { ...u, xp: u.xp + n } : u);
  const addUserImpact = (n) => setUser(u => u && u.impact !== undefined ? { ...u, impact: u.impact + n } : u);

  const resetAppState = () => { setTab("home"); setOverlay(null); setBadgeModal(null); setTodayDone(false); setMidwayEarned(false); setShowMidway(false); setJustEarnedId(null); setWatched({}); setReacted({}); setMenteeAdds(0); };

  /* — session bootstrap —
     One call answers three questions: who are you, what role, and have you set
     up yet. A 401 is the normal signed-out case, not an error. */
  const loadSession = useCallback(async () => {
    try {
      const me = await fetchMe();
      setSession(me);
      setRole(me.user.role === "mentor" ? "mentor" : "mentee");
      return me;
    } catch (err) {
      if (err.status !== 401) console.error("[ryzn] /api/me failed:", err);
      setSession(null);
      return null;
    }
  }, []);

  /** Apply /api/me into app state, including today's exercise completion. */
  const applyMe = useCallback((me) => {
    if (!me) return;
    setUser(toAppUser(me));
    if ((me.user.role || "mentee") !== "mentor") {
      setTodayDone(!!me.exercise?.todayDone);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const me = await loadSession();
      if (!alive) return;
      if (me) {
        if (me.user.onboardingComplete) { applyMe(me); setPhase("app"); }
        else { setPhase("journey"); setStage("chat"); }
      }
      setBooting(false);
    })();
    return () => { alive = false; };
  }, [loadSession, applyMe]);

  /* — roster —
     Loaded when the match deck is about to show. Empty is a valid result: an
     early cohort has nobody on the other side yet. */
  const loadRoster = useCallback(async () => {
    setRosterLoading(true); setRosterError(null);
    try {
      const [{ people }, { matches: mine }] = await Promise.all([fetchRoster(), fetchMatches()]);
      setRoster(people || []);
      setMatches(mine || []);
    } catch (err) {
      console.error("[ryzn] roster/matches failed:", err);
      setRosterError(err);
      setRoster([]);
    } finally {
      setRosterLoading(false);
    }
  }, []);

  const loadMatches = useCallback(async () => {
    try {
      const { matches: mine } = await fetchMatches();
      setMatches(mine || []);
      return mine || [];
    } catch (err) {
      console.error("[ryzn] /api/matches failed:", err);
      return [];
    }
  }, []);

  /** Re-reads /api/me so the app reflects a pairing change immediately. */
  const refreshUser = useCallback(async () => {
    const me = await loadSession();
    if (me) applyMe(me);
    return me;
  }, [loadSession, applyMe]);

  useEffect(() => { if (stage === "matches" && phase === "journey") loadRoster(); }, [stage, phase, loadRoster]);

  /* — mentor content —
     A mentor loads their own feed; a mentee loads their active mentor's. Same
     endpoint, and the server decides what each is allowed to see. `viewerState`
     restores what's already been watched and reacted to, which used to be
     useState maps wiped by every refresh. */
  const mentorId = user?.mentorId ?? null;
  const loadFeed = useCallback(async () => {
    if (role === "mentee" && !mentorId) { setMentorFeed([]); return; }
    try {
      const { posts, viewerState } = await fetchPosts(role === "mentee" ? { mentorId } : {});
      setMentorFeed(posts || []);
      setWatched(Object.fromEntries((viewerState?.watched || []).map(id => [id, true])));
      setReacted(Object.fromEntries((viewerState?.reacted || []).map(id => [id, true])));
    } catch (err) {
      console.error("[ryzn] /api/posts failed:", err);
    }
  }, [role, mentorId]);

  useEffect(() => { if (phase === "app") loadFeed(); }, [phase, loadFeed]);

  /* Derived, not stored: the greeting *is* a post, so the feed is the only
     thing that can answer whether one exists. */
  const greetingUp = mentorFeed.some(p => p.greeting);

  /* Every deck decision is a server write. The roster is refetched afterwards
     because it excludes anyone already answered for, so the card leaves the
     deck as a consequence of the write rather than of local bookkeeping. */
  const decideMatch = useCallback(async (person, action) => {
    let res;
    if (action === "request" || action === "pass") {
      res = await requestMatch(person.id, action);
    } else {
      res = await respondToMatch(person.id, action);
    }
    await loadRoster();
    return res;
  }, [loadRoster]);

  /* — entry points into the app — */
  const enterApp = async (known) => {
    resetAppState();
    const me = known || await loadSession();
    // No session means the cookie didn't survive; falling through to phase:"app"
    // with a null user renders a blank screen, so go back to the journey instead.
    if (!me) { setPhase("journey"); setStage("welcome"); return; }
    applyMe(me);
    setPhase("app");
  };

  /* Leaving the deck for the app. Both sides just re-read /api/me: the mentor
     and cohort come back from the matches collection, so nothing needs to be
     passed through from the screen that made the decision. */
  const enterFromDeck = async () => {
    resetAppState();
    const me = await loadSession();
    if (!me) { setPhase("journey"); setStage("welcome"); return; }
    const base = toAppUser(me);
    setUser({
      ...base,
      fresh: true,
      xp: base.xp || xp,
      earned: { ...(base.earned || {}), goal: "Today" },
    });
    setPhase("app");
  };

  const logout = async () => {
    try { await signOut(); } catch { /* already gone */ }
    setSession(null); setUser(null); setXp(0); setRoster([]);
    resetAppState(); setPhase("journey"); setStage("welcome");
  };

  /* — onboarding completion —
     Persist first, then route. If the write fails the answers are still in
     memory, so the user is told rather than silently losing six questions. */
  const completeOnboarding = async (answers) => {
    try {
      await saveOnboarding(answers);
    } catch (err) {
      console.error("[ryzn] /api/onboarding failed:", err);
      toast("Couldn’t save your answers — check your connection.");
      return;
    }
    await loadSession();
    setStage("unlock");
  };

  const badges = user && role === "mentee"
    ? makeMenteeBadges(
        midwayEarned ? { ...user.earned, midway: "Today" } : user.earned,
        user.streak || 0,
        user.milestones || 0
      )
    : [];

  const todayEx = EXERCISE_TRACK[0];
  const submitToday = async (text) => {
    if (todayDone || submittingExercise) return;
    setSubmittingExercise(true);
    try {
      const res = await submitExercise({ text, exerciseId: "write-your-why" });
      setTodayDone(true);
      setUser(u => u && ({
        ...u,
        xp: res.xp ?? ((u.xp || 0) + (res.awarded || todayEx.xp)),
        streak: res.streak ?? u.streak,
        stage1Complete: true,
        todayExercise: res.exercise ?? u.todayExercise,
      }));
      toast(`+${res.awarded || todayEx.xp} XP · streak day ${res.streak ?? (user?.streak || 0)}`);
      if (user?.mentorName) setTimeout(() => toast(`Direct Connect unlocked · message ${user.mentorName.split(" ")[0]}`), 2300);
    } catch (err) {
      throw err;
    } finally {
      setSubmittingExercise(false);
    }
  };

  /* Stage 1 = first exercise submitted. Survives refresh via profile.stage1Complete. */
  const stage1 = role === "mentee" && user ? !!(user.stage1Complete || todayDone) : true;

  const watchContent = async (id, xpGain) => {
    if (watched[id]) return;
    setWatched(w => ({ ...w, [id]: true }));   // optimistic; the server dedupes
    try {
      const { xp: awarded } = await postAction(id, "view");
      if (awarded) { addUserXp(awarded); toast(`+${awarded} XP · reviewed`); }
    } catch (e) {
      setWatched(w => { const n = { ...w }; delete n[id]; return n; });
      toast(e.message || "Couldn’t open that.");
    }
  };

  const publishPost = async ({ kind, text, title, media }) => {
    // Throws on failure so the Composer can keep the draft and show why.
    // `impact` comes back from the server, which is what actually awarded it.
    const { impact } = await createPost({ kind, text, title, media });
    await Promise.all([loadFeed(), refreshUser()]);
    const n = user?.cohort?.length || 0;
    toast(`+${impact} Impact · live in ${n} mentee orbit${n === 1 ? "" : "s"}`);
  };

  const reactToPost = async (id) => {
    if (reacted[id]) return;
    setReacted(r => ({ ...r, [id]: true }));
    try { await postAction(id, "react"); toast("Reaction sent"); }
    catch (e) {
      setReacted(r => { const n = { ...r }; delete n[id]; return n; });
      toast(e.message || "Couldn’t send that.");
    }
  };

  const pinPost = async (id, pinned) => {
    try { await updatePost(id, { pinned }); await loadFeed(); toast(pinned ? "Pinned to the top" : "Unpinned"); }
    catch (e) { toast(e.message || "Couldn’t change that."); }
  };

  const removePost = async (id) => {
    try { await deletePost(id); await loadFeed(); toast("Post deleted"); }
    catch (e) { toast(e.message || "Couldn’t delete that."); }
  };

  /* The greeting is a pinned video post like any other — that's what makes it
     show up in a mentee's Orbit. It used to set a boolean and nothing else. */
  const uploadGreeting = async (media) => {
    await createPost({ kind: "video", title: "Start here", media, greeting: true });
    await Promise.all([loadFeed(), refreshUser()]);
    toast("+25 Impact · greeting pinned to your Orbit");
  };

  const addMentor = async (m) => {
    try {
      await requestMatch(m.id);
      await Promise.all([loadRoster(), refreshUser()]);
      addUserXp(15);
      toast(`Request sent to ${m.name.split(" ")[0]}`);
    } catch (e) { toast(e.message || "Couldn’t send that request."); }
  };
  /* Promote/drop write to the shared match record, so the mentor sees the same
     change. Previously both were local array shuffles the other side never saw. */
  const promoteMentor = async (m) => {
    try {
      await respondToMatch(m.matchId, "promote");
      await refreshUser();
      toast(`${m.name.split(" ")[0]} is now your active mentor`);
    } catch (e) { toast(e.message || "Couldn’t change your active mentor."); }
  };
  const dropMentor = async (m) => {
    try {
      await respondToMatch(m.matchId, "end");
      await Promise.all([loadRoster(), refreshUser()]);
      toast(`${m.name.split(" ")[0]} dropped · seat opened`);
    } catch (e) { toast(e.message || "Couldn’t drop that mentor."); }
  };
  const addMentee = async (m) => {
    try {
      await requestMatch(m.id);
      await Promise.all([loadRoster(), refreshUser()]);
      setMenteeAdds(n => n + 1);
      addUserImpact(30);
      toast(`Invitation sent to ${m.name.split(" ")[0]} · +30 Impact`);
    } catch (e) { toast(e.message || "Couldn’t send that invitation."); }
  };

  /* Seats, in one place — Explore and the add decks must agree on whether
     there's room, and the answer differs per side. */
  const mentorCapacity = session?.profile?.capacity ?? 4;
  const mentorSeatsLeft = 3 - ((user?.mentorName ? 1 : 0) + (user?.supportMentors?.length || 0));
  const cohortSeatsLeft = mentorCapacity - (user?.cohort?.length || 0);

  /* — notification deep links — */
  const navTo = (to) => {
    setOverlay(null);
    if (["cohort", "dm", "orbit", "board", "explore"].includes(to)) setTimeout(() => setOverlay(to), 60);
    else setTab(to);
  };

  /* — journey content — */
  const journeyContent = () => {
    switch (stage) {
      case "role": return <RoleSelect onPick={(r) => { setRole(r); setStage("welcome"); }} />;
      case "welcome": return <Welcome role={role} go={setStage} />;
      case "register": return <Register role={role} go={setStage} initialInvite={inviteCode} onDone={async () => { addXp(10); await loadSession(); setStage("chat"); }} />;
      case "login": return <Login role={role} go={setStage} onDone={async () => {
        const me = await loadSession();
        // Signing in mid-setup drops you back into the chat, not past it.
        if (me && !me.user.onboardingComplete) setStage("chat");
        else await enterApp(me);
      }} />;
      case "forgot": return <Forgot go={setStage} />;
      case "chat": return <ChatScreen role={role} xp={xp} addXp={addXp} onComplete={completeOnboarding} firstName={session?.user?.name?.split(" ")[0] || ""} />;
      case "matches": return role === "mentee"
        ? <MatchesScreen xp={xp} addXp={addXp} toast={toast} onEnterApp={enterFromDeck} roster={roster} matches={matches} onDecide={decideMatch} loading={rosterLoading} error={rosterError} />
        : <RequestsScreen xp={xp} addXp={addXp} toast={toast} onEnterApp={enterFromDeck} roster={roster} matches={matches} onDecide={decideMatch} loading={rosterLoading} error={rosterError} capacity={session?.profile?.capacity ?? 4} />;
      default: return null;
    }
  };

  /* — overlay content (rendered inline on mobile, in a modal on desktop) — */
  const overlayContent = () => {
    if (!user || !overlay) return null;
    if (overlay === "notifs") return <NotifsScreen role={role} u={user} back={() => setOverlay(null)} navTo={navTo} />;
    if (overlay === "settings") return <SettingsScreen role={role} back={() => setOverlay(null)} toast={toast} onLogout={logout} user={session?.user} />;
    if (overlay === "cohort") return <CohortScreen u={user} back={() => setOverlay(null)} />;
    if (overlay === "addmentor") return <AddMentorScreen candidates={roster} used={(user.mentorName ? 1 : 0) + (user.supportMentors?.length || 0)} onAdd={addMentor} back={() => setOverlay(null)} toast={toast} onLoad={loadRoster} loading={rosterLoading} />;
    if (overlay === "addmentee") return <AddMenteeScreen candidates={roster} addsUsed={menteeAdds} onAdd={addMentee} back={() => setOverlay(null)} toast={toast} onLoad={loadRoster} loading={rosterLoading} />;
    if (overlay === "explore") return (
      <ExploreScreen
        role={role} back={() => setOverlay(null)} toast={toast}
        onRequest={role === "mentee" ? addMentor : addMentee}
        onRespond={async (id, action) => { await respondToMatch(id, action); await Promise.all([loadRoster(), refreshUser()]); }}
        canRequest={role === "mentee" ? mentorSeatsLeft > 0 : cohortSeatsLeft > 0}
        capacityNote={role === "mentee" ? "Mentor seats full · 3 of 3" : `Cohort full · ${mentorCapacity} seats`}
        openAccepted={(p) => {
          setOverlay(null);
          if (role === "mentee") setTimeout(() => setOverlay("orbit"), 60);
          else { const m = user.cohort?.find(c => c.id === p.id); if (m) setTimeout(() => setOverlay({ mentee: m }), 60); }
        }}
      />
    );
    if (overlay === "orbit") return <OrbitScreen u={user} stage1={stage1} feed={mentorFeed} back={() => setOverlay(null)} watched={watched} onWatch={watchContent} reacted={reacted} onReact={reactToPost} openDm={() => setOverlay("dm")} go={() => { setOverlay(null); setTab("exercises"); }} />;
    if (overlay === "board") return <MentorBoard u={user} back={() => setOverlay(null)} />;
    if (overlay === "dm") return user.mentorId ? (
      <DMScreen name={user.mentorName} otherId={user.mentorId} sub="DIRECT CONNECT · EARNED AT STAGE 1" back={() => setOverlay(null)} placeholder={`Message ${user.mentorName.split(" ")[0]}…`} />
    ) : null;
    if (overlay.dmPeer) return (
      <DMScreen
        name={overlay.dmPeer.name}
        otherId={overlay.dmPeer.id}
        sub="YOUR MENTEE · STAGE 1 COMPLETE ✓"
        back={() => setOverlay(overlay.from || null)}
        placeholder={`Message ${overlay.dmPeer.name.split(" ")[0]}…`}
      />
    );
    if (overlay.mentee) return <MenteeDetailScreen u={user} mentee={overlay.mentee} back={() => setOverlay(null)} openDm={(m) => setOverlay({ dmPeer: m, from: { mentee: m } })} />;
    return null;
  };

  /* — current tab content (always the active tab, regardless of overlay) — */
  const tabContent = () => {
    if (!user) return null;
    if (role === "mentee") {
      switch (tab) {
        case "home": return <MenteeHome u={user} name={session?.user?.name} badges={badges} go={setTab} openOverlay={setOverlay} todayDone={todayDone} stage1={stage1} mentorSeats={(user.mentorName ? 1 : 0) + (user.supportMentors?.length || 0)} toast={toast} feed={mentorFeed} watched={watched} />;
        case "exercises": return <MenteeExercises u={user} todayDone={todayDone} onSubmit={submitToday} submitting={submittingExercise} />;
        case "badges": return <MenteeBadges badges={badges} openBadge={(b, i) => setBadgeModal({ b, i })} justEarnedId={justEarnedId} />;
        case "meets": return <MeetsScreen role={role} u={user} toast={toast} />;
        case "profile": return <MenteeProfile u={user} name={session?.user?.name} badges={badges} openBadge={(b, i) => setBadgeModal({ b, i })} openOverlay={setOverlay} extraMentors={user.supportMentors || []} onPromote={promoteMentor} onDrop={dropMentor} />;
        default: return null;
      }
    }
    switch (tab) {
      case "home": return <MentorDash u={user} name={session?.user?.name} openOverlay={setOverlay} addsLeft={3 - menteeAdds} />;
      case "feed": return <MentorFeed u={user} name={session?.user?.name} userId={session?.user?.id} feed={mentorFeed} publish={publishPost} greetingUp={greetingUp} uploadGreeting={uploadGreeting} />;
      case "sessions": return <MentorSessions u={user} />;
      case "meets": return <MeetsScreen role={role} u={user} name={session?.user?.name} toast={toast} />;
      case "profile": return <MentorProfile u={user} name={session?.user?.name} openOverlay={setOverlay} feed={mentorFeed} go={setTab} greetingUp={greetingUp} onPin={pinPost} onDelete={removePost} />;
      default: return null;
    }
  };

  const menteeNav = [["home", Home, "Home"], ["exercises", Zap, "Exercises"], ["badges", Award, "Badges"], ["meets", MapPin, "Meets"], ["profile", User, "Profile"]];
  const mentorNav = [["home", LayoutGrid, "Cohort"], ["feed", Newspaper, "Feed"], ["sessions", Calendar, "Sessions"], ["meets", MapPin, "Meets"], ["profile", User, "Profile"]];
  const nav = role === "mentee" ? menteeNav : mentorNav;
  const isDesktop = useIsDesktop();

  const fullScreenOverlay = Boolean(overlay === "dm" || (overlay && overlay.dmPeer));
  const chatLike = phase === "journey" && ["chat", "matches"].includes(stage);
  const useAuthCard = isDesktop && phase === "journey" && ["role", "welcome", "register", "login", "forgot"].includes(stage);

  const overlayEl = overlayContent();

  // Hold the splash until /api/me answers, so a signed-in user never sees the
  // signed-out journey flash past on the way to their own app.
  if (booting) return (
    <div className="full-h" style={{ fontFamily: F.sans }}>
      <Splash onEnter={() => {}} isDesktop={isDesktop} />
    </div>
  );

  return (
    <div className="full-h" style={{ fontFamily: F.sans, color: C.ink, overflow: "hidden", width: "100%", maxWidth: "100%" }}>

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
            <Sidebar nav={nav} tab={tab} overlay={overlay} role={role} name={session?.user?.name} adminConsole={session?.user?.adminConsole}
              onSelect={(id) => { setOverlay(null); setTab(id); }}
              onSettings={() => setOverlay("settings")} onLogout={logout} />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
                <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 40px" }}>
                  <SectionBoundary name={tab} resetKey={tab}>{tabContent()}</SectionBoundary>
                </div>
              </div>
            </div>
            {overlayEl && (
              <ModalShell onClose={() => setOverlay(null)}>
                <SectionBoundary name="overlay" resetKey={overlay}>{overlayEl}</SectionBoundary>
              </ModalShell>
            )}
          </div>
        ) : (
          <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div className="app-scroll" style={{
                height: "100%", boxSizing: "border-box", overflowY: fullScreenOverlay ? "hidden" : "auto",
                paddingTop: "env(safe-area-inset-top, 0px)",
              }}>
                <SectionBoundary name={overlay ? "overlay" : tab} resetKey={overlay || tab}>
                  {overlayEl || tabContent()}
                </SectionBoundary>
              </div>
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
    </div>
  );
}
