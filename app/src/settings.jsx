import React, { useState } from "react";
import { Linkedin, LogOut, Download, Trash2, Sparkles, ChevronRight, Building2, Users, Globe } from "lucide-react";
import { C, F } from "./theme.js";
import { Card, Label, Btn, Chip, Avatar, Seg, Toggle, Sheet, SecLabel, SettingRow, Locked, firstNameOf } from "./ui.jsx";
import { InstallSection } from "./install.jsx";
import { copyFor } from "./lib/orbits.js";
import { orbitIcon } from "./orbits.jsx";

/**
 * Settings — one component, both roles, all three orbit kinds.
 *
 * Sections appear conditionally; nothing forks into a second screen. The two
 * rules here matter well beyond the UI:
 *
 * 1. **A `Locked` field is a trust signal, not a limitation.** In a company
 *    orbit, email and division come from the employer's directory, and saying so
 *    — visibly, with a padlock, on the field itself — tells an employee that
 *    Ryzn is reading their org chart rather than keeping a private second copy
 *    of it. The identical screen in the public orbit makes the same fields
 *    editable, because there nobody else owns them.
 *
 * 2. **Leaving an orbit never deletes identity.** The copy says it and the
 *    server honours it: XP, tier, badges, streak and follows survive; only the
 *    orbit-scoped progress ends. This is the state model made visible to the
 *    person it protects.
 *
 * Preferences are identity-level on purpose. Nobody should configure streak
 * reminders once per employer and again per circle.
 */

/**
 * What a toggle reads as before /api/me answers.
 *
 * Mirrors the server's defaults in api/profile.js, and is only ever a first
 * paint: the stored values arrive with the session and replace these. It exists
 * so a switch never renders in the off position for a preference that is
 * actually on — a settings screen that flickers is a settings screen people
 * stop trusting.
 */
export const DEFAULT_PREFS = Object.freeze({
  streak: true, notes: true, sessions: true, posts: true, board: false,
  badgeVis: true, feedVis: true, discoverable: true,
  avail: "Flexible", openDoor: false, paused: false,
});

/* Exported because the notification centre names the switch that muted a row.
   Deriving the name from the same list the switch is drawn from is the only way
   the two can't drift — "muted by Leaderboard movement" has to match a label
   that actually exists in Settings, or it sends people looking for a switch
   that isn't there. */
export const NOTIF_ROWS = (role) => [
  ["streak", "Daily streak reminder", "One nudge a day, at the time you usually write."],
  ["notes", role === "mentor" ? "Mentee activity" : "Notes from your mentor", role === "mentor"
    ? "When someone in your cohort writes or finishes a step."
    : "When a mentor replies or comments on your writing."],
  ["sessions", "Session reminders", "Before a booked session, and when one is proposed."],
  ["posts", "New posts from people you follow", "Follows travel across orbits, so these do too."],
  ["board", "Leaderboard movement", "When your position changes. Off by default — it's the noisiest one."],
];

/** The Settings label for a preference key, or the raw key if it has no switch. */
export const notifPrefLabel = (role, key) =>
  NOTIF_ROWS(role).find(([k]) => k === key)?.[1] || key;

export function SettingsSheet({
  role, orbit, orbits = [], user, prefs, onPrefs, onClose, onLogout,
  onLeaveOrbit, onExport, onDelete, onRedoTour, toast, busy,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [leaving, setLeaving] = useState(null);
  const isPrivate = orbit?.kind === "private";
  const isMentor = role === "mentor";
  const copy = copyFor(orbit);

  const set = (key) => (value) => onPrefs({ [key]: value });

  return (
    <Sheet title="Settings" onClose={onClose}>
      {/* ————— profile ————— */}
      <SecLabel>Profile photo</SecLabel>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar src={user?.avatarUrl} name={user?.name} size={54} radius={16} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{user?.name || "—"}</div>
            {isPrivate && (
              <div style={{ fontSize: 11.5, color: C.gray, marginTop: 3, lineHeight: 1.45 }}>
                Your picture is yours to change — it isn't taken from your employer's directory.
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ————— identity ————— */}
      <SecLabel>Identity</SecLabel>
      <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
        <SettingRow label="Display name">
          <span style={{ fontSize: 13, color: C.gray }}>{user?.name || "—"}</span>
        </SettingRow>
        <SettingRow
          label="Email"
          sub={isPrivate ? "From your organisation's directory." : undefined}
        >
          {isPrivate
            ? <Locked>{user?.email || "—"}</Locked>
            : <span style={{ fontSize: 13, color: C.gray }}>{user?.email || "—"}</span>}
        </SettingRow>
        {isPrivate ? (
          <SettingRow label="Division" sub="Set by your organisation. It decides who you can match with." last>
            <Locked>{orbit?.division || "Not set"}</Locked>
          </SettingRow>
        ) : (
          <SettingRow label="Headline" sub="One line. It's a hook on your card, not a bio." last>
            <span style={{ fontSize: 13, color: C.gray, maxWidth: 170, textAlign: "right", display: "inline-block" }}>
              {user?.headline || "Not set"}
            </span>
          </SettingRow>
        )}
      </Card>

      {/* ————— notifications ————— */}
      <SecLabel>Notifications</SecLabel>
      <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
        {NOTIF_ROWS(role).map(([key, label, sub], i, arr) => (
          <SettingRow key={key} label={label} sub={sub} last={i === arr.length - 1}>
            <Toggle on={prefs?.[key]} onChange={set(key)} label={label} />
          </SettingRow>
        ))}
      </Card>
      <p style={{ fontSize: 11.5, color: C.mute, lineHeight: 1.5, margin: "8px 4px 0" }}>
        These follow you. You set them once, not once per orbit.
      </p>

      {/* ————— visibility ————— */}
      <SecLabel>Visibility</SecLabel>
      <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
        <SettingRow
          label={isPrivate ? "Badges visible to your manager" : "Badges on your public profile"}
          sub={isPrivate
            ? "Your badges, shown inside this orbit. Off keeps them to you and your mentor."
            : "Anyone who opens your profile can see what you've earned."}
        >
          <Toggle on={prefs?.badgeVis} onChange={set("badgeVis")} label="Badge visibility" />
        </SettingRow>
        <SettingRow
          label={isMentor ? "Impact on the board" : "Wins on the cohort feed"}
          sub={isMentor ? "Your Impact Score, ranked against other mentors here." : "Milestones you hit appear where your cohort can see them."}
        >
          <Toggle on={prefs?.feedVis} onChange={set("feedVis")} label="Feed visibility" />
        </SettingRow>
        <SettingRow label="Discoverable in Explore" sub="Off hides you from search. Existing pairings are unaffected." last>
          <Toggle on={prefs?.discoverable} onChange={set("discoverable")} label="Discoverable" />
        </SettingRow>
      </Card>

      {/* ————— availability ————— */}
      <SecLabel>Availability</SecLabel>
      <Card>
        <Seg options={["Mornings", "Afternoons", "Flexible"]} value={prefs?.avail || "Flexible"} onChange={set("avail")} small />
        {isMentor && (
          <div style={{ marginTop: 6 }}>
            {/* §10.1's per-mentor escape hatch from Apply mode. A policy sets the
                default for an orbit; this lets one mentor opt out of it without
                the orbit having to change for everyone. */}
            <SettingRow
              label="Open door"
              sub="Accept anyone who applies, even where this orbit asks people to qualify."
            >
              <Toggle on={prefs?.openDoor} onChange={set("openDoor")} label="Open door" />
            </SettingRow>
            {/* The humane alternative to leaving: invisible to new mentees,
                cohort untouched. */}
            <SettingRow
              label="Pause new mentees"
              sub="Hides you from the deck. Everyone already in your cohort stays."
              last
            >
              <Toggle on={prefs?.paused} onChange={set("paused")} label="Pause new mentees" />
            </SettingRow>
          </div>
        )}
      </Card>

      {/* ————— linked accounts ————— */}
      <SecLabel>Linked accounts</SecLabel>
      <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
        <SettingRow label="LinkedIn" sub="Used for sharing a badge. Nothing is posted without you tapping share." last>
          <Chip c={C.gray} bg={C.surface}><Linkedin size={10} /> Share only</Chip>
        </SettingRow>
      </Card>

      {/* ————— your orbits ————— */}
      <SecLabel>Your orbits</SecLabel>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {orbits.map((o, i) => {
          const Icon = orbitIcon(o.kind);
          const isCurrent = o.id === orbit?.id;
          const canLeave = o.kind !== "public" && o.orgRole !== "owner";
          return (
            <div key={o.id} style={{ padding: "12px 14px", borderBottom: i === orbits.length - 1 ? "none" : `1px solid ${C.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <Icon size={16} color={o.accent || C.purple} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{o.name}</div>
                  <div style={{ fontSize: 11.5, color: C.gray }}>
                    {o.tag}{isCurrent ? " · you're here" : ""}
                  </div>
                </div>
                {canLeave && (
                  <button onClick={() => setLeaving(leaving === o.id ? null : o.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.mono, fontSize: 9.5, letterSpacing: 0.6, color: C.gray }}>
                    LEAVE
                  </button>
                )}
              </div>
              {/* The promise, stated at the moment it matters. */}
              {leaving === o.id && (
                <div style={{ background: C.surface, borderRadius: 10, padding: "11px 12px", marginTop: 10 }}>
                  <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.55 }}>{copyFor(o).leaveWarning}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <Btn kind="ghost" small style={{ flex: 1, borderColor: C.line, color: C.gray }} onClick={() => setLeaving(null)}>Stay</Btn>
                    <Btn small style={{ flex: 1, background: C.coral }} disabled={busy}
                      onClick={async () => { await onLeaveOrbit(o.id); setLeaving(null); }}>
                      Leave {o.name}
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {/* ————— install ————— */}
      <InstallSection />

      {/* ————— account and privacy ————— */}
      <SecLabel>Account and privacy</SecLabel>
      <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
        <SettingRow label="Export my data" sub="Everything we hold about you, as one JSON file.">
          <Btn kind="ghost" small onClick={onExport}><Download size={13} /> Export</Btn>
        </SettingRow>
        {onRedoTour && (
          <SettingRow label="Redo the tour" sub="Walk through the app again from the start.">
            <Btn kind="ghost" small onClick={onRedoTour}><Sparkles size={13} /> Replay</Btn>
          </SettingRow>
        )}
        {/* Destructive, and therefore not a full-width button of equal weight to
            a benign one. The confirm carries the consequence rather than asking
            "are you sure" about an unstated thing. */}
        <SettingRow label="Delete account" sub="Permanent. Your posts, writing and pairings go with it." last>
          <button onClick={() => setConfirmDelete(true)}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.mono, fontSize: 9.5, letterSpacing: 0.6, color: C.coral, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Trash2 size={12} /> DELETE
          </button>
        </SettingRow>
      </Card>

      {confirmDelete && (
        <Card style={{ marginTop: 10, border: `1.5px solid ${C.coral}`, background: C.coralTint }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Delete your account?</div>
          <p style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.55, marginTop: 6 }}>
            Your profile, writing, posts, pairings and XP are erased and cannot be restored.
            Anyone you mentor loses access to your Orbit. Export your data first if you want to keep it.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn kind="ghost" small style={{ flex: 1, borderColor: C.line }} onClick={() => setConfirmDelete(false)}>Keep my account</Btn>
            <Btn small style={{ flex: 1, background: C.coral }} disabled={busy} onClick={onDelete}>Delete permanently</Btn>
          </div>
        </Card>
      )}

      <Btn kind="ghost" style={{ marginTop: 18, marginBottom: 6 }} onClick={onLogout}>
        <LogOut size={15} /> Sign out
      </Btn>
      {isPrivate && (
        <p style={{ fontSize: 11.5, color: C.mute, textAlign: "center", lineHeight: 1.5, margin: "0 0 8px" }}>
          Signing out here ends your Ryzn session. Your organisation's single sign-on handles the rest.
        </p>
      )}
    </Sheet>
  );
}
