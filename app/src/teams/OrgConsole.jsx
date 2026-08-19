import React, { useEffect, useState } from "react";
import {
  Building2, Users, Send, Settings, Radio, Copy, ExternalLink, Plus, ChevronLeft,
  Check, Shield, Trash2, RotateCcw, Globe, SlidersHorizontal,
} from "lucide-react";
import { C, F } from "../theme.js";
import { Card, Label, Btn, Field, FormError, Monogram, firstNameOf } from "../ui.jsx";
import { useIsDesktop } from "../useIsDesktop.js";
import { buildInviteUrl, copyText } from "../lib/invite-url.js";
import { PostCard } from "../feed.jsx";
import { OrbitPolicyPanel, OrgSettingsPanel } from "../console-policy.jsx";
import {
  updateOrg, setOrgOrbit, orgMintInvites, orgRevokeInvite,
  orgSetMemberRole, orgRemoveMember, orgLeave, fetchOrgOrbit, messageFor, postAction,
  orgSetRules, orgSetDivision,
} from "../lib/auth-client.js";

/* ----------------- ORG CONSOLE -----------------

   The real one. Every number on this screen is counted from the database: the
   roster is org_members, the codes are invites scoped to this org, the Orbit is
   the profile-visible posts of the org's own people. Nothing is seeded and
   nothing is simulated, the console this replaces was a fictional company with
   invented mentors, which is exactly what an org console must never be.

   Who may do what is decided server-side in api/orgs.js. The controls here are
   hidden by the same rules so a manager isn't offered a button that 403s, but
   hiding is a courtesy, not the gate. */

const STATE_COLOR = { open: C.purple, claimed: C.teal, expired: C.gray, revoked: C.coral };
const STATE_BG = { open: C.purpleTint, claimed: C.tealTint, expired: C.surface, revoked: C.coralTint };

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "-");

const Chip = ({ children, c = C.purple, bg = C.purpleTint }) => (
  <span style={{ fontFamily: F.mono, fontSize: 8.5, fontWeight: 700, letterSpacing: 0.6, color: c, background: bg, padding: "4px 8px", whiteSpace: "nowrap" }}>{children}</span>
);

const Tile = ({ label, value, color = C.ink, sub }) => (
  <Card style={{ padding: 14 }}>
    <Label>{label}</Label>
    <div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 700, color, marginTop: 6, letterSpacing: -0.6 }}>{value}</div>
    {sub && <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 4 }}>{sub}</div>}
  </Card>
);

const ROLE_CHIP = {
  owner: { c: C.amber, bg: C.amberTint, label: "OWNER" },
  admin: { c: C.teal, bg: C.tealTint, label: "ORG ADMIN" },
  member: { c: C.purple, bg: C.purpleTint, label: "MEMBER" },
};

/** The divisions this org actually uses, read off the roster. Never a second
    list to maintain, a division exists because somebody is sitting in it. */
const divisionsOf = (members) =>
  [...new Set(members.map((m) => m.division).filter(Boolean))].sort();

const Switch = ({ on, onChange, disabled }) => (
  <button role="switch" aria-checked={!!on} disabled={disabled} onClick={() => onChange(!on)}
    style={{
      width: 46, height: 27, borderRadius: 14, border: "none", flexShrink: 0,
      cursor: disabled ? "default" : "pointer", padding: 3, display: "flex",
      justifyContent: on ? "flex-end" : "flex-start",
      background: on ? C.purple : "#D6D4CE", opacity: disabled ? 0.5 : 1, transition: "background .15s",
    }}>
    <span style={{ width: 21, height: 21, borderRadius: "50%", background: C.white, display: "block" }} />
  </button>
);

/** One programme rule: what it does, and what it costs when it's on. The body
    text is the point, a switch labelled only "Cross-division" tells a manager
    nothing about who stops appearing in their people's decks. */
const Rule = ({ title, body, on, onChange, disabled }) => (
  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: `1px solid ${C.line}` }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: C.gray, lineHeight: 1.55, marginTop: 5 }}>{body}</div>
    </div>
    <Switch on={on} onChange={onChange} disabled={disabled} />
  </div>
);

/* ----- overview ----- */
function Overview({ org, members, invites, onOrbit, onNav, canManage }) {
  const open = invites.filter((i) => i.state === "open").length;
  const mentors = members.filter((m) => m.role === "mentor" || m.role === "admin").length;
  const impact = members.reduce((n, m) => n + (m.impact || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <Tile label="People" value={members.length} sub={`${mentors} MENTOR${mentors === 1 ? "" : "S"}`} />
        <Tile label="Open seats" value={open} color={C.purple} sub="UNCLAIMED CODES" />
        <Tile label="Impact" value={impact} color={C.teal} sub="ACROSS THE ORG" />
        <Tile label="Orbit" value={org.orbitActive ? "Open" : "Closed"} color={org.orbitActive ? C.teal : C.gray}
          sub={org.orbitActive ? `SINCE ${fmtDate(org.orbitActivatedAt).toUpperCase()}` : "NOT ACTIVATED"} />
      </div>

      {!org.orbitActive && (
        <Card style={{ background: C.purpleTint, border: "none" }}>
          <Label color={C.purple}>Next step</Label>
          <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8 }}>
            {members.length < 2
              ? <>Invite mentors and mentees. Each claim seats them in {org.name} on Ryzn, then open the Orbit so the whole org reads the same feed.</>
              : <>You have a roster. Opening the Orbit puts everyone’s profile posts into one feed for the org.</>}
          </div>
          {canManage && (
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <Btn kind="soft" small onClick={() => onNav("invites")}><Send size={14} /> Invite people</Btn>
              <Btn small onClick={() => onOrbit(true)}><Radio size={14} /> Open the Orbit</Btn>
            </div>
          )}
        </Card>
      )}

      <Card>
        <Label>What an org is here</Label>
        <div style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.6, marginTop: 8 }}>
          Your people keep their own Ryzn accounts, profile, cohort, Impact Score, and the org is the
          layer around them: a shared roster, seats you hand out yourself, and one feed. Being the owner
          makes you an admin <b style={{ color: C.ink }}>of {org.name}</b>, not of Ryzn.
        </div>
      </Card>
    </div>
  );
}

/* ----- people ----- */

/** Seats one person in a team. Free text with the org's existing divisions
    offered as suggestions: an org chart is not ours to enumerate, but retyping
    "Engineering" slightly differently would quietly split a division in two. */
function DivisionCell({ member, divisions, onSet, busy }) {
  const [value, setValue] = useState(member.division || "");
  const listId = "divisions-list";
  useEffect(() => { setValue(member.division || ""); }, [member.division]);

  const commit = () => {
    const next = value.trim();
    if (next === (member.division || "")) return;
    onSet(member.id, next || null);
  };

  return (
    <>
      <datalist id={listId}>{divisions.map((d) => <option key={d} value={d} />)}</datalist>
      <input
        value={value} list={listId} disabled={busy} placeholder="No division"
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setValue(member.division || ""); }}
        style={{
          width: 118, border: `1px solid ${member.division ? C.line : "transparent"}`, borderRadius: 9,
          padding: "6px 8px", fontFamily: F.sans, fontSize: 12, color: member.division ? C.ink : C.gray,
          background: member.division ? C.white : C.surface, outline: "none", boxSizing: "border-box",
        }}
      />
    </>
  );
}

function People({ org, members, canManage, isOwner, meId, onRole, onRemove, onDivision, busy }) {
  const divisions = divisionsOf(members);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Label>Roster · {members.length}</Label>
          <Label color={C.purple}>{org.name.toUpperCase()}</Label>
        </div>
        {members.map((m, i) => {
          const chip = ROLE_CHIP[m.orgRole] || ROLE_CHIP.member;
          const isMe = m.id === meId;
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < members.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <Monogram name={m.name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.name}{isMe && <span style={{ color: C.gray, fontWeight: 500 }}> · you</span>}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(m.email || m.headline || m.role).toString().toUpperCase()} · JOINED {fmtDate(m.joinedAt).toUpperCase()}
                </div>
              </div>
              {m.impact != null && (
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.gray, whiteSpace: "nowrap" }}>{m.impact} IMPACT</span>
              )}
              {canManage
                ? <DivisionCell member={m} divisions={divisions} onSet={onDivision} busy={busy} />
                : m.division && <Chip c={C.gray} bg={C.surface}>{m.division.toUpperCase()}</Chip>}
              <Chip c={chip.c} bg={chip.bg}>{chip.label}</Chip>
              {/* Only the owner reshuffles who runs the org, an org admin can
                  seat and unseat members, not promote a peer above themselves. */}
              {isOwner && m.orgRole !== "owner" && (
                <button disabled={busy} onClick={() => onRole(m.id, m.orgRole === "admin" ? "member" : "admin")}
                  title={m.orgRole === "admin" ? "Make a member" : "Make an org admin"}
                  style={{ border: "none", background: C.surface, cursor: busy ? "default" : "pointer", borderRadius: 9, padding: "7px 9px", display: "flex" }}>
                  <Shield size={13} color={m.orgRole === "admin" ? C.teal : C.gray} />
                </button>
              )}
              {canManage && m.orgRole !== "owner" && !isMe && (
                <button disabled={busy} onClick={() => onRemove(m)} title={`Remove ${firstNameOf(m.name)}`}
                  style={{ border: "none", background: C.coralTint, cursor: busy ? "default" : "pointer", borderRadius: 9, padding: "7px 9px", display: "flex" }}>
                  <Trash2 size={13} color={C.coral} />
                </button>
              )}
            </div>
          );
        })}
      </Card>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", lineHeight: 1.7, padding: "0 4px" }}>
        REMOVING SOMEONE TAKES THEIR ORG SEAT, NOT THEIR RYZN ACCOUNT, THEIR MENTEES, POSTS AND IMPACT STAY THEIRS.
      </div>
    </div>
  );
}

/* ----- invites ----- */
function Invites({ org, invites, divisions, onMint, onRevoke, busy, toast, inviterName }) {
  const [to, setTo] = useState("");
  const [who, setWho] = useState("");
  const [count, setCount] = useState(1);
  const [days, setDays] = useState(90);
  const [role, setRole] = useState("mentor");
  const [orgRole, setOrgRole] = useState("member");
  const [division, setDivision] = useState("");
  const addressed = to.trim().length > 0;
  const isMentee = role === "mentee";

  // Same query shape the server builds when it mails one, the page reads `org`
  // + `role` and opens with the company's name rather than Ryzn's founding pitch.
  const linkFor = (iv) =>
    buildInviteUrl({
      code: iv.code,
      name: iv.sentName || "",
      adminName: inviterName,
      orgName: org.name,
      role: (iv.role || "mentor") === "mentee" ? "Mentee" : "Mentor",
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card>
        <Label color={C.purple}>Seat someone at {org.name}</Label>
        <div style={{ fontSize: 13, color: C.gray, marginTop: 6, lineHeight: 1.5 }}>
          A code is single-use. Claiming it puts them in {org.name} on Ryzn
          {isMentee ? " as a mentee" : " as a mentor with their own profile and Impact Score"} -
          one link, one sign-in, no approval queue.
        </div>

        <div style={{ display: "flex", background: "#EFEEEA", borderRadius: 12, padding: 4, marginTop: 14 }}>
          {[["mentor", "Mentor"], ["mentee", "Mentee"]].map(([id, l]) => (
            <button key={id} onClick={() => { setRole(id); if (id === "mentee") setOrgRole("member"); }} style={{
              flex: 1, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0",
              fontFamily: F.sans, fontWeight: 600, fontSize: 13,
              background: role === id ? C.white : "transparent", color: role === id ? C.ink : C.gray,
            }}>{l}</button>
          ))}
        </div>

        {!isMentee && (
          <>
            <div style={{ display: "flex", background: "#EFEEEA", borderRadius: 12, padding: 4, marginTop: 10 }}>
              {[["member", "Member"], ["admin", "Org admin"]].map(([id, l]) => (
                <button key={id} onClick={() => setOrgRole(id)} style={{
                  flex: 1, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0",
                  fontFamily: F.sans, fontWeight: 600, fontSize: 13,
                  background: orgRole === id ? C.white : "transparent", color: orgRole === id ? C.ink : C.gray,
                }}>{l}</button>
              ))}
            </div>
            {orgRole === "admin" && (
              <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: C.amberTint, borderRadius: 12, padding: 12, marginTop: 10 }}>
                <Shield size={15} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
                  An org admin can invite, remove people and open the Orbit for {org.name}. They still can’t touch
                  anything outside this org.
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 12 }}>
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            <Label color={addressed ? C.purple : C.gray}>Send to (optional)</Label>
            <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="them@yourcompany.com" autoComplete="off"
              style={{ width: "100%", marginTop: 7, border: `1px solid ${addressed ? C.purple : C.line}`, borderRadius: 12, padding: 12, fontFamily: F.sans, fontSize: 14, outline: "none", background: C.white, boxSizing: "border-box" }} />
          </div>
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            <Label>Their first name</Label>
            <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Guessed from the address if blank"
              style={{ width: "100%", marginTop: 7, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, fontFamily: F.sans, fontSize: 14, outline: "none", background: C.white, boxSizing: "border-box" }} />
          </div>
          <div>
            <Label>How many</Label>
            <input type="number" min={1} max={25} value={addressed ? 1 : count} disabled={addressed} onChange={(e) => setCount(e.target.value)}
              style={{ width: "100%", marginTop: 7, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, fontFamily: F.mono, fontSize: 14, outline: "none", background: addressed ? C.surface : C.white, color: addressed ? C.gray : C.ink, boxSizing: "border-box" }} />
          </div>
          <div>
            <Label>Expires in (days)</Label>
            <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)}
              style={{ width: "100%", marginTop: 7, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, fontFamily: F.mono, fontSize: 14, outline: "none", background: C.white, boxSizing: "border-box" }} />
          </div>
          {/* Set here so they land already seated in a team. Leaving it blank is
              fine, a division-less person sees everyone regardless of the rule. */}
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            <Label>Division (optional)</Label>
            <input value={division} list="invite-divisions" onChange={(e) => setDivision(e.target.value)}
              placeholder={divisions[0] ? `e.g. ${divisions[0]}` : "e.g. Engineering"}
              style={{ width: "100%", marginTop: 7, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, fontFamily: F.sans, fontSize: 14, outline: "none", background: C.white, boxSizing: "border-box" }} />
            <datalist id="invite-divisions">{divisions.map((d) => <option key={d} value={d} />)}</datalist>
          </div>
        </div>

        <Btn style={{ marginTop: 14 }} disabled={busy}
          onClick={() => onMint({
            to: to.trim(), name: who.trim(), count: Number(count) || 1,
            expiresDays: Number(days) || 90, role, orgRole: isMentee ? "member" : orgRole,
            division: division.trim(),
          }).then((ok) => { if (ok) { setTo(""); setWho(""); } })}>
          {addressed ? <Send size={15} /> : <Plus size={15} />}
          {busy ? "Working…" : addressed
            ? `Invite ${to.trim()} as ${isMentee ? "mentee" : "mentor"}`
            : `Mint ${count} ${isMentee ? "mentee" : "mentor"} code${Number(count) === 1 ? "" : "s"}`}
        </Btn>
      </Card>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Label>Codes · {invites.length}</Label>
          <Label color={C.teal}>{invites.filter((i) => i.state === "open").length} OPEN</Label>
        </div>
        {invites.length === 0 && <div style={{ padding: 18, fontSize: 13, color: C.gray }}>No codes yet. Mint one above.</div>}
        {invites.map((iv, i) => (
          <div key={iv.code} style={{ padding: "12px 16px", borderBottom: i < invites.length - 1 ? `1px solid ${C.line}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: F.mono, fontSize: 11.5, fontWeight: 700, flex: 1, minWidth: 170 }}>{iv.code}</span>
              <Chip c={(iv.role || "mentor") === "mentee" ? C.purple : C.teal}
                bg={(iv.role || "mentor") === "mentee" ? C.purpleTint : C.tealTint}>
                {(iv.role || "mentor").toUpperCase()}
              </Chip>
              {iv.orgRole === "admin" && <Chip c={C.amber} bg={C.amberTint}>ORG ADMIN</Chip>}
              {iv.division && <Chip c={C.gray} bg={C.surface}>{iv.division.toUpperCase()}</Chip>}
              <Chip c={STATE_COLOR[iv.state]} bg={STATE_BG[iv.state]}>{iv.state.toUpperCase()}</Chip>
              <button onClick={() => copyText(linkFor(iv)).then(() => toast("Invite link copied"))} title="Copy invite link"
                style={{ border: "none", background: C.surface, cursor: "pointer", borderRadius: 9, padding: "7px 9px", display: "flex" }}><Copy size={13} color={C.gray} /></button>
              <button onClick={() => window.open(linkFor(iv), "_blank", "noopener")} title="Preview the invitation"
                style={{ border: "none", background: C.surface, cursor: "pointer", borderRadius: 9, padding: "7px 9px", display: "flex" }}><ExternalLink size={13} color={C.gray} /></button>
              {iv.state === "open" && (
                <button disabled={busy} onClick={() => onRevoke(iv.code)} title="Revoke"
                  style={{ border: "none", background: C.coralTint, cursor: busy ? "default" : "pointer", borderRadius: 9, padding: "7px 9px", display: "flex" }}><RotateCcw size={13} color={C.coral} /></button>
              )}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 6 }}>
              {iv.state === "claimed"
                ? `CLAIMED ${fmtDate(iv.redeemedAt).toUpperCase()}`
                : `MINTED ${fmtDate(iv.createdAt).toUpperCase()}${iv.expiresAt ? ` · EXPIRES ${fmtDate(iv.expiresAt).toUpperCase()}` : ""}`}
            </div>
            {iv.sentTo && (
              <div style={{ fontFamily: F.mono, fontSize: 9, color: iv.lastSendError ? C.coral : C.teal, marginTop: 4 }}>
                {iv.lastSendError
                  ? `SEND FAILED · ${iv.sentTo} · ${iv.lastSendError.toUpperCase()}`
                  : `SENT TO ${iv.sentTo} · ${fmtDate(iv.sentAt).toUpperCase()}`}
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ----- programme rules -----
   The two switches below predate orbits and are still enforced by /api/roster.
   The six that decide everything else are `orbit.policy`, edited through
   OrbitPolicyPanel above them, one panel, shared with the creator console, so
   the same rule cannot come to mean two things under one name.

   `crossDivision` appears in both. It is one rule with one value: api/orgs.js
   mirrors a write here into `policy.crossDiv`, and `resolvePolicy` treats the
   policy as the authority. */
function Programme({ org, members, canManage, onRules, busy, orbit, onOrbitSaved, toast }) {
  const rules = org.rules || {};
  const divisions = divisionsOf(members);
  const unseated = members.filter((m) => !m.division).length;
  const mentors = members.filter((m) => m.role === "mentor" || m.role === "admin");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Policy first: it is what a member actually experiences. */}
      {canManage && orbit && <OrbitPolicyPanel orbit={orbit} onSaved={onOrbitSaved} toast={toast} />}
      {canManage && orbit && <OrgSettingsPanel orbit={orbit} onSaved={onOrbitSaved} toast={toast} />}
      <Card>
        <Label color={C.purple}>Programme rules</Label>
        <div style={{ fontSize: 13, color: C.gray, marginTop: 6, lineHeight: 1.55 }}>
          These decide who your people see when they browse mentors inside {org.name}. They are
          applied by the server on every request, not by the app, so they hold no matter which
          screen someone is looking at.
        </div>

        <div style={{ marginTop: 8 }}>
          <Rule
            title="Mentors from any division"
            body={
              rules.crossDivision
                ? "On. Anyone at the company can be matched with anyone, the widest pool, and the usual choice for a first cohort."
                : `Off. People only see mentors sitting in their own division.${unseated ? ` ${unseated} of your ${members.length} still have no division, and they keep seeing everyone until you seat them.` : ""}`
            }
            on={!!rules.crossDivision}
            disabled={!canManage || busy}
            onChange={(v) => onRules({ crossDivision: v })}
          />
          <Rule
            title="Hide mentors who are full"
            body={
              rules.capacityGate
                ? "On. A mentor at their stated cohort size drops out of the deck until a seat frees up."
                : "Off. Full mentors still appear. Someone can write out an application and only then be told the cohort is full."
            }
            on={!!rules.capacityGate}
            disabled={!canManage || busy}
            onChange={(v) => onRules({ capacityGate: v })}
          />
        </div>

        {!canManage && (
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", letterSpacing: 1, marginTop: 14 }}>
            THE OWNER AND ORG ADMINS SET THESE.
          </div>
        )}
      </Card>

      <Card>
        <Label>Divisions · {divisions.length}</Label>
        <div style={{ fontSize: 13, color: C.gray, marginTop: 6, lineHeight: 1.55 }}>
          A division is a team inside {org.name}. It exists because somebody is sitting in it -
          set one on a person from the People tab, or on the invitation before you send it.
        </div>
        {divisions.length === 0 ? (
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", letterSpacing: 1, marginTop: 14 }}>
            NOBODY IS SEATED IN ONE YET.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14 }}>
            {divisions.map((d) => {
              const n = members.filter((m) => m.division === d).length;
              const withMentors = mentors.some((m) => m.division === d);
              return (
                <span key={d} style={{
                  display: "inline-flex", alignItems: "center", gap: 7, background: C.surface,
                  border: `1px solid ${C.line}`, borderRadius: 10, padding: "7px 11px", fontSize: 12.5, fontWeight: 600,
                }}>
                  {d}
                  <span style={{ fontFamily: F.mono, fontSize: 9, color: withMentors ? "#A5A39D" : C.coral }}>
                    {n} {withMentors ? "" : "· NO MENTOR"}
                  </span>
                </span>
              );
            })}
          </div>
        )}
        {/* The failure mode of the division rule, stated before it bites: a
            division with no mentor in it shows its people an empty deck. */}
        {!rules.crossDivision && divisions.some((d) => !mentors.some((m) => m.division === d)) && (
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: C.coralTint, borderRadius: 12, padding: 12, marginTop: 14 }}>
            <Shield size={15} color={C.coral} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              A division with no mentor in it shows its people an empty deck while “mentors from any
              division” is off. Seat a mentor there, or turn the rule back on.
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ----- orbit ----- */
function Orbit({ org, canManage, onOrbit, busy, toast, meId }) {
  const [state, setState] = useState({ loading: true, posts: [], error: null, members: 0 });
  const [reacted, setReacted] = useState({});
  const [opened, setOpened] = useState({});

  useEffect(() => {
    let cancelled = false;
    if (!org.orbitActive) { setState({ loading: false, posts: [], error: null, members: 0 }); return; }
    setState((s) => ({ ...s, loading: true }));
    fetchOrgOrbit()
      .then((res) => {
        if (cancelled) return;
        setState({ loading: false, posts: res.posts || [], error: null, members: res.orbit?.members || 0 });
        setReacted(Object.fromEntries((res.viewerState?.reacted || []).map((id) => [id, true])));
        setOpened(Object.fromEntries((res.viewerState?.watched || []).map((id) => [id, true])));
      })
      .catch((e) => { if (!cancelled) setState({ loading: false, posts: [], members: 0, error: messageFor(e, "Couldn’t load the Orbit.") }); });
    return () => { cancelled = true; };
  }, [org.orbitActive, org.id]);

  const onReact = async (id) => {
    if (reacted[id]) return { already: true };
    setReacted((r) => ({ ...r, [id]: true }));
    try {
      const res = await postAction(id, "react");
      if (res?.self) {
        setReacted((r) => { const n = { ...r }; delete n[id]; return n; });
        return res;
      }
      setState((s) => ({
        ...s,
        posts: (s.posts || []).map((p) => (
          p.id === id ? { ...p, reactions: (p.reactions ?? 0) + 1 } : p
        )),
      }));
      toast?.("Liked");
      return res;
    } catch (e) {
      setReacted((r) => { const n = { ...r }; delete n[id]; return n; });
      throw e;
    }
  };

  /* PostCard calls `onOpen` unguarded for a colleague's video or resource, so a
     feed rendered without one throws the moment anybody taps Watch. */
  const onOpen = async (post) => {
    if (opened[post.id]) return;
    setOpened((o) => ({ ...o, [post.id]: true }));
    try {
      const { xp } = await postAction(post.id, "view");
      if (xp) toast?.(`+${xp} XP · reviewed`);
    } catch (e) {
      setOpened((o) => { const n = { ...o }; delete n[post.id]; return n; });
      toast?.(messageFor(e, "Couldn’t open that."));
    }
  };

  if (!org.orbitActive) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card style={{ textAlign: "center", padding: 26 }}>
          <div style={{ width: 52, height: 52, background: C.purpleTint, borderRadius: 15, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Radio size={24} color={C.purple} />
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 19, fontWeight: 700, marginTop: 14 }}>The {org.name} Orbit is closed.</div>
          <div style={{ fontSize: 13.5, color: C.gray, marginTop: 8, lineHeight: 1.55, maxWidth: 420, margin: "8px auto 0" }}>
            Open it and everyone in the org reads one feed: every post your people have marked
            profile-visible, newest first. Posts written for a mentor’s own cohort stay private to
            that cohort, the Orbit never widens who can see those.
          </div>
          {canManage
            ? <Btn style={{ marginTop: 18, maxWidth: 260, marginLeft: "auto", marginRight: "auto" }} disabled={busy} onClick={() => onOrbit(true)}>
                <Radio size={15} /> {busy ? "Opening…" : "Activate the Orbit"}
              </Btn>
            : <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 16, letterSpacing: 1 }}>THE OWNER OPENS IT.</div>}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, background: C.tealTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Radio size={17} color={C.teal} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14.5 }}>Orbit is open</div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 3 }}>
            {state.members} PEOPLE · PROFILE POSTS ONLY
          </div>
        </div>
        {canManage && (
          <Btn kind="ghost" small disabled={busy} onClick={() => onOrbit(false)}>Close</Btn>
        )}
      </Card>

      {state.loading && <Card style={{ padding: 22, textAlign: "center", fontFamily: F.mono, fontSize: 11, color: C.gray, letterSpacing: 1 }}>LOADING THE ORBIT…</Card>}
      <FormError>{state.error}</FormError>

      {!state.loading && !state.error && state.posts.length === 0 && (
        <Card style={{ textAlign: "center", padding: 26 }}>
          <div style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.55 }}>
            Nothing here yet. Posts appear once someone in {org.name} publishes one and marks it
            visible on their profile.
          </div>
        </Card>
      )}

      {state.posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          author={p.authorName}
          authorId={p.authorId}
          mine={meId && String(p.authorId) === String(meId)}
          reacted={!!reacted[p.id]}
          onReact={onReact}
          done={!!opened[p.id]}
          onOpen={onOpen}
          toast={toast}
        />
      ))}
    </div>
  );
}

/* ----- settings ----- */
function OrgSettings({ org, canManage, isOwner, onSave, onLeave, busy }) {
  const [name, setName] = useState(org.name);
  const [size, setSize] = useState(org.size || "");
  const [website, setWebsite] = useState(org.website || "");
  const [mission, setMission] = useState(org.mission || "");
  const dirty = name !== org.name || size !== (org.size || "") || website !== (org.website || "") || mission !== (org.mission || "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card>
        <Label color={C.purple}>Organisation</Label>
        {canManage ? (
          <>
            <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Field label="Roughly how many people" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 40 engineers" />
            <Field label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="yourcompany.com" />
            <div style={{ marginTop: 18 }}>
              <Label>What you’re building</Label>
              <textarea value={mission} onChange={(e) => setMission(e.target.value)} rows={3} maxLength={400}
                placeholder="One or two lines your people will see."
                style={{ width: "100%", marginTop: 8, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, fontFamily: F.sans, fontSize: 15, color: C.ink, outline: "none", background: C.white, boxSizing: "border-box", resize: "vertical" }} />
            </div>
            <Btn style={{ marginTop: 16 }} disabled={busy || !dirty} onClick={() => onSave({ name, size, website, mission })}>
              <Check size={15} /> {busy ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </Btn>
          </>
        ) : (
          <div style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.6, marginTop: 8 }}>
            {org.mission || `You're a member of ${org.name}.`}
          </div>
        )}
      </Card>

      <Card>
        <Label>Handle</Label>
        <div style={{ fontFamily: F.mono, fontSize: 12, marginTop: 8 }}>{org.slug}</div>
        <div style={{ fontSize: 12.5, color: C.gray, marginTop: 8, lineHeight: 1.55 }}>
          Set when the org was created and left alone on rename, it’s the handle your invitations
          were minted against.
        </div>
      </Card>

      {isOwner ? (
        <Card style={{ background: C.amberTint, border: "none" }}>
          <Label color={C.amber}>You own this org</Label>
          <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.55, marginTop: 8 }}>
            The owner can’t leave or be removed, that would leave {org.name} with nobody able to
            seat anyone. Promote an org admin if you need cover while you’re away.
          </div>
        </Card>
      ) : (
        <Card>
          <Label color={C.coral}>Leave {org.name}</Label>
          <div style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.55, marginTop: 8 }}>
            Your Ryzn account, your mentees and your Impact Score are yours and stay exactly as they are.
            You’d only lose the org roster and its Orbit.
          </div>
          <Btn kind="ghost" style={{ marginTop: 14, borderColor: C.coral, color: C.coral }} disabled={busy}
            onClick={() => { if (window.confirm(`Leave ${org.name}?`)) onLeave(); }}>
            Leave the organisation
          </Btn>
        </Card>
      )}
    </div>
  );
}

/* ----- root ----- */
export default function OrgConsole({ ctx, me, onCtx, onExit, toast, orbit, onOrbitsChanged }) {
  const isDesktop = useIsDesktop();
  const [nav, setNav] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const { org, members, invites } = ctx;
  const canManage = !!org.canManage;
  const isOwner = org.orgRole === "owner";
  const meId = me?.user?.id;

  /* Every write answers with the whole context, so there is one setState and no
     second GET, and no window where the roster on screen disagrees with the
     server's. Returns true so callers can clear their own form on success. */
  const run = async (fn, okMsg) => {
    setBusy(true); setErr(null);
    try {
      const fresh = await fn();
      onCtx(fresh);
      if (okMsg) toast(okMsg);
      return fresh;
    } catch (e) {
      setErr(messageFor(e, "That didn’t go through."));
      return null;
    } finally { setBusy(false); }
  };

  const NAV = [
    ["overview", "Overview", Building2],
    ["people", `People · ${members.length}`, Users],
    ...(canManage ? [["invites", "Invites", Send]] : []),
    ["programme", "Programme", SlidersHorizontal],
    ["orbit", "Orbit", Radio],
    ["settings", "Settings", Settings],
  ];

  const mint = async ({ to, name, count, expiresDays, role, orgRole, division }) => {
    const res = await run(
      () => orgMintInvites({
        to: to || undefined, name: name || undefined, count, expiresDays,
        role, orgRole, division: division || undefined,
      }),
      null
    );
    if (!res) return false;
    if (to) {
      // A failed send doesn't undo the mint, the code is live either way, so
      // say what actually happened rather than a blanket success.
      if (res.sent) toast(`Seat sent to ${to}`);
      else { copyText(res.url || res.created?.[0] || ""); toast(res.sendError || "Minted but not sent · link copied"); }
    } else if (res.url) {
      copyText(res.url);
      toast("Invite link copied");
    } else {
      copyText((res.created || []).join("\n"));
      toast(`${res.created?.length || 0} code${res.created?.length === 1 ? "" : "s"} minted · copied`);
    }
    return true;
  };

  const body = {
    overview: <Overview org={org} members={members} invites={invites} canManage={canManage}
      onNav={setNav} onOrbit={(v) => run(() => setOrgOrbit(v), v ? "Orbit is open" : "Orbit closed")} />,
    people: <People org={org} members={members} canManage={canManage} isOwner={isOwner} meId={meId} busy={busy}
      onRole={(userId, orgRole) => run(() => orgSetMemberRole(userId, orgRole), orgRole === "admin" ? "Promoted to org admin" : "Now a member")}
      onDivision={(userId, division) => run(() => orgSetDivision(userId, division), division ? `Seated in ${division}` : "Division cleared")}
      onRemove={(m) => { if (window.confirm(`Remove ${m.name} from ${org.name}?`)) run(() => orgRemoveMember(m.id), `${firstNameOf(m.name)} removed`); }} />,
    invites: <Invites org={org} invites={invites} busy={busy} toast={toast} onMint={mint}
      divisions={divisionsOf(members)}
      inviterName={me?.user?.name || org.name}
      onRevoke={(code) => run(() => orgRevokeInvite(code), `${code} revoked`)} />,
    programme: <Programme org={org} members={members} canManage={canManage} busy={busy}
      orbit={orbit} onOrbitSaved={onOrbitsChanged} toast={toast}
      onRules={(patch) => run(() => orgSetRules(patch), "Rule saved")} />,
    orbit: <Orbit org={org} canManage={canManage} busy={busy} toast={toast} meId={me?.user?.id}
      onOrbit={(v) => run(() => setOrgOrbit(v), v ? "Orbit is open" : "Orbit closed")} />,
    settings: <OrgSettings org={org} canManage={canManage} isOwner={isOwner} busy={busy}
      onSave={(patch) => run(() => updateOrg(patch), "Saved")}
      onLeave={() => run(() => orgLeave(), `You left ${org.name}`)} />,
  }[nav];

  return (
    <div className="full-h app-scroll" style={{ fontFamily: F.sans, color: C.ink, background: C.surface, overflowY: "auto", paddingBottom: "var(--safe-bottom)" }}>
      {/* The console replaces the app shell, so its header is the thing sitting
          at viewport y=0 and it pads the status bar inset itself. The white
          runs into the inset, the header owns that strip, it is never a bare
          gap above it. */}
      <div style={{
        background: C.white, borderBottom: `1px solid ${C.line}`,
        padding: isDesktop ? "16px 26px" : "14px 16px",
        paddingTop: isDesktop ? 16 : "calc(14px + var(--safe-top))",
        paddingLeft: `max(${isDesktop ? 26 : 16}px, var(--safe-left))`,
        paddingRight: `max(${isDesktop ? 26 : 16}px, var(--safe-right))`,
      }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <button onClick={onExit}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 0 10px", display: "flex", alignItems: "center", gap: 6, color: C.gray, fontFamily: F.sans, fontWeight: 600, fontSize: 13 }}>
            <ChevronLeft size={16} /> Back to Ryzn
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, background: C.purple, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Building2 size={21} color={C.white} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.sans, fontSize: 21, fontWeight: 700, letterSpacing: -0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.name}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", letterSpacing: 1, marginTop: 2 }}>
                RYZN FOR TEAMS · {(ROLE_CHIP[org.orgRole] || ROLE_CHIP.member).label}
              </div>
            </div>
            {org.website && (
              <button onClick={() => window.open(org.website, "_blank", "noopener")} title={org.website}
                style={{ border: `1px solid ${C.line}`, background: C.white, cursor: "pointer", borderRadius: 10, padding: 9, display: "flex" }}>
                <Globe size={15} color={C.gray} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 4, marginTop: 14, overflowX: "auto" }}>
            {NAV.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setNav(id)} style={{
                display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer", borderRadius: 10,
                padding: "8px 11px", whiteSpace: "nowrap", fontFamily: F.sans, fontWeight: 600, fontSize: 12.5,
                background: nav === id ? C.purpleTint : "transparent", color: nav === id ? C.purple : C.gray,
              }}><Icon size={14} />{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: isDesktop ? "20px 26px 60px" : "16px 16px 60px" }}>
        <FormError>{err}</FormError>
        <div style={{ marginTop: err ? 12 : 0 }}>{body}</div>
      </div>
    </div>
  );
}
