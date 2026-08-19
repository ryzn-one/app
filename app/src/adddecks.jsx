import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Chip, Monogram, Field, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots, ModalShell, firstNameOf, initialsOf, labelOf } from "./ui.jsx";
import { SwipeDeck, CardGrid, MentorDetailSheet, MenteeDetailSheet } from "./chatmatch.jsx";
import { useIsDesktop } from "./useIsDesktop.js";

/* ----------------- IN-APP ADD DECKS -----------------

   The deck is the clearest place the architecture is visible: the same screen,
   in three orbits, behaving differently because three policy values differ.

     matchMode  decides the CTA and whether the qualify sheet appears
     cap        decides the seat counter and when the deck stops accepting
     levelGate  decides who is in the pool, and is *named* on the screen
     crossDiv   same

   The last two are enforced server-side, this only explains them. A narrow deck
   with no explanation reads as "Ryzn has no mentors"; the same deck with the
   rule on it reads as "my employer set this", which is true and is not Ryzn's
   failure to fix.                                                              */

/**
 * The qualifying question, shown only where `policy.matchMode` is "Apply".
 *
 * One question, answered in a sentence. It exists for the mentor's inbox: a name
 * is not something anyone can approve, a name with "I want to run my first
 * project end to end" underneath it is. The reward sits on the button before the
 * action, not in the toast after it.
 */
const QualifySheet = ({ mentor, onClose, onSend, busy }) => {
  const [text, setText] = useState("");
  const ready = text.trim().length >= 10;
  return (
    <ModalShell onClose={onClose}>
      <Label color={C.purple}>Apply · {firstNameOf(mentor.name)}</Label>
      <div style={{ fontFamily: F.sans, fontSize: 19, fontWeight: 700, marginTop: 8, letterSpacing: -0.3 }}>
        What do you want to work on?
      </div>
      <div style={{ fontSize: 13, color: C.gray, lineHeight: 1.5, marginTop: 6 }}>
        {firstNameOf(mentor.name)} reads this before deciding. One honest sentence does more than a paragraph.
      </div>
      <textarea
        value={text} onChange={(e) => setText(e.target.value)} rows={4} autoFocus
        placeholder="I want to lead a project end to end and I don't know where to start."
        style={{
          width: "100%", marginTop: 14, padding: 12, borderRadius: 12, border: `1px solid ${C.line}`,
          fontFamily: F.sans, fontSize: 14, lineHeight: 1.5, resize: "vertical", background: C.white, color: C.ink,
        }}
      />
      <div style={{ fontFamily: F.mono, fontSize: 9, color: ready ? C.teal : C.mute, letterSpacing: 0.6, marginTop: 6 }}>
        {ready ? "READY TO SEND" : "A SENTENCE IS ENOUGH"}
      </div>
      <Btn style={{ marginTop: 14 }} disabled={!ready || busy} onClick={() => onSend(text.trim())}>
        {busy ? "Sending…" : `Apply to ${firstNameOf(mentor.name)}'s orbit · +15 XP`}
      </Btn>
      <Btn kind="ghost" small style={{ marginTop: 8, width: "100%" }} onClick={onClose}>Not now</Btn>
    </ModalShell>
  );
};

/** The rules that narrowed this deck, in the words the console set them with.
    Rendered from the policy the server applied, never from a local copy. */
const PoolChips = ({ policy, orbit }) => {
  if (!policy) return null;
  const chips = [];
  if (policy.levelGate) chips.push("Staff+ mentors only");
  if (!policy.crossDiv && orbit?.division) chips.push(`${orbit.division} only`);
  if (!chips.length) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 14px 8px" }}>
      {chips.map((c) => <Chip key={c} c={C.deep} bg={C.purpleTint}>{c}</Chip>)}
      <Chip c={C.gray} bg={C.surface}>Set by {orbit?.name || "this orbit"}</Chip>
    </div>
  );
};

export const AddMentorScreen = ({ candidates, used, onAdd, back, toast, onLoad, loading, policy, orbit, busy }) => {
  const isDesktop = useIsDesktop();
  // The deck is only populated when the roster has been fetched; entering this
  // screen straight from the app is the case the journey never covers.
  useEffect(() => { if (onLoad && candidates.length === 0) onLoad(); }, []);
  const [decided, setDecided] = useState({});
  const [history, setHistory] = useState([]);
  const [detail, setDetail] = useState(null);
  const [qualifying, setQualifying] = useState(null);
  const deck = candidates.filter(m => !decided[m.id]);

  /* Seats come from the orbit, not from a constant. A company orbit that gives
     one mentor per employee and the public orbit's three are the same screen. */
  const cap = policy?.cap ?? 3;
  const seatsLeft = cap - used;
  const apply = policy?.matchMode === "Apply";

  const send = (m, answer) => {
    setDecided(d => ({ ...d, [m.id]: "pending" }));
    setQualifying(null);
    toast(apply ? `Application sent to ${firstNameOf(m.name)}…` : `Request sent to ${firstNameOf(m.name)}…`);
    onAdd(m, answer);
  };

  const decide = (m, dir) => {
    if (dir === "blocked") { toast(`Mentor seats full · ${used} of ${cap}`); return; }
    setHistory(h => [...h, { id: m.id, dir }]);
    if (dir === "right") {
      /* Apply mode asks the question first. It is the whole behavioural
         difference between the two modes, and it happens here rather than in a
         branch inside the send path so the swipe and the detail-sheet button
         reach the same place. */
      if (apply) { setQualifying(m); setHistory(h => h.slice(0, -1)); return; }
      send(m, null);
    } else setDecided(d => ({ ...d, [m.id]: "passed" }));
  };
  const undo = () => { const last = history[history.length - 1]; if (!last || last.dir !== "left") return; setHistory(h => h.slice(0, -1)); setDecided(d => { const n = { ...d }; delete n[last.id]; return n; }); };
  const renderCard = (m) => {
    const bg = DECK_COLORS[(Math.max(0, candidates.indexOf(m)) + 2) % DECK_COLORS.length];
    return (
      <div style={{ height: "100%", background: C.white, borderRadius: 20, border: `1px solid ${C.line}`, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 12px 32px rgba(26,26,26,.12)" }}>
        <div style={{ height: "42%", background: bg, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontFamily: F.sans, fontSize: 72, fontWeight: 700, color: "rgba(255,255,255,.94)", letterSpacing: -3 }}>{initialsOf(m.name)}</div>
          {m.affinity?.shared > 0 && <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(26,26,26,.45)", color: C.white, fontFamily: F.mono, fontSize: 11, fontWeight: 700, padding: "6px 10px" }}>{m.affinity.shared} SHARED</div>}
          <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,.94)", color: C.deep, fontFamily: F.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: 1, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}><Crown size={11} /> {(m.tier || "Scout").toUpperCase()}</div>
        </div>
        <div style={{ flex: 1, padding: "13px 16px 14px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontFamily: F.sans, fontSize: 19, fontWeight: 700, letterSpacing: -0.4 }}>{m.name}</div>
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
      <div style={{ fontFamily: F.sans, fontSize: 20, fontWeight: 700, marginTop: 12 }}>{loading ? "Loading the Roster…" : "No mentors available."}</div>
      <div style={{ fontSize: 13, color: C.gray, marginTop: 6, lineHeight: 1.5 }}>{loading ? "One moment." : "New mentors join the Roster as they’re onboarded. We’ll notify you when a fit lands."}</div>
      <Btn kind="ghost" style={{ marginTop: 16 }} onClick={back}>Back to home</Btn>
    </div>
  );
  const stamp = apply ? "APPLY" : "ADD";
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <HeaderRow
        title={apply ? "Apply to a mentor" : "Add a mentor"}
        onBack={back}
        right={<Label color={seatsLeft > 0 ? C.purple : C.teal}>{used}/{cap} SEATS</Label>}
      />
      <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", padding: "0 14px 8px", letterSpacing: 0.5 }}>
        {apply
          ? `MENTORS APPROVE APPLICATIONS · ${seatsLeft} SEAT${seatsLeft === 1 ? "" : "S"} LEFT · +15 XP`
          : `ADD INSTANTLY · ${seatsLeft} SEAT${seatsLeft === 1 ? "" : "S"} LEFT · +15 XP`}
      </div>
      <PoolChips policy={policy} orbit={orbit} />
      {isDesktop
        ? <CardGrid deck={deck} renderCard={renderCard} stampRight={stamp} stampLeft="PASS" canRight={seatsLeft > 0} onDecide={decide} onUndo={undo} canUndo={history.length > 0 && history[history.length - 1].dir === "left"} emptyView={emptyView} onTap={setDetail} />
        : <SwipeDeck deck={deck} renderCard={renderCard} stampRight={stamp} stampLeft="PASS" canRight={seatsLeft > 0} onDecide={decide} onUndo={undo} canUndo={history.length > 0 && history[history.length - 1].dir === "left"} emptyView={emptyView} onTap={setDetail} />}

      {detail && (
        <MentorDetailSheet m={detail} close={() => setDetail(null)} footer={
          <Btn disabled={seatsLeft <= 0 || !!decided[detail.id]} onClick={() => { const m = detail; setDetail(null); decide(m, "right"); }}>
            {decided[detail.id]
              ? (apply ? "Application sent" : "Request sent")
              : seatsLeft <= 0 ? `Mentor seats full · ${used}/${cap}`
              : apply ? `Apply to ${firstNameOf(detail.name)}'s orbit · +15 XP`
              : `Add ${firstNameOf(detail.name)} · +15 XP`}
          </Btn>
        } />
      )}

      {qualifying && (
        <QualifySheet mentor={qualifying} busy={busy} onClose={() => setQualifying(null)}
          onSend={(answer) => send(qualifying, answer)} />
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
          <div style={{ fontFamily: F.sans, fontSize: 72, fontWeight: 700, color: "rgba(255,255,255,.94)", letterSpacing: -3 }}>{initialsOf(m.name)}</div>
          {m.affinity?.shared > 0 && <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(26,26,26,.45)", color: C.white, fontFamily: F.mono, fontSize: 11, fontWeight: 700, padding: "6px 10px" }}>{m.affinity.shared} SHARED</div>}
          {labelOf(m.track) && <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,.94)", color: C.deep, fontFamily: F.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: 1, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}><School size={11} /> {labelOf(m.track).toUpperCase()}</div>}
        </div>
        <div style={{ flex: 1, padding: "13px 16px 14px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontFamily: F.sans, fontSize: 19, fontWeight: 700, letterSpacing: -0.4 }}>{m.name}</div>
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
      <div style={{ fontFamily: F.sans, fontSize: 20, fontWeight: 700, marginTop: 12 }}>{loading ? "Loading matches…" : "That’s everyone for now."}</div>
      <div style={{ fontSize: 13, color: C.gray, marginTop: 6, lineHeight: 1.5 }}>{loading ? "One moment." : "Matching runs weekly, new mentees who fit your profile land here first."}</div>
      <Btn kind="ghost" style={{ marginTop: 16 }} onClick={back}>Back to cohort</Btn>
    </div>
  );
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <HeaderRow title="Add mentees" onBack={back} right={<Label color={addsLeft > 0 ? C.purple : C.teal}>{addsUsed}/3 ADDS</Label>} />
      <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", padding: "0 14px 8px", letterSpacing: 0.5 }}>✓ ACCEPT · ✕ PASS · +30 IMPACT EACH · {addsLeft} ADD{addsLeft === 1 ? "" : "S"} LEFT THIS CYCLE</div>
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

