import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Crown, Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search
} from "lucide-react";
import { C, F, S, R, SP, TIER_COLOR, DECK_COLORS } from "./theme.js";
/* ProgramTimeline moved to OrbitScreen with the programs themselves. */
import { Card, GhostCard, IconTile, Section, Label, Btn, Chip, Monogram, Avatar, Field, XPPill, Ring, Bar, Sparkline, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots, labelOf } from "./ui.jsx";
import { ProfileHeader, EditableRow } from "./app-shared.jsx";
import { EXERCISE_TRACK } from "./data.js";
import { UnlockTrackCard } from "./unlock.jsx";
import { SavedShelf } from "./resources.jsx";
import { fetchMessages, sendMessage, fetchImpactHistory } from "./lib/auth-client.js";
import { countdown, fmtRange } from "./lib/calendar.js";

/* ----------------- APP: MENTEE ----------------- */

/**
 * The Chat tab's open state: one row per mentor held in this orbit.
 *
 * Only reached once the track is finished, the locked half of this tab is a
 * screen of its own (see unlock.jsx). The empty state here is the third case,
 * and it is a real one: chat can be unlocked while nobody is on the other end
 * of it yet.
 */
export const MenteeChatList = ({ mentors = [], onOpenThread }) => (
  <div style={{ padding: "14px 14px 14px" }}>
    <Label color={C.purple}>Direct Connect</Label>
    <div style={{ fontFamily: F.sans, fontSize: 24, fontWeight: 700, letterSpacing: -0.5, marginTop: 4 }}>Your threads.</div>
    {mentors.length === 0 ? (
      <Card style={{ marginTop: 16, textAlign: "center", padding: "28px 20px" }}>
        <MessageCircle size={24} color={C.mute} />
        <div style={{ fontFamily: F.sans, fontSize: 16, fontWeight: 700, marginTop: 10 }}>Chat is open, you just need someone to talk to.</div>
        <div style={{ fontSize: 13, color: C.gray, lineHeight: 1.5, marginTop: 6 }}>
          Find a mentor here and this fills up.
        </div>
      </Card>
    ) : (
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {mentors.map((m) => (
          <Card key={m.id} onClick={() => onOpenThread(m)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
            <Avatar src={m.avatarUrl} name={m.name} size={38} radius={12} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>{m.name}</div>
              {m.headline && <div style={{ fontSize: 12, color: C.gray, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.headline}</div>}
            </div>
            <ChevronRight size={16} color={C.mute} />
          </Card>
        ))}
      </div>
    )}
  </div>
);

/** Every mentor this mentee holds, in pairing order. Never null, never ranked. */
const mentorsOf = (u) => u?.mentors || [];

/**
 * A mentee's Home is the part of the app that belongs to them and to nobody
 * else: the streak, the exercise, the milestones, the standings. It is the same
 * screen whether they hold one mentor or three, which is the point, it used to
 * reshape itself around whichever mentor happened to accept first, and a second
 * mentor changed nothing about it because a second mentor had nowhere to go.
 *
 * The mentors live below it as Orbits, one tile each, each opening its own
 * feed, program and thread. `feeds` is keyed by mentor id for exactly that
 * reason: there is no single feed to show here.
 */
/* Home, in the order §6.1 sets out, and the order matters more than any single
   card on it. The unlock track sits above the daily rep and below only an
   at-risk nudge, because until Stage 1 is done it is the *only* thing this
   person needs to be looking at. Everything below it is for someone who already
   has a habit. */
export const MenteeHome = ({ u, name, badges, go, openOverlay, openOrbit, todayDone, stage1, mentorSeats, toast, feeds = {}, watched = {}, invites = [], sessions = [], stage, policy, orbit, atRisk = null }) => {
  const nextBadge = badges.find(b => !b.earned);
  const nextIdx = badges.indexOf(nextBadge);
  const todayEx = EXERCISE_TRACK[0];
  const msgUnlocked = stage1;
  const firstName = (name || "").split(" ")[0];
  const mentors = u.mentors || [];
  const pendingInvites = Array.isArray(invites) ? invites : [];
  /* Real bookings from /api/sessions. A time is only ever shown once both sides
     have agreed on it, see api/sessions.js. */
  const needsAnswer = sessions.filter(s => s.awaitingYou);
  const nextSession = sessions
    .filter(s => s.status === "confirmed" && new Date(s.confirmedSlot.end).getTime() > Date.now())
    .sort((a, b) => new Date(a.confirmedSlot.start) - new Date(b.confirmedSlot.start))[0];
  return (
    <div style={{ padding: "14px 14px 14px" }}>
      {/* The greeting, in the reference's two lines: where you are in small
          mono, then your name at 22. The bell that used to sit beside it moved
          to the top bar, where it is reachable from every tab rather than only
          from Home. */}
      <div style={{ padding: "2px 2px 0" }}>
        <div style={S.mono(7.5, C.mute)}>{u.fresh ? "FOUNDING COHORT · DAY 1" : `FOUNDING COHORT · WEEK ${u.week} OF 12`}</div>
        <div style={S.h(22)}>{firstName ? `Morning, ${firstName}.` : "Welcome."}</div>
      </div>

      {pendingInvites.length > 0 && (
        <Card onClick={() => openOverlay("notifs")} style={{ marginTop: 14, background: C.purpleTint, border: `1px solid ${C.purple}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: C.purple, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={16} color={C.white} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>
                {pendingInvites.length === 1
                  ? `${(pendingInvites[0].person?.name || "A mentor").split(" ")[0]} invited you`
                  : `${pendingInvites.length} mentor invites waiting`}
              </div>
              <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2 }}>Tap to accept or pass</div>
            </div>
            <ChevronRight size={16} color={C.purple} />
          </div>
        </Card>
      )}

      {/* The at-risk nudge. First in the order, and it comes from a person.
          The detection may have happened in an HR console, but the sentence a
          mentee reads never says so, "your programme administrator noticed" is
          the line that makes someone close the app, and the whole point of
          attributing it to their mentor is that it doesn't. */}
      {atRisk && (
        <Card style={{ marginTop: 14, border: `1px solid ${C.amber}`, background: C.amberTint }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Avatar src={mentors[0]?.avatarUrl} name={atRisk.mentorName} size={36} radius={11} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>
                {(atRisk.mentorName || "Your mentor").split(" ")[0]} noticed you've been away
              </div>
              <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5, marginTop: 3 }}>
                {atRisk.daysSince} days since your last paragraph. Pick it back up, one is enough to start again.
              </div>
              <Btn small style={{ marginTop: 11 }} onClick={() => go("exercises")}>
                Write today's · +{todayEx.xp} XP
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {/* The unlock track, first, and alone, until it's finished. It routes to
          whichever screen the current step lives on rather than owning the work
          itself: the track is a map, not a second place to do things. */}
      {stage && !stage.complete && (
        <div style={{ marginTop: 18 }}>
          <UnlockTrackCard
            stage={stage}
            mentor={mentors[0] || null}
            chatGate={!!policy?.chatGate}
            onStart={(step) => {
              if (step.id === "mentor") { openOverlay("addmentor"); return; }
              if (step.id === "setup") { openOverlay("settings"); return; }
              go("exercises");
            }}
          />
        </div>
      )}

      {/* Today's rep. One ring, one sentence, one button — the reference's
          card. The two it replaces (a week-percentage ring beside a streak
          counter, then a black slab repeating the same exercise) between them
          took a third of the screen to say a thing this says in a line, and the
          streak and XP they carried now live in the top bar on every tab. */}
      <Card data-tour="mentee-home-progress" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Ring pct={todayDone ? 1 : 0.15} color={C.teal} size={72} stroke={7}>
            <Flame size={16} color={todayDone ? C.teal : C.mute} />
          </Ring>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.sb(14)}>{todayDone ? "Today is banked." : "Today’s rep is waiting"}</div>
            <div style={S.b(12, C.gray)}>{todayDone ? "Come back tomorrow to keep the flame." : `${todayEx.mins} minutes protects your streak.`}</div>
            <div style={{ ...S.mono(7, C.mute), marginTop: 6 }}>
              {Number(u.xp || 0).toLocaleString()} XP · {u.fresh ? "DAY 1" : `WEEK ${u.week} OF 12`}{u.rank ? ` · #${u.rank} IN COHORT` : ""}
            </div>
          </div>
          {!todayDone && <Btn small onClick={() => go("exercises")}>Do it</Btn>}
        </div>
      </Card>

      {nextBadge && (
        <Card onClick={() => go("badges")} style={{ marginTop: 11 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <BadgeTile badge={nextBadge} i={nextIdx} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.mono(7, C.mute)}>NEXT MILESTONE</div>
              <div style={{ ...S.sb(13), marginTop: 2 }}>{nextBadge.name}, {nextBadge.unlocks.toLowerCase()}</div>
              {nextBadge.progress ? <>
                <div style={{ marginTop: 8 }}><Bar pct={nextBadge.progress[0] / nextBadge.progress[1]} /></div>
                <div style={{ ...S.mono(7, C.mute), marginTop: 5 }}>{nextBadge.progressLabel}</div>
              </> : null}
            </div>
            <ChevronRight size={16} color={C.mute} />
          </div>
        </Card>
      )}

      {/* ----- the orbits -----
          One tile per mentor, in the order they came in, none of them ranked
          above the others. No mentor is a real state in an early cohort and
          renders as itself rather than borrowing a name. */}
      <Section
        title={mentors.length > 1 ? "Your orbits" : "Your orbit"}
        right={mentors.length > 0 ? <Label color={mentors.length >= 3 ? C.teal : C.gray}>{mentors.length}/3</Label> : null}
      >
        {mentors.length === 0 ? (
          <GhostCard onClick={() => openOverlay("addmentor")}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <IconTile size={48} bg={C.ghostTile}><Users size={20} color={C.gray} /></IconTile>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 15 }}>No mentor matched yet</div>
                <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2, lineHeight: 1.45 }}>Mentors are still being onboarded. Your exercises are open now, the work counts either way.</div>
              </div>
              <ChevronRight size={16} color={C.gray} />
            </div>
          </GhostCard>
        ) : mentors.map((m) => {
          const posts = feeds[m.id] || [];
          const latest = posts.find(p => !p.pinned);
          const unread = posts.filter(p => (p.kind === "video" || p.kind === "resource") && !watched[p.id]).length;
          const first = m.name.split(" ")[0];
          return (
            <Card key={m.id} onClick={() => openOrbit(m.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar src={m.avatarUrl} name={m.name} size={48} bg={C.purple} color={C.white} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                    {unread > 0 && <span style={{ fontFamily: F.mono, fontSize: 8.5, background: C.purple, color: C.white, padding: "2px 7px", borderRadius: R.pill, fontWeight: 700 }}>{unread} NEW</span>}
                  </div>
                  {m.headline && <div style={{ fontSize: 12, color: C.gray, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.headline}</div>}
                  <div style={{ fontFamily: F.mono, fontSize: 10, color: C.purple, marginTop: 3 }}>{first.toUpperCase()}’S ORBIT · {posts.length} POST{posts.length === 1 ? "" : "S"}</div>
                </div>
                {msgUnlocked
                  ? <Btn small kind="soft" onClick={(e) => { e.stopPropagation(); openOverlay({ dmPeer: m }); }}><MessageCircle size={14} /> Message</Btn>
                  : <span style={{ fontFamily: F.mono, fontSize: 9, background: C.ghost, color: C.gray, padding: "7px 10px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 5 }}><Lock size={10} /> STAGE 1</span>}
              </div>
              {latest ? (
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 13, paddingTop: 13, borderTop: `1px solid ${C.line}` }}>
                  <IconTile size={28} radius={9}>
                    {latest.kind === "video" ? <Play size={13} color={C.purple} /> : latest.kind === "resource" ? <FileText size={13} color={C.purple} /> : <MessageCircle size={13} color={C.purple} />}
                  </IconTile>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.45, color: C.ink, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{latest.title || latest.text}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 4 }}>{String(latest.when || "NOW").toUpperCase()} · TAP TO READ, REACT + EARN XP</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 10 }}>{msgUnlocked ? "NOTHING POSTED YET · TAP TO OPEN" : "ORBIT IS OPEN NOW · FINISH STAGE 1 TO EARN DIRECT CONNECT"}</div>
              )}
            </Card>
          );
        })}

        {mentors.length > 0 && mentorSeats < 3 && (
          <GhostCard onClick={() => openOverlay("addmentor")}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <IconTile size={36} radius={10}><Plus size={16} color={C.purple} /></IconTile>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>Add another mentor</div>
                <div style={{ fontSize: 11.5, color: C.gray, marginTop: 2 }}>A different strength, its own orbit · {mentorSeats}/3 seats used · +15 XP</div>
              </div>
              <ChevronRight size={16} color={C.gray} />
            </div>
          </GhostCard>
        )}
      </Section>

      {/* Sessions. Three honest states: a proposal waiting on you, a booked time,
          or nothing yet, never an invented slot, which is what this card's
          ancestor printed under the mentor's name. */}
      <Section>
        {(mentors.length > 0 || sessions.length > 0) && (
          <Card
            onClick={() => openOverlay("sessions")}
            style={needsAnswer.length > 0 ? { border: `1px solid ${C.amber}`, background: C.amberTint } : undefined}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <IconTile size={36} radius={10} bg={needsAnswer.length ? "#F2E2C4" : C.purpleTint}>
                <Calendar size={16} color={needsAnswer.length ? C.amber : C.purple} />
              </IconTile>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>
                  {needsAnswer.length > 0
                    ? `${(needsAnswer[0].person?.name || "Your mentor").split(" ")[0]} proposed a session`
                    : nextSession ? "Your next session" : "No session booked"}
                </div>
                <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>
                  {needsAnswer.length > 0
                    ? "Pick a time that works, that books it"
                    : nextSession ? `${fmtRange(nextSession.confirmedSlot)} · ${countdown(nextSession.confirmedSlot.start)}` : "Propose a few times to your mentor"}
                </div>
              </div>
              <ChevronRight size={16} color={needsAnswer.length ? C.amber : C.gray} />
            </div>
          </Card>
        )}

        {/* The "Latest in X's Orbit" card that used to sit here showed one
            mentor's newest post and had no way to name which mentor it belonged
            to once there were several. Each Orbit tile above carries its own. */}

        {/* The directory, as distinct from the deck below it: search the whole
            Roster and see who you've already asked, rather than being handed one
            card at a time. */}
        <Card onClick={() => openOverlay("explore")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <IconTile size={36} radius={10}><Search size={16} color={C.purple} /></IconTile>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>Explore mentors</div>
              <div style={{ fontSize: 11.5, color: C.gray, marginTop: 2 }}>Search the whole Roster by name, role, or expertise</div>
            </div>
            <ChevronRight size={16} color={C.gray} />
          </div>
        </Card>

        {/* The board, in the reference's row shape — rank, name, XP — with the
            one row that is actually knowable. There is no cross-cohort XP ledger
            yet, so the rest of the table stays absent rather than invented. */}
        <Card onClick={() => openOverlay("cohort")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={S.sb(13)}>Leaderboard</div>
            <Chip>{policy?.boardScope || "Cohort"}</Chip>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: C.purpleTint, borderRadius: 10 }}>
            <span style={{ ...S.mono(9, u.rank === 1 ? C.amber : C.mute), width: 18 }}>{u.rank ? `#${u.rank}` : "—"}</span>
            <span style={{ ...S.sb(12.5), flex: 1 }}>You</span>
            <span style={S.mono(9, C.purple)}>{Number(u.xp || 0).toLocaleString()} XP</span>
          </div>
          <div style={{ ...S.b(11, C.mute), marginTop: 8 }}>
            {u.rank ? "Tap for your full standing." : "Rankings open once enough of the cohort is active."}
          </div>
        </Card>
      </Section>
    </div>
  );
};

/**
 * Grow.
 *
 * Three things, in the reference's order: today's rep, the consistency grid
 * that shows the streak is real, and the badge wall. The last two used to live
 * behind separate overlays reachable only from Home and Profile, so the tab
 * whose whole job is "keep showing up" showed no evidence of having shown up.
 */
export const MenteeExercises = ({ u, todayDone, onSubmit, submitting, badges = [], openBadge, justEarnedId }) => {
  const [text, setText] = useState("");
  const [err, setErr] = useState(null);
  const list = EXERCISE_TRACK;
  return (
    <div>
      <HeaderRow title="Grow" right={<Chip c={C.gray} bg="#F1F0EC">WEEK {u.week || 1}</Chip>} />
      <div style={{ padding: "0 14px 20px", display: "flex", flexDirection: "column", gap: SP.gap }}>
        {list.map((ex, i) => {
          if (ex.state === "open" && !todayDone) return (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={S.mono(8, C.teal)}>TODAY’S EXERCISE</div>
                {ex.milestone && <div style={S.mono(8, C.amber)}>MILESTONE 3/3</div>}
              </div>
              <div style={{ ...S.h(15), margin: "6px 0 4px" }}>{ex.title}</div>
              <div style={S.b(12, C.gray)}>{ex.prompt} · {ex.mins} min</div>
              <textarea value={text} onChange={e => { setText(e.target.value); setErr(null); }} placeholder="I’m here because…" rows={4}
                style={{ width: "100%", marginTop: 12, borderRadius: 12, border: `1px solid ${C.line}`, padding: 12, fontFamily: F.sans, fontSize: 13.5, resize: "none", background: C.white, boxSizing: "border-box", outline: "none" }} />
              {err && <div style={{ ...S.b(12, C.coral), marginTop: 8 }}>{err}</div>}
              <Btn kind="purple" data-tour="mentee-exercises-submit" style={{ marginTop: 12 }} disabled={submitting} onClick={async () => {
                try {
                  setErr(null);
                  await onSubmit(text);
                  setText("");
                } catch (e) {
                  setErr(e.message || "Couldn’t save that. Try again.");
                }
              }}>{submitting ? "Saving…" : `Submit today’s rep · +${ex.xp} XP`}</Btn>
            </Card>
          );
          const done = ex.state === "open" && todayDone;
          const upcoming = ex.state === "upcoming";
          if (done) return (
            <Card key={i} style={{ background: C.tealTint, border: "1px solid #CDEBDE" }}>
              <div style={S.mono(8, C.teal)}>TODAY’S EXERCISE</div>
              <div style={{ ...S.h(15), margin: "6px 0 4px" }}>{ex.title}</div>
              {u.todayExercise?.text && <div style={{ ...S.b(12.5, C.ink), fontStyle: "italic" }}>“{u.todayExercise.text}”</div>}
              <Btn kind="ghost" style={{ marginTop: 12 }} disabled><Check size={14} /> Submitted · +{ex.xp} XP</Btn>
            </Card>
          );
          return (
            <Card key={i} style={{ opacity: upcoming ? 0.85 : 1, background: upcoming ? "#F4F3EF" : C.white }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 26, height: 26, borderRadius: 9, background: "#EFEEE9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {upcoming ? <Lock size={13} color={C.mute} /> : <Zap size={13} color={C.mute} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.mono(7, C.mute)}>{ex.day.toUpperCase()}</div>
                  <div style={S.sb(13)}>{ex.title}</div>
                  {upcoming && <div style={S.b(11.5, C.gray)}>Unlocks at 7 AM. One a day keeps the streak alive.</div>}
                </div>
                <div style={S.mono(9, C.mute)}>+{ex.xp} XP</div>
              </div>
            </Card>
          );
        })}

        {/* The streak, drawn. A number on Home is a claim; six weeks of squares
            is the evidence for it, and it is what makes a broken streak feel
            like something lost rather than a counter resetting. */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={S.sb(13)}>Consistency</div>
            <Chip c={C.teal} bg={C.tealTint}><Flame size={9} /> {u.streak || 0}-DAY STREAK</Chip>
          </div>
          <Heatmap />
        </Card>

        {/* The badge wall, on the tab that earns them. */}
        {badges.length > 0 && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <span style={S.sb(13)}>Badges</span>
              <span style={S.mono(7, C.mute)}>TAP ONE · VERIFIED FOREVER</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9 }}>
              {badges.map((b, i) => {
                const earned = !!b.earned, color = TIER_COLOR[b.tier] || C.purple;
                return (
                  <div key={b.id} onClick={() => openBadge?.(b, i)} className={justEarnedId === b.id ? "badge-pop" : ""}
                    style={{
                      cursor: openBadge ? "pointer" : "default", borderRadius: 14, padding: "12px 6px",
                      border: `1px solid ${earned ? color + "55" : C.line}`, background: earned ? "#FDFDFB" : "#F4F3EF",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: earned ? 1 : 0.5,
                    }}>
                    <BadgeGlyph i={i} color={earned ? color : "#C9C6C0"} />
                    <div style={{ ...S.sb(10.5), textAlign: "center" }}>{b.name}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export const MenteeBadges = ({ badges, openBadge, justEarnedId }) => (
  <div>
    <HeaderRow title="Milestones" right={<Label>{badges.filter(b => b.earned).length} OF 8 EARNED</Label>} />
    <div style={{ padding: "0 14px 14px" }}>
      {badges.map((b, i) => {
        const earned = !!b.earned, color = TIER_COLOR[b.tier];
        return (
          <div key={b.id} style={{ display: "flex", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14 }}>
              <div style={{ width: 12, height: 12, background: earned ? color : "#D8D6D0", marginTop: 26, transform: "rotate(45deg)" }} />
              {i < badges.length - 1 && <div style={{ width: 2, flex: 1, background: earned ? color : "#DEDDD7", opacity: earned ? 0.35 : 1 }} />}
            </div>
            <Card data-tour={i === 0 ? "mentee-badges-first" : undefined} onClick={earned ? () => openBadge(b, i) : undefined} style={{ flex: 1, marginBottom: 12, border: `1px solid ${earned ? color : C.line}` }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <BadgeTile badge={b} i={i} size={54} justEarned={justEarnedId === b.id} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 15 }}>{b.name}</div>
                  {earned ? <>
                    <div style={{ fontFamily: F.mono, fontSize: 10, color, marginTop: 2 }}>EARNED {b.earned.toUpperCase()} · VERIFIED</div>
                    <div style={{ fontSize: 11.5, color: C.gray, marginTop: 3 }}>Tap for QR verification + LinkedIn share</div>
                  </> : <>
                    {b.progress && <><div style={{ marginTop: 7 }}><Bar pct={b.progress[0] / b.progress[1]} color={color} /></div>
                      <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.gray, marginTop: 4 }}>{b.progressLabel.toUpperCase()}</div></>}
                  </>}
                </div>
                {earned && <ChevronRight size={16} color={C.gray} />}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  </div>
);

/* The cohort board. Every row here used to be invented, six anonymous handles
   with XP totals, plus a school-vs-school table, sitting under the heading
   "Anonymised leaderboard" where a user would reasonably read them as peers.
   There is no XP ledger yet (see docs/PRODUCTION.md), so the only honest board
   is the caller's own standing. */
export const CohortScreen = ({ u, back }) => {
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
  <div>
    <HeaderRow title="Cohort" onBack={back} right={<Label>FOUNDING</Label>} />
    <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ background: C.ink, border: "none", color: C.white, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 18, right: 18 }}>
          <Sparkline points={impactPoints} color="#B7AFF2" />
        </div>
        <Label color="#9C93E8">Your cohort impact</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <IconTile size={26} radius={9} bg={C.purple}><Crown size={13} color={C.white} /></IconTile>
          <div>
            <div style={{ fontFamily: F.sans, fontSize: 18, fontWeight: 700, color: "#B7AFF2", lineHeight: 1.2 }}>
              {Number(u.xp || 0).toLocaleString()} <span style={{ fontFamily: F.mono, fontSize: 9.5, fontWeight: 600, color: "#8B8985", letterSpacing: 0.5 }}>XP</span>
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 9.5, color: "#8B8985", marginTop: 3 }}>
              {u.rank ? `RANK #${u.rank}` : "RANK OPENS WHEN THE COHORT IS FULL"} · {u.streak} DAY STREAK
            </div>
          </div>
        </div>
      </Card>
      <GhostCard>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <IconTile size={44} bg={C.ghostTile}><Users size={18} color={C.gray} /></IconTile>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>The board opens with the cohort</div>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 3, lineHeight: 1.45 }}>Anonymised rankings appear once enough of the founding cohort is active. Until then the only number worth watching is your own.</div>
          </div>
        </div>
      </GhostCard>
    </div>
  </div>
  );
};

/* Direct Connect, persisted via /api/messages. Fake mentor replies that used
   to fire 1.4s after send are gone; both sides read the same thread. */
export const DMScreen = ({ name, sub, back, otherId, placeholder }) => {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);

  useEffect(() => {
    if (!otherId) { setLoading(false); setError("No match to message."); return; }
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const { messages } = await fetchMessages(otherId);
        if (!cancelled) setMsgs(messages || []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Couldn’t load this conversation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [otherId]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy || !otherId) return;
    setBusy(true);
    setText("");
    const optimistic = { id: `tmp-${Date.now()}`, who: "me", text: t };
    setMsgs(m => [...m, optimistic]);
    try {
      const { message } = await sendMessage(otherId, t);
      setMsgs(m => m.map(x => x.id === optimistic.id ? message : x));
    } catch (e) {
      setMsgs(m => m.filter(x => x.id !== optimistic.id));
      setText(t);
      setError(e.message || "Couldn’t send that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${C.line}`, background: C.white }}>
        <button onClick={back} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, margin: -4 }}><ChevronLeft size={22} color={C.ink} /></button>
        <Monogram name={name} size={36} bg={C.purple} color={C.white} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>{name}</div>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.teal, letterSpacing: 0.8 }}>{sub}</div>
        </div>
      </div>
      <div ref={scrollRef} className="app-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && <div style={{ margin: "auto", fontFamily: F.mono, fontSize: 11, color: C.gray, letterSpacing: 0.8 }}>LOADING…</div>}
        {!loading && error && msgs.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: 260, fontSize: 13, color: C.coral, lineHeight: 1.5 }}>{error}</div>
        )}
        {!loading && !error && msgs.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: 240 }}>
            <MessageCircle size={26} color="#C9C6C0" />
            <div style={{ fontSize: 13, color: C.gray, marginTop: 10, lineHeight: 1.5 }}>No messages yet. Say the first thing.</div>
          </div>
        )}
        {/* Your own messages are ink, not brand purple. Purple is the app's
            action colour — every button, every active tab — and using it for
            "you said this" made a thread read like a column of buttons. */}
        {msgs.map((m) => (
          <div key={m.id} className="msg-in" style={{
            alignSelf: m.who === "them" ? "flex-start" : "flex-end", maxWidth: "80%",
            background: m.who === "them" ? C.white : C.ink, color: m.who === "them" ? C.ink : C.white,
            border: m.who === "them" ? `1px solid ${C.line}` : "none",
            borderRadius: 14, padding: "9px 12px", ...S.b(13, m.who === "them" ? C.ink : C.white),
          }}>{m.text}</div>
        ))}
      </div>
      {error && msgs.length > 0 && (
        <div style={{ padding: "0 14px 6px", fontSize: 12, color: C.coral }}>{error}</div>
      )}
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${C.line}`, background: C.white }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={placeholder}
          disabled={busy || !otherId}
          style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 13px", fontFamily: F.sans, fontSize: 13, outline: "none", background: C.white, minWidth: 0 }} />
        <Btn small kind="purple" onClick={send} disabled={busy || !otherId}><Send size={14} /></Btn>
      </div>
    </div>
  );
};

export const MenteeProfile = ({ u, name, userId, badges = [], openBadge, openOverlay, openOrbit, programs = {}, onLeave, onUpdateProfile, toast }) => (
  <div>
    <HeaderRow title="Profile" right={
      <button data-tour="mentee-profile-settings" onClick={() => openOverlay("settings")} style={{ background: "none", border: "none", cursor: "pointer" }}><Settings size={20} color={C.ink} /></button>} />
    <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div data-tour="mentee-profile-hero">
        <ProfileHeader name={name} headline={u?.headline} avatarUrl={u?.avatarUrl} bannerUrl={u?.bannerUrl}
          linkedinUrl={u?.linkedinUrl} userId={userId} editable onSaveImage={onUpdateProfile}>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.purple, marginTop: 6 }}>{labelOf(u?.track) ? `TRACK · ${labelOf(u.track).toUpperCase()} · ` : ""}WEEK {u?.week ?? 1}</div>
        </ProfileHeader>
      </div>
      {u?.goals?.length > 0 && (
        <Card>
          <Label color={C.purple}>Your program goals</Label>
          {u.goals.map((g, i) => (
            <div key={g} style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "flex-start" }}>
              <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.purple, marginTop: 1 }}>0{i + 1}</span>
              <div style={{ fontSize: 13, lineHeight: 1.45, fontStyle: "italic" }}>“{g}”</div>
            </div>
          ))}
        </Card>
      )}
      {/* One identity, every orbit. The dark card is the reference's, and it is
          dark on purpose: XP, streak, badges and tier belong to the person, not
          to any orbit they are standing in, so they get their own surface
          instead of three pale tiles that read as page furniture. */}
      <Card style={{ background: C.ink, border: "none" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Avatar src={u?.avatarUrl} name={name} size={52} radius={16} bg="#2A2A2A" color={C.lilac} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.h(16, C.white)}>{name || "Your profile"}</div>
            <div style={S.mono(7.5, C.lilac)}>ONE IDENTITY · EVERY ORBIT</div>
          </div>
          <Chip c={TIER_COLOR[u?.tier] || C.amber} bg="#2A2A2A">{u?.tier || "Scout"}</Chip>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {[["XP", Number(u?.xp || 0).toLocaleString()], ["Streak", u?.streak || 0], ["Badges", badges.filter(b => b.earned).length], ["Week", `${u?.week || 1}/12`]].map(([l, v]) => (
            <div key={l} style={{ flex: 1, background: "#242424", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
              <div style={S.h(16, C.white)}>{v}</div>
              <div style={S.mono(7, C.mute)}>{l}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <Label>Badge wall</Label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          {badges.filter(b => b.earned).map((b) => (
            <BadgeTile key={b.id} badge={b} i={badges.indexOf(b)} size={62} onClick={() => openBadge(b, badges.indexOf(b))} />
          ))}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 9.5, color: "#A5A39D", marginTop: 12 }}>EVERY BADGE VERIFIABLE · SHARE TO LINKEDIN FROM DETAIL</div>
      </Card>
      <Card>
        <Label>Background</Label>
        <div style={{ fontSize: 12.5, color: C.gray, marginTop: 8, lineHeight: 1.5 }}>Add a headline, your education, projects, or other experience to complete your profile.</div>
        <EditableRow label="Headline" value={u?.headline} maxLength={220}
          placeholder="e.g., CS student at Stanford · building tools for student founders"
          emptyText="Add a headline" onSave={v => onUpdateProfile("headline", v)} />
        <EditableRow label="Education" value={u?.education} maxLength={600}
          placeholder="e.g., Stanford University, Computer Science (Expected 2025)"
          emptyText="Add your education" onSave={v => onUpdateProfile("education", v)} />
        <EditableRow label="Experience & projects" value={u?.experience} maxLength={600} rows={3}
          placeholder="e.g., Interned at Google as a Product Manager (Summer 2024)"
          emptyText="Add your experience" onSave={v => onUpdateProfile("experience", v)} />
        {/* Optional for a mentee in a way it isn't for a mentor: plenty of them
            are students who don't have one yet, so the empty state reads as an
            offer rather than a gap in the profile. */}
        <EditableRow label="LinkedIn" value={u?.linkedinUrl} maxLength={200} rows={1}
          placeholder="linkedin.com/in/your-handle"
          emptyText="Add your LinkedIn (optional)" onSave={v => onUpdateProfile("linkedinUrl", v)} />
      </Card>
      {/* Every mentor, equal. The old version ranked them, one ACTIVE row and
          the rest tagged SUPPORT, each carrying a "Make active" button whose
          only real effect was to move the single working Orbit from one mentor
          to another. There is an Orbit per mentor now, so the only thing left
          to do to a pairing is leave it. */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Label>Your mentors</Label>
          <Label color={mentorsOf(u).length >= 3 ? C.teal : C.purple}>{mentorsOf(u).length}/3 SEATS</Label>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 8.5, color: "#A5A39D", marginTop: 6, letterSpacing: 0.5 }}>UP TO THREE AT ONCE · EACH ONE ITS OWN ORBIT</div>
        {mentorsOf(u).length === 0 && (
          <div style={{ fontSize: 12.5, color: C.gray, marginTop: 12, lineHeight: 1.5 }}>No mentors yet.</div>
        )}
        {mentorsOf(u).map(m => (
          <div key={m.id} style={{ marginTop: 12 }}>
            <div onClick={() => openOrbit(m.id)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <Avatar src={m.avatarUrl} name={m.name} size={40} bg={C.purple} color={C.white} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                {m.headline && <div style={{ fontSize: 11.5, color: C.gray }}>{m.headline}</div>}
              </div>
              <ChevronRight size={16} color={C.gray} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, marginLeft: 52 }}>
              <button onClick={() => onLeave(m)} style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 11.5, cursor: "pointer", padding: "6px 11px", borderRadius: 10, border: `1.5px solid ${C.coral}`, background: C.white, color: C.coral }}>Leave orbit</button>
            </div>
          </div>
        ))}
        {mentorsOf(u).length < 3 && (() => {
          const open = 3 - mentorsOf(u).length;
          return (
            <div onClick={() => openOverlay("addmentor")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, padding: "11px 0", background: C.ghost, borderRadius: R.tile, cursor: "pointer", color: C.purple, fontWeight: 600, fontSize: 13 }}>
              <Plus size={14} /> Add a mentor · {open} seat{open === 1 ? "" : "s"} open
            </div>
          );
        })()}
      </Card>
      {/* The roll-up. Each mentor authors their own program, so there is no one
          timeline to draw, this is the count per mentor, and the phases
          themselves live in that mentor's Orbit where the work is done. */}
      {mentorsOf(u).some(m => (programs[m.id]?.phases?.length || 0) > 0) && (
        <Card>
          <Label>Your programs</Label>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: "#A5A39D", marginTop: 6, letterSpacing: 0.5 }}>ONE PER MENTOR · OPEN AN ORBIT FOR THE PHASES</div>
          {mentorsOf(u).map(m => {
            const prog = programs[m.id];
            if (!prog?.phases?.length) return null;
            const done = (prog.completedPhaseIds || []).length;
            return (
              <div key={m.id} onClick={() => openOrbit(m.id)} style={{ marginTop: 12, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name.split(" ")[0]}’s program</div>
                  <Label color={done === prog.phases.length ? C.teal : C.purple}>{done} OF {prog.phases.length} DONE</Label>
                </div>
                <div style={{ marginTop: 7 }}><Bar pct={done / prog.phases.length} color={done === prog.phases.length ? C.teal : C.purple} /></div>
              </div>
            );
          })}
        </Card>
      )}
      {/* The reading list. Whatever your mentors promoted to Ryzn and you kept -
          the other end of the Save button on their shelves, without which that
          button would teach you your taps don't matter. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 2px 0" }}>
        <Label color={C.purple}>Saved by you</Label>
        <Label>FROM YOUR MENTORS’ SHELVES</Label>
      </div>
      <SavedShelf toast={toast} />
    </div>
  </div>
);

