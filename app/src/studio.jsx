import React, { useState } from "react";
import { Check, MoreHorizontal, Pin, Trash2, Users, Eye, Heart, UserPlus, ChevronRight } from "lucide-react";
import { C, F } from "./theme.js";
import { Card, Label, Btn, Chip, Bar, Seg, firstNameOf } from "./ui.jsx";

/**
 * Studio, a mentor's own surface, and the payoff for filling it in.
 *
 * §6.2's order is deliberate and is the order below: stats → profile strength →
 * greeting → composer → content. Strength sits second because it is the thing
 * that turns an empty Studio into a next action; putting it under the composer
 * would mean the people who most need it never scroll far enough to see it.
 */

/** The four stats. Followers is identity-level and the others are not, which is
    worth showing side by side: reach travels with the person, reactions belong
    to the work. */
export function StudioStats({ inOrbit, followers, views, reactions }) {
  const stats = [
    [String(inOrbit ?? 0), "in your orbit", C.purple, Users],
    [Number(followers ?? 0).toLocaleString(), "followers", C.teal, UserPlus],
    [Number(views ?? 0).toLocaleString(), "views", C.ink, Eye],
    [String(reactions ?? 0), "reactions", C.coral, Heart],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
      {stats.map(([n, l, c, Icon]) => (
        <Card key={l} style={{ padding: "11px 6px", textAlign: "center" }}>
          <Icon size={13} color={c} />
          <div style={{ fontFamily: F.sans, fontSize: 17, fontWeight: 700, color: c, marginTop: 3 }}>{n}</div>
          <div style={{ fontFamily: F.mono, fontSize: 7.5, color: C.gray, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>{l}</div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Profile strength.
 *
 * Four items, computed from what is actually on the record, never a stored
 * percentage, which would be a number that can disagree with the profile it
 * describes. Each incomplete item is a link to the thing that completes it, and
 * the reward rides on the row rather than arriving in a toast afterwards.
 *
 * It disappears at 100%. A permanent "you're done" bar is a permanent reminder
 * of a task, and the actual payoff, the Public view, is one tap away instead.
 */
export function ProfileStrength({ u, hasGreeting, postCount, onGo }) {
  const items = [
    { id: "headline", label: "Add a headline", done: !!u?.headline, sub: "One line. It's the hook on your card, not a bio.", go: "profile" },
    { id: "why", label: "Say why you mentor", done: !!u?.why, sub: "Two honest sentences. This is what mentees read first.", go: "profile" },
    { id: "greeting", label: "Record a greeting", done: !!hasGreeting, sub: "Thirty seconds, pinned to the top of your orbit.", reward: "+25 Impact", go: "feed" },
    { id: "post", label: "Publish something", done: postCount > 0, sub: "Your first post lands in every mentee's Orbit.", reward: "+10 Impact", go: "feed" },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = done / items.length;
  if (done === items.length) return null;

  const next = items.find((i) => !i.done);

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Label color={C.purple}>Profile strength</Label>
        <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.purple }}>{Math.round(pct * 100)}%</span>
      </div>
      <div style={{ marginTop: 9 }}><Bar pct={pct} /></div>
      <p style={{ fontSize: 12, color: C.gray, lineHeight: 1.5, margin: "9px 0 4px" }}>
        A complete profile is what a mentee decides on. {items.length - done} left.
      </p>
      <div style={{ marginTop: 6 }}>
        {items.map((i) => (
          <button key={i.id} onClick={() => !i.done && onGo?.(i.go)} disabled={i.done}
            style={{
              width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
              background: "transparent", border: "none", padding: "9px 0", cursor: i.done ? "default" : "pointer",
              borderTop: `1px solid ${C.line}`,
            }}>
            <span style={{
              width: 18, height: 18, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: i.done ? C.teal : "transparent", border: i.done ? "none" : `1.5px solid ${C.line}`,
            }}>
              {i.done && <Check size={11} color={C.white} strokeWidth={3} />}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: i.done ? C.mute : C.ink, textDecoration: i.done ? "line-through" : "none" }}>
                {i.label}
              </span>
              {!i.done && i.id === next?.id && (
                <span style={{ display: "block", fontSize: 11.5, color: C.gray, marginTop: 2, lineHeight: 1.4 }}>{i.sub}</span>
              )}
            </span>
            {!i.done && i.reward && <Chip c={C.teal} bg={C.tealTint}>{i.reward}</Chip>}
            {!i.done && <ChevronRight size={14} color={C.mute} />}
          </button>
        ))}
      </div>
    </Card>
  );
}

/**
 * The ⋯ overflow on a post.
 *
 * Pin and Delete live behind it rather than beside the benign actions, and this
 * is the interaction rule the pre-merge Studio broke worst: Delete was a
 * full-width button of equal weight to Publish. A destructive action gets less
 * prominence than a safe one, and its confirm carries the consequence -
 * "Mentees lose access", rather than asking "are you sure" about an unnamed
 * thing.
 */
export function PostOverflow({ post, onPin, onDelete }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div style={{ background: C.coralTint, border: `1px solid ${C.coral}`, borderRadius: 12, padding: "11px 12px", marginTop: 10 }}>
        <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 13 }}>Delete this post?</div>
        <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.5, marginTop: 4 }}>
          Mentees lose access to it, and the views and reactions go with it. This can't be undone.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Btn kind="ghost" small style={{ flex: 1, borderColor: C.line, color: C.gray }} onClick={() => { setConfirming(false); setOpen(false); }}>Keep it</Btn>
          <Btn small style={{ flex: 1, background: C.coral }} onClick={() => { setConfirming(false); setOpen(false); onDelete(post); }}>Delete</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} aria-label="More" aria-expanded={open}
        style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, display: "flex", borderRadius: 8 }}>
        <MoreHorizontal size={16} color={C.gray} />
      </button>
      {open && (
        <>
          {/* Tapping anywhere else closes it, a menu that only closes via its
              own button strands people on phones. */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
          <div style={{
            position: "absolute", right: 0, top: 26, zIndex: 31, background: C.white,
            border: `1px solid ${C.line}`, borderRadius: 12, boxShadow: "0 10px 26px rgba(26,26,26,.12)",
            minWidth: 168, overflow: "hidden",
          }}>
            <button onClick={() => { setOpen(false); onPin(post); }}
              style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "11px 13px", display: "flex", alignItems: "center", gap: 9, fontFamily: F.sans, fontSize: 13.5, color: C.ink }}>
              <Pin size={14} color={C.purple} /> {post.pinned ? "Unpin" : "Pin to top"}
            </button>
            <button onClick={() => setConfirming(true)}
              style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", borderTop: `1px solid ${C.line}`, cursor: "pointer", padding: "11px 13px", display: "flex", alignItems: "center", gap: 9, fontFamily: F.sans, fontSize: 13.5, color: C.coral }}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Studio · Public view.
 *
 * The same components, read-only, seen the way a stranger sees them, which is
 * why it is a segment of the Studio rather than a separate screen. A mentor who
 * cannot check what their profile looks like from outside will keep writing for
 * an audience they are imagining.
 */
export function StudioSeg({ value, onChange }) {
  return <Seg options={["Studio", "Public view"]} value={value} onChange={onChange} />;
}

/** The empty state. An invitation, not a report of absence. */
export function StudioEmpty() {
  return (
    <Card style={{ textAlign: "center", padding: "28px 22px" }}>
      <div style={{ fontFamily: F.sans, fontSize: 17, fontWeight: 700 }}>Nothing here yet.</div>
      <p style={{ fontSize: 13, color: C.gray, lineHeight: 1.55, marginTop: 7 }}>
        Your first post lands in every mentee's Orbit, no message required, no meeting needed.
        A paragraph about the thing you learned this week is enough.
      </p>
    </Card>
  );
}
