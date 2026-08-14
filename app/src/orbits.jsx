import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Globe, Users, Building2, ChevronDown, Check, Plus } from "lucide-react";
import { C, F } from "./theme.js";
import { Card, Chip, Btn, Monogram, Label } from "./ui.jsx";
import { copyFor, PUBLIC_ORBIT_ID, POLICY_COPY } from "./lib/orbits.js";
import { spring } from "./motion.js";

/**
 * The orbit switcher — the top-level navigation control.
 *
 * It is not a settings menu. It is the surface that makes "one identity, several
 * spaces" legible: the same person, the same XP and the same follows, seen from
 * inside a different set of rules. It doubles as a re-engagement surface, which
 * is why unread counts and per-orbit standing belong on the rows rather than
 * buried inside each orbit.
 *
 * Switching orbits never re-authenticates and never reloads. The shell swaps one
 * resolved `policy` for another and the screens below re-render against it —
 * that swap is the entire architecture, visible in one interaction.
 */

const ICON_FOR = { public: Globe, community: Users, private: Building2 };

export const orbitIcon = (kind) => ICON_FOR[kind] || Globe;

/** A one-line summary of what is different here — the rules, in a person's words.
    Drawn from the same POLICY_COPY the consoles write through, so the row and
    the switch can never describe the rule differently. */
export function policySummary(policy) {
  if (!policy) return "";
  const bits = [POLICY_COPY.matchMode.valueLabel(policy.matchMode)];
  if (policy.levelGate) bits.push("Staff+ only");
  if (!policy.crossDiv) bits.push("Own division");
  bits.push(POLICY_COPY.cap.valueLabel(policy.cap));
  return bits.join(" · ");
}

/** One row in the sheet. `unread` and `delta` are what make this a place worth
    coming back to rather than a list of names. */
function OrbitRow({ orbit, active, unread = 0, onSelect }) {
  const Icon = orbitIcon(orbit.kind);
  const copy = copyFor(orbit);
  return (
    <button onClick={() => onSelect(orbit.id)} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
      background: active ? C.purpleTint : C.white, border: `1px solid ${active ? C.purple : C.line}`,
      borderRadius: 14, padding: "12px 13px", cursor: "pointer", marginBottom: 8,
    }}>
      <span style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: active ? C.white : C.surface, border: `1px solid ${C.line}`,
      }}>
        <Icon size={17} color={orbit.accent || C.purple} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orbit.name}</span>
          {unread > 0 && <Chip c={C.coral} bg={C.coralTint}>{unread}</Chip>}
        </span>
        <span style={{ display: "block", fontSize: 11.5, color: C.gray, marginTop: 2 }}>{orbit.tag} · {copy.runBy}</span>
        <span style={{ display: "block", fontFamily: F.mono, fontSize: 9, letterSpacing: 0.4, color: C.mute, marginTop: 3, textTransform: "uppercase" }}>
          {policySummary(orbit.policy)}
        </span>
      </span>
      {active && <Check size={16} color={C.purple} />}
    </button>
  );
}

/**
 * The control in the app header: current orbit, tap to switch.
 *
 * Collapsed it is one line, because most sessions never leave the orbit they
 * started in. Expanded it is the whole membership list — and the place a circle
 * is joined or opened, since those are orbit-level acts rather than settings.
 */
export function OrbitSwitcher({ orbits, orbitId, onSwitch, unread = {}, onJoinCircle, onOpenCircle, canOpenCircle }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const current = orbits.find((o) => o.id === orbitId) || orbits[0];
  if (!current) return null;
  const Icon = orbitIcon(current.kind);
  const others = orbits.filter((o) => o.id !== orbitId);
  const otherUnread = others.reduce((n, o) => n + (unread[o.id] || 0), 0);

  return (
    <>
      <button onClick={() => setOpen(true)} aria-haspopup="dialog" style={{
        display: "flex", alignItems: "center", gap: 8, background: C.surface,
        border: `1px solid ${C.line}`, borderRadius: 12, padding: "6px 10px 6px 8px", cursor: "pointer", maxWidth: 210,
      }}>
        <Icon size={15} color={current.accent || C.purple} />
        <span style={{ minWidth: 0, textAlign: "left" }}>
          <span style={{ display: "block", fontFamily: F.sans, fontWeight: 700, fontSize: 12.5, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current.name}</span>
          <span style={{ display: "block", fontFamily: F.mono, fontSize: 8, letterSpacing: 0.5, color: C.mute, textTransform: "uppercase" }}>{current.tag}</span>
        </span>
        {otherUnread > 0 && <Chip c={C.coral} bg={C.coralTint}>{otherUnread}</Chip>}
        <ChevronDown size={14} color={C.gray} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(26,26,26,.45)", zIndex: 80, display: "flex", alignItems: "flex-end" }}>
            <motion.div
              initial={reduced ? false : { y: 30 }} animate={{ y: 0 }} exit={{ y: 30 }} transition={spring(reduced)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", background: C.surface, borderRadius: "20px 20px 0 0", padding: "18px 16px 22px", maxHeight: "84%", overflowY: "auto" }}>
              <Label color={C.purple} style={{ marginBottom: 10 }}>Your orbits</Label>

              <OrbitRow orbit={current} active unread={unread[current.id] || 0} onSelect={() => setOpen(false)} />
              {others.map((o) => (
                <OrbitRow key={o.id} orbit={o} active={false} unread={unread[o.id] || 0}
                  onSelect={(id) => { onSwitch(id); setOpen(false); }} />
              ))}

              {/* Your XP, tier, badges and follows are the same in every row above.
                  Saying so here is worth more than saying it in a help page: this
                  is the moment someone wonders what they lose by switching. */}
              <p style={{ fontSize: 11.5, color: C.gray, lineHeight: 1.5, margin: "10px 4px 14px" }}>
                Your XP, tier, badges, streak and the people you follow are yours — they're the same in every orbit.
                What changes is the rules, the people and the board.
              </p>

              <div style={{ display: "flex", gap: 8 }}>
                {onJoinCircle && <Btn kind="ghost" small onClick={() => { setOpen(false); onJoinCircle(); }} style={{ flex: 1 }}>Join a circle</Btn>}
                {canOpenCircle && onOpenCircle && (
                  <Btn kind="soft" small onClick={() => { setOpen(false); onOpenCircle(); }} style={{ flex: 1 }}>
                    <Plus size={13} /> Open a circle
                  </Btn>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * JoinFlow — how someone enters an orbit that isn't the public one.
 *
 * The two kinds enter differently, and the difference is real rather than
 * cosmetic:
 *
 *   community  a link and one tap. Nothing to verify, because a creator letting
 *              anyone in is the point. Joining follows the creator, which is
 *              what makes their next post reach this person everywhere.
 *
 *   private    an invite code or SSO, and — before either — a plain statement of
 *              what their employer can and cannot see. That paragraph is not
 *              legal cover; it is the thing that decides whether someone writes
 *              an honest goal in the next screen.
 *
 * Both hand off to the same conversational onboarding. There is no form behind
 * either door.
 */
export function JoinCircle({ circle, joined, busy, error, onJoin, onCancel }) {
  if (error) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <Users size={30} color={C.mute} />
        <div style={{ fontSize: 19, fontWeight: 700, marginTop: 12 }}>That link doesn't lead anywhere.</div>
        <p style={{ fontSize: 13, color: C.gray, lineHeight: 1.5, marginTop: 6 }}>
          The circle may have been closed, or the link may be mistyped.
        </p>
        <Btn kind="ghost" style={{ marginTop: 16 }} onClick={onCancel}>Back to Ryzn</Btn>
      </div>
    );
  }
  if (!circle) {
    return <div style={{ padding: "40px 20px", textAlign: "center", color: C.gray, fontSize: 13 }}>Opening the circle…</div>;
  }

  return (
    <div style={{ padding: "26px 20px 30px" }}>
      <Label color={C.teal}>Community circle</Label>
      <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: -0.6, marginTop: 8 }}>{circle.name}</div>
      {circle.tag && <div style={{ fontSize: 14, color: C.gray, marginTop: 4, lineHeight: 1.5 }}>{circle.tag}</div>}

      <Card style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
        <Users size={17} color={C.teal} />
        <span style={{ flex: 1, fontSize: 13 }}>
          <strong style={{ fontWeight: 700 }}>{circle.memberCount ?? 0}</strong> {circle.memberCount === 1 ? "member" : "members"}
        </span>
        <Chip c={C.teal} bg={C.tealTint}>Free to join</Chip>
      </Card>

      {/* Said before joining, not after. The one thing a person actually wants to
          know at this moment is what they are signing up to lose, and the answer
          is nothing — identity is theirs and travels. */}
      <Card style={{ marginTop: 10, background: C.surface }}>
        <p style={{ fontSize: 12.5, color: C.gray, lineHeight: 1.6, margin: 0 }}>
          Joining follows the creator, so their posts reach you in every orbit you're in — not only this one.
          Your XP, tier, badges, streak and follows stay yours. You can leave any time and keep all of it.
        </p>
      </Card>

      <Btn style={{ marginTop: 18 }} disabled={busy || joined} onClick={onJoin}>
        {joined ? "You're in this circle" : busy ? "Joining…" : `Join ${circle.name}`}
      </Btn>
      <Btn kind="ghost" small style={{ marginTop: 8, width: "100%" }} onClick={onCancel}>Not now</Btn>
    </div>
  );
}

/**
 * The banner that appears for a beat after switching.
 *
 * A switch changes the rules underneath someone mid-session; saying which rules,
 * once, is the difference between "the app changed" and "I moved somewhere with
 * different rules". It states the policy, not the orbit kind.
 */
export function OrbitContextBanner({ orbit }) {
  if (!orbit) return null;
  const Icon = orbitIcon(orbit.kind);
  return (
    <Card style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", background: C.purpleTint, border: `1px solid ${C.lilac}`, borderRadius: 12 }}>
      <Icon size={15} color={orbit.accent || C.purple} />
      <span style={{ fontSize: 12, color: C.deep, lineHeight: 1.45 }}>
        <strong style={{ fontWeight: 700 }}>{orbit.name}</strong> · {policySummary(orbit.policy)}
      </span>
    </Card>
  );
}
