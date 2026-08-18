import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Lock, MessageCircle, Calendar, Zap, Check, ChevronRight } from "lucide-react";
import { C, F } from "./theme.js";
import { Card, Label, Btn, Chip, Avatar, Bar, Glyph, firstNameOf } from "./ui.jsx";
import { spring } from "./motion.js";

/**
 * The unlock track.
 *
 * This is the single most important motivational component in the product, and
 * every rule it follows is deliberate:
 *
 *   One step at a time.       The card shows the *current* step and nothing
 *                             else. A flat list of everything remaining reads as
 *                             a chore; one step with the prize named reads as a
 *                             next move. Finishing advances the card in place.
 *
 *   Name the prize first.     "FINISHING THIS TRACK UNLOCKS" is above the CTA,
 *                             not in a toast afterwards. Someone deciding
 *                             whether to spend four minutes needs to know what
 *                             they buy before they spend them.
 *
 *   The reward is on the      "Start · +30 XP", never a bare "Start" that pays
 *   button.                   out in a toast nobody reads.
 *
 *   It is for a person.       The header is the mentor's face and name — "FOR
 *                             YOUR MENTOR · Jordan". The work is for someone,
 *                             not for a progress bar, and social accountability
 *                             outperforms a percentage every time.
 *
 * `stage` comes resolved from /api/orbits: `{ current, index, total, done,
 * complete, remainingXp }`. Nothing here re-derives it.
 */

const UNLOCKS = [
  { icon: MessageCircle, label: (m) => (m ? `Chat with ${firstNameOf(m)}` : "Chat with your mentor") },
  { icon: Calendar, label: () => "Session booking" },
];

export function UnlockTrackCard({ stage, mentor, chatGate, onStart, busy }) {
  const reduced = useReducedMotion();
  if (!stage || stage.complete) return null;
  const step = stage.current;
  if (!step) return null;

  const pct = Math.round((stage.done.length / stage.total) * 100);

  return (
    <Card style={{ padding: 0, overflow: "hidden", border: `1.5px solid ${C.purple}` }}>
      {/* Who this is for. Not "your progress" — a person, with a face. */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: C.purpleTint }}>
        <Avatar src={mentor?.avatarUrl} name={mentor?.name} size={34} radius={10} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, letterSpacing: 0.9, color: C.deep, fontWeight: 700 }}>
            {mentor ? `FOR YOUR MENTOR · ${firstNameOf(mentor.name).toUpperCase()}` : "FOR YOUR FIRST MENTOR"}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, letterSpacing: 0.9, color: C.purple, marginTop: 2 }}>
            UNLOCK TRACK · STEP {stage.index} OF {stage.total}
          </div>
        </div>
        <Chip c={C.purple} bg={C.white}>+{stage.remainingXp} XP LEFT</Chip>
      </div>

      <div style={{ padding: "14px 14px 15px" }}>
        <Bar pct={pct} />

        {/* The current step, alone. */}
        <motion.div key={step.id} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring(reduced)}>
          <div style={{ fontFamily: F.sans, fontSize: 18, fontWeight: 700, letterSpacing: -0.3, marginTop: 12 }}>{step.title}</div>
          <div style={{ fontSize: 13, color: C.gray, lineHeight: 1.5, marginTop: 4 }}>{step.sub}</div>
        </motion.div>

        {/* The prize, before the ask. */}
        <div style={{ marginTop: 13 }}>
          <Label color={C.purple}>Finishing this track unlocks</Label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
            {chatGate && UNLOCKS.map(({ icon: Icon, label }) => (
              <Chip key={label(mentor?.name)} c={C.deep} bg={C.surface}>
                <Icon size={10} /> {label(mentor?.name)}
              </Chip>
            ))}
            <Chip c={C.teal} bg={C.tealTint}><Zap size={10} /> +{stage.remainingXp} XP</Chip>
          </div>
        </div>

        <Btn style={{ marginTop: 14 }} disabled={busy} onClick={() => onStart(step)}>
          Start · +{step.xp} XP
        </Btn>

        <div style={{ fontSize: 11.5, color: C.mute, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
          One step at a time. This is all you need to do right now.
        </div>
      </div>
    </Card>
  );
}

/**
 * The locked Chat screen.
 *
 * A designed destination, not a hidden route. Hiding a gated feature removes the
 * goal gradient — someone cannot want a thing they can't see — so the tab stays
 * present and padlocked, and tapping it lands here: the lock, the reason, the
 * distance left, and one way forward.
 */
export function ChatLocked({ stage, mentor, go }) {
  const left = stage ? stage.total - stage.done.length : 1;
  return (
    <div style={{ padding: "44px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: 62, height: 62, borderRadius: 20, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Lock size={24} color={C.purple} />
      </div>
      <div style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 16 }}>Chat is earned.</div>
      <p style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.6, marginTop: 8, maxWidth: 320 }}>
        {mentor
          ? `${firstNameOf(mentor.name)} reads what you write before you ever message them. Finish the track and this opens.`
          : "Finish your first track and messaging opens with every mentor here."}
      </p>

      {stage && (
        <div style={{ width: "100%", maxWidth: 320, marginTop: 18 }}>
          <Bar pct={Math.round((stage.done.length / stage.total) * 100)} />
          <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 0.8, color: C.purple, marginTop: 7 }}>
            {stage.done.length} OF {stage.total} DONE · {left} STEP{left === 1 ? "" : "S"} TO GO
          </div>
        </div>
      )}

      <Btn style={{ marginTop: 20, maxWidth: 320 }} onClick={() => go("exercises")}>
        {stage?.current ? `${stage.current.title} · +${stage.current.xp} XP` : "Back to the track"}
      </Btn>
    </div>
  );
}

/**
 * The unlock ceremony.
 *
 * Fires once, when the track completes. Rewards that arrive silently teach
 * people that finishing things changes nothing — so this is a moment, and it
 * hands over the thing that was earned rather than merely announcing it.
 */
export function ChatUnlocked({ mentor, onOpen, onClose }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "absolute", inset: 0, background: "rgba(26,26,26,.55)", zIndex: 95, display: "flex", alignItems: "center", justifyContent: "center", padding: 22 }}>
      <motion.div
        className="badge-pop"
        initial={reduced ? false : { scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} transition={spring(reduced)}
        style={{ background: C.white, borderRadius: 20, padding: "26px 22px", maxWidth: 340, width: "100%", textAlign: "center" }}>
        <Glyph color={C.teal} size={40} />
        <div style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 12 }}>Chat is open.</div>
        <p style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.6, marginTop: 7 }}>
          You finished the track{mentor ? ` — ${firstNameOf(mentor.name)} is one message away.` : "."} The Connect badge is yours.
        </p>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 13 }}>
          <Chip c={C.teal} bg={C.tealTint}><Check size={10} /> Connect badge</Chip>
          <Chip c={C.purple} bg={C.purpleTint}><MessageCircle size={10} /> Chat unlocked</Chip>
        </div>
        <Btn style={{ marginTop: 18 }} onClick={onOpen}>
          {mentor ? `Message ${firstNameOf(mentor.name)}` : "Open chat"} <ChevronRight size={15} />
        </Btn>
        <Btn kind="ghost" small style={{ marginTop: 8, width: "100%" }} onClick={onClose}>Later</Btn>
      </motion.div>
    </motion.div>
  );
}
