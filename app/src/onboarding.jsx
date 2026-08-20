import React, { useState, useEffect } from "react";
import { Sparkles, Users, Compass } from "lucide-react";
import { C, F } from "./theme.js";
import { Btn } from "./ui.jsx";

/* ----------------- ONBOARDING TUTORIAL ----------------- */
/* Two parts: a one-time intro slideshow, and per-tab spotlight hints.
   "Seen" state lives in localStorage keyed by role so a mentee and a mentor
   on the same device each get their own tour. Replay / reset live in Settings. */

const LS_KEYS = {
  tour: "ryzn_onboarding_tour_v1",
  hints: "ryzn_onboarding_hints_v1",
  comprehensiveTour: "ryzn_comprehensive_tour_v1",
};

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded or private-mode storage block, tour just won't persist this run */
  }
}

export const hasSeenIntroTour = (role) => Boolean(readLS(LS_KEYS.tour, {})[role]);
export const markIntroTourSeen = (role) => {
  const seen = readLS(LS_KEYS.tour, {});
  writeLS(LS_KEYS.tour, { ...seen, [role]: true });
};

export const hasSeenTabHint = (role, tabId) => Boolean(readLS(LS_KEYS.hints, {})[role]?.[tabId]);
export const markTabHintSeen = (role, tabId) => {
  const all = readLS(LS_KEYS.hints, {});
  writeLS(LS_KEYS.hints, { ...all, [role]: { ...(all[role] || {}), [tabId]: true } });
};
export const resetTabHints = (role) => {
  const all = readLS(LS_KEYS.hints, {});
  writeLS(LS_KEYS.hints, { ...all, [role]: {} });
};

export const hasCompletedTour = (role) => Boolean(readLS(LS_KEYS.comprehensiveTour, {})[role]);
export const markTourCompleted = (role) => {
  const seen = readLS(LS_KEYS.comprehensiveTour, {});
  writeLS(LS_KEYS.comprehensiveTour, { ...seen, [role]: true });
};
export const resetTour = (role) => {
  const seen = readLS(LS_KEYS.comprehensiveTour, {});
  writeLS(LS_KEYS.comprehensiveTour, { ...seen, [role]: false });
};

/* ----- content ----- */

export const TOUR_STEPS = {
  mentee: [
    { icon: Sparkles, title: "Welcome to Ryzn", body: "You've been matched with a mentor who wants to see you win. This quick tour shows you around before you dive in." },
    { icon: Users, title: "How mentorship works here", body: "Show up daily for a short exercise to build your streak, earn XP, and unlock badges. Finish Stage 1 to unlock Direct Connect messaging with your mentor." },
    { icon: Compass, title: "Where things live", body: "Home for your daily status, Exercises to keep your streak alive, Badges for milestones, Meets for in-person events, and Profile to manage your mentors." },
  ],
  mentor: [
    { icon: Sparkles, title: "Welcome, mentor", body: "Your cohort is counting on you. This quick tour shows you around before you dive in." },
    { icon: Users, title: "How your cohort works", body: "Track each mentee's progress, publish content to your feed, and grow your Impact Score as mentees hit milestones." },
    { icon: Compass, title: "Where things live", body: "Cohort for your mentee roster, Feed to publish, Sessions for opening meetings, Meets for in-person events, and Profile for settings." },
  ],
};

export const TAB_HINTS = {
  mentee: {
    home: { target: "mentee-home-progress", title: "Your daily progress", body: "Your streak and XP live here, check in every day to keep it going.", placement: "bottom" },
    exercises: { target: "mentee-exercises-submit", title: "Submit today's exercise", body: "A few minutes a day builds your streak and earns XP toward badges.", placement: "top" },
    badges: { target: "mentee-badges-first", title: "Your badges", body: "Tap an earned badge for QR verification and a one-tap LinkedIn share.", placement: "bottom" },
    meets: { target: "meets-ticket-mentee", title: "In-person Meets", body: "Keep showing up and your ticket unlocks, track your progress here.", placement: "bottom" },
    profile: { target: "mentee-profile-hero", title: "Your profile", body: "Goals, badges, and mentors live here. Settings (and this tour) are up in the gear.", placement: "bottom" },
  },
  mentor: {
    home: { target: "mentor-home-impact", title: "Your Impact Score", body: "This grows as your mentees hit milestones, it drives your tier.", placement: "bottom" },
    feed: { target: "mentor-feed-compose", title: "Your feed", body: "Publish a post here. Mentees on your Orbit see what you share.", placement: "bottom" },
    sessions: { target: "mentor-sessions-list", title: "Book your sessions", body: "Propose a few times to a mentee. When they pick one it's booked, and both of you can add it to your calendar.", placement: "bottom" },
    meets: { target: "meets-ticket-mentor", title: "In-person Meets", body: "Your seat at the quarterly event lands here once a date is set.", placement: "bottom" },
    profile: { target: "mentor-profile-program", title: "Design your course", body: "Tap here to open the course designer, add phases from kickoff to graduation, with optional certificates.", placement: "bottom" },
  },
};

export const COMPREHENSIVE_TOUR_STEPS = {
  mentee: [
    { type: "intro", icon: Sparkles, title: "Welcome to Ryzn", body: "You've been matched with a mentor who wants to see you win. This tour walks you through the full app." },
    { type: "intro", icon: Users, title: "How mentorship works", body: "Show up daily for exercises to build your streak, earn XP, and unlock badges. Your mentor shares guidance in their Orbit feed." },
    { type: "screen", tab: "home", title: "Your dashboard", body: "This is your home, check your daily progress, streak, and XP. Your mentor's name appears here once you're matched." },
    { type: "screen", tab: "grow", title: "Daily exercises", body: "A few minutes a day builds your streak and earns XP. Complete one now to start unlocking features." },
    { type: "screen", tab: "discover", title: "Discover mentors", body: "Browse and explore mentors in your network. Follow mentors and learn from their insights." },
    { type: "screen", tab: "chat", title: "Direct connect", body: "Chat with your mentors once you're matched. Build your relationship one message at a time." },
    { type: "screen", tab: "profile", title: "Your profile", body: "Your goals, mentors, and settings live here. Come back anytime to update or explore more." },
    { type: "outro", icon: Sparkles, title: "You're all set", body: "Dive in and show up daily. Your streak and engagement unlock new features over time." },
  ],
  mentor: [
    { type: "intro", icon: Sparkles, title: "Welcome, mentor", body: "Your cohort is counting on you. This tour shows you around and how to guide your mentees." },
    { type: "intro", icon: Users, title: "Your impact & tier", body: "Track mentee progress, publish content to your feed, and grow your Impact Score. Tier up from Scout to Pathfinder and beyond." },
    { type: "screen", tab: "feed", title: "Your brief", body: "Publish posts and resources here. Your mentees on your Orbit see everything you share. The Brief is finite and purposeful." },
    { type: "screen", tab: "cohort", title: "Your cohort", body: "Search your mentees and mentors, manage requests, and track progress. Your mentees show here once matched." },
    { type: "screen", tab: "sessions", title: "Sessions", body: "Propose times, your mentee picks one, and the booking lands on the calendar for both of you." },
    { type: "screen", tab: "chat", title: "Community events", body: "In-person and online meetups for your cohort. Track availability, vote on dates, and finalize timing here." },
    { type: "screen", tab: "impact", title: "Your profile", body: "Manage your profile strength, greeting video, and course design. Everything mentees see about you lives here." },
    { type: "outro", icon: Sparkles, title: "You're ready to lead", body: "Show up for your mentees, share your knowledge, and watch your Impact Score grow." },
  ],
};

/* ----- intro slideshow ----- */

export const IntroTourModal = ({ role, onDone }) => {
  const steps = TOUR_STEPS[role] || TOUR_STEPS.mentee;
  const [i, setI] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;
  const Icon = step.icon;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,16,40,.55)", zIndex: 95, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div key={i} className="sheet-up" style={{ width: "min(94vw, 420px)", background: C.white, borderRadius: 22, padding: "28px 24px 22px", boxSizing: "border-box", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: C.purpleTint, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={28} color={C.purple} />
        </div>
        <div style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 18 }}>{step.title}</div>
        <div style={{ fontSize: 14, color: C.gray, marginTop: 10, lineHeight: 1.55 }}>{step.body}</div>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 20 }}>
          {steps.map((_, d) => (
            <div key={d} style={{ width: d === i ? 16 : 6, height: 6, borderRadius: 3, background: d === i ? C.purple : "#E2E0F5", transition: "width .2s" }} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
          {i > 0 && <Btn kind="ghost" style={{ flex: 1 }} onClick={() => setI(i - 1)}>Back</Btn>}
          <Btn style={{ flex: 1 }} onClick={() => (last ? onDone() : setI(i + 1))}>{last ? "Get started" : "Next"}</Btn>
        </div>
        {!last && (
          <button onClick={onDone} style={{ background: "none", border: "none", color: C.gray, fontFamily: F.sans, fontSize: 13, cursor: "pointer", marginTop: 12, padding: 4 }}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
};

/* ----- per-tab spotlight hint ----- */

function bubblePosition(rect, placement) {
  const PAD = 12, WIDTH = 240;
  const preferAbove = placement === "top" ? true : placement === "bottom" ? false : rect.top > window.innerHeight / 2;
  const fitsAbove = rect.top - PAD > 140;
  const fitsBelow = window.innerHeight - rect.bottom - PAD > 140;
  const above = preferAbove ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;

  const style = { width: WIDTH };
  if (above) style.bottom = `calc(100% - ${rect.top - PAD}px)`;
  else style.top = rect.bottom + PAD;

  let left = rect.left + rect.width / 2 - WIDTH / 2;
  left = Math.max(16, Math.min(left, window.innerWidth - WIDTH - 16));
  style.left = left;
  return style;
}

export const SpotlightHint = ({ role, tab, onDismiss }) => {
  const hint = (TAB_HINTS[role] || TAB_HINTS.mentee)[tab];
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!hint) return;
    let tries = 0, timer;
    const tick = () => {
      const el = document.querySelector(`[data-tour="${hint.target}"]`);
      if (el) { setRect(el.getBoundingClientRect()); return; }
      if (++tries < 10) timer = setTimeout(tick, 150);
    };
    tick();
    return () => clearTimeout(timer);
  }, [hint]);

  useEffect(() => {
    if (!rect || !hint) return;
    const remeasure = () => {
      const el = document.querySelector(`[data-tour="${hint.target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    return () => {
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [rect, hint]);

  if (!hint || !rect) return null;
  const PAD = 6;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 85, pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: rect.top - PAD, left: rect.left - PAD,
        width: rect.width + PAD * 2, height: rect.height + PAD * 2, borderRadius: 14,
        boxShadow: "0 0 0 9999px rgba(20,16,40,.55)",
      }} />
      <div className="badge-pop" style={{
        position: "absolute", ...bubblePosition(rect, hint.placement),
        pointerEvents: "auto", background: C.ink, color: C.white, borderRadius: 14,
        padding: "12px 14px", boxSizing: "border-box",
      }}>
        <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 13.5 }}>{hint.title}</div>
        <div style={{ fontSize: 12.5, color: "#D9D6F2", marginTop: 4, lineHeight: 1.45 }}>{hint.body}</div>
        <button onClick={onDismiss} style={{ marginTop: 10, background: "none", border: "1px solid #55508C", color: C.white, borderRadius: 8, padding: "5px 10px", fontFamily: F.sans, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Got it
        </button>
      </div>
    </div>
  );
};

/* ----- comprehensive tour ----- */

export const ComprehensiveTour = ({ role, onDone, onNavTo }) => {
  const steps = COMPREHENSIVE_TOUR_STEPS[role] || COMPREHENSIVE_TOUR_STEPS.mentee;
  const [stepIdx, setStepIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [rect, setRect] = useState(null);
  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const isIntro = step.type === "intro";
  const isOutro = step.type === "outro";
  const isScreen = step.type === "screen";
  const hint = isScreen ? (TAB_HINTS[role] || TAB_HINTS.mentee)[step.tab] : null;

  const finish = () => {
    markTourCompleted(role);
    onDone();
  };

  const handleNext = () => {
    if (isLast) {
      finish();
    } else {
      setStepIdx(stepIdx + 1);
      setShowHint(false);
      setRect(null);
    }
  };

  const handleBack = () => {
    if (stepIdx > 0) {
      setStepIdx(stepIdx - 1);
      setShowHint(false);
      setRect(null);
    }
  };

  useEffect(() => {
    if (!isScreen || !step.tab) return;
    onNavTo(step.tab);
    const t = setTimeout(() => setShowHint(true), 300);
    return () => clearTimeout(t);
  }, [stepIdx, isScreen, step.tab, onNavTo]);

  useEffect(() => {
    if (!hint || !showHint) return;
    let tries = 0, timer;
    const tick = () => {
      const el = document.querySelector(`[data-tour="${hint.target}"]`);
      if (el) { setRect(el.getBoundingClientRect()); return; }
      if (++tries < 10) timer = setTimeout(tick, 150);
    };
    tick();
    return () => clearTimeout(timer);
  }, [hint, showHint, stepIdx]);

  const Icon = step.icon;

  if (isIntro || isOutro) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(20,16,40,.55)", zIndex: 95, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div key={stepIdx} className="sheet-up" style={{ width: "min(94vw, 420px)", background: C.white, borderRadius: 22, padding: "28px 24px 22px", boxSizing: "border-box", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: C.purpleTint, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={28} color={C.purple} />
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 18 }}>{step.title}</div>
          <div style={{ fontSize: 14, color: C.gray, marginTop: 10, lineHeight: 1.55 }}>{step.body}</div>

          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 20 }}>
            {steps.map((_, d) => (
              <div key={d} style={{ width: 6, height: 6, borderRadius: 3, background: d <= stepIdx ? C.purple : "#E2E0F5", transition: "background .2s" }} />
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
            {stepIdx > 0 && <Btn kind="ghost" style={{ flex: 1 }} onClick={handleBack}>Back</Btn>}
            <Btn style={{ flex: 1 }} onClick={handleNext}>{isLast ? "Finish" : "Next"}</Btn>
          </div>
          {!isLast && (
            <button onClick={finish} style={{ background: "none", border: "none", color: C.gray, fontFamily: F.sans, fontSize: 13, cursor: "pointer", marginTop: 12, padding: 4 }}>
              Skip tour
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isScreen) {
    if (!showHint || !hint || !rect) return null;
    const PAD = 6;

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 85, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: rect.top - PAD, left: rect.left - PAD,
          width: rect.width + PAD * 2, height: rect.height + PAD * 2, borderRadius: 14,
          boxShadow: "0 0 0 9999px rgba(20,16,40,.55)",
        }} />
        <div className="badge-pop" style={{
          position: "absolute", ...bubblePosition(rect, hint.placement),
          pointerEvents: "auto", background: C.ink, color: C.white, borderRadius: 14,
          padding: "12px 14px", boxSizing: "border-box",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 13.5, flex: 1 }}>{step.title}</div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: "#A9A6D6" }}>{stepIdx}/{steps.length}</div>
          </div>
          <div style={{ fontSize: 12.5, color: "#D9D6F2", lineHeight: 1.45 }}>{step.body}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button onClick={handleBack} style={{ flex: 1, background: "none", border: "1px solid #55508C", color: C.white, borderRadius: 8, padding: "5px 10px", fontFamily: F.sans, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Back
            </button>
            <button onClick={handleNext} style={{ flex: 1, background: C.purple, border: "none", color: C.white, borderRadius: 8, padding: "5px 10px", fontFamily: F.sans, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
