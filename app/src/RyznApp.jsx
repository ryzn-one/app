import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search, Newspaper, UserPlus, UserCheck
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Monogram, Field, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots, ModalShell, Sidebar, AuthCardShell, SectionBoundary, firstNameOf } from "./ui.jsx";
import { useIsDesktop } from "./useIsDesktop.js";
import { BADGE_DEFS, STATUS, EXERCISE_TRACK } from "./data.js";
import { fetchMe, fetchRoster, fetchMatches, requestMatch, respondToMatch, saveOnboarding, signOut, fetchPosts, createPost, postAction, updatePost, deletePost, amplifyPost, unamplifyPost, submitExercise, fetchProgram, saveProgram, fetchEvents, createEvent, eventAction, updateProfile, fetchSessions, createSession, sessionAction, followMentor, unfollowMentor } from "./lib/auth-client.js";
import { appSide, isMentorRole, isOnboardingDone } from "./lib/roles.js";
import { stashPendingInvite, readPendingInvite, claimPendingInvite } from "./lib/pending-invite.js";
import { Splash, RoleSelect, Welcome, Register, Login, Forgot } from "./auth.jsx";
import { ChatScreen, UnlockScreen, MatchesScreen, RequestsScreen, MentorDetailSheet } from "./chatmatch.jsx";
import { AddMentorScreen, AddMenteeScreen } from "./adddecks.jsx";
import { MenteeHome, MenteeExercises, MenteeBadges, CohortScreen, DMScreen, MenteeProfile, MenteeChatList } from "./app-mentee.jsx";
import { ChatLocked, ChatUnlocked } from "./unlock.jsx";
import { SettingsSheet, DEFAULT_PREFS } from "./settings.jsx";
import { updatePrefs, exportMyData, deleteMyAccount, leaveOrbit } from "./lib/auth-client.js";
import { MentorDash, MenteeDetailScreen, MentorBoard, MentorProfile, CourseDesigner } from "./app-mentor.jsx";
import { SessionsScreen } from "./sessions.jsx";
import { ExploreScreen } from "./explore.jsx";
import { MenteesScreen } from "./mentees.jsx";
import { NetworkScreen } from "./network.jsx";
import { MeetsScreen, NotifsScreen, InviteAlert, SettingsScreen, BadgeModal, MidwayUnlock } from "./app-shared.jsx";
import { MentorFeed, OrbitScreen } from "./feed.jsx";
import { TEAMS_NAV, TEAMS_TABS, TeamsHome, TeamsMentors, TeamsCohort, TeamsRoster, TeamsChat } from "./teams/TeamsApp.jsx";
import { useOrbits } from "./lib/orbits.js";
import { OrbitSwitcher, JoinCircle } from "./orbits.jsx";
import { fetchCircle, joinCircle } from "./lib/auth-client.js";
import { IntroTourModal, SpotlightHint, ComprehensiveTour, hasSeenIntroTour, markIntroTourSeen, hasSeenTabHint, markTabHintSeen, resetTabHints, hasCompletedTour, markTourCompleted, resetTour } from "./onboarding.jsx";
import { InstallBanner } from "./install.jsx";
import { fadeSlide, sheet, t, spring, T_BASE } from "./motion.js";
import { fmtDate } from "./lib/calendar.js";

/* ————————————————— ROOT SHELL —————————————————

   Identity comes from the server. On mount this asks /api/me who the caller is
   and builds the whole app state from the answer; there are no hard-coded
   users, no seeded cohorts and no demo role switcher. If /api/me 401s you are
   in the signed-out journey, and that is the only way into it.

   The session is also what decides where a signed-in user lands: no profile
   answers yet means the Ryzn AI setup, otherwise straight into the app. */

/**
 * An invite arriving from the web invite page: /app/#/join?code=RYZ-INV-…&role=…
 *
 * The invite page confirms the code against /api/invites/validate and then
 * hands it over here so it never has to be retyped. The code alone grants
 * nothing — it is still claimed atomically server-side at sign-up.
 */
function inviteFromHash() {
  if (typeof window === "undefined") return { code: null, role: null };
  const hash = window.location.hash || "";
  if (!hash.startsWith("#/join")) return { code: null, role: null };
  const params = new URLSearchParams(hash.split("?")[1] || "");
  const code = params.get("code");
  const roleRaw = (params.get("role") || "").trim().toLowerCase();
  const role = roleRaw === "mentee" || roleRaw === "mentor" ? roleRaw : null;
  return {
    code: code ? code.trim().toUpperCase() : null,
    role,
  };
}

/** Share deep link: /app/#/post/{id} — cleared once handled. */
function postIdFromHash() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  const m = hash.match(/^#\/post\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** A circle invitation: /app/#/circle/{slug}.
 *
 *  The community answer to an org's invite code. A circle is open, so the link
 *  is the whole credential — there is nothing to verify and nothing to claim
 *  atomically, which is exactly what separates it from an org invite. */
function circleSlugFromHash() {
  if (typeof window === "undefined") return null;
  const m = (window.location.hash || "").match(/^#\/circle\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]).toLowerCase() : null;
}

export const JOURNEY_STAGES = ["splash", "role", "welcome", "auth", "chat", "unlock", "matches", "app"];
export const STAGE_LABEL = { splash: "Splash", role: "Role", welcome: "Welcome", auth: "Auth", chat: "AI Setup", unlock: "Unlock", matches: "Match", app: "App" };

/** Progress figures read from the caller's own record. They used to be fixed
    ("34 of 100 days", "2 of 3 milestone exercises") regardless of who was
    looking. */
export const makeMenteeBadges = (earned = {}, streak = 0, milestones = 0, firstSessionLabel = null) => BADGE_DEFS.map(b => {
  const out = { ...b, earned: earned[b.id] || null };
  if (b.id === "midway" && !out.earned) { out.progress = [milestones, 3]; out.progressLabel = `${milestones} of 3 milestone exercises`; }
  // "First Session" now reads a real booking off /api/sessions rather than
  // always claiming nothing is booked.
  if (b.id === "first" && !out.earned) { out.progress = [firstSessionLabel ? 1 : 0, 1]; out.progressLabel = firstSessionLabel || "Not booked yet"; }
  if (b.id === "streak100" && !out.earned) { out.progress = [streak, 100]; out.progressLabel = `${streak} of 100 days`; }
  return out;
});

/** Shapes an /api/me payload into the object every screen already reads.
 *
 *  `me.mentors` and `me.cohort` are derived server-side from the matches
 *  collection, so both halves of a pairing read the same record and neither is
 *  invented locally. */
function toAppUser(me) {
  const p = me.profile || {};
  // Founders (`admin`) only ever use the mentor product surface.
  const isMentor = isMentorRole(me.user.role || "mentee");
  // "fresh" means day one: no history to show, so screens render first-run copy
  // rather than a fabricated six weeks of it.
  const fresh = !p.onboardingCompletedAt || (p.week ?? 1) <= 1;
  /* Google sign-in already hands us a photo, so an account that never uploaded
     one still has a face. Whatever they set on Ryzn wins over it. */
  const pictures = {
    avatarUrl: p.avatarUrl ?? me.user?.image ?? null,
    bannerUrl: p.bannerUrl ?? null,
  };
  if (isMentor) {
    return {
      ...pictures,
      fresh,
      handle: p.handle ?? null,
      impact: p.impact ?? 0,
      tier: p.tier || "Scout",
      mentorRank: p.mentorRank ?? null,
      cohort: me.cohort ?? [],
      capacity: p.capacity ?? 4,
      greetingUploaded: !!p.greetingUploaded,
      headline: p.headline ?? null,
      industry: Array.isArray(p.industry) ? (p.industry[0] ?? null) : (p.industry ?? null),
      why: p.why ?? null,
      // Already shown to strangers in MentorDetailSheet; the mentor's own
      // profile was the one place they weren't rendered.
      expertise: p.expertise ?? [],
      menteeFit: p.menteeFit ?? [],
      education: p.education ?? null,
      experience: p.experience ?? null,
    };
  }
  return {
    ...pictures,
    fresh,
    handle: p.handle ?? null,
    headline: p.headline ?? null,
    week: p.week ?? 1,
    streak: p.streak ?? 0,
    xp: p.xp ?? 0,
    rank: p.rank ?? null,
    stage1Complete: !!p.stage1Complete,
    todayExercise: me.exercise?.today ?? null,
    /* Every accepted mentor, equal, oldest first. Empty until one accepts —
       screens must handle "no mentor yet" rather than falling back to a name.
       Each entry carries the mentor's *user* id, which is what /api/posts,
       /api/program and /api/messages all key on; `matchId` is only for ending
       the pairing. There is deliberately no "active mentor" here: a mentee with
       three mentors has three Orbits, not one plus two names in a list. */
    mentors: me.mentors ?? [],
    track: Array.isArray(p.track) ? (p.track[0] ?? null) : (p.track ?? null),
    goals: p.goals ?? [],
    skills: p.skills ?? [],
    interests: p.interests ?? [],
    influences: p.influences ?? [],
    education: p.education ?? null,
    experience: p.experience ?? null,
    earned: p.earned || {},
  };
}

export default function RyznComplete() {
  const [inviteArrival] = useState(inviteFromHash);
  const [inviteCode] = useState(inviteArrival.code);
  const [booting, setBooting] = useState(true);
  const [introTourOpen, setIntroTourOpen] = useState(false);
  const [comprehensiveTourOpen, setComprehensiveTourOpen] = useState(false);
  const [spotlightTab, setSpotlightTab] = useState(null);
  const introCheckedRef = useRef(false);
  const [session, setSession] = useState(null);          // /api/me payload, or null when signed out
  // An invited mentor is a mentor: skip the role picker they were never meant
  // to see, and open on the claim form rather than the splash. Mentee invites
  // land on the mentee side the same way.
  const [role, setRole] = useState(
    inviteArrival.role === "mentee" ? "mentee" : (inviteCode ? "mentor" : "mentee")
  );
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
  const [inviteBusy, setInviteBusy] = useState(false);

  // app state
  const [tab, setTab] = useState("home");
  const [overlay, setOverlay] = useState(null);
  const [profileFollowBusy, setProfileFollowBusy] = useState(false);
  const [badgeModal, setBadgeModal] = useState(null);
  const [todayDone, setTodayDone] = useState(false);
  const [submittingExercise, setSubmittingExercise] = useState(false);
  const [midwayEarned, setMidwayEarned] = useState(false);
  const [showMidway, setShowMidway] = useState(false);
  const [justEarnedId, setJustEarnedId] = useState(null);
  const [watched, setWatched] = useState({});
  const [reacted, setReacted] = useState({});
  const [mentorFeed, setMentorFeed] = useState([]);
  /* Posts by other mentors that this mentor put in their own Orbit. Kept apart
     from `mentorFeed` because they are not theirs to edit, pin or delete — only
     to stop relaying. A mentee's Orbit gets the two already merged server-side. */
  const [relayed, setRelayed] = useState([]);
  /* The mentee side: one feed per mentor, keyed by mentor user id, because a
     mentee holds up to three and each Orbit shows only its own. `mentorFeed`
     above stays what its name says — the signed-in mentor's own posts. */
  const [feeds, setFeeds] = useState({});
  const [highlightPostId, setHighlightPostId] = useState(null);
  /* A circle link waiting to be accepted: `{ slug, circle, joined, error }`.
     Held in state rather than routed to, because it opens over whatever the
     person was already doing and leaves them there if they decline. */
  const [circleInvite, setCircleInvite] = useState(null);
  const [circleBusy, setCircleBusy] = useState(false);
  /* The unlock ceremony, and the orbit it fired for. Keyed by orbit because the
     track is per orbit — finishing it at work is a separate moment from
     finishing it in a circle, and each one is worth marking. */
  const [chatCeremony, setChatCeremony] = useState(null);
  const chatOpenRef = useRef({});
  /* Notification, visibility and availability preferences. Identity-level, so
     they are read once from /api/me and not per orbit. */
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [menteeAdds, setMenteeAdds] = useState(0);
  const [program, setProgram] = useState({ phases: [], completedPhaseIds: [] });
  /* The mentee side: one program per mentor, keyed the same way as `feeds`. */
  const [programs, setPrograms] = useState({});
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);
  const [sessionBusy, setSessionBusy] = useState(false);

  const toast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2000); };
  const addXp = (n) => { setXp(x => x + n); toast(`+${n} ${role === "mentee" ? "XP" : "IMPACT"}`); };
  const addUserXp = (n) => setUser(u => u && u.xp !== undefined ? { ...u, xp: u.xp + n } : u);
  const addUserImpact = (n) => setUser(u => u && u.impact !== undefined ? { ...u, impact: u.impact + n } : u);

  /* — solo or teams —
     Belonging to an organisation changes which product this is. Somebody who
     joined a company's programme is not browsing Ryzn-the-network; they are
     inside their employer, under rules their HR set, and the surface reflects
     that. `session.org` is the whole switch: the server writes it when an org
     invite is claimed (api/invites/redeem.js) and drops it when they leave, so
     being invited or removed flips the app on the next /api/me with nothing
     stored locally to go stale. Declared here because `navTo` and the tab
     guard both need it long before the screens do. */
  /* — orbits —
     Since v2 the switch above is the *active orbit*, not the account. A person
     can hold a company seat, a circle membership and the public orbit at once,
     and which surface they see is decided by where they are standing right now
     — not by a field on their user row. `session.org` still says which company
     they belong to; it no longer says which product they are using.

     Every screen below branches on `policy` values, never on `orbit.kind`. The
     policy arrives resolved from /api/orbits and is passed down as a prop; the
     only writers are the two consoles. */
  /* Loaded as soon as there is a session, not once the app opens: onboarding
     happens *inside* an orbit and its opening line needs to know which one. */
  const orbits = useOrbits(!!session?.user);
  const orbit = orbits.orbit;
  const policy = orbits.policy;
  /* Pulled out as a plain string so every loader below can depend on *it*
     rather than on the hook's object, which is a new reference each render. */
  const activeOrbitId = orbits.orbitId;
  /* Until /api/orbits answers, the account's org is the best guess at where this
     person stands — and it is the answer the app gave before orbits existed. Not
     guessing would flash the public surface at an employee on every cold start. */
  const mode = (orbits.loading ? !!session?.org : orbit?.kind === "private") ? "teams" : "solo";
  /* Teams screens read the org payload from /api/me for names, invites and
     counts. It is the right one whenever the active orbit is the company one —
     which is exactly when `mode` is "teams". */
  const org = mode === "teams" ? (session?.org ?? null) : null;

  /* Teams has four tabs where solo has five, so a tab that exists in one mode
     may not exist in the other. Without this, someone sitting on Badges when
     their org invite lands renders an empty body until they tap something. */
  useEffect(() => {
    if (phase !== "app") return;
    const allowed = mode === "teams"
      ? TEAMS_TABS[role]
      : (role === "mentee"
        // "meets" stays allowed though it left the tab bar — notification deep
        // links still land there, and a destination with no tab is fine.
        ? ["home", "exercises", "chat", "badges", "meets", "profile"]
        : ["home", "feed", "sessions", "meets", "profile"]);
    if (!allowed.includes(tab)) setTab("home");
  }, [mode, role, tab, phase]);

  /* Moving between orbits. Not a reload and not a re-auth: the identity below is
     the same one, so XP, badges, follows and the session all stay put. What
     changes is the resolved policy — and, because the surfaces differ, the tab
     and any open overlay, which would otherwise point at a screen the new orbit
     doesn't have. The toast names the rules rather than the orbit, so the first
     thing someone learns after switching is what is different here. */
  const switchOrbit = (id) => {
    const next = orbits.orbits.find((o) => o.id === id);
    orbits.switchTo(id);
    setOverlay(null);
    setTab("home");
    if (next) {
      toast(next.policy?.matchMode === "Apply" ? `${next.name} · mentors approve` : `${next.name} · open matching`);
    }
  };

  const resetAppState = () => {
    setTab("home"); setOverlay(null); setBadgeModal(null); setTodayDone(false);
    setMidwayEarned(false); setShowMidway(false); setJustEarnedId(null);
    setWatched({}); setReacted({}); setMenteeAdds(0); setRelayed([]);
    setIntroTourOpen(false); setSpotlightTab(null); introCheckedRef.current = false;
  };

  /* — session bootstrap —
     One call answers three questions: who are you, what role, and have you set
     up yet. A 401 is the normal signed-out case, not an error. */
  const loadSession = useCallback(async () => {
    try {
      const me = await fetchMe();
      setSession(me);
      setRole(appSide(me.user.role));
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
    /* Preferences arrive resolved, with defaults already filled in server-side —
       so a toggle never renders off for a preference that is actually on. */
    if (me.profile?.prefs) setPrefs(me.profile.prefs);
    if (!isMentorRole(me.user.role || "mentee")) {
      setTodayDone(!!me.exercise?.todayDone);
    }
  }, []);

  /* Hold an arriving code somewhere a page load cannot reach: "Continue with
     Google" returns to /app/ with the hash stripped, and the sign-in screen is
     equally a place someone lands from an invitation link. Both are settled by
     settleInvite rather than by the screen they happened to arrive on. */
  useEffect(() => { if (inviteCode) stashPendingInvite(inviteCode); }, [inviteCode]);

  /* Spend a stashed code now that there is a session to spend it with, and
     re-read /api/me if it changed anything — a claim can flip the role, and
     every screen below branches on it. Returns the session either way. */
  const settleInvite = useCallback(async (me) => {
    if (!me || !readPendingInvite()) return me;
    const claimed = await claimPendingInvite();
    if (!claimed?.ok || claimed.already) return me;
    return (await loadSession()) || me;
  }, [loadSession]);

  /* Onboarding is one-time. /api/me resolves the flag from profile / answers /
     a fresh user doc (not cookieCache), so a completed setup never restarts. */
  useEffect(() => {
    let alive = true;
    (async () => {
      // Claim before routing: coming back from Google, this is the first moment
      // a session exists, and the role it grants decides where they land.
      const me = await settleInvite(await loadSession());
      if (!alive) return;
      if (me) {
        if (isOnboardingDone(me)) { applyMe(me); setPhase("app"); }
        else { setPhase("journey"); setStage("chat"); }
      }
      setBooting(false);
    })();
    return () => { alive = false; };
  }, [loadSession, applyMe, settleInvite]);

  /* — roster —
     Loaded when the match deck is about to show. Empty is a valid result: an
     early cohort has nobody on the other side yet. */
  /* Both reads are scoped to the orbit the person is standing in: the deck draws
     from that orbit's pool under that orbit's policy, and the seat counter
     counts against that orbit's cap. Switching orbits re-runs them, which is
     what makes a policy change visible without a reload. */
  const loadRoster = useCallback(async () => {
    setRosterLoading(true); setRosterError(null);
    try {
      const [{ people }, { matches: mine }] = await Promise.all([
        fetchRoster({ orbitId: activeOrbitId }),
        fetchMatches(activeOrbitId),
      ]);
      setRoster(Array.isArray(people) ? people : []);
      setMatches(Array.isArray(mine) ? mine : []);
    } catch (err) {
      console.error("[ryzn] roster/matches failed:", err);
      setRosterError(err);
      setRoster([]);
      setMatches([]);
    } finally {
      setRosterLoading(false);
    }
  }, [activeOrbitId]);

  const loadMatches = useCallback(async () => {
    try {
      const { matches: mine } = await fetchMatches(activeOrbitId);
      const rows = Array.isArray(mine) ? mine : [];
      setMatches(rows);
      return rows;
    } catch (err) {
      console.error("[ryzn] /api/matches failed:", err);
      return [];
    }
  }, [activeOrbitId]);

  /** Re-reads /api/me so the app reflects a pairing change immediately. */
  const refreshUser = useCallback(async () => {
    const me = await loadSession();
    if (me) applyMe(me);
    return me;
  }, [loadSession, applyMe]);

  useEffect(() => { if (stage === "matches" && phase === "journey") loadRoster(); }, [stage, phase, loadRoster]);
  /* Pending invites must reach the in-app Notifications surface, not only the
     onboarding deck — otherwise a mentor invite sits unanswered with no UI.
     Poll while the app is open so an invite that lands mid-session pops the
     top-right alert without a refresh. */
  useEffect(() => {
    if (phase !== "app") return;
    loadMatches();
    const tick = setInterval(loadMatches, 20_000);
    const onFocus = () => loadMatches();
    const onVis = () => { if (document.visibilityState === "visible") loadMatches(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(tick);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [phase, loadMatches]);

  /* — mentor content —
     A mentor loads their own feed; a mentee loads one per mentor they hold.
     Same endpoint, and the server decides what each is allowed to see —
     /api/posts?mentorId= has always been per-mentor and pair-authorised, so
     this is the client catching up to it. It previously fetched only the
     "active" mentor's posts, which is why a second mentor's Orbit was empty of
     content that existed and was already readable.

     `viewerState` restores what's already been watched and reacted to. It comes
     back per request, so the maps are merged across mentors rather than
     replaced — otherwise the last feed to land would erase the others. */
  const mentorIds = useMemo(
    () => (role === "mentee" ? (user?.mentors || []).map(m => m.id) : []),
    [role, user?.mentors]
  );
  // Stable across renders that don't change the set — the loaders depend on it.
  const mentorIdKey = mentorIds.join(",");

  const loadFeed = useCallback(async () => {
    if (role === "mentee") {
      const ids = mentorIdKey ? mentorIdKey.split(",") : [];
      if (!ids.length) { setFeeds({}); setWatched({}); setReacted({}); return; }
      const results = await Promise.all(ids.map(async (id) => {
        try {
          const { posts, viewerState } = await fetchPosts({ mentorId: id });
          return [id, posts || [], viewerState];
        } catch (err) {
          console.error(`[ryzn] /api/posts?mentorId=${id} failed:`, err);
          return [id, [], null];
        }
      }));
      setFeeds(Object.fromEntries(results.map(([id, posts]) => [id, posts])));
      const watchedIds = results.flatMap(([, , vs]) => vs?.watched || []);
      const reactedIds = results.flatMap(([, , vs]) => vs?.reacted || []);
      setWatched(Object.fromEntries(watchedIds.map(id => [id, true])));
      setReacted(Object.fromEntries(reactedIds.map(id => [id, true])));
      return;
    }
    try {
      const { posts, amplified, viewerState } = await fetchPosts({});
      setMentorFeed(posts || []);
      setRelayed(amplified || []);
      setWatched(Object.fromEntries((viewerState?.watched || []).map(id => [id, true])));
      setReacted(Object.fromEntries((viewerState?.reacted || []).map(id => [id, true])));
    } catch (err) {
      console.error("[ryzn] /api/posts failed:", err);
    }
  }, [role, mentorIdKey]);

  useEffect(() => { if (phase === "app") loadFeed(); }, [phase, loadFeed]);

  /* The unlock ceremony. Fires on the transition from locked to open, never on
     the state itself — otherwise it re-fires on every refresh for someone who
     unlocked chat weeks ago. The first reading of an orbit only seeds the ref,
     which is why arriving already-unlocked is silent. */
  useEffect(() => {
    if (phase !== "app" || role !== "mentee" || !orbit || orbit.chatOpen === undefined) return;
    const seen = chatOpenRef.current;
    const before = seen[orbit.id];
    seen[orbit.id] = orbit.chatOpen;
    if (before === false && orbit.chatOpen === true) setChatCeremony(orbit.id);
  }, [phase, role, orbit?.id, orbit?.chatOpen]);

  /* A circle invitation link. Resolved once there is a session to join with —
     a signed-out visitor lands in the normal journey first and the slug waits in
     the hash, which is where it came from and where a page load can't lose it. */
  useEffect(() => {
    if (phase !== "app" || !user) return;
    const slug = circleSlugFromHash();
    if (!slug || circleInvite?.slug === slug) return;
    let cancelled = false;
    setCircleInvite({ slug, circle: null, joined: false, error: null });
    (async () => {
      try {
        const { circle, joined } = await fetchCircle(slug);
        if (!cancelled) setCircleInvite({ slug, circle, joined, error: null });
      } catch (err) {
        if (!cancelled) setCircleInvite({ slug, circle: null, joined: false, error: err });
      }
    })();
    return () => { cancelled = true; };
  }, [phase, user, circleInvite?.slug]);

  /** One tap, then straight into the circle — and the follow that comes with it
      is what puts the creator's next post in this person's feed everywhere. */
  const acceptCircle = async () => {
    if (!circleInvite?.circle || circleBusy) return;
    setCircleBusy(true);
    try {
      const { orbits: list, joined } = await joinCircle({ slug: circleInvite.slug });
      orbits.applyOrbits(list);
      clearCircleHash();
      setCircleInvite(null);
      if (joined) switchOrbit(joined);
      toast(`Joined ${circleInvite.circle.name}`);
    } catch (e) {
      toast(e.message || "Couldn't join that circle.");
    } finally {
      setCircleBusy(false);
    }
  };

  const clearCircleHash = () => {
    if (typeof window !== "undefined" && circleSlugFromHash()) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  /* Share deep link: open the post the recipient is allowed to see. */
  useEffect(() => {
    if (phase !== "app" || !user) return;
    const id = postIdFromHash();
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const { post } = await fetchPosts({ id });
        if (cancelled || !post) return;
        setHighlightPostId(post.id);
        if (role === "mentee") {
          /* Into the Orbit of whoever wrote it. A shared post used to open
             "the" Orbit, which was the wrong mentor's whenever the author was
             one of the other two. Amplified posts carry a foreign author, so
             fall back to the first Orbit rather than opening none. */
          const owner = (user.mentors || []).find(m => String(m.id) === String(post.authorId))
            || (user.mentors || [])[0];
          if (owner) setOverlay({ orbit: owner.id });
        } else if (String(post.authorId) === String(session?.user?.id)) {
          setTab("feed");
          setOverlay(null);
        } else {
          setOverlay({
            mentorProfile: {
              id: post.authorId,
              name: "Mentor",
              matchState: "accepted",
            },
          });
        }
        toast("Opened shared post");
      } catch (e) {
        toast(e.message || "That shared post isn’t available to you.");
      } finally {
        if (window.location.hash.startsWith("#/post/")) {
          history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mentorIdKey, role, session?.user?.id]);

  /* Derived, not stored: the greeting *is* a post, so the feed is the only
     thing that can answer whether one exists. */
  const greetingUp = mentorFeed.some(p => p.greeting);

  /* The authored program. A mentor has one; a mentee reads one per mentor, and
     each is that mentor's own curriculum with the mentee's progress against it
     — so they are held apart by mentor id and never merged into a single
     timeline. `program` stays the mentor's own for the mentor side. */
  const loadProgram = useCallback(async () => {
    if (role === "mentee") {
      const ids = mentorIdKey ? mentorIdKey.split(",") : [];
      if (!ids.length) { setPrograms({}); return; }
      const results = await Promise.all(ids.map(async (id) => {
        try {
          const data = await fetchProgram({ mentorId: id });
          return [id, { phases: data.phases || [], completedPhaseIds: data.completedPhaseIds || [] }];
        } catch (err) {
          console.error(`[ryzn] /api/program?mentorId=${id} failed:`, err);
          return [id, { phases: [], completedPhaseIds: [] }];
        }
      }));
      setPrograms(Object.fromEntries(results));
      return;
    }
    try {
      const data = await fetchProgram({});
      setProgram({ phases: data.phases || [], completedPhaseIds: data.completedPhaseIds || [] });
    } catch (err) {
      console.error("[ryzn] /api/program failed:", err);
    }
  }, [role, mentorIdKey]);

  useEffect(() => { if (phase === "app") loadProgram(); }, [phase, loadProgram]);

  const saveProgramPhases = async (phases) => {
    try { await saveProgram(phases); await loadProgram(); }
    catch (e) { toast(e.message || "Couldn't save that."); }
  };

  /* Mentor Meets events: lazy-loaded when the meets tab is first visited. */
  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const { events: rows } = await fetchEvents();
      setEvents(rows || []);
    } catch (err) {
      console.error("[ryzn] /api/events failed:", err);
      setEventsError(err);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  /* Meets is a tab in solo and an overlay in teams — load on either, or the
     teams side opens a screen that never fetches. */
  useEffect(() => {
    if (phase === "app" && (tab === "meets" || overlay === "meets")) loadEvents();
  }, [phase, tab, overlay, loadEvents]);

  const createEventHandler = async (body) => {
    const res = await createEvent(body);
    await loadEvents();
    return res;
  };

  const eventActionHandler = async (id, action, extra) => {
    const res = await eventAction(id, action, extra);
    await loadEvents();
    return res;
  };

  /* — 1:1 sessions —
     Both sides read the same documents, so a booking made by one is visible to
     the other on their next load. Polled alongside the app being open because a
     proposal can land while the tab sits there. */
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const { sessions: rows } = await fetchSessions();
      setSessions(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("[ryzn] /api/sessions failed:", err);
      setSessionsError(err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (phase !== "app") return;
    loadSessions();
    const tick = setInterval(loadSessions, 60_000);
    const onVis = () => { if (document.visibilityState === "visible") loadSessions(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(tick); document.removeEventListener("visibilitychange", onVis); };
  }, [phase, loadSessions]);

  /* Who the caller can book with: an accepted pairing on either side. The server
     enforces the same rule — this only decides what the composer offers. */
  const sessionPeople = useMemo(() => {
    if (!user) return [];
    if (role === "mentor") return (user.cohort || []).map(m => ({ id: m.id, name: m.name, week: m.week }));
    return (user.mentors || []).map(m => ({ id: m.id, name: m.name, week: user.week }));
  }, [user, role]);

  const createSessionHandler = async (body) => {
    const res = await createSession(body);
    await loadSessions();
    const who = (sessionPeople.find(p => p.id === body.otherId)?.name || "them").split(" ")[0];
    toast(`Times sent to ${who}`);
    return res;
  };

  const sessionActionHandler = async (id, action, extra) => {
    if (sessionBusy) return;
    setSessionBusy(true);
    try {
      const res = await sessionAction(id, action, extra);
      await loadSessions();
      const said = {
        accept: "Booked · add it to your calendar",
        decline: "Declined",
        reschedule: "New times sent",
        cancel: "Session canceled",
        complete: "Session logged",
        update: "Session updated",
      };
      if (said[action]) toast(said[action]);
      return res;
    } catch (e) {
      toast(e?.message || "Couldn’t save that.");
    } finally {
      setSessionBusy(false);
    }
  };

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

  /* If a finished account somehow lands on the AI chat stage, bounce to the app. */
  useEffect(() => {
    if (booting || phase !== "journey" || stage !== "chat") return;
    if (!isOnboardingDone(session)) return;
    enterApp(session);
  // enterApp is stable enough for this bounce; session/phase/stage are the triggers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booting, phase, stage, session]);

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

  /* — first-run tutorial: slideshow once per role, then per-tab spotlights — */
  useEffect(() => {
    if (introCheckedRef.current || phase !== "app" || !user) return;
    introCheckedRef.current = true;
    if (!hasCompletedTour(role)) {
      const t = setTimeout(() => setComprehensiveTourOpen(true), 500);
      return () => clearTimeout(t);
    }
  }, [phase, user, role]);

  useEffect(() => {
    if (phase !== "app" || !user) return;
    if (overlay || badgeModal || showMidway || introTourOpen) { setSpotlightTab(null); return; }
    if (hasSeenTabHint(role, tab)) { setSpotlightTab(null); return; }
    const t = setTimeout(() => setSpotlightTab(tab), 400);
    return () => clearTimeout(t);
  }, [tab, phase, user, overlay, badgeModal, showMidway, introTourOpen, role]);

  const dismissTabHint = () => { markTabHintSeen(role, tab); setSpotlightTab(null); };

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

  /* The First Session badge, derived from real bookings: earned once a session
     has been logged, in progress once one is on the calendar. */
  const firstSession = useMemo(() => {
    if (role !== "mentee") return null;
    const done = sessions.find(s => s.status === "completed");
    if (done) return { earned: fmtDate(done.confirmedSlot?.start || done.completedAt) };
    const next = sessions
      .filter(s => s.status === "confirmed")
      .sort((a, b) => new Date(a.confirmedSlot.start) - new Date(b.confirmedSlot.start))[0];
    return next ? { label: `Booked for ${fmtDate(next.confirmedSlot.start)}` } : null;
  }, [sessions, role]);

  const badges = user && role === "mentee"
    ? makeMenteeBadges(
        {
          ...(midwayEarned ? { ...user.earned, midway: "Today" } : user.earned),
          ...(firstSession?.earned ? { first: firstSession.earned } : {}),
        },
        user.streak || 0,
        user.milestones || 0,
        firstSession?.label || null
      )
    : [];

  const todayEx = EXERCISE_TRACK[0];
  const submitToday = async (text) => {
    if (todayDone || submittingExercise) return;
    setSubmittingExercise(true);
    try {
      /* Written in an orbit, and it completes that orbit's track. Someone six
         weeks in at work is still on step one in a circle they joined
         yesterday — the paragraph counts where it was written. */
      const res = await submitExercise({ text, exerciseId: "write-your-why", orbitId: activeOrbitId });
      setTodayDone(true);
      setUser(u => u && ({
        ...u,
        xp: res.xp ?? ((u.xp || 0) + (res.awarded || todayEx.xp)),
        streak: res.streak ?? u.streak,
        stage1Complete: true,
        todayExercise: res.exercise ?? u.todayExercise,
      }));
      toast(`+${res.awarded || todayEx.xp} XP · streak day ${res.streak ?? (user?.streak || 0)}`);
      /* Re-read the orbits so the track advances and, if that was the last step,
         the unlock ceremony fires. The ceremony is the announcement now — a
         toast claiming Direct Connect was open would be wrong in an orbit whose
         policy still gates it, or whose track has a step left. */
      await orbits.refresh();
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

  const publishPost = async ({ kind, text, title, media, visibility }) => {
    // Throws on failure so the Composer can keep the draft and show why.
    // `impact` comes back from the server, which is what actually awarded it.
    const { impact } = await createPost({ kind, text, title, media, visibility });
    await Promise.all([loadFeed(), refreshUser()]);
    const n = user?.cohort?.length || 0;
    toast(visibility === "public"
      ? `+${impact} Impact · public link ready`
      : `+${impact} Impact · live in ${n} mentee orbit${n === 1 ? "" : "s"}`);
  };

  const reactToPost = async (id) => {
    if (reacted[id]) return { already: true };
    setReacted(r => ({ ...r, [id]: true }));
    try {
      const res = await postAction(id, "react");
      if (res?.self) {
        setReacted(r => { const n = { ...r }; delete n[id]; return n; });
        return res;
      }
      /* The post lives in the mentor's own feed or in one of the mentee's
         per-mentor feeds — patch wherever it is rather than guessing which. */
      const bump = (p) => (p.id === id ? { ...p, reactions: (p.reactions ?? 0) + 1 } : p);
      setMentorFeed((feed) => (feed || []).map(bump));
      setFeeds((byMentor) => Object.fromEntries(
        Object.entries(byMentor).map(([mid, posts]) => [mid, (posts || []).map(bump)])
      ));
      toast("Liked");
      return res;
    } catch (e) {
      setReacted(r => { const n = { ...r }; delete n[id]; return n; });
      throw e;
    }
  };

  const openAuthorProfile = (person) => {
    if (!person?.id && !person?.name) return;
    // Own name on your feed → Profile tab.
    if (session?.user?.id && person.id && String(person.id) === String(session.user.id)) {
      setOverlay(null);
      setTab("profile");
      return;
    }
    /* Returning to the Orbit the profile was opened from means remembering
       *which* Orbit — `from` carries the whole overlay, not a bare string. */
    const from = (overlay === "orbit" || overlay?.orbit) ? overlay : undefined;
    /* One of the mentee's own mentors, tapped from an Orbit or a post header.
       Checked against every mentor they hold, not just one: the details on the
       card come from the match, so the wrong lookup renders a real mentor
       under a stranger's name. */
    const own = role === "mentee"
      ? (user?.mentors || []).find(m => String(m.id) === String(person.id))
      : null;
    if (own) {
      setOverlay({
        mentorProfile: {
          id: own.id,
          name: own.name,
          headline: own.headline,
          avatarUrl: own.avatarUrl,
          tier: own.tier,
          matchState: "accepted",
        },
        from,
      });
      return;
    }
    setOverlay({
      mentorProfile: {
        id: person.id,
        name: person.name || "Mentor",
        headline: person.headline,
        avatarUrl: person.avatarUrl,
        tier: person.tier,
        matchState: person.matchState,
        // Carried over when the caller already knows it (e.g. the mentor
        // network list) so the button doesn't flash "Follow" before the
        // lookup below resolves it.
        following: typeof person.following === "boolean" ? person.following : undefined,
      },
      from,
    });
  };

  /* Follow lives on `overlay.mentorProfile` itself rather than separate state,
     same as network.jsx keeps it on `detail` — one object to keep in sync
     instead of two. Resolved lazily: most callers (a feed post's byline, a
     match card) don't know the viewer's follow state up front, only the
     mentor network list does. Mentor-to-mentor only, matching api/roster.js —
     a mentee viewing their own mentor, or a mentor viewing themselves, never
     gets a follow lookup or button. */
  useEffect(() => {
    const target = overlay?.mentorProfile;
    if (role !== "mentor" || !target?.id) return;
    if (session?.user?.id && String(target.id) === String(session.user.id)) return;
    if (typeof target.following === "boolean") return;
    let cancelled = false;
    (async () => {
      try {
        const { people } = await fetchRoster({ side: "mentors", q: target.name });
        const match = (people || []).find((p) => String(p.id) === String(target.id));
        if (!cancelled && typeof match?.following === "boolean") {
          setOverlay((o) => (o?.mentorProfile?.id === target.id
            ? { ...o, mentorProfile: { ...o.mentorProfile, following: match.following } }
            : o));
        }
      } catch {
        // A failed lookup just leaves the button unresolved for this open —
        // it still works, starting from "Follow" rather than blocking on it.
      }
    })();
    return () => { cancelled = true; };
  }, [overlay?.mentorProfile?.id, overlay?.mentorProfile?.following, role, session?.user?.id]);

  const toggleProfileFollow = async () => {
    const target = overlay?.mentorProfile;
    if (!target?.id || profileFollowBusy) return;
    const next = !target.following;
    setProfileFollowBusy(true);
    setOverlay((o) => (o?.mentorProfile?.id === target.id
      ? { ...o, mentorProfile: { ...o.mentorProfile, following: next } }
      : o));
    try {
      await (next ? followMentor(target.id) : unfollowMentor(target.id));
      toast(next ? `Following ${firstNameOf(target.name)}` : `Unfollowed ${firstNameOf(target.name)}`);
    } catch (e) {
      setOverlay((o) => (o?.mentorProfile?.id === target.id
        ? { ...o, mentorProfile: { ...o.mentorProfile, following: !next } }
        : o));
      toast(e?.message || "Couldn’t save that.");
    } finally {
      setProfileFollowBusy(false);
    }
  };

  const pinPost = async (id, pinned) => {
    try { await updatePost(id, { pinned }); await loadFeed(); toast(pinned ? "Pinned to the top" : "Unpinned"); }
    catch (e) { toast(e.message || "Couldn’t change that."); }
  };

  /* Public is what makes ryzn.one/p/<slug> open for a stranger — the same
     switch that puts the post on the mentor's profile. */
  const setPostVisibility = async (id, visibility) => {
    try {
      await updatePost(id, { visibility });
      await loadFeed();
      toast(visibility === "public"
        ? "Public — anyone with the link can open this"
        : "Private — only your cohort can see this");
    } catch (e) { toast(e.message || "Couldn’t change that."); }
  };

  const removePost = async (id) => {
    try { await deletePost(id); await loadFeed(); toast("Post deleted"); }
    catch (e) { toast(e.message || "Couldn’t delete that."); }
  };

  /* The relay toggle as it appears on your own Feed tab, where everything shown
     is already in your Orbit — so this is almost always the "remove" direction.
     It still honours `next` rather than assuming, because the card stays on
     screen until loadFeed answers. Re-throws so PostCard can restore its own
     button on failure. */
  const setRelaying = async (post, next) => {
    await (next ? amplifyPost(post.id) : unamplifyPost(post.id));
    await loadFeed();
    toast(next ? "Added to your Orbit" : "Removed from your Orbit");
  };

  /* The greeting is a pinned video post like any other — that's what makes it
     show up in a mentee's Orbit. It used to set a boolean and nothing else. */
  const uploadGreeting = async (media) => {
    await createPost({ kind: "video", title: "Start here", media, greeting: true });
    await Promise.all([loadFeed(), refreshUser()]);
    toast("+25 Impact · greeting pinned to your Orbit");
  };

  /* `answer` is what the applicant wrote to qualify. It is required where the
     orbit's policy is Apply and ignored where it is Open — the deck collects it
     or doesn't, and this passes on whatever it got rather than deciding again. */
  const addMentor = async (m, answer) => {
    try {
      await requestMatch(m.id, "request", { orbitId: orbits.orbitId, answer });
      await Promise.all([loadRoster(), refreshUser()]);
      addUserXp(15);
      toast(policy?.matchMode === "Apply"
        ? `Application sent to ${m.name.split(" ")[0]}`
        : `Request sent to ${m.name.split(" ")[0]}`);
    } catch (e) { toast(e.message || "Couldn’t send that request."); }
  };
  /* Leaving writes to the shared match record, so the mentor sees the same
     change. There is no promote any more — mentors aren't ranked, so there is
     nothing to promote a mentor to. */
  const leaveMentor = async (m) => {
    try {
      await respondToMatch(m.matchId, "end");
      await Promise.all([loadRoster(), refreshUser()]);
      toast(`Left ${m.name.split(" ")[0]}’s orbit · seat opened`);
    } catch (e) { toast(e.message || "Couldn’t leave that orbit."); }
  };
  const addMentee = async (m) => {
    try {
      await requestMatch(m.id, "request", { orbitId: orbits.orbitId });
      await Promise.all([loadRoster(), refreshUser()]);
      setMenteeAdds(n => n + 1);
      addUserImpact(30);
      toast(`Invitation sent to ${m.name.split(" ")[0]} · +30 Impact`);
    } catch (e) { toast(e.message || "Couldn’t send that invitation."); }
  };

  /* — preferences, export, deletion —
     Preferences are identity-level: one set per person, carried into every
     orbit. Written optimistically because a toggle that waits on a round trip
     feels broken, and reconciled from the server's merged answer. */
  const savePrefs = async (patch) => {
    setPrefs((p) => ({ ...p, ...patch }));
    setPrefsBusy(true);
    try {
      const res = await updatePrefs(patch);
      if (res?.profile?.prefs) setPrefs(res.profile.prefs);
    } catch (e) {
      await refreshUser();               // put the switch back where it really is
      toast(e.message || "Couldn't save that.");
    } finally {
      setPrefsBusy(false);
    }
  };

  const downloadMyData = async () => {
    try {
      const blob = await exportMyData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ryzn-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
      toast("Your data is downloading");
    } catch (e) { toast(e.message || "Couldn't build your export."); }
  };

  const deleteAccountHandler = async () => {
    try {
      await deleteMyAccount();
      /* Nothing to clean up locally — the account is gone, so a full reload
         lands on the signed-out journey with no stale state to disagree. */
      window.location.href = "/app/";
    } catch (e) { toast(e.message || "Couldn't delete that account."); }
  };

  /* Leaving takes the membership and nothing else: XP, tier, badges, streak and
     follows are identity-level and survive. The Settings copy promises exactly
     this, and api/orbits.js is where the promise is kept. */
  const leaveOrbitHandler = async (id) => {
    try {
      const { orbits: list } = await leaveOrbit(id);
      orbits.applyOrbits(list);
      if (id === activeOrbitId) switchOrbit("public");
      toast("Left the orbit · your XP and badges are still yours");
    } catch (e) { toast(e.message || "Couldn't leave that orbit."); }
  };

  const updateUserProfile = async (field, value) => {
    try {
      await updateProfile({ [field]: value });
      await refreshUser();
      toast("Profile updated");
    } catch (e) { toast(e.message || "Couldn’t save that."); }
  };

  /* Seats, in one place — Explore and the add decks must agree on whether
     there’s room, and the answer differs per side. */
  const mentorCapacity = session?.profile?.capacity ?? 4;
  /* Seats are per orbit, so only the mentors held *here* count against the cap.
     Matches formed before orbits existed carry no orbitId and belong to the
     public orbit — the same rule the server reads them under. */
  const mentorsHeld = (user?.mentors || []).filter(
    (m) => (m.orbitId || "public") === orbits.orbitId
  ).length;
  /* `policy.cap` is the number. The constant is only what an orbit that hasn't
     answered yet falls back to. */
  const mentorSeatsLeft = (policy?.cap ?? 3) - mentorsHeld;
  const cohortSeatsLeft = mentorCapacity - (user?.cohort?.length || 0);

  /* — notification deep links — */
  const navTo = (to) => {
    setOverlay(null);
    /* Teams keeps four tabs, so most destinations are overlays there and two of
       the remaining tabs are named differently. Mapped rather than ignored — a
       notification deep link has to land on a real screen in both modes. */
    if (mode === "teams") {
      const asOverlay = ["exercises", "badges", "meets", "sessions", "cohort", "dm", "orbit", "board", "explore", "network"];
      if (asOverlay.includes(to)) { setTimeout(() => setOverlay(to), 60); return; }
      setTab({ feed: "roster", mentors: "mentors", chat: "chat", profile: "profile" }[to] || "home");
      return;
    }
    // Sessions is a tab on the mentor side and an overlay on the mentee side.
    const asOverlay = ["cohort", "dm", "orbit", "board", "explore", "network"].includes(to)
      || (to === "sessions" && role === "mentee");
    if (asOverlay) setTimeout(() => setOverlay(to), 60);
    else setTab(to);
  };

  /* — journey content — */
  const journeyContent = () => {
    switch (stage) {
      case "role": return <RoleSelect onPick={(r) => { setRole(r); setStage("welcome"); }} />;
      case "welcome": return <Welcome role={role} go={setStage} />;
      case "register": return <Register role={role} go={setStage} initialInvite={inviteCode} onDone={async () => {
        addXp(10);
        const me = await settleInvite(await loadSession());
        // Returning accounts that already finished setup skip the AI chat.
        if (isOnboardingDone(me)) await enterApp(me);
        else setStage("chat");
      }} />;
      case "login": return <Login role={role} go={setStage} onDone={async () => {
        // Someone can arrive from an invitation link already holding an
        // account and sign in rather than register — the code is still theirs.
        const me = await settleInvite(await loadSession());
        // Setup is one-time — never re-open the chat for a finished account.
        if (isOnboardingDone(me)) await enterApp(me);
        else setStage("chat");
      }} />;
      case "forgot": return <Forgot go={setStage} />;
      /* The same conversation in every orbit. `orbit` seeds one sentence of
         context into the opening message — where they are and what stays
         theirs — and changes nothing else about the script. */
      case "chat": return <ChatScreen role={role} xp={xp} addXp={addXp} onComplete={completeOnboarding} firstName={session?.user?.name?.split(" ")[0] || ""} orbit={orbit} />;
      case "matches": return (
        <SectionBoundary name="matches" resetKey={`matches-${role}`}>
          {role === "mentee"
            ? <MatchesScreen xp={xp} addXp={addXp} toast={toast} onEnterApp={enterFromDeck} roster={roster} matches={matches} onDecide={decideMatch} loading={rosterLoading} error={rosterError} />
            : <RequestsScreen xp={xp} addXp={addXp} toast={toast} onEnterApp={enterFromDeck} roster={roster} matches={matches} onDecide={decideMatch} loading={rosterLoading} error={rosterError} capacity={session?.profile?.capacity ?? 4} />}
        </SectionBoundary>
      );
      default: return null;
    }
  };

  /* Accept / pass a pending invite from the sticky alert or Notifications. */
  const respondInvite = useCallback(async (id, action) => {
    if (inviteBusy) return;
    setInviteBusy(true);
    try {
      await respondToMatch(id, action);
      const row = matches.find(m => m.id === id);
      const first = (row?.person?.name || "them").split(" ")[0];
      await Promise.all([loadMatches(), loadRoster(), refreshUser()]);
      toast(action === "accept"
        ? (role === "mentee" ? `You’re matched with ${first}` : `${first} joined your cohort`)
        : "Declined.");
      if (action === "accept" && overlay === "notifs") setOverlay(null);
    } catch (e) {
      toast(e?.message || "Couldn’t save that.");
    } finally {
      setInviteBusy(false);
    }
  }, [inviteBusy, matches, loadMatches, loadRoster, refreshUser, role, overlay, toast]);

  /* — overlay content (rendered inline on mobile, in a modal on desktop) — */
  const overlayContent = () => {
    if (!user || !overlay) return null;
    if (overlay === "notifs") return (
      <NotifsScreen
        role={role}
        u={user}
        matches={matches}
        sessions={sessions}
        back={() => setOverlay(null)}
        navTo={navTo}
        busy={inviteBusy}
        onRespond={respondInvite}
        /* Rows obey these. A "leaderboard movement" switch that goes on turning
           up here teaches people their settings are decorative. */
        prefs={prefs}
        /* Detected from real inactivity, phrased as coming from the mentor. */
        nudge={session?.atRisk ? {
          from: (session.atRisk.mentorName || "Your mentor").split(" ")[0],
          text: `${session.atRisk.daysSince} days since your last paragraph. One is enough to pick it back up.`,
          to: "exercises",
        } : null}
      />
    );
    /* One sheet for both roles and all three orbit kinds. It branches on
       `orbit.kind` for SSO-locked fields and copy — presentation only; nothing
       here changes what the app *does*. */
    if (overlay === "settings") return (
      <SettingsSheet
        role={role}
        orbit={orbit}
        orbits={orbits.orbits}
        user={{ ...session?.user, avatarUrl: user?.avatarUrl, headline: user?.headline }}
        prefs={prefs}
        busy={prefsBusy}
        onPrefs={savePrefs}
        onClose={() => setOverlay(null)}
        onLogout={logout}
        onLeaveOrbit={leaveOrbitHandler}
        onExport={downloadMyData}
        onDelete={deleteAccountHandler}
        onRedoTour={() => { setOverlay(null); resetTour(role); setComprehensiveTourOpen(true); }}
        toast={toast}
      />
    );
    /* Teams has four tabs, so the screens solo reaches from its tab bar are
       reached from the Home card and the profile instead. Same components —
       only the way in changes, and each gets the back affordance a tab body
       never needed. */
    if (overlay === "exercises") return (
      <div>
        <HeaderRow title="Your exercises" onBack={() => setOverlay(null)} />
        <MenteeExercises u={user} todayDone={todayDone} onSubmit={submitToday} submitting={submittingExercise} />
      </div>
    );
    if (overlay === "badges") return (
      <div>
        <HeaderRow title="Your progress" onBack={() => setOverlay(null)} />
        <MenteeBadges badges={badges} openBadge={(b, i) => setBadgeModal({ b, i })} justEarnedId={justEarnedId} />
      </div>
    );
    if (overlay === "meets") return (
      <div>
        <HeaderRow title="Mentor Meets" onBack={() => setOverlay(null)} />
        <MeetsScreen role={role} u={user} name={session?.user?.name} toast={toast} events={events}
          eventsLoading={eventsLoading} eventsError={eventsError} isAdmin={session?.user?.isAdmin}
          userId={session?.user?.id} onCreateEvent={createEventHandler} onEventAction={eventActionHandler} />
      </div>
    );
    if (overlay === "cohort") return <CohortScreen u={user} back={() => setOverlay(null)} />;
    /* Mentees reach the same screen from Home — the mentor has a tab for it. */
    if (overlay === "sessions") return (
      <SessionsScreen
        role={role} people={sessionPeople} sessions={sessions}
        loading={sessionsLoading} error={sessionsError} busy={sessionBusy}
        onCreate={createSessionHandler} onAction={sessionActionHandler} toast={toast}
        back={() => setOverlay(null)}
      />
    );
    if (overlay === "addmentor") return <AddMentorScreen candidates={roster} used={mentorsHeld} onAdd={addMentor} back={() => setOverlay(null)} toast={toast} onLoad={loadRoster} loading={rosterLoading} policy={policy} orbit={orbit} />;
    if (overlay === "addmentee") return <AddMenteeScreen candidates={roster} addsUsed={menteeAdds} onAdd={addMentee} back={() => setOverlay(null)} toast={toast} onLoad={loadRoster} loading={rosterLoading} />;
    /* The three-tab mentee surface. Wraps the deck, Discover and the inbox that
       used to be reached three separate ways. "explore" below still resolves —
       notification deep links point at it — but Cohort now opens this. */
    if (overlay === "mentees") return (
      <MenteesScreen
        role={role} back={() => setOverlay(null)} toast={toast}
        xp={xp} addXp={addXp}
        roster={roster} matches={matches} onDecide={decideMatch}
        loading={rosterLoading} error={rosterError}
        capacity={mentorCapacity}
        onRequest={role === "mentee" ? addMentor : addMentee}
        onRespond={async (id, action) => { await respondToMatch(id, action); await Promise.all([loadRoster(), refreshUser()]); }}
        canRequest={role === "mentee" ? mentorSeatsLeft > 0 : cohortSeatsLeft > 0}
        capacityNote={role === "mentee" ? "Mentor seats full · 3 of 3" : `Cohort full · ${mentorCapacity} seats`}
        openAccepted={(p) => {
          setOverlay(null);
          if (role === "mentee") setTimeout(() => setOverlay({ orbit: p.id }), 60);
          else { const m = user.cohort?.find(c => c.id === p.id); if (m) setTimeout(() => setOverlay({ mentee: m }), 60); }
        }}
      />
    );
    if (overlay === "explore") return (
      <ExploreScreen
        role={role} back={() => setOverlay(null)} toast={toast}
        onRequest={role === "mentee" ? addMentor : addMentee}
        onRespond={async (id, action) => { await respondToMatch(id, action); await Promise.all([loadRoster(), refreshUser()]); }}
        canRequest={role === "mentee" ? mentorSeatsLeft > 0 : cohortSeatsLeft > 0}
        capacityNote={role === "mentee" ? "Mentor seats full · 3 of 3" : `Cohort full · ${mentorCapacity} seats`}
        openAccepted={(p) => {
          setOverlay(null);
          // Their Orbit, not "the" Orbit — the mentee may hold three.
          if (role === "mentee") setTimeout(() => setOverlay({ orbit: p.id }), 60);
          else { const m = user.cohort?.find(c => c.id === p.id); if (m) setTimeout(() => setOverlay({ mentee: m }), 60); }
        }}
      />
    );
    if (overlay === "network") return (
      <NetworkScreen orbitId={activeOrbitId}
        back={() => setOverlay(null)}
        toast={toast}
        cohortSize={(user.cohort || []).length}
        /* Adding or dropping a post there changes what this mentor's own Feed
           tab lists, so the shared copy is re-read rather than patched twice. */
        onAmplifyChange={loadFeed}
      />
    );
    /* One Orbit per mentor, addressed by mentor id. A bare "orbit" still
       arrives from notification deep links, which know a destination but not a
       mentor; it falls back to the first, which is the only Orbit that exists
       in the common case. */
    if (overlay === "orbit" || overlay?.orbit) {
      const list = user.mentors || [];
      const m = overlay?.orbit
        ? list.find(x => String(x.id) === String(overlay.orbit))
        : list[0];
      if (!m) return <OrbitScreen mentor={null} back={() => setOverlay(null)} />;
      return (
        <OrbitScreen
          mentor={m}
          stage1={stage1}
          feed={feeds[m.id] || []}
          program={programs[m.id] || { phases: [], completedPhaseIds: [] }}
          back={() => setOverlay(null)}
          watched={watched} onWatch={watchContent}
          reacted={reacted} onReact={reactToPost}
          openDm={() => setOverlay({ dmPeer: m, from: { orbit: m.id } })}
          go={() => { setOverlay(null); setTab("exercises"); }}
          toast={toast} onAuthor={openAuthorProfile} highlightPostId={highlightPostId}
        />
      );
    }
    if (overlay === "board") return <MentorBoard u={user} back={() => setOverlay(null)} />;
    if (overlay === "course") return (
      <CourseDesigner
        phases={program?.phases || []}
        onSaveProgram={saveProgramPhases}
        back={() => setOverlay(null)}
      />
    );
    /* A bare "dm" is the same deep-link case as a bare "orbit": no person
       attached, so it opens the first mentor's thread. Every other route into
       messaging names its peer, which is what lets a mentee message all three
       of their mentors rather than only the one the app used to hard-code. */
    if (overlay === "dm") {
      const m = (user.mentors || [])[0];
      return m ? (
        <DMScreen name={m.name} otherId={m.id} sub="DIRECT CONNECT · EARNED AT STAGE 1" back={() => setOverlay(null)} placeholder={`Message ${m.name.split(" ")[0]}…`} />
      ) : null;
    }
    if (overlay.dmPeer) return (
      <DMScreen
        name={overlay.dmPeer.name}
        otherId={overlay.dmPeer.id}
        /* Teams routes both sides through this overlay, so the subtitle can't
           assume the person on the other end is a mentee. */
        sub={role === "mentor" ? "YOUR MENTEE · DIRECT CONNECT" : "YOUR MENTOR · DIRECT CONNECT"}
        back={() => setOverlay(overlay.from || null)}
        placeholder={`Message ${firstNameOf(overlay.dmPeer.name)}…`}
      />
    );
    if (overlay.mentee) return <MenteeDetailScreen u={user} mentee={overlay.mentee} back={() => setOverlay(null)} openDm={(m) => setOverlay({ dmPeer: m, from: { mentee: m } })} />;
    if (overlay.mentorProfile) {
      // Following is a mentor-to-mentor thing only (see api/roster.js) — a
      // mentee never gets the button, and neither does a mentor on their own
      // profile, which can't reach this branch anyway (openAuthorProfile
      // routes that to the Profile tab instead).
      const canFollow = role === "mentor" && overlay.mentorProfile.id
        && String(overlay.mentorProfile.id) !== String(session?.user?.id);
      return (
        <MentorDetailSheet
          m={overlay.mentorProfile}
          toast={toast}
          close={() => setOverlay(overlay.from || null)}
          footer={canFollow ? (
            <Btn
              kind={overlay.mentorProfile.following ? "ghost" : "primary"}
              disabled={profileFollowBusy}
              style={overlay.mentorProfile.following ? { borderColor: C.purple, color: C.purple } : undefined}
              onClick={toggleProfileFollow}>
              {overlay.mentorProfile.following
                ? <><UserCheck size={15} /> Following {firstNameOf(overlay.mentorProfile.name)}</>
                : <><UserPlus size={15} /> Follow {firstNameOf(overlay.mentorProfile.name)}</>}
            </Btn>
          ) : (
            <Btn kind="dark" onClick={() => setOverlay(overlay.from || null)}>Done</Btn>
          )}
        />
      );
    }
    return null;
  };

  /* — solo or teams —
     Belonging to an organisation changes which product this is. Somebody who
     joined a company's programme is not browsing Ryzn-the-network; they are
     inside their employer, under rules their HR set, and the surface reflects
     that. `session.org` is the whole switch: it is written by the server when
     an org invite is claimed (api/invites/redeem.js) and cleared when they
     leave, so being invited or removed flips the app on the next /api/me with
     nothing stored locally to go stale.

     It is a different set of screens, not a theme — see teams/TeamsApp.jsx for
     what actually differs. The account underneath is identical either way.
     `mode` and `org` are declared with the session state, above. */

  /** Teams folds Exercises, Badges, Meets and the Orbit into overlays — the
      tab bar is deliberately short, so everything else opens over it. */
  const teamsOpen = (what) => {
    if (what === "profile") { setOverlay(null); setTab("profile"); return; }
    setOverlay(what);
  };

  const teamsContent = () => {
    const common = { u: user, org, name: session?.user?.name, onOpen: teamsOpen };
    if (role === "mentee") {
      switch (tab) {
        case "home": return (
          <TeamsHome {...common} stage1={stage1} todayDone={todayDone} matches={matches} sessions={sessions}
            go={(t) => { setOverlay(null); setTab(t); }} onRespond={respondInvite} busy={inviteBusy} />
        );
        case "mentors": return (
          <TeamsMentors {...common} onDecide={decideMatch} onOpenMentor={openAuthorProfile}
            toast={toast} seatsLeft={mentorSeatsLeft} />
        );
        case "chat": return (
          <TeamsChat {...common} role={role} matches={matches} stage1={stage1}
            onOpenThread={(p) => setOverlay({ dmPeer: p })} />
        );
        case "profile": return <MenteeProfile u={user} name={session?.user?.name} userId={session?.user?.id} badges={badges} openBadge={(b, i) => setBadgeModal({ b, i })} openOverlay={setOverlay} openOrbit={(id) => setOverlay({ orbit: id })} programs={programs} onLeave={leaveMentor} onUpdateProfile={updateUserProfile} toast={toast} />;
        default: return null;
      }
    }
    switch (tab) {
      case "home": return (
        <TeamsCohort {...common} matches={matches} sessions={sessions} onRespond={respondInvite}
          onOpenMentee={(m) => setOverlay({ mentee: m })} busy={inviteBusy} capacity={mentorCapacity} />
      );
      case "roster": return (
        <TeamsRoster {...common} onOpenMentor={openAuthorProfile} onInvite={addMentee}
          toast={toast} cohortSeatsLeft={cohortSeatsLeft} />
      );
      case "chat": return (
        <TeamsChat {...common} role={role} matches={matches} stage1
          onOpenThread={(p) => setOverlay({ dmPeer: p })} />
      );
      case "profile": return <MentorProfile u={user} name={session?.user?.name} userId={session?.user?.id} openOverlay={setOverlay} feed={mentorFeed} go={setTab} greetingUp={greetingUp} onPin={pinPost} onDelete={removePost} program={program} onUpdateProfile={updateUserProfile} toast={toast} />;
      default: return null;
    }
  };

  /* — current tab content (always the active tab, regardless of overlay) — */
  const tabContent = () => {
    if (!user) return null;
    if (mode === "teams") return teamsContent();
    if (role === "mentee") {
      switch (tab) {
        case "home": return <MenteeHome u={user} name={session?.user?.name} badges={badges} go={setTab} openOverlay={setOverlay} openOrbit={(id) => setOverlay({ orbit: id })} todayDone={todayDone} stage1={stage1} mentorSeats={mentorsHeld} toast={toast} feeds={feeds} watched={watched} invites={matches.filter(m => m.awaitingYou)} sessions={sessions} stage={orbit?.stage} policy={policy} orbit={orbit} atRisk={session?.atRisk} />;
        case "exercises": return <MenteeExercises u={user} todayDone={todayDone} onSubmit={submitToday} submitting={submittingExercise} />;
        /* Locked is a screen, not a missing route. */
        case "chat": return chatLocked
          ? <ChatLocked stage={orbit?.stage} mentor={(user.mentors || [])[0]} go={setTab} />
          : <MenteeChatList mentors={user.mentors || []} onOpenThread={(m) => setOverlay({ dmPeer: m })} />;
        case "badges": return <MenteeBadges badges={badges} openBadge={(b, i) => setBadgeModal({ b, i })} justEarnedId={justEarnedId} />;
        case "meets": return <MeetsScreen role={role} u={user} toast={toast} events={events} eventsLoading={eventsLoading} eventsError={eventsError} isAdmin={session?.user?.isAdmin} userId={session?.user?.id} onCreateEvent={createEventHandler} onEventAction={eventActionHandler} />;
        case "profile": return <MenteeProfile u={user} name={session?.user?.name} userId={session?.user?.id} badges={badges} openBadge={(b, i) => setBadgeModal({ b, i })} openOverlay={setOverlay} openOrbit={(id) => setOverlay({ orbit: id })} programs={programs} onLeave={leaveMentor} onUpdateProfile={updateUserProfile} toast={toast} />;
        default: return null;
      }
    }
    switch (tab) {
      case "home": return <MentorDash u={user} name={session?.user?.name} openOverlay={setOverlay} addsLeft={3 - menteeAdds} org={session?.org} />;
      case "feed": return <MentorFeed u={user} name={session?.user?.name} userId={session?.user?.id} feed={mentorFeed} amplified={relayed} publish={publishPost} greetingUp={greetingUp} uploadGreeting={uploadGreeting} toast={toast} onAuthor={openAuthorProfile} onVisibility={setPostVisibility} onAmplify={setRelaying} openNetwork={() => setOverlay("network")} highlightPostId={highlightPostId}
          followers={session?.followers ?? 0} onPin={pinPost} onDelete={removePost} go={setTab} />;
      case "sessions": return (
        <SessionsScreen
          role={role} people={sessionPeople} sessions={sessions}
          loading={sessionsLoading} error={sessionsError} busy={sessionBusy}
          onCreate={createSessionHandler} onAction={sessionActionHandler} toast={toast}
        />
      );
      case "meets": return <MeetsScreen role={role} u={user} name={session?.user?.name} toast={toast} events={events} eventsLoading={eventsLoading} eventsError={eventsError} isAdmin={session?.user?.isAdmin} userId={session?.user?.id} onCreateEvent={createEventHandler} onEventAction={eventActionHandler} />;
      case "profile": return <MentorProfile u={user} name={session?.user?.name} userId={session?.user?.id} openOverlay={setOverlay} feed={mentorFeed} go={setTab} greetingUp={greetingUp} onPin={pinPost} onDelete={removePost} program={program} onUpdateProfile={updateUserProfile} toast={toast} />;
      default: return null;
    }
  };

  /* Chat is a permanent tab, padlocked rather than hidden. Hiding a gated
     feature removes the goal gradient — someone cannot want a thing they can't
     see — so it stays in the bar and lands on a designed locked screen that
     names the unlock condition. `chatOpen` is resolved server-side from
     `policy.chatGate` and this orbit's Stage 1, so the padlock and the endpoint
     that refuses the message are answering the same question. */
  const chatLocked = role === "mentee" && orbit ? orbit.chatOpen === false : false;
  const menteeNav = [["home", Home, "Home"], ["exercises", Zap, "Exercises"], ["chat", MessageCircle, "Chat"], ["badges", Award, "Badges"], ["profile", User, "Profile"]];
  const mentorNav = [["home", LayoutGrid, "Cohort"], ["feed", Newspaper, "Feed"], ["sessions", Calendar, "Sessions"], ["meets", MapPin, "Meets"], ["profile", User, "Profile"]];
  const nav = mode === "teams" ? TEAMS_NAV[role] : (role === "mentee" ? menteeNav : mentorNav);
  const isDesktop = useIsDesktop();
  const reduced = useReducedMotion();

  const fullScreenOverlay = Boolean(
    overlay === "dm"
    || (overlay && overlay.dmPeer)
    || (overlay && overlay.mentorProfile)
  );
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
    <div className="full-h" style={{ fontFamily: F.sans, color: C.ink, width: "100%", maxWidth: "100%", position: "relative" }}>

      {phase === "journey" && (
        <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
          {stage === "splash" && <Splash onEnter={() => setStage("role")} isDesktop={isDesktop} />}
          {stage === "unlock" && <UnlockScreen role={role} onNext={() => setStage("matches")} toast={toast} />}
          {useAuthCard ? (
            <AuthCardShell>
              <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={stage} variants={fadeSlide} initial="initial" animate="animate" exit="exit" transition={t(reduced, T_BASE)}>
                    {journeyContent()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </AuthCardShell>
          ) : (
            <div className="app-scroll" style={{
              height: "100%", boxSizing: "border-box", overflowY: chatLike ? "hidden" : "auto",
              paddingTop: isDesktop ? 0 : "env(safe-area-inset-top, 0px)",
            }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={stage} variants={fadeSlide} initial="initial" animate="animate" exit="exit" transition={t(reduced, T_BASE)}
                  style={chatLike ? { height: "100%" } : undefined}>
                  {journeyContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {phase === "app" && user && (
        isDesktop ? (
          <div style={{ display: "flex", height: "100%" }}>
            <Sidebar nav={nav} tab={tab} overlay={overlay} role={role} name={session?.user?.name} adminConsole={session?.user?.adminConsole}
              org={session?.org}
              onSelect={(id) => { setOverlay(null); setTab(id); }}
              onSettings={() => setOverlay("settings")} onLogout={logout} />
            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
              <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
                <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 40px" }}>
                  {orbits.orbits.length > 1 && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
                      <OrbitSwitcher orbits={orbits.orbits} orbitId={orbits.orbitId} onSwitch={switchOrbit} />
                    </div>
                  )}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={overlay === "course" ? "course" : tab}
                      variants={fadeSlide} initial="initial" animate="animate" exit="exit" transition={t(reduced, T_BASE)}>
                      <SectionBoundary name={overlay === "course" ? "course" : tab} resetKey={overlay === "course" ? "course" : tab}>
                        {overlay === "course" ? overlayEl : tabContent()}
                      </SectionBoundary>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
            <AnimatePresence>
              {overlayEl && overlay !== "course" && (
                <ModalShell onClose={() => setOverlay(null)}>
                  <SectionBoundary name="overlay" resetKey={overlay}>{overlayEl}</SectionBoundary>
                </ModalShell>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            {/* The switcher only earns a permanent line of a phone screen once
                there is somewhere to switch to. One orbit is not a choice. */}
            {orbits.orbits.length > 1 && !fullScreenOverlay && (
              <div style={{
                flexShrink: 0, display: "flex", justifyContent: "center", padding: "8px 14px 6px",
                paddingTop: "calc(8px + env(safe-area-inset-top, 0px))", background: C.white, borderBottom: `1px solid ${C.line}`,
              }}>
                <OrbitSwitcher orbits={orbits.orbits} orbitId={orbits.orbitId} onSwitch={switchOrbit} />
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden", paddingTop: orbits.orbits.length > 1 && !fullScreenOverlay ? 0 : "env(safe-area-inset-top, 0px)" }}>
              <div className="app-scroll" style={{
                height: "100%", boxSizing: "border-box", overflowY: fullScreenOverlay ? "hidden" : "auto",
                paddingBottom: fullScreenOverlay ? 0 : 20,
              }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={overlayEl ? `overlay-${typeof overlay === "string" ? overlay : overlay?.dm || overlay?.mentee?.name || "detail"}` : `tab-${tab}`}
                    variants={overlayEl ? sheet : fadeSlide}
                    initial="initial" animate="animate" exit="exit"
                    transition={t(reduced, T_BASE)}
                    style={fullScreenOverlay ? { height: "100%" } : undefined}
                  >
                    <SectionBoundary name={overlay ? "overlay" : tab} resetKey={overlay || tab}>
                      {overlayEl || tabContent()}
                    </SectionBoundary>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            {!fullScreenOverlay && (
              <div className="mobile-tab-bar" style={{ borderTop: `1px solid ${C.line}` }}>
                {nav.map(([id, Icon, label]) => {
                  const active = tab === id && !overlay;
                  /* A locked tab is rendered, not removed, and it still
                     navigates — the locked screen behind it explains the unlock
                     condition, which is the whole mechanic. */
                  const locked = id === "chat" && chatLocked;
                  return (
                    <motion.button key={id} onClick={() => { setOverlay(null); setTab(id); }} whileTap={reduced ? undefined : { scale: 0.9 }} transition={spring(reduced)}
                      style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0", position: "relative" }}>
                      {active && (
                        <motion.div layoutId="mobile-nav-active" transition={spring(reduced)}
                          style={{ position: "absolute", top: 0, width: 22, height: 2.5, borderRadius: 2, background: C.purple }} />
                      )}
                      <span style={{ position: "relative", lineHeight: 0 }}>
                        <Icon size={20} color={active ? C.purple : "#A5A39D"} strokeWidth={active ? 2.4 : 2} />
                        {locked && (
                          <span style={{ position: "absolute", right: -7, top: -5, background: C.ink, borderRadius: 5, padding: 2, display: "flex" }}>
                            <Lock size={8} color={C.white} />
                          </span>
                        )}
                      </span>
                      <span style={{ fontFamily: F.mono, fontSize: 8.5, letterSpacing: 0.6, color: active ? C.purple : "#A5A39D", fontWeight: active ? 700 : 400 }}>{label.toUpperCase()}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {/* A circle link, answered over whatever they were already doing. Declining
          leaves them exactly where they were — an invitation is not a redirect. */}
      <AnimatePresence>
        {phase === "app" && circleInvite && (
          <ModalShell onClose={() => { clearCircleHash(); setCircleInvite(null); }}>
            <JoinCircle
              circle={circleInvite.circle}
              joined={circleInvite.joined}
              error={circleInvite.error}
              busy={circleBusy}
              onJoin={acceptCircle}
              onCancel={() => { clearCircleHash(); setCircleInvite(null); }}
            />
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "app" && chatCeremony && (
          <ChatUnlocked
            mentor={(user?.mentors || [])[0]}
            onOpen={() => { setChatCeremony(null); setOverlay(null); setTab("chat"); }}
            onClose={() => setChatCeremony(null)}
          />
        )}
      </AnimatePresence>

      {phase === "app" && badgeModal && <BadgeModal badge={badgeModal.b} index={badgeModal.i} close={() => setBadgeModal(null)} toast={toast} />}
      {phase === "app" && showMidway && <MidwayUnlock onClose={() => setShowMidway(false)} toast={toast} />}
      {phase === "app" && spotlightTab && <SpotlightHint key={spotlightTab} role={role} tab={spotlightTab} onDismiss={dismissTabHint} />}
      {phase === "app" && introTourOpen && (
        <IntroTourModal role={role} onDone={() => { markIntroTourSeen(role); setIntroTourOpen(false); }} />
      )}
      {phase === "app" && comprehensiveTourOpen && (
        <ComprehensiveTour role={role} onDone={() => { setComprehensiveTourOpen(false); }} onNavTo={navTo} />
      )}

      <AnimatePresence>
        {phase === "app" && overlay !== "notifs" && matches.some(m => m.awaitingYou) && (
          <InviteAlert
            key="invite-alert"
            role={role}
            invites={matches}
            busy={inviteBusy}
            onRespond={respondInvite}
          />
        )}
      </AnimatePresence>

      {/* The offer to put Ryzn on the home screen. It waits for the app proper —
          never the signed-out journey — and stands down for anything already
          asking for an answer, so it is the only thing on screen wanting a tap.
          On phones it sits above the tab bar rather than over it. */}
      <InstallBanner
        enabled={
          phase === "app" && !!user && !circleInvite && !chatCeremony && !badgeModal &&
          !showMidway && !spotlightTab && !introTourOpen && !comprehensiveTourOpen &&
          !matches.some(m => m.awaitingYou)
        }
        liftAbove={isDesktop || fullScreenOverlay ? 0 : 60}
      />

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            key={toastMsg}
            initial={{ opacity: 0, y: -12, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -8, x: "-50%" }}
            transition={t(reduced, T_BASE)}
            style={{ position: "fixed", top: "calc(18px + env(safe-area-inset-top, 0px))", left: "50%", background: C.ink, color: "#B7AFF2", fontFamily: F.mono, fontSize: 12, fontWeight: 700, padding: "9px 16px", borderRadius: 12, zIndex: 90, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            <Zap size={12} /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
