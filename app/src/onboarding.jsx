import React, { useState, useEffect } from "react";
import { Sparkles, Users, Compass } from "lucide-react";
import { C, F } from "./theme.js";
import { Btn } from "./ui.jsx";

/* ————————————————— ONBOARDING TUTORIAL ————————————————— */
/* Two parts: a one-time intro slideshow, and per-tab spotlight hints.
   "Seen" state lives in localStorage keyed by role so a mentee and a mentor
   on the same device each get their own tour. Replay / reset live in Settings. */

const LS_KEYS = {
  tour: "ryzn_onboarding_tour_v1",
  hints: "ryzn_onboarding_hints_v1",
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
    /* quota exceeded or private-mode storage block — tour just won't persist this run */
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

/* ————— content ————— */

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
    home: { target: "mentee-home-progress", title: "Your daily progress", body: "Your streak and XP live here — check in every day to keep it going.", placement: "bottom" },
    exercises: { target: "mentee-exercises-submit", title: "Submit today's exercise", body: "A few minutes a day builds your streak and earns XP toward badges.", placement: "top" },
    badges: { target: "mentee-badges-first", title: "Your badges", body: "Tap an earned badge for QR verification and a one-tap LinkedIn share.", placement: "bottom" },
    meets: { target: "meets-ticket-mentee", title: "In-person Meets", body: "Keep showing up and your ticket unlocks — track your progress here.", placement: "bottom" },
    profile: { target: "mentee-profile-settings", title: "Settings", body: "Account details and this tour both live here — come back anytime.", placement: "bottom" },
  },
  mentor: {
    home: { target: "mentor-home-impact", title: "Your Impact Score", body: "This grows as your mentees hit milestones — it drives your tier.", placement: "bottom" },
    feed: { target: "mentor-feed-compose", title: "Your feed", body: "Publish a greeting or a post here. Mentees on your Orbit see what you share.", placement: "bottom" },
    sessions: { target: "mentor-sessions-list", title: "Opening sessions", body: "Each mentee who joins gets an opening session card here. Agree a time in your thread for now.", placement: "bottom" },
    meets: { target: "meets-ticket-mentor", title: "In-person Meets", body: "Your seat at the quarterly event lands here once a date is set.", placement: "bottom" },
    profile: { target: "mentor-profile-settings", title: "Settings", body: "Account details and this tour both live here — come back anytime.", placement: "bottom" },
  },
};

/* ————— intro slideshow ————— */

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
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 18 }}>{step.title}</div>
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

/* ————— per-tab spotlight hint ————— */

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
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{hint.title}</div>
        <div style={{ fontSize: 12.5, color: "#D9D6F2", marginTop: 4, lineHeight: 1.45 }}>{hint.body}</div>
        <button onClick={onDismiss} style={{ marginTop: 10, background: "none", border: "1px solid #55508C", color: C.white, borderRadius: 8, padding: "5px 10px", fontFamily: F.sans, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Got it
        </button>
      </div>
    </div>
  );
};
