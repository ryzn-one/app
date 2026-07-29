import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Monogram, Field, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots, firstNameOf, initialsOf } from "./ui.jsx";
import { SwipeDeck, CardGrid, MentorDetailSheet, MenteeDetailSheet } from "./chatmatch.jsx";
import { useIsDesktop } from "./useIsDesktop.js";

/* ————————————————— IN-APP ADD DECKS (MAX 3) ————————————————— */

export const AddMentorScreen = ({ candidates, used, onAdd, back, toast, onLoad, loading }) => {
  const isDesktop = useIsDesktop();
  // The deck is only populated when the roster has been fetched; entering this
  // screen straight from the app is the case the journey never covers.
  useEffect(() => { if (onLoad && candidates.length === 0) onLoad(); }, []);
  const [decided, setDecided] = useState({});
  const [history, setHistory] = useState([]);
  const [detail, setDetail] = useState(null);
  const deck = candidates.filter(m => !decided[m.id]);
  const seatsLeft = 3 - used;
  const decide = (m, dir) => {
    if (dir === "blocked") { toast("Mentor seats full · 3 of 3"); return; }
    setHistory(h => [...h, { id: m.id, dir }]);
    if (dir === "right") {
      setDecided(d => ({ ...d, [m.id]: "pending" }));
      toast(`Request sent to ${firstNameOf(m.name)}…`);
      onAdd(m);
    } else setDecided(d => ({ ...d, [m.id]: "passed" }));
  };
  const undo = () => { const last = history[history.length - 1]; if (!last || last.dir !== "left") return; setHistory(h => h.slice(0, -1)); setDecided(d => { const n = { ...d }; delete n[last.id]; return n; }); };
  const renderCard = (m) => {
    const bg = DECK_COLORS[(Math.max(0, candidates.indexOf(m)) + 2) % DECK_COLORS.length];
    return (
      <div style={{ height: "100%", background: C.white, borderRadius: 20, border: `1px solid ${C.line}`, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 12px 32px rgba(26,26,26,.12)" }}>
        <div style={{ height: "42%", background: bg, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: "rgba(255,255,255,.94)", letterSpacing: -3 }}>{initialsOf(m.name)}</div>
          {m.affinity?.shared > 0 && <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(26,26,26,.45)", color: C.white, fontFamily: F.mono, fontSize: 11, fontWeight: 700, padding: "6px 10px" }}>{m.affinity.shared} SHARED</div>}
          <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,.94)", color: C.deep, fontFamily: F.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: 1, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}><Crown size={11} /> {(m.tier || "Scout").toUpperCase()}</div>
        </div>
        <div style={{ flex: 1, padding: "13px 16px 14px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.4 }}>{m.name}</div>
          {m.headline && <div style={{ fontSize: 12.5, color: C.gray, marginTop: 1 }}>{m.headline}</div>}
          {m.why && <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5, marginTop: 8, overflow: "hidden", flex: 1 }}>{m.why}</div>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, padding: "7px 0", background: C.purpleTint, borderRadius: 10, color: C.purple, fontFamily: F.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8 }}>TAP CARD FOR FULL PROFILE</div>
        </div>
      </div>
    );
  };
  const emptyView = (
    <div style={{ height: "100%", background: C.white, borderRadius: 20, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 26 }}>
      <Glyph color={C.purple} size={38} />
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>{loading ? "Loading the Roster…" : "No mentors available."}</div>
      <div style={{ fontSize: 13, color: C.gray, marginTop: 6, lineHeight: 1.5 }}>{loading ? "One moment." : "New mentors join the Roster as they’re onboarded. We’ll notify you when a fit lands."}</div>
      <Btn kind="ghost" style={{ marginTop: 16 }} onClick={back}>Back to home</Btn>
    </div>
  );
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <HeaderRow title="Add a support mentor" onBack={back} right={<Label color={seatsLeft > 0 ? C.purple : C.teal}>{used}/3 SEATS</Label>} />
      <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", padding: "0 20px 8px", letterSpacing: 0.5 }}>ONE ACTIVE ENGAGEMENT AT A TIME · NEW MENTORS JOIN AS SUPPORT · +15 XP</div>
      {isDesktop
        ? <CardGrid deck={deck} renderCard={renderCard} stampRight="REQUEST" stampLeft="PASS" canRight={seatsLeft > 0} onDecide={decide} onUndo={undo} canUndo={history.length > 0 && history[history.length - 1].dir === "left"} emptyView={emptyView} onTap={setDetail} />
        : <SwipeDeck deck={deck} renderCard={renderCard} stampRight="REQUEST" stampLeft="PASS" canRight={seatsLeft > 0} onDecide={decide} onUndo={undo} canUndo={history.length > 0 && history[history.length - 1].dir === "left"} emptyView={emptyView} onTap={setDetail} />}

      {detail && (
        <MentorDetailSheet m={detail} close={() => setDetail(null)} footer={
          <Btn disabled={seatsLeft <= 0 || !!decided[detail.id]} onClick={() => { const m = detail; setDetail(null); decide(m, "right"); }}>
            {decided[detail.id] ? "Request sent" : seatsLeft <= 0 ? "Mentor seats full · 3/3" : `Request ${firstNameOf(detail.name)} as support · +15 XP`}
          </Btn>
        } />
      )}
    </div>
  );
};

export const AddMenteeScreen = ({ candidates, addsUsed, onAdd, back, toast, onLoad, loading }) => {
  const isDesktop = useIsDesktop();
  useEffect(() => { if (onLoad && candidates.length === 0) onLoad(); }, []);
  const [decided, setDecided] = useState({});
  const [history, setHistory] = useState([]);
  const deck = candidates.filter(m => !decided[m.id]);
  const [detail, setDetail] = useState(null);
  const addsLeft = 3 - addsUsed;
  const decide = (m, dir) => {
    if (dir === "blocked") { toast("Add limit reached · 3 per cycle"); return; }
    setHistory(h => [...h, { id: m.id, dir }]);
    if (dir === "right") { setDecided(d => ({ ...d, [m.id]: "accepted" })); onAdd(m); }
    else setDecided(d => ({ ...d, [m.id]: "passed" }));
  };
  const undo = () => { const last = history[history.length - 1]; if (!last || last.dir !== "left") return; setHistory(h => h.slice(0, -1)); setDecided(d => { const n = { ...d }; delete n[last.id]; return n; }); };
  const renderCard = (m) => {
    const bg = DECK_COLORS[(Math.max(0, candidates.indexOf(m)) + 3) % DECK_COLORS.length];
    return (
      <div style={{ height: "100%", background: C.white, borderRadius: 20, border: `1px solid ${C.line}`, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 12px 32px rgba(26,26,26,.12)" }}>
        <div style={{ height: "40%", background: bg, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: "rgba(255,255,255,.94)", letterSpacing: -3 }}>{initialsOf(m.name)}</div>
          {m.affinity?.shared > 0 && <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(26,26,26,.45)", color: C.white, fontFamily: F.mono, fontSize: 11, fontWeight: 700, padding: "6px 10px" }}>{m.affinity.shared} SHARED</div>}
          {m.track && <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,.94)", color: C.deep, fontFamily: F.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: 1, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}><School size={11} /> {m.track.toUpperCase()}</div>}
        </div>
        <div style={{ flex: 1, padding: "13px 16px 14px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.4 }}>{m.name}</div>
          {m.goals?.[0] && (
            <div style={{ background: C.surface, borderRadius: 10, padding: "8px 11px", marginTop: 8 }}>
              <span style={{ fontFamily: F.mono, fontSize: 8.5, color: C.gray, letterSpacing: 0.8 }}>GOAL 1 OF {m.goals.length}</span>
              <div style={{ fontSize: 12.5, fontStyle: "italic", marginTop: 2 }}>“{m.goals[0]}”</div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, padding: "6px 0", background: C.purpleTint, borderRadius: 10, color: C.purple, fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.8 }}>TAP FOR FULL PROFILE</div>
        </div>
      </div>
    );
  };
  const emptyView = (
    <div style={{ height: "100%", background: C.white, borderRadius: 20, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 26 }}>
      <Users size={32} color={C.purple} />
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>{loading ? "Loading matches…" : "That’s everyone for now."}</div>
      <div style={{ fontSize: 13, color: C.gray, marginTop: 6, lineHeight: 1.5 }}>{loading ? "One moment." : "Matching runs weekly — new mentees who fit your profile land here first."}</div>
      <Btn kind="ghost" style={{ marginTop: 16 }} onClick={back}>Back to cohort</Btn>
    </div>
  );
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <HeaderRow title="Add mentees" onBack={back} right={<Label color={addsLeft > 0 ? C.purple : C.teal}>{addsUsed}/3 ADDS</Label>} />
      <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", padding: "0 20px 8px", letterSpacing: 0.5 }}>✓ ACCEPT · ✕ PASS · +30 IMPACT EACH · {addsLeft} ADD{addsLeft === 1 ? "" : "S"} LEFT THIS CYCLE</div>
      {isDesktop
        ? <CardGrid deck={deck} renderCard={renderCard} stampRight="ACCEPT" stampLeft="PASS" canRight={addsLeft > 0} onDecide={decide} onUndo={undo} canUndo={history.length > 0 && history[history.length - 1].dir === "left"} emptyView={emptyView} onTap={setDetail} />
        : <SwipeDeck deck={deck} renderCard={renderCard} stampRight="ACCEPT" stampLeft="PASS" canRight={addsLeft > 0} onDecide={decide} onUndo={undo} canUndo={history.length > 0 && history[history.length - 1].dir === "left"} emptyView={emptyView} onTap={setDetail} />}
      {detail && (
        <MenteeDetailSheet m={detail} close={() => setDetail(null)} footer={
          <Btn disabled={addsLeft <= 0 || !!decided[detail.id]} onClick={() => { const m = detail; setDetail(null); decide(m, "right"); }}>
            {decided[detail.id] ? "Added ✓" : addsLeft <= 0 ? "Add limit reached · 3 per cycle" : `Accept ${firstNameOf(detail.name)} · +30 Impact`}
          </Btn>
        } />
      )}
    </div>
  );
};

