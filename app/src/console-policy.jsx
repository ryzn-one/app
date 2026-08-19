import React, { useState } from "react";
import { Users, Building2, ExternalLink, ChevronRight } from "lucide-react";
import { C, F } from "./theme.js";
import { Card, Label, Btn, Chip, Seg, Toggle, SettingRow, SecLabel } from "./ui.jsx";
import { POLICY_COPY } from "./lib/orbits.js";
import { setOrbitPolicy, setOrbitSettings } from "./lib/auth-client.js";

/**
 * Orbit policy, the console panel, shared by HR and creators.
 *
 * The consoles are the **only** writers of policy in the product. Everything
 * else reads it: the deck's CTA, the seat counter, the padlock on the Chat tab,
 * which leaderboard renders, who is in the pool. That is why this is one panel
 * rather than two, an HR console and a creator console editing the same six
 * fields through different code is how the two drift into meaning different
 * things by the same name.
 *
 * The highest-value assertion in the whole build is that flipping a switch here
 * changes a member's screen **without a reload**. Every write returns the
 * caller's whole orbit list, and the shell re-renders off it, so the console
 * and the phone are never looking at two versions of the rules.
 *
 * Rows are labelled from POLICY_COPY, the same map the read-only rows in the
 * deck's filter sheet draw from. The switch an admin flips and the explanation a
 * mentee reads for why their deck is narrow are guaranteed to describe the same
 * rule because they are the same string.
 */

const SCOPES_FOR = {
  private: ["Org", "Department"],
  community: ["Community", "Global"],
};

export function OrbitPolicyPanel({ orbit, onSaved, toast }) {
  const [busy, setBusy] = useState(false);
  const policy = orbit?.policy;
  if (!policy) return null;

  const write = async (patch) => {
    setBusy(true);
    try {
      const res = await setOrbitPolicy(orbit.id, patch);
      onSaved?.(res.orbits);
      /* Names what changed for whom, not "saved". A rule change lands on other
         people's phones and the person flipping it should be told so. */
      toast?.("Policy updated · live for everyone here");
    } catch (e) {
      toast?.(e.message || "Couldn't save that rule.");
    } finally {
      setBusy(false);
    }
  };

  const scopes = SCOPES_FOR[orbit.kind] || ["Global"];

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Label color={C.purple}>{orbit.kind === "community" ? "Circle policy" : "Orbit policy"}</Label>
        <Chip c={C.gray} bg={C.surface}>{busy ? "Saving…" : "Live"}</Chip>
      </div>
      <p style={{ fontSize: 12, color: C.gray, lineHeight: 1.5, margin: "8px 0 4px" }}>
        These six switches are the only thing that makes this orbit behave differently
        from any other. Changes reach everyone here immediately, nobody has to sign out.
      </p>

      <SettingRow label={POLICY_COPY.matchMode.label} sub={POLICY_COPY.matchMode.sub}>
        <Seg small options={["Open", "Apply"]} value={policy.matchMode}
          onChange={(v) => write({ matchMode: v })} style={{ width: 150 }} />
      </SettingRow>

      <SettingRow label={POLICY_COPY.cap.label} sub={POLICY_COPY.cap.sub}>
        <Seg small options={["1", "2", "3", "4"]} value={String(policy.cap)}
          onChange={(v) => write({ cap: Number(v) })} style={{ width: 150 }} />
      </SettingRow>

      <SettingRow label={POLICY_COPY.chatGate.label} sub={POLICY_COPY.chatGate.sub}>
        <Toggle on={policy.chatGate} onChange={(v) => write({ chatGate: v })} disabled={busy} label="Chat gate" />
      </SettingRow>

      {orbit.kind === "private" && (
        <>
          <SettingRow label={POLICY_COPY.levelGate.label} sub={POLICY_COPY.levelGate.sub}>
            <Toggle on={policy.levelGate} onChange={(v) => write({ levelGate: v })} disabled={busy} label="Staff+ only" />
          </SettingRow>
          <SettingRow label={POLICY_COPY.crossDiv.label} sub={POLICY_COPY.crossDiv.sub}>
            <Toggle on={policy.crossDiv} onChange={(v) => write({ crossDiv: v })} disabled={busy} label="Cross division" />
          </SettingRow>
        </>
      )}

      <SettingRow label={POLICY_COPY.boardScope.label} sub={POLICY_COPY.boardScope.sub} last>
        <Seg small options={scopes} value={policy.boardScope}
          onChange={(v) => write({ boardScope: v })} style={{ width: 170 }} />
      </SettingRow>

      {/* Seniority has to exist as a field before the switch above can be honest.
          Saying so here, next to the switch, is better than letting an admin turn
          on a filter that silently matches nobody. */}
      {orbit.kind === "private" && policy.levelGate && (
        <div style={{ background: C.amberTint, borderRadius: 10, padding: "10px 12px", marginTop: 12 }}>
          <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.5 }}>
            Only mentors graded <strong>Staff+</strong> in People appear in the deck. Ungraded seats don't clear the gate -
            grade them before anyone goes looking for a mentor.
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Org settings, the parts of a company orbit that aren't policy.
 *
 * `allowExternal` is the one that matters commercially: it decides whether posts
 * by mentors an employee follows *outside* this orbit may appear inside it. On
 * by default, because the follow graph is the product and a company orbit with
 * no outside voices is a worse product. Off is the enterprise answer for buyers
 * whose content policy needs one, and it is a switch rather than an argument.
 */
export function OrgSettingsPanel({ orbit, onSaved, toast }) {
  const [busy, setBusy] = useState(false);
  if (!orbit || orbit.kind !== "private") return null;

  const write = async (patch, message) => {
    setBusy(true);
    try {
      const res = await setOrbitSettings(orbit.id, patch);
      onSaved?.(res.orbits);
      toast?.(message);
    } catch (e) {
      toast?.(e.message || "Couldn't save that.");
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <Label color={C.purple}>Content and data</Label>
      <SettingRow
        label="Allow external content in this orbit"
        sub="Posts from mentors your people follow elsewhere on Ryzn can appear in their Discover feed here. Off keeps this orbit to its own members."
      >
        <Toggle
          on={orbit.allowExternal !== false}
          disabled={busy}
          label="Allow external content"
          onChange={(v) => write({ allowExternal: v }, v
            ? "External content on · follows reach in here"
            : "External content off · members see this orbit only")}
        />
      </SettingRow>
      <SettingRow label="Export" sub="Every member can export their own data from Settings at any time." last>
        <Chip c={C.gray} bg={C.surface}>Self-serve</Chip>
      </SettingRow>
    </Card>
  );
}

/**
 * The creator console.
 *
 * Deliberately smaller than the HR one, and the omissions are the design: there
 * is no People table and no at-risk surface, because a creator manages an
 * audience rather than a programme. Giving them retention dashboards would
 * invite them to treat readers as a cohort they are accountable for.
 */
export function CreatorConsole({ orbit, orbits, onSaved, toast, onOpenPosts }) {
  if (!orbit || orbit.kind !== "community") return null;
  const link = orbit.slug ? `${window.location.origin}/app/#/circle/${orbit.slug}` : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: C.tealTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={19} color={C.teal} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F.sans, fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>{orbit.name}</div>
            <div style={{ fontSize: 12.5, color: C.gray }}>
              {orbit.memberCount ?? 0} {orbit.memberCount === 1 ? "member" : "members"}
            </div>
          </div>
        </div>
        {link && (
          <div style={{ marginTop: 12, background: C.surface, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1, fontFamily: F.mono, fontSize: 10.5, color: C.gray, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</span>
            <Btn kind="ghost" small onClick={async () => {
              try { await navigator.clipboard.writeText(link); toast?.("Invite link copied"); }
              catch { toast?.("Couldn't copy that link"); }
            }}>Copy</Btn>
          </div>
        )}
        <p style={{ fontSize: 11.5, color: C.mute, lineHeight: 1.5, margin: "10px 2px 0" }}>
          Anyone with this link can join, and joining follows you, so your next post reaches them
          in every orbit they're in, not only this one.
        </p>
      </Card>

      {onOpenPosts && (
        <Card onClick={onOpenPosts} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px" }}>
          <ExternalLink size={16} color={C.purple} />
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>Your posts</span>
          <ChevronRight size={16} color={C.mute} />
        </Card>
      )}

      <OrbitPolicyPanel orbit={orbit} onSaved={onSaved} toast={toast} />
    </div>
  );
}
