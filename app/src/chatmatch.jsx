import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Monogram, Avatar, Field, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots, NoCloseGutter, labelOf } from "./ui.jsx";
import { useIsDesktop } from "./useIsDesktop.js";
import { GENERAL_INFLUENCERS, INFLUENCERS_BY_CATEGORY, menteeScript, mentorScript } from "./data.js";
import { shareToLinkedIn } from "./lib/share.js";
import { fetchPosts, fetchMenteeExercises } from "./lib/auth-client.js";
import { ContentTabs, ContentTabBar } from "./feed.jsx";

/* ————————————————— JOURNEY: AI CHAT + UNLOCK + MATCHING ————————————————— */

/**
 * The one-time Ryzn AI setup.
 *
 * `firstName` is the name on the account, so the opening line greets the person
 * who actually signed in. `onComplete(answers)` hands the collected answers up
 * to be persisted — they used to die with the component, which is why a
 * returning user was asked the same six questions forever.
 */
export const ChatScreen = ({ role, xp, addXp, onComplete, firstName }) => {
  const script = useMemo(
    () => (role === "mentee" ? menteeScript(firstName) : mentorScript(firstName)),
    [role, firstName]
  );
  const [msgs, setMsgs] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const [sel, setSel] = useState([]);
  const [customText, setCustomText] = useState("");
  const [search, setSearch] = useState("");
  const [writeText, setWriteText] = useState("");
  const [goals, setGoals] = useState(["", "", ""]);
  const [extraOpts, setExtraOpts] = useState({});
  const [answers, setAnswers] = useState({});
  const scrollRef = useRef(null);
  const step = script[stepIdx];
  const isInfluence = !!step && step.id === "influence";
  const unit = role === "mentee" ? "XP" : "IMPACT";

  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    setReady(false); setSel([]); setWriteText(""); setCustomText(""); setSearch("");
    const lines = step.ai;
    const play = (i) => {
      if (cancelled) return;
      if (i >= lines.length) { setTyping(false); setReady(true); return; }
      setTyping(true);
      setTimeout(() => {
        if (cancelled) return;
        setMsgs(m => [...m, { who: "ai", text: lines[i] }]);
        setTyping(false);
        setTimeout(() => play(i + 1), 350);
      }, i === 0 && stepIdx === 0 ? 900 : 1100);
    };
    play(0);
    return () => { cancelled = true; };
  }, [stepIdx]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, typing, ready]);

  const baseOptions = useMemo(() => {
    if (!step) return [];
    if (isInfluence) {
      const cats = answers.interests || [];
      return [...new Set([...cats.flatMap(c => INFLUENCERS_BY_CATEGORY[c] || []), ...GENERAL_INFLUENCERS])];
    }
    return step.options || [];
  }, [stepIdx, answers]);
  const options = step ? [...baseOptions, ...(extraOpts[step.id] || [])] : [];
  const q = search.trim().toLowerCase();
  const shown = isInfluence ? [...new Set([...sel, ...options.filter(o => o.toLowerCase().includes(q))])] : options;
  const noExact = isInfluence && q.length > 1 && !options.some(o => o.toLowerCase() === q);

  const toggle = (o) => setSel(s => step.type === "single" ? [o] : s.includes(o) ? s.filter(x => x !== o) : [...s, o]);
  const addName = (t) => { if (!t) return; setExtraOpts(e => ({ ...e, [step.id]: [...(e[step.id] || []), t] })); setSel(s => [...s, t]); };
  const addCustom = () => { const t = customText.trim(); if (!t) return; addName(t); setCustomText(""); };

  const goalsDone = goals.filter(g => g.trim().length > 2).length;
  const canSubmit = step && (
    step.type === "single" ? sel.length === 1 :
    step.type === "multi" ? sel.length >= (step.min || 1) :
    step.type === "write" ? writeText.trim().length > 2 :
    step.type === "goals" ? goalsDone >= 1 : false
  );
  const submit = () => {
    if (!canSubmit) return;
    const filledGoals = goals.filter(g => g.trim().length > 2);
    const text = step.type === "goals" ? filledGoals.map((g, i) => `${i + 1}. ${g}`).join("\n")
      : step.type === "write" ? writeText : sel.join(" · ");
    // Single-select must be a string — submitting `sel` (an array) made
    // track/industry land on profiles as ["University"] and crash any screen
    // that called `.toUpperCase()` on them.
    const value = step.type === "goals" ? filledGoals
      : step.type === "write" ? writeText
      : step.type === "single" ? (sel[0] ?? "")
      : sel;
    const next = { ...answers, [step.id]: value };
    setAnswers(next);
    setMsgs(m => [...m, { who: "user", text }, { who: "xp", text: `+${step.xp} ${unit}` }]);
    addXp(step.xp);
    setReady(false);
    if (stepIdx + 1 < script.length) setTimeout(() => setStepIdx(i => i + 1), 450);
    else {
      setTimeout(() => {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          // No count promised — the roster is however many mentors have actually
          // onboarded, which on day one may be none.
          setMsgs(m => [...m, { who: "ai", text: role === "mentee" ? "That’s everything I need. Finding your mentor matches now — and you’ve just earned your first badge." : "That’s everything. Matching mentees to your profile now — and your tier is confirmed." }]);
          // `next`, not `answers`: the state update above hasn't flushed yet.
          setTimeout(() => onComplete(next), 1600);
        }, 1300);
      }, 500);
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${C.line}`, background: C.white }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: C.purple, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={17} color={C.white} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Ryzn AI</div>
            <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.teal, letterSpacing: 0.8 }}>SETUP · STEP {Math.min(stepIdx + 1, script.length)} OF {script.length} · ONE-TIME ONLY</div>
          </div>
          <XPPill xp={xp} unit={role === "mentee" ? "XP" : "IMP"} />
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
          {script.map((s, i) => <div key={s.id} style={{ flex: 1, height: 4, background: i < stepIdx ? C.purple : i === stepIdx ? "#B3AEE6" : "#E6E5E1", transition: "background .3s" }} />)}
        </div>
      </div>

      <div ref={scrollRef} className="app-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
        {msgs.map((m, i) => m.who === "xp" ? (
          <div key={i} style={{ alignSelf: "center", fontFamily: F.mono, fontSize: 10.5, fontWeight: 700, color: C.teal, background: C.tealTint, padding: "5px 12px", borderRadius: 10 }}>⚡ {m.text}</div>
        ) : (
          <div key={i} className="msg-in" style={{
            alignSelf: m.who === "ai" ? "flex-start" : "flex-end", maxWidth: "82%",
            background: m.who === "ai" ? C.white : C.purple, color: m.who === "ai" ? C.ink : C.white,
            border: m.who === "ai" ? `1px solid ${C.line}` : "none",
            borderRadius: m.who === "ai" ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
            padding: "11px 14px", fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap",
          }}>{m.text}</div>
        ))}
        {typing && <TypingDots />}
      </div>

      {ready && step && (
        <div className="sheet-up" style={{ borderTop: `1px solid ${C.line}`, background: C.white, display: "flex", flexDirection: "column", maxHeight: 380, flexShrink: 0 }}>
          {/* sticky header: label + (search for influence) */}
          <div style={{ padding: "12px 16px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label>
                {step.type === "single" ? "Pick one"
                  : step.type === "multi" ? (isInfluence ? `Pick ${step.min}+ · matched to your interests · ${sel.length} selected` : `Pick ${step.min}+ · ${sel.length} selected`)
                  : step.type === "goals" ? "Your program goals · 1 required" : "In your own words"}
              </Label>
              <Label color={C.teal}>+{step.xp} {unit}</Label>
            </div>
            {isInfluence && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20, padding: "0 12px" }}>
                  <Search size={14} color={C.gray} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search names — or add your own"
                    style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "10px 0", fontFamily: F.sans, fontSize: 13, minWidth: 0 }} />
                </div>
                {noExact && (
                  <button onClick={() => { addName(search.trim()); setSearch(""); }} style={{ height: 38, padding: "0 12px", borderRadius: 19, border: "none", background: C.ink, color: C.white, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: F.sans, fontWeight: 600, fontSize: 12, flexShrink: 0 }}><Plus size={13} /> Add</button>
                )}
              </div>
            )}
          </div>

          {/* only this region scrolls — CTA below stays put */}
          <div className="app-scroll" style={{ overflowY: "auto", minHeight: 0, padding: "10px 16px 8px" }}>
            {(step.type === "single" || step.type === "multi") && <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {shown.map(o => {
                  const on = sel.includes(o);
                  return (
                    <button key={o} onClick={() => toggle(o)} style={{
                      fontFamily: F.sans, fontWeight: 600, fontSize: 13, cursor: "pointer",
                      padding: "9px 13px", borderRadius: 20, border: `1.5px solid ${on ? C.purple : C.line}`,
                      background: on ? C.purple : C.surface, color: on ? C.white : C.ink,
                      display: "inline-flex", alignItems: "center", gap: 6, transition: "all .15s",
                    }}>{on && <Check size={13} strokeWidth={3} />}{o}</button>
                  );
                })}
                {isInfluence && shown.length === 0 && (
                  <div style={{ fontSize: 12.5, color: C.gray, padding: "6px 2px" }}>No matches for “{search}” — tap Add to include them anyway.</div>
                )}
              </div>
              {step.custom && !isInfluence && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <input value={customText} onChange={e => setCustomText(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustom()} placeholder="Write your own…"
                    style={{ flex: 1, border: `1px dashed #C9C6C0`, borderRadius: 20, padding: "9px 14px", fontFamily: F.sans, fontSize: 13, outline: "none", background: C.surface, minWidth: 0 }} />
                  <button onClick={addCustom} style={{ width: 38, height: 38, borderRadius: 19, border: "none", background: C.ink, color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Plus size={16} /></button>
                </div>
              )}
            </>}

            {step.type === "write" && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea value={writeText} onChange={e => setWriteText(e.target.value)} placeholder={step.placeholder} rows={2}
                  style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 14, padding: "11px 14px", fontFamily: F.sans, fontSize: 14, outline: "none", background: C.surface, resize: "none", boxSizing: "border-box", minWidth: 0 }} />
                <button onClick={submit} style={{ width: 42, height: 42, borderRadius: 14, border: "none", background: canSubmit ? C.purple : "#C9C6E8", color: C.white, cursor: canSubmit ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Send size={16} /></button>
              </div>
            )}

            {step.type === "goals" && goals.map((g, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: i === 0 ? 0 : 8 }}>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: g.trim().length > 2 ? C.teal : C.gray, width: 18, fontWeight: 700 }}>{g.trim().length > 2 ? "✓" : `0${i + 1}`}</span>
                <input value={g} onChange={e => setGoals(gs => gs.map((x, j) => j === i ? e.target.value : x))}
                  placeholder={i === 0 ? `e.g. ${step.placeholders[0]}` : `${step.placeholders[i]} (optional)`}
                  style={{ flex: 1, border: `1px solid ${g.trim().length > 2 ? C.teal : C.line}`, borderRadius: 12, padding: "10px 13px", fontFamily: F.sans, fontSize: 13.5, outline: "none", background: C.surface, minWidth: 0 }} />
              </div>
            ))}
          </div>

          {/* sticky CTA */}
          {step.type !== "write" && (
            <div style={{ padding: "8px 16px 16px", flexShrink: 0, borderTop: `1px solid ${C.line}`, background: C.white }}>
              <Btn disabled={!canSubmit} onClick={submit}>
                {step.type === "goals"
                  ? (canSubmit ? `Set my goal${goalsDone === 1 ? "" : "s"} (${goalsDone}/3)` : "Write at least 1 goal")
                  : canSubmit ? "Lock it in"
                  : step.type === "single" ? "Pick one to continue"
                  : `Pick ${Math.max(0, (step.min || 1) - sel.length)} more`}
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const UnlockScreen = ({ role, onNext, toast }) => (
  <div style={{ position: "absolute", inset: 0, background: C.purple, zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30, textAlign: "center", color: C.white }}>
    <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 2.5, color: "#C9C3F2" }}>{role === "mentee" ? "BADGE 1 OF 8 · DAY 1" : "TIER CONFIRMED"}</div>
    <div className="badge-pop" style={{ width: 118, height: 118, background: C.white, margin: "26px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {role === "mentee" ? <Glyph color={C.purple} size={54} /> : <Crown size={50} color={C.purple} />}
    </div>
    <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.8 }}>{role === "mentee" ? "Goal Setter." : "Scout."}</div>
    <div style={{ fontSize: 14.5, marginTop: 8, lineHeight: 1.55, maxWidth: 260, color: "#DDD9F6" }}>
      {role === "mentee"
        ? "Three real goals, on the record. Your streak starts today — and your first badge is already verifiable."
        : "You’re on the Roster. Your Impact Score is live — every mentee outcome grows it from here."}
    </div>
    <div style={{ fontFamily: F.mono, fontSize: 10.5, marginTop: 14, color: "#C9C3F2" }}>
      {role === "mentee" ? "RYZ-2026-00441 · VERIFIED" : "SCOUT → PATHFINDER AT 400 IMPACT"}
    </div>
    {role === "mentee" && (
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 16, background: "rgba(255,255,255,.12)", padding: "8px 14px", borderRadius: 12 }}>
        <Flame size={15} color="#FFB59A" fill="#FFB59A" /><span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700 }}>STREAK · DAY 1</span>
      </div>
    )}
    <div style={{ width: "100%", maxWidth: 280, marginTop: 26, display: "flex", flexDirection: "column", gap: 10 }}>
      <Btn kind="dark" onClick={() => shareToLinkedIn(role === "mentee"
        ? "Day one on Ryzn. Three real goals on the record, and my first badge earned."
        : "I've joined the Ryzn mentor Roster. Taking on my first cohort now.")}><Linkedin size={15} /> Share to LinkedIn</Btn>
      <button onClick={onNext} style={{ background: "none", border: "none", color: "#DDD9F6", fontFamily: F.sans, fontWeight: 600, fontSize: 14, cursor: "pointer", padding: 10 }}>
        {role === "mentee" ? "See my mentor matches" : "See my matched mentees"}
      </button>
    </div>
  </div>
);

export const FilterSheet = ({ open, close, sections, values, setValues, count, countLabel }) => {
  if (!open) return null;
  return (
    <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(26,26,26,.5)", zIndex: 55, display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} className="sheet-up" style={{ background: C.white, width: "100%", borderRadius: "22px 22px 0 0", padding: "16px 22px 24px", boxSizing: "border-box" }}>
        <div style={{ width: 38, height: 4, background: "#D8D6D0", borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 19, fontWeight: 700 }}>Filters</div>
          <button onClick={() => setValues(v => Object.fromEntries(Object.keys(v).map(k => [k, "Any"])))} style={{ background: "none", border: "none", color: C.purple, fontFamily: F.sans, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Reset all</button>
        </div>
        {sections.map(s => (
          <div key={s.key} style={{ marginTop: 14 }}>
            <Label>{s.label}</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {s.options.map(o => {
                const on = values[s.key] === o;
                return (
                  <button key={o} onClick={() => setValues(v => ({ ...v, [s.key]: o }))} style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 12.5, cursor: "pointer", padding: "8px 12px", borderRadius: 18, border: `1.5px solid ${on ? C.purple : C.line}`, background: on ? C.purple : C.surface, color: on ? C.white : C.ink, display: "inline-flex", alignItems: "center", gap: 5 }}>{on && <Check size={12} strokeWidth={3} />}{o}</button>
                );
              })}
            </div>
          </div>
        ))}
        <Btn style={{ marginTop: 18 }} onClick={close}>Show {count} {countLabel}{count === 1 ? "" : "s"}</Btn>
      </div>
    </div>
  );
};

export const SwipeDeck = ({ deck, renderCard, stampRight, stampLeft, canRight, onDecide, onUndo, canUndo, emptyView, onTap }) => {
  const [drag, setDrag] = useState(null);
  const [fling, setFling] = useState(null);
  const top = deck[0], next = deck[1];
  const x = fling ? (fling === "right" ? 520 : -520) : drag ? drag.x : 0;
  const commit = (dir) => {
    if (!top || fling) return;
    if (dir === "right" && !canRight) { setDrag(null); onDecide(top, "blocked"); return; }
    setFling(dir);
    setTimeout(() => { const t = top; setFling(null); setDrag(null); onDecide(t, dir); }, 240);
  };
  const onDown = (e) => { if (!top || fling) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag({ startX: e.clientX, x: 0 }); };
  const onMove = (e) => { if (!drag || fling) return; const dx = e.clientX - drag.startX; setDrag(d => d ? { ...d, x: dx } : d); };
  const onUp = () => { if (!drag || fling) return; if (drag.x > 90) commit("right"); else if (drag.x < -90) commit("left"); else { if (Math.abs(drag.x) < 8 && onTap) onTap(top); setDrag(null); } };
  const roundBtn = (size, bg, color, borderColor) => ({ width: size, height: size, borderRadius: size / 2, border: borderColor ? `1.5px solid ${borderColor}` : "none", background: bg, color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(26,26,26,.10)" });
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 20px 14px", minHeight: 0 }}>
      <div style={{ flex: 1, position: "relative", minHeight: 0, overflow: "hidden" }}>
        {!top && emptyView}
        {next && <div style={{ position: "absolute", inset: 0, transform: "scale(.94) translateY(12px)", opacity: 0.75, pointerEvents: "none" }}>{renderCard(next)}</div>}
        {top && (
          <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            style={{ position: "absolute", inset: 0, transform: `translateX(${x}px) rotate(${x / 18}deg)`, transition: drag ? "none" : "transform .24s ease", cursor: "grab", touchAction: "pan-y", userSelect: "none" }}>
            {renderCard(top)}
            <div style={{ position: "absolute", top: 20, left: 18, border: `3px solid ${C.teal}`, color: C.teal, fontFamily: F.mono, fontWeight: 700, fontSize: 15, letterSpacing: 2, padding: "5px 12px", transform: "rotate(-12deg)", opacity: Math.max(0, Math.min(1, x / 80)), background: "rgba(255,255,255,.92)", pointerEvents: "none" }}>{stampRight}</div>
            <div style={{ position: "absolute", top: 20, right: 18, border: `3px solid ${C.coral}`, color: C.coral, fontFamily: F.mono, fontWeight: 700, fontSize: 15, letterSpacing: 2, padding: "5px 12px", transform: "rotate(12deg)", opacity: Math.max(0, Math.min(1, -x / 80)), background: "rgba(255,255,255,.92)", pointerEvents: "none" }}>{stampLeft}</div>
          </div>
        )}
      </div>
      {top && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, paddingTop: 12 }}>
          <button onClick={() => commit("left")} style={roundBtn(54, C.white, C.coral, C.coral)} title={stampLeft}><X size={24} /></button>
          {/* The match decks pass no onUndo at all, so this used to render as a
              permanently greyed button that could never do anything. Screens
              that can undo (the add-a-mentor decks) still get it. */}
          {onUndo && (
            <button onClick={onUndo} disabled={!canUndo} style={{ ...roundBtn(38, C.white, canUndo ? C.gray : "#C9C6C0", C.line), boxShadow: "none" }} title="Undo"><RotateCcw size={15} /></button>
          )}
          <button onClick={() => commit("right")} style={roundBtn(54, canRight ? C.purple : "#C9C6E8", C.white)} title={stampRight}><Check size={26} strokeWidth={3} /></button>
        </div>
      )}
    </div>
  );
};


export const CardGrid = ({ deck, renderCard, stampRight, stampLeft, canRight, onDecide, onUndo, canUndo, emptyView, onTap }) => {
  const roundBtn = (size, bg, color, borderColor) => ({ width: size, height: size, borderRadius: size / 2, border: borderColor ? `1.5px solid ${borderColor}` : "none", background: bg, color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(26,26,26,.10)" });
  if (deck.length === 0) return <div style={{ flex: 1, minHeight: 0, padding: "10px 24px 24px" }}>{emptyView}</div>;
  return (
    <div className="app-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 24px 24px" }}>
      {onUndo && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <button onClick={onUndo} disabled={!canUndo} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${canUndo ? C.line : "transparent"}`, borderRadius: 10, padding: "6px 12px", cursor: canUndo ? "pointer" : "default", color: canUndo ? C.gray : "#C9C6C0", fontFamily: F.sans, fontWeight: 600, fontSize: 12.5 }}>
            <RotateCcw size={13} /> Undo last
          </button>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 20 }}>
        {deck.map((item, i) => (
          <div key={item.name || i} style={{ height: 420, display: "flex", flexDirection: "column", gap: 10 }}>
            <div onClick={() => onTap && onTap(item)} style={{ flex: 1, minHeight: 0, cursor: onTap ? "pointer" : "default" }}>
              {renderCard(item)}
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
              <button onClick={() => onDecide(item, "left")} style={roundBtn(44, C.white, C.coral, C.coral)} title={stampLeft}><X size={18} /></button>
              <button onClick={() => onDecide(item, canRight ? "right" : "blocked")} style={roundBtn(44, canRight ? C.purple : "#C9C6E8", C.white)} title={stampRight}><Check size={20} strokeWidth={3} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* Sits above ModalShell's close button rather than beside it, so this header
   gets the full width back — hence NoCloseGutter. Closing is `close` here. */
export const DetailShell = ({ title, right, close, footer, children }) => (
  <NoCloseGutter>
    <div style={{ position: "absolute", inset: 0, background: C.surface, zIndex: 50, display: "flex", flexDirection: "column", borderRadius: 24, overflow: "hidden" }}>
      <HeaderRow title={title} onBack={close} right={right} />
      <div className="app-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>{children}</div>
      <div style={{ padding: "10px 20px 16px", background: C.white, borderTop: `1px solid ${C.line}`, flexShrink: 0 }}>{footer}</div>
    </div>
  </NoCloseGutter>
);


/* ————— Shared bits for the two decks —————
   Every field below comes from /api/roster, which reads real accounts. A field
   the person hasn't filled in renders as nothing, never as a placeholder — an
   empty profile is information, and inventing a bio to fill the space is the
   exact behaviour this screen is being cured of. */

/** Shared answers between two people, or null when either side has none.
    Shown as a count, not a percentage: the old "96% MATCH" was a number no
    part of the system computed. */
export const AffinityTag = ({ affinity, color = C.purple }) =>
  affinity && affinity.shared > 0 ? (
    <Label color={color}>{affinity.shared} SHARED {affinity.shared === 1 ? "ANSWER" : "ANSWERS"}</Label>
  ) : null;

export const Initials = ({ name }) => <>{(name || "?").split(" ").map(w => w[0]).join("").slice(0, 2)}</>;

export const TagRow = ({ items = [], bg = C.surface, color = C.gray, border = true, limit }) => {
  const list = Array.isArray(items) ? items : [];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {(limit ? list.slice(0, limit) : list).map(t => (
        <span key={t} style={{ fontSize: 11, fontWeight: 600, background: bg, border: border ? `1px solid ${C.line}` : "none", borderRadius: 12, padding: "4px 10px", color }}>{t}</span>
      ))}
    </div>
  );
};

/** Shown when nobody is on the other side of the platform yet. Early cohorts
    genuinely start here, and saying so is better than a deck of strangers. */
export const EmptyRoster = ({ title, body, action }) => (
  <div style={{ height: "100%", background: C.white, borderRadius: 20, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 26 }}>
    <Glyph color={C.purple} size={40} />
    <div style={{ fontSize: 21, fontWeight: 700, marginTop: 14 }}>{title}</div>
    <div style={{ fontSize: 13, color: C.gray, marginTop: 8, lineHeight: 1.55, maxWidth: 280 }}>{body}</div>
    {action}
  </div>
);

export const MentorDetailSheet = ({ m, close, footer }) => {
  const [posts, setPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(!!m?.id);
  const [contentTab, setContentTab] = useState("feed");
  const paired = m.matchState === "accepted";

  useEffect(() => {
    if (!m?.id) { setFeedLoading(false); return; }
    let cancelled = false;
    (async () => {
      setFeedLoading(true);
      try {
        const { posts: rows } = await fetchPosts(
          paired ? { mentorId: m.id } : { mentorId: m.id, scope: "profile" }
        );
        if (!cancelled) setPosts(rows || []);
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [m?.id, paired]);

  const resourceCount = posts.filter((p) => p.kind === "video" || p.kind === "resource").length;

  return (
    <DetailShell title="Mentor profile" right={<AffinityTag affinity={m.affinity} />} close={close} footer={footer}>
      <Card style={{ background: C.ink, border: "none", color: C.white, padding: 20 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Avatar src={m.avatarUrl} name={m.name} size={58} bg={C.purple} color={C.white} radius={0} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{m.name}</div>
            {m.headline && <div style={{ fontSize: 12.5, color: "#B5B3AE" }}>{m.headline}</div>}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.purple, padding: "4px 9px", marginTop: 7, fontFamily: F.mono, fontSize: 9, letterSpacing: 1 }}><Crown size={11} /> {(m.tier || "Scout").toUpperCase()}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 26, marginTop: 16 }}>
          {[[m.impact ?? 0, "IMPACT"], [m.industry || "—", "INDUSTRY"]].map(([n, l]) => (
            <div key={l}><div style={{ fontSize: 18, fontWeight: 700, color: "#B7AFF2" }}>{n}</div><div style={{ fontFamily: F.mono, fontSize: 8, color: "#8B8985", letterSpacing: 1 }}>{l}</div></div>
          ))}
        </div>
      </Card>
      {m.why && (
        <Card>
          <Label>Why they mentor</Label>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>{m.why}</div>
        </Card>
      )}
      {m.expertise?.length > 0 && (
        <Card>
          <Label color={C.purple}>What they can teach</Label>
          <div style={{ marginTop: 10 }}><TagRow items={m.expertise} bg={C.purpleTint} color={C.purple} border={false} /></div>
        </Card>
      )}
      {m.menteeFit?.length > 0 && (
        <Card>
          <Label color={C.teal}>Who they want to work with</Label>
          <div style={{ marginTop: 10 }}><TagRow items={m.menteeFit} bg={C.tealTint} color={C.teal} border={false} /></div>
        </Card>
      )}
      {m.education && (
        <Card>
          <Label>Education</Label>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>{m.education}</div>
        </Card>
      )}
      {m.experience && (
        <Card>
          <Label>Current role</Label>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>{m.experience}</div>
        </Card>
      )}
      {m.capacity != null && (
        <Card>
          <Label color={C.amber}>Cohort capacity</Label>
          <div style={{ fontSize: 13.5, marginTop: 8 }}>Taking up to {m.capacity} mentee{m.capacity === 1 ? "" : "s"} this cohort.</div>
        </Card>
      )}
      <ContentTabBar view={contentTab} setView={setContentTab} count={resourceCount} />
      {feedLoading ? (
        <Card><div style={{ fontFamily: F.mono, fontSize: 10, color: C.gray, letterSpacing: 0.6 }}>LOADING FEED…</div></Card>
      ) : (
        <ContentTabs
          feed={posts}
          authorName={m.name}
          authorId={m.id}
          view={contentTab}
          readOnly
          emptyText={`${(m.name || "They").split(" ")[0]} hasn’t put anything on their profile yet.`}
        />
      )}
    </DetailShell>
  );
};

export const MenteeDetailSheet = ({ m, close, footer }) => {
  const influences = Array.isArray(m.influences) ? m.influences : [];
  const paired = m.matchState === "accepted";
  const [exercises, setExercises] = useState([]);
  const [exLoading, setExLoading] = useState(paired && !!m?.id);

  useEffect(() => {
    if (!paired || !m?.id) { setExLoading(false); return; }
    let cancelled = false;
    (async () => {
      setExLoading(true);
      try {
        const { exercises: rows } = await fetchMenteeExercises(m.id);
        if (!cancelled) setExercises(rows || []);
      } catch {
        if (!cancelled) setExercises([]);
      } finally {
        if (!cancelled) setExLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [m?.id, paired]);

  return (
    <DetailShell title="Mentee profile" right={<AffinityTag affinity={m.affinity} />} close={close} footer={footer}>
      <Card style={{ background: C.deep, border: "none", color: C.white, padding: 20 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Avatar src={m.avatarUrl} name={m.name} size={58} bg={C.purple} color={C.white} radius={0} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{m.name}</div>
            {m.headline && <div style={{ fontSize: 12.5, color: "#B5B3AE", marginTop: 2, lineHeight: 1.4 }}>{m.headline}</div>}
            {labelOf(m.track) && <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.14)", padding: "4px 9px", marginTop: 7, fontFamily: F.mono, fontSize: 9, letterSpacing: 1 }}><School size={11} /> {labelOf(m.track).toUpperCase()}</div>}
          </div>
        </div>
      </Card>
      {m.goals?.length > 0 && (
        <Card>
          <Label color={C.purple}>Their program goals</Label>
          {m.goals.map((g, i) => (
            <div key={g} style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "flex-start" }}>
              <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.purple, marginTop: 1 }}>0{i + 1}</span>
              <div style={{ fontSize: 13, lineHeight: 1.45, fontStyle: "italic" }}>“{g}”</div>
            </div>
          ))}
        </Card>
      )}
      {m.skills?.length > 0 && (
        <Card>
          <Label color={C.teal}>Skills they claim today</Label>
          <div style={{ marginTop: 10 }}><TagRow items={m.skills} bg={C.tealTint} color={C.teal} border={false} /></div>
        </Card>
      )}
      {m.interests?.length > 0 && (
        <Card>
          <Label color={C.amber}>What pulls at them</Label>
          <div style={{ marginTop: 10 }}><TagRow items={m.interests} /></div>
        </Card>
      )}
      {influences.length > 0 && (
        <Card>
          <Label>Who they follow</Label>
          <div style={{ marginTop: 10 }}><TagRow items={influences} /></div>
        </Card>
      )}
      {m.education && (
        <Card>
          <Label>Education</Label>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>{m.education}</div>
        </Card>
      )}
      {m.experience && (
        <Card>
          <Label>Experience & projects</Label>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>{m.experience}</div>
        </Card>
      )}
      {paired && (
        <Card>
          <Label>Their journal</Label>
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
      )}
    </DetailShell>
  );
};

/* ————————————————— MENTEE: choosing a mentor ————————————————— */

export const MatchesScreen = ({ xp, addXp, toast, onEnterApp, roster = [], matches = [], onDecide, loading, error }) => {
  const isDesktop = useIsDesktop();
  const [filters, setFilters] = useState({ tier: "Any", industry: "Any" });
  const [showFilter, setShowFilter] = useState(false);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const firstReq = useRef(false);

  /* Decisions come back from the server, not local state. The roster already
     excludes anyone answered for, so the deck is whatever is genuinely left.
     Guard array shape — a non-array here used to throw in render and take the
     whole shell down via the root boundary ("Something broke on our side"). */
  const safeRoster = Array.isArray(roster) ? roster : [];
  const safeMatches = Array.isArray(matches) ? matches : [];
  const pending = safeMatches.filter(m => m.status === "pending");
  const accepted = safeMatches.filter(m => m.status === "accepted");
  const inbox = safeMatches.filter(m => m.awaitingYou);
  const requested = [...accepted, ...pending];
  const openReqs = pending.length;
  const activeMentor = accepted.find(m => m.seat === "active") || accepted[0] || null;

  const passes = (m) =>
    (filters.tier === "Any" || m.tier === filters.tier) &&
    (filters.industry === "Any" || labelOf(m.industry) === filters.industry);
  const filtered = safeRoster.filter(passes);
  const deck = filtered;
  const activeF = Object.values(filters).filter(v => v !== "Any").length;

  // Industries offered as filters are the ones actually present in the roster,
  // so the list never promises a category nobody occupies.
  const industries = ["Any", ...new Set(safeRoster.map(m => labelOf(m.industry)).filter(Boolean))];

  const decide = async (m, dir) => {
    if (dir === "blocked") { toast("All 3 mentor seats are held"); return; }
    if (busy) return;
    setBusy(true);
    try {
      const res = await onDecide(m, dir === "right" ? "request" : "pass");
      if (dir === "right") {
        if (!firstReq.current) { firstReq.current = true; addXp(25); }
        const first = (m.name || "them").split(" ")[0];
        toast(res?.match?.status === "accepted"
          ? `You’re matched with ${first}`
          : `Request sent to ${first}`);
      }
    } catch (e) {
      toast(e.message || "Couldn’t save that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  /** Answering a mentor who asked first. Separate from `decide` because it acts
      on a match id, not a roster person — and it must not reject unhandled. */
  const respond = async (match, action) => {
    if (busy) return;
    setBusy(true);
    try {
      await onDecide(match, action);
      const first = (match.person?.name || "them").split(" ")[0];
      toast(action === "accept" ? `You’re matched with ${first}` : "Declined.");
    } catch (e) {
      toast(e.message || "Couldn’t save that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const renderCard = (m) => {
    const bg = DECK_COLORS[Math.max(0, safeRoster.indexOf(m)) % DECK_COLORS.length];
    return (
      <div style={{ height: "100%", background: C.white, borderRadius: 20, border: `1px solid ${C.line}`, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 12px 32px rgba(26,26,26,.12)" }}>
        <div style={{ height: "44%", background: bg, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 76, fontWeight: 700, color: "rgba(255,255,255,.94)", letterSpacing: -3 }}><Initials name={m.name} /></div>
          {m.affinity?.shared > 0 && <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(26,26,26,.45)", color: C.white, fontFamily: F.mono, fontSize: 11, fontWeight: 700, padding: "6px 10px" }}>{m.affinity.shared} SHARED</div>}
          <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,.94)", color: bg === C.teal ? C.teal : C.deep, fontFamily: F.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: 1, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}><Crown size={11} /> {(m.tier || "Scout").toUpperCase()}</div>
          {m.industry && <div style={{ position: "absolute", bottom: 12, right: 12, fontFamily: F.mono, fontSize: 9, color: "rgba(255,255,255,.8)", letterSpacing: 1 }}>{String(m.industry).toUpperCase()}</div>}
        </div>
        <div style={{ flex: 1, padding: "13px 16px 14px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>{m.name}</div>
          {m.headline && <div style={{ fontSize: 12.5, color: C.gray, marginTop: 1 }}>{m.headline}</div>}
          {m.why && <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5, marginTop: 8, overflow: "hidden", flex: 1 }}>{m.why}</div>}
          <div style={{ marginTop: 8 }}><TagRow items={m.expertise} limit={3} /></div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 9, letterSpacing: 0.5 }}>IMPACT {m.impact ?? 0}{m.capacity ? ` · ${m.capacity} SEAT${m.capacity === 1 ? "" : "S"} THIS COHORT` : ""}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, padding: "6px 0", background: C.purpleTint, borderRadius: 10, color: C.purple, fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.8 }}>TAP FOR FULL PROFILE</div>
        </div>
      </div>
    );
  };

  const emptyView = requested.length > 0 ? (
    <div style={{ height: "100%", background: C.white, borderRadius: 20, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 26 }}>
      <Glyph color={C.purple} size={40} />
      <div style={{ fontSize: 21, fontWeight: 700, marginTop: 14 }}>That’s the deck.</div>
      <div style={{ fontSize: 13, color: C.gray, marginTop: 6, lineHeight: 1.5 }}>
        {openReqs > 0
          ? `${openReqs} request${openReqs === 1 ? "" : "s"} out. Mentors reply in their own time — you’ll get a notification.`
          : "Your pairings are saved to your account."}
      </div>
      <div style={{ width: "100%", marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {requested.map(m => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, borderRadius: 12, padding: "9px 12px" }}>
            <Monogram name={m.person?.name} size={30} />
            <span style={{ flex: 1, textAlign: "left", fontWeight: 600, fontSize: 13 }}>{m.person?.name || "—"}</span>
            {m.status === "accepted"
              ? <span style={{ fontFamily: F.mono, fontSize: 9, background: C.tealTint, color: C.teal, fontWeight: 700, padding: "4px 8px" }}>{m.seat === "active" ? "ACTIVE ✓" : "SUPPORT ✓"}</span>
              : m.awaitingYou
                ? <Btn small disabled={busy} onClick={() => respond(m, "accept")}>Accept</Btn>
                : <span style={{ fontFamily: F.mono, fontSize: 9, background: C.amberTint, color: C.amber, fontWeight: 700, padding: "4px 8px" }}>PENDING</span>}
          </div>
        ))}
      </div>
    </div>
  ) : (
    <EmptyRoster
      title={loading ? "Finding your matches…" : error ? "Couldn’t load the Roster." : "No mentors yet."}
      body={loading ? "One moment." : error
        ? "Something went wrong on our end. Try again in a moment."
        : "The founding mentors are still being onboarded. You’ll get a notification the moment there’s someone to meet — your Day 1 exercises are open in the meantime."}
      action={!loading && !error ? <Btn style={{ marginTop: 18 }} onClick={() => onEnterApp(null)}>Start Day 1 without a mentor</Btn> : error ? <Btn style={{ marginTop: 18 }} kind="ghost" onClick={() => onEnterApp(null)}>Continue to Day 1</Btn> : null}
    />
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 20px 10px", background: C.white, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Label color={C.purple}>Matched from your answers</Label>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, marginTop: 3 }}>
              {filtered.length === 0 ? "Your mentors." : `Your ${filtered.length} mentor${filtered.length === 1 ? "" : "s"}.`}
            </div>
          </div>
          <XPPill xp={xp} />
          <button onClick={() => setShowFilter(true)} style={{ position: "relative", background: activeF ? C.purpleTint : C.white, border: `1.5px solid ${activeF ? C.purple : C.line}`, borderRadius: 12, padding: 9, cursor: "pointer" }}>
            <SlidersHorizontal size={16} color={activeF ? C.purple : C.ink} />
            {activeF > 0 && <span style={{ position: "absolute", top: -6, right: -6, width: 17, height: 17, borderRadius: 9, background: C.purple, color: C.white, fontFamily: F.mono, fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeF}</span>}
          </button>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 7, letterSpacing: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>SWIPE OR TAP — ✓ REQUEST · ✕ PASS · {deck.length} LEFT · {Math.max(0, 3 - requested.length)} SEAT{3 - requested.length === 1 ? "" : "S"} FREE</div>
      </div>
      {inbox.length > 0 && (
        <div style={{ padding: "10px 20px 0" }}>
          <Label color={C.purple}>Asked for you · {inbox.length}</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {inbox.map(m => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.purpleTint, borderRadius: 12, padding: "9px 12px" }}>
                <Monogram name={m.person?.name} size={30} bg={C.purple} color={C.white} />
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{m.person?.name || "—"}</div>
                  <div style={{ fontSize: 11.5, color: C.gray }}>Invited you to their cohort</div>
                </div>
                <Btn small kind="ghost" style={{ borderColor: C.line, color: C.gray }} disabled={busy} onClick={() => respond(m, "decline")}>Pass</Btn>
                <Btn small disabled={busy || requested.length >= 3} onClick={() => respond(m, "accept")}>Accept</Btn>
              </div>
            ))}
          </div>
        </div>
      )}
      {isDesktop
        ? <CardGrid deck={deck} renderCard={renderCard} stampRight="REQUEST" stampLeft="PASS" canRight={requested.length < 3} onDecide={decide} canUndo={false} emptyView={emptyView} onTap={setDetail} />
        : <SwipeDeck deck={deck} renderCard={renderCard} stampRight="REQUEST" stampLeft="PASS" canRight={requested.length < 3} onDecide={decide} canUndo={false} emptyView={emptyView} onTap={setDetail} />}
      {activeMentor && (
        <div className="sheet-up" style={{ padding: "10px 20px 16px", background: C.white, borderTop: `1px solid ${C.line}` }}>
          <Btn onClick={() => onEnterApp(activeMentor)}>Enter Ryzn · Week 1 with {(activeMentor.person?.name || "your mentor").split(" ")[0]}</Btn>
        </div>
      )}
      {detail && (
        <MentorDetailSheet m={detail} close={() => setDetail(null)} footer={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="ghost" style={{ flex: 0.6, borderColor: C.line, color: C.gray }} onClick={() => { const m = detail; setDetail(null); decide(m, "left"); }}>Pass</Btn>
            <Btn style={{ flex: 1 }} disabled={requested.length >= 3} onClick={() => { const m = detail; setDetail(null); decide(m, "right"); }}>{requested.length >= 3 ? "All 3 seats held" : "Request to connect"}</Btn>
          </div>
        } />
      )}
      <FilterSheet open={showFilter} close={() => setShowFilter(false)} values={filters} setValues={setFilters} count={filtered.length} countLabel="mentor"
        sections={[
          { key: "tier", label: "Mentor tier", options: ["Any", "Scout", "Pathfinder", "Architect", "Legend"] },
          { key: "industry", label: "Industry", options: industries },
        ]} />
    </div>
  );
};

/* ————————————————— MENTOR: accepting mentees ————————————————— */

export const RequestsScreen = ({ xp, addXp, toast, onEnterApp, roster = [], matches = [], onDecide, loading, error, capacity = 4 }) => {
  const isDesktop = useIsDesktop();
  const [filters, setFilters] = useState({ track: "Any" });
  const [showFilter, setShowFilter] = useState(false);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  /* capacity can arrive as a bad number from a mangled profile — Array(NaN)
     throws RangeError and wiped the whole app via the root boundary. */
  const cap = (() => {
    const n = Number(capacity);
    return Number.isFinite(n) && n > 0 ? Math.min(20, Math.floor(n)) : 4;
  })();

  /* Server state, not local. `inbox` is mentees who asked for you — those are
     answered, not swiped, and they used to be invisible entirely because a
     mentee's request lived only in the mentee's own browser. */
  const safeRoster = Array.isArray(roster) ? roster : [];
  const safeMatches = Array.isArray(matches) ? matches : [];
  const accepted = safeMatches.filter(m => m.status === "accepted");
  const inbox = safeMatches.filter(m => m.awaitingYou);
  const outbox = safeMatches.filter(m => m.status === "pending" && !m.awaitingYou);
  const taken = accepted.length;

  const passes = (m) => filters.track === "Any" || labelOf(m.track) === filters.track;
  const deck = safeRoster.filter(passes);
  const activeF = Object.values(filters).filter(v => v !== "Any").length;

  const decide = async (m, dir) => {
    if (dir === "blocked") { toast(`Cohort full · ${cap} seats`); return; }
    if (busy) return;
    setBusy(true);
    try {
      const res = await onDecide(m, dir === "right" ? "request" : "pass");
      if (dir === "right") {
        addXp(30);
        const first = (m.name || "them").split(" ")[0];
        toast(res?.match?.status === "accepted"
          ? `${first} joined your cohort`
          : `Invitation sent to ${first}`);
      }
    } catch (e) {
      toast(e.message || "Couldn’t save that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  /** Answering a mentee who asked first — acts on a match id, not a roster row. */
  const respond = async (match, action) => {
    if (busy) return;
    setBusy(true);
    try {
      await onDecide(match, action);
      if (action === "accept") addXp(30);
      const first = (match.person?.name || "them").split(" ")[0];
      toast(action === "accept" ? `${first} joined your cohort` : "Declined.");
    } catch (e) {
      toast(e.message || "Couldn’t save that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const renderCard = (m) => {
    const bg = DECK_COLORS[(Math.max(0, safeRoster.indexOf(m)) + 1) % DECK_COLORS.length];
    return (
      <div style={{ height: "100%", background: C.white, borderRadius: 20, border: `1px solid ${C.line}`, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 12px 32px rgba(26,26,26,.12)" }}>
        <div style={{ height: "42%", background: bg, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 76, fontWeight: 700, color: "rgba(255,255,255,.94)", letterSpacing: -3 }}><Initials name={m.name} /></div>
          {m.affinity?.shared > 0 && <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(26,26,26,.45)", color: C.white, fontFamily: F.mono, fontSize: 11, fontWeight: 700, padding: "6px 10px" }}>{m.affinity.shared} SHARED</div>}
          {labelOf(m.track) && <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,.94)", color: C.deep, fontFamily: F.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: 1, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}><School size={11} /> {labelOf(m.track).toUpperCase()}</div>}
        </div>
        <div style={{ flex: 1, padding: "13px 16px 14px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>{m.name}</div>
          {m.goals?.[0] && (
            <div style={{ background: C.surface, borderRadius: 10, padding: "8px 11px", marginTop: 8 }}>
              <span style={{ fontFamily: F.mono, fontSize: 8.5, color: C.gray, letterSpacing: 0.8 }}>GOAL 1 OF {m.goals.length}</span>
              <div style={{ fontSize: 12.5, fontStyle: "italic", marginTop: 2 }}>“{m.goals[0]}”</div>
            </div>
          )}
          <div style={{ marginTop: 8, flex: 1 }}><TagRow items={m.interests} limit={3} /></div>
          <div style={{ marginTop: 6 }}><TagRow items={m.skills} limit={2} bg={C.tealTint} color={C.teal} border={false} /></div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, padding: "6px 0", background: C.purpleTint, borderRadius: 10, color: C.purple, fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.8 }}>TAP FOR FULL PROFILE</div>
        </div>
      </div>
    );
  };

  const emptyView = (taken > 0 || outbox.length > 0) ? (
    <div style={{ height: "100%", background: C.white, borderRadius: 20, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 26 }}>
      <Crown size={34} color={C.purple} />
      <div style={{ fontSize: 21, fontWeight: 700, marginTop: 12 }}>{taken > 0 ? "Cohort forming." : "Invitations out."}</div>
      <div style={{ fontSize: 13, color: C.gray, marginTop: 6 }}>{taken} of {cap} seats filled{outbox.length > 0 ? ` · ${outbox.length} awaiting a reply` : ""}.</div>
      <div style={{ width: "100%", marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {[...accepted, ...outbox].map(m => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: m.status === "accepted" ? C.tealTint : C.surface, borderRadius: 12, padding: "9px 12px" }}>
            <Monogram name={m.person?.name} size={30} bg={m.status === "accepted" ? C.teal : undefined} color={m.status === "accepted" ? C.white : undefined} />
            <span style={{ flex: 1, textAlign: "left", fontWeight: 600, fontSize: 13, color: m.status === "accepted" ? C.teal : C.ink }}>{m.person?.name || "—"}</span>
            {m.status === "accepted"
              ? <Check size={15} color={C.teal} strokeWidth={3} />
              : <span style={{ fontFamily: F.mono, fontSize: 9, background: C.amberTint, color: C.amber, fontWeight: 700, padding: "4px 8px" }}>PENDING</span>}
          </div>
        ))}
      </div>
    </div>
  ) : (
    <EmptyRoster
      title={loading ? "Matching mentees…" : error ? "Couldn’t load matches." : "No mentees yet."}
      body={loading ? "One moment." : error
        ? "Something went wrong on our end. Try again in a moment."
        : "You’re early — mentee applications for this cohort are still open. We’ll notify you the moment someone matches your profile. Your dashboard is ready in the meantime."}
      action={!loading && !error ? <Btn style={{ marginTop: 18 }} onClick={() => onEnterApp([])}>Open my dashboard</Btn> : error ? <Btn style={{ marginTop: 18 }} kind="ghost" onClick={() => onEnterApp([])}>Open my dashboard</Btn> : null}
    />
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 20px 10px", background: C.white, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Label color={C.purple}>Matched to your profile</Label>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, marginTop: 3 }}>Mentee requests.</div>
          </div>
          <XPPill xp={xp} unit="IMP" />
          <button onClick={() => setShowFilter(true)} style={{ position: "relative", background: activeF ? C.purpleTint : C.white, border: `1.5px solid ${activeF ? C.purple : C.line}`, borderRadius: 12, padding: 9, cursor: "pointer" }}>
            <SlidersHorizontal size={16} color={activeF ? C.purple : C.ink} />
            {activeF > 0 && <span style={{ position: "absolute", top: -6, right: -6, width: 17, height: 17, borderRadius: 9, background: C.purple, color: C.white, fontFamily: F.mono, fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeF}</span>}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
          <div style={{ display: "flex", gap: 3, flex: 1 }}>
            {[...Array(cap)].map((_, i) => <div key={i} style={{ flex: 1, height: 5, background: i < taken ? C.purple : "#E6E5E1", transition: "background .3s" }} />)}
          </div>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.purple, fontWeight: 700 }}>{taken}/{cap} SEATS · +30 IMPACT EACH</span>
        </div>
      </div>
      {inbox.length > 0 && (
        <div style={{ padding: "10px 20px 0" }}>
          <Label color={C.purple}>Asked for you · {inbox.length}</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {inbox.map(m => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.purpleTint, borderRadius: 12, padding: "9px 12px" }}>
                <Monogram name={m.person?.name} size={30} bg={C.purple} color={C.white} />
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{m.person?.name || "—"}</div>
                  {m.person?.goals?.[0] && <div style={{ fontSize: 11.5, color: C.gray, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>“{m.person.goals[0]}”</div>}
                </div>
                <Btn small kind="ghost" style={{ borderColor: C.line, color: C.gray }} disabled={busy} onClick={() => respond(m, "decline")}>Pass</Btn>
                <Btn small disabled={busy || taken >= cap} onClick={() => respond(m, "accept")}>Accept</Btn>
              </div>
            ))}
          </div>
        </div>
      )}
      {isDesktop
        ? <CardGrid deck={deck} renderCard={renderCard} stampRight="INVITE" stampLeft="PASS" canRight={taken < cap} onDecide={decide} canUndo={false} emptyView={emptyView} onTap={setDetail} />
        : <SwipeDeck deck={deck} renderCard={renderCard} stampRight="INVITE" stampLeft="PASS" canRight={taken < cap} onDecide={decide} canUndo={false} emptyView={emptyView} onTap={setDetail} />}
      {(taken >= 1 || outbox.length > 0) && (
        <div className="sheet-up" style={{ padding: "10px 20px 16px", background: C.white, borderTop: `1px solid ${C.line}` }}>
          <Btn onClick={() => onEnterApp(accepted)}>Open mentor dashboard · cohort {taken}/{cap}</Btn>
        </div>
      )}
      {detail && (
        <MenteeDetailSheet m={detail} close={() => setDetail(null)} footer={(() => {
          const first = (detail.name || "them").split(" ")[0];
          const pendingOut = outbox.find(m => m.person?.id === detail.id);
          const pendingIn = inbox.find(m => m.person?.id === detail.id);
          const already = accepted.find(m => m.person?.id === detail.id);
          if (already) {
            return <Btn kind="soft" disabled>{first} is in your cohort</Btn>;
          }
          if (pendingOut) {
            return <Btn disabled>Invitation sent · waiting on {first}</Btn>;
          }
          if (pendingIn) {
            return (
              <div style={{ display: "flex", gap: 8 }}>
                <Btn kind="ghost" style={{ flex: 0.6, borderColor: C.line, color: C.gray }} disabled={busy} onClick={() => { setDetail(null); respond(pendingIn, "decline"); }}>Pass</Btn>
                <Btn style={{ flex: 1 }} disabled={busy || taken >= cap} onClick={() => { setDetail(null); respond(pendingIn, "accept"); }}>{taken >= cap ? `Cohort full · ${cap} seats` : `Accept ${first}`}</Btn>
              </div>
            );
          }
          return (
            <div style={{ display: "flex", gap: 8 }}>
              <Btn kind="ghost" style={{ flex: 0.6, borderColor: C.line, color: C.gray }} onClick={() => { const m = detail; setDetail(null); decide(m, "left"); }}>Pass</Btn>
              <Btn style={{ flex: 1 }} disabled={taken >= cap} onClick={() => { const m = detail; setDetail(null); decide(m, "right"); }}>{taken >= cap ? `Cohort full · ${cap} seats` : `Invite ${first}`}</Btn>
            </div>
          );
        })()} />
      )}
      <FilterSheet open={showFilter} close={() => setShowFilter(false)} values={filters} setValues={setFilters} count={deck.length} countLabel="mentee"
        sections={[{ key: "track", label: "Track", options: ["Any", "University", "High school"] }]} />
    </div>
  );
};
