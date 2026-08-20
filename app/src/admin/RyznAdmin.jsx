import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Users, Send, Building2, Settings, Shield, Search, Copy, ExternalLink,
  Plus, LogOut, RotateCcw, Eye, EyeOff, Zap, ChevronLeft, Trash2, Newspaper, AlertTriangle,
} from "lucide-react";
import { C, F } from "../theme.js";
import { Card, Label, Btn, Monogram, Field, FormError, Bar, Glyph } from "../ui.jsx";
import { useIsDesktop } from "../useIsDesktop.js";
import {
  signIn, signOut, messageFor, redeemInvite, fetchMe,
  adminStats, adminUsers, adminInvites, adminMintInvites, adminRevokeInvite, adminResendInvite,
  adminDeleteInvite, adminDeleteUser, adminPosts, deletePost,
} from "../lib/auth-client.js";
import { buildInviteUrl, copyText } from "../lib/invite-url.js";
import { GoogleMark } from "../auth.jsx";

/* ----------------- RYZN ADMIN -----------------
   The founders' console: platform analytics, the mentor invite Roster, and the
   people table. It's a page in the same app, routed at /app/#/admin, no second
   site, no subdomain, so it shares the origin and the session with everything else.

   Reads /api/admin/* behind an admin-only gate (lib/admin.js). The console had
   a second mode that rendered seeded sample numbers, invented users, invented
   invite codes, invented signup counts, for anyone who opened the URL without
   a database. It's gone: an admin console that can show fictional platform
   metrics is one screenshot away from being quoted as real.
*/


/* ----- small bits ----- */
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "-");
const fmtAgo = (d) => {
  if (!d) return "-";
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

const STATE_COLOR = { open: C.purple, claimed: C.teal, expired: C.gray, revoked: C.coral };

/* Full reload onto the consumer URL so the purple RYZN splash remounts as a
   buffer, then /api/me re-hydrates the same session into the mentor (or mentee)
   app, no role picker, no sign-in again. Clearing the hash alone remounted
   React but still left founders mapped wrong; the hard navigation makes the
   handoff feel intentional. */
const goToApp = () => {
  const { origin, pathname, search } = window.location;
  window.location.assign(`${origin}${pathname}${search || ""}`);
};

const Tile = ({ label, value, color = C.ink, sub }) => (
  <Card style={{ padding: 14 }}>
    <Label>{label}</Label>
    <div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 700, color, marginTop: 6, letterSpacing: -0.6 }}>{value}</div>
    {sub && <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 4 }}>{sub}</div>}
  </Card>
);

const Chip = ({ children, c = C.purple, bg = C.purpleTint }) => (
  <span style={{ fontFamily: F.mono, fontSize: 8.5, fontWeight: 700, letterSpacing: 0.6, color: c, background: bg, padding: "4px 8px", whiteSpace: "nowrap" }}>{children}</span>
);

/* ----- sign-in gate ----- */
/** An admin invite code arriving as /app/#/admin?code=…, prefilled so the
    recipient only has to sign in. */
const codeFromHash = () => {
  const q = (typeof window !== "undefined" ? window.location.hash : "").split("?")[1] || "";
  return new URLSearchParams(q).get("code") || "";
};

function AdminGate({ onIn, error }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [code, setCode] = useState(codeFromHash);
  const [showCode, setShowCode] = useState(() => Boolean(codeFromHash()));
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null); setBusy(true);
    try {
      const { error: e } = await signIn.email({ email: email.trim(), password: pw });
      if (e) throw e;
      // Redeeming is a separate authenticated call: sign-in proves who you are,
      // the code is what promotes you. Server-side, atomic, single-use.
      if (code.trim()) await redeemInvite(code.trim());
      onIn();
    } catch (e) {
      setErr(messageFor(e, "Couldn’t sign you in."));
    } finally { setBusy(false); }
  };

  return (
    /* `margin: auto` on the card rather than centring on the container: a
       centred flex item taller than the box overflows past the top edge and
       cannot be scrolled back to, which is what happens once the keyboard is
       up on a small phone. */
    <div className="full-h app-scroll" style={{
      fontFamily: F.sans, color: C.ink, background: C.ink, overflowY: "auto",
      display: "flex",
      padding: 24,
      paddingTop: "calc(24px + var(--safe-top))",
      paddingBottom: "calc(24px + var(--safe-bottom))",
      paddingLeft: "max(24px, var(--safe-left))",
      paddingRight: "max(24px, var(--safe-right))",
    }}>
      <div style={{ width: "min(94vw, 400px)", margin: "auto" }}>
        <button onClick={goToApp}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 0", marginBottom: 12, display: "flex", alignItems: "center", gap: 6, color: "#8B8985", fontFamily: F.sans, fontWeight: 600, fontSize: 13 }}>
          <ChevronLeft size={16} /> Back to Ryzn
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Glyph color={C.purple} size={30} />
          <div>
            <div style={{ color: C.white, fontSize: 24, fontWeight: 700, letterSpacing: -1 }}>RYZN</div>
            <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 1.6, color: "#8B8985" }}>FOUNDER CONSOLE</div>
          </div>
        </div>
        <div style={{ background: C.surface, borderRadius: 20, padding: 22, marginTop: 20 }}>
          <div style={{ fontFamily: F.sans, fontSize: 19, fontWeight: 700, letterSpacing: -0.4 }}>Sign in</div>
          <div style={{ fontSize: 13, color: C.gray, marginTop: 4, lineHeight: 1.5 }}>
            Founding team only. Your account must be on the admin list.
          </div>
          <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          <Field label="Password" type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)}
            autoComplete="current-password" onKeyDown={e => e.key === "Enter" && submit()}
            right={<button onClick={() => setShow(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>{show ? <EyeOff size={16} color={C.gray} /> : <Eye size={16} color={C.gray} />}</button>} />

          {showCode ? (
            <div style={{ marginTop: 14 }}>
              <Label color={C.amber}>Admin invite code</Label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.amberTint, border: `1px solid ${C.amber}`, borderRadius: 12, marginTop: 7, padding: 12 }}>
                <Shield size={15} color={C.amber} />
                <input value={code} onChange={e => setCode(e.target.value)} placeholder="RYZ-INV-…" autoComplete="off" spellCheck={false}
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: F.mono, fontSize: 13, color: C.ink, minWidth: 0, textTransform: "uppercase" }} />
              </div>
              <div style={{ fontSize: 11.5, color: C.gray, marginTop: 7, lineHeight: 1.5 }}>
                Sign in with your normal Ryzn account, the code promotes it. One use only.
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCode(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: "12px 0 0", fontFamily: F.sans, fontWeight: 600, fontSize: 12.5, color: C.purple }}>
              Have an admin invite code?
            </button>
          )}

          <FormError>{err || error}</FormError>
          <Btn style={{ marginTop: 18 }} disabled={busy} onClick={submit}><Shield size={15} /> {busy ? "Checking…" : "Enter the console"}</Btn>
          {/* Email + password was the only way in, which locks out any founder
              who signed up with Google, most of them. Comes back to /app/#/admin
              so the redirect lands on the console, not the consumer app. */}
          <Btn kind="ghost" style={{ marginTop: 10 }} disabled={busy}
            onClick={() => signIn.social({ provider: "google", callbackURL: "/app/#/admin" })}>
            <GoogleMark /> Continue with Google
          </Btn>
          {code.trim() && (
            <div style={{ fontSize: 11.5, color: C.gray, marginTop: 8, lineHeight: 1.5, textAlign: "center" }}>
              Google sign-in won’t redeem the code above, sign in, then paste it here.
            </div>
          )}
          {/* Without this the console is a dead end for anyone who doesn't
              already have a Ryzn account, there's no sign-up on this screen.
              The same link is the way out for anyone who landed here by mistake
              and just wants the normal sign-in. */}
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 18, paddingTop: 14, textAlign: "center" }}>
            <button onClick={goToApp} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: F.sans, fontWeight: 600, fontSize: 12.5, color: C.purple }}>
              Not a founder? Use the regular Ryzn sign-in
            </button>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 8 }}>
              No Ryzn account yet?{" "}
              <span onClick={goToApp} style={{ color: C.purple, fontWeight: 600, cursor: "pointer" }}>Create one</span>
              , then come back here.
            </div>
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", textAlign: "center", marginTop: 12, letterSpacing: 0.6 }}>
            RYZN.ONE/APP/#/ADMIN
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----- overview ----- */
function Overview({ stats }) {
  const peak = Math.max(1, ...stats.daily.map(d => d.n));
  const funnel = [
    ["Accounts created", stats.users.total, C.purple],
    ["Finished onboarding", stats.activation.onboarded, C.teal],
    ["Mentors on the Roster", stats.users.mentors, C.amber],
    ["Mentors with a greeting", stats.activation.greetings, C.coral],
  ];
  const inv = stats.invites;
  const invTotal = Math.max(1, inv.open + inv.claimed + inv.expired + inv.revoked);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <Tile label="Total accounts" value={stats.users.total} sub={`+${stats.users.last7} IN 7 DAYS`} />
        <Tile label="Mentees" value={stats.users.mentees} color={C.purple} />
        <Tile label="Mentors" value={stats.users.mentors} color={C.teal} sub={`${inv.open} CODES LEFT`} />
        <Tile label="Joined this month" value={stats.users.last30} color={C.amber} />
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Label>Signups · last 14 days</Label>
          <Label color={C.purple}>PEAK {peak}/DAY</Label>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 110, marginTop: 14 }}>
          {stats.daily.map(d => (
            <div key={d.day} title={`${d.day}: ${d.n}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 5, height: "100%" }}>
              <div style={{ width: "100%", height: `${(d.n / peak) * 100}%`, minHeight: d.n ? 3 : 1, background: d.n ? C.purple : "#E6E5E1", transition: "height .5s ease" }} />
              <span style={{ fontFamily: F.mono, fontSize: 7.5, color: "#A5A39D" }}>{d.day.slice(8)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <Card>
          <Label>Activation funnel</Label>
          {funnel.map(([l, n, c]) => (
            <div key={l} style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13.5 }}>{l}</span>
                <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: c }}>{n}</span>
              </div>
              <div style={{ marginTop: 6 }}><Bar pct={n / Math.max(1, stats.users.total)} color={c} /></div>
            </div>
          ))}
        </Card>

        <Card>
          <Label>Invite Roster</Label>
          <div style={{ display: "flex", height: 10, marginTop: 12, overflow: "hidden" }}>
            {[["claimed", inv.claimed], ["open", inv.open], ["expired", inv.expired], ["revoked", inv.revoked]].map(([k, n]) => (
              n ? <div key={k} style={{ width: `${(n / invTotal) * 100}%`, background: STATE_COLOR[k] }} /> : null
            ))}
          </div>
          {[["Claimed", inv.claimed, C.teal], ["Open", inv.open, C.purple], ["Expired", inv.expired, C.gray], ["Revoked", inv.revoked, C.coral]].map(([l, n, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
              <span style={{ flex: 1, fontSize: 13.5 }}>{l}</span>
              <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: c }}>{n}</span>
            </div>
          ))}
        </Card>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}` }}><Label>Newest accounts</Label></div>
        {stats.recent.map((u, i) => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < stats.recent.length - 1 ? `1px solid ${C.line}` : "none" }}>
            <Monogram name={u.name === "-" ? u.email : u.name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
            </div>
            <Chip c={u.role === "mentor" ? C.teal : C.purple} bg={u.role === "mentor" ? C.tealTint : C.purpleTint}>{u.role.toUpperCase()}</Chip>
            <span style={{ fontFamily: F.mono, fontSize: 9.5, color: C.gray, width: 62, textAlign: "right" }}>{fmtAgo(u.createdAt)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ----- invites ----- */
function Invites({ rows, onMint, onRevoke, onResend, onDelete, toast, founderName }) {
  const [role, setRole] = useState("mentor");
  const [count, setCount] = useState(5);
  const [days, setDays] = useState(90);
  const [note, setNote] = useState("");
  const [to, setTo] = useState("");
  const [who, setWho] = useState("");
  const [busy, setBusy] = useState(false);
  const isAdminCode = role === "admin";
  const isMenteeCode = role === "mentee";
  /* An address turns minting into addressing: one code, mailed to one person.
     Without it this stays a batch minter and the founder pastes links by hand. */
  const addressed = to.trim().length > 0;

  const mint = async () => {
    setBusy(true);
    try {
      await onMint({
        role, count: Number(count), expiresDays: Number(days), note,
        to: to.trim() || undefined, name: who.trim() || undefined,
      });
      if (addressed) { setTo(""); setWho(""); }
    } finally { setBusy(false); }
  };

  const previewName = (() => {
    const explicit = who.trim();
    if (explicit) return explicit;
    const local = to.trim().split("@")[0]?.split(/[._-]/)[0];
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : "Alex";
  })();

  const openPreview = () => {
    const url = buildInviteUrl({
      code: "RYZ-INV-PREVIEW",
      name: previewName,
      email: to.trim(),
      role: isMenteeCode ? "Mentee" : "Mentor",
      adminName: founderName,
      preview: true,
    });
    window.open(url, "_blank", "noopener");
  };

  // Mentor / mentee codes open the branded claim page. Admin codes go to the
  // console's own sign-in, where the code field promotes an existing account.
  const linkFor = (iv) => iv.role === "admin"
    ? `${window.location.origin}/app/#/admin?code=${encodeURIComponent(iv.code)}`
    // Prefer the stored recipient name (set when the invite was mailed). Fall
    // back to guessing from the address so older rows still personalize.
    : buildInviteUrl({
      code: iv.code,
      email: iv.sentTo || "",
      name: iv.sentName || "",
      role: iv.role === "mentee" ? "Mentee" : "Mentor",
      adminName: founderName,
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Label color={isAdminCode ? C.amber : isMenteeCode ? C.teal : C.purple}>Mint invites</Label>
          <Label>SINGLE-USE · ONE PERSON PER CODE</Label>
        </div>
        <div style={{ display: "flex", background: "#EFEEEA", borderRadius: 12, padding: 4, marginTop: 10 }}>
          {[["mentor", "Mentor"], ["mentee", "Mentee"], ["admin", "Admin"]].map(([id, l]) => (
            <button key={id} onClick={() => { setRole(id); setCount(id === "admin" ? 1 : 5); }} style={{ flex: 1, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontFamily: F.sans, fontWeight: 600, fontSize: 13, background: role === id ? C.white : "transparent", color: role === id ? C.ink : C.gray }}>{l}</button>
          ))}
        </div>
        {isAdminCode && (
          <div style={{ background: C.amberTint, borderRadius: 12, padding: "11px 12px", marginTop: 10, display: "flex", gap: 9 }}>
            <Shield size={15} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
              An admin code hands over this whole console. Send it to one person, directly, never in a shared channel.
              They sign in at <span style={{ fontFamily: F.mono, fontSize: 11.5 }}>/app/#/admin</span> with their own Ryzn account and paste it.
            </div>
          </div>
        )}
        {isMenteeCode && (
          <div style={{ background: C.tealTint, borderRadius: 12, padding: "11px 12px", marginTop: 10, fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
            A mentee code grants the mentee role on claim, same redeem path as org mentee seats, without seating them in an organisation.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 12 }}>
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            <Label color={addressed ? C.purple : C.gray}>Send to (optional)</Label>
            <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="kaleem@example.com" autoComplete="off"
              style={{ width: "100%", marginTop: 7, border: `1px solid ${addressed ? C.purple : C.line}`, borderRadius: 12, padding: "12px", fontFamily: F.sans, fontSize: 14, outline: "none", background: C.white, boxSizing: "border-box" }} />
          </div>
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            <Label>Their first name</Label>
            <input value={who} onChange={e => setWho(e.target.value)} placeholder="Guessed from the address if blank"
              style={{ width: "100%", marginTop: 7, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px", fontFamily: F.sans, fontSize: 14, outline: "none", background: C.white, boxSizing: "border-box" }} />
          </div>
          <div>
            <Label>How many</Label>
            <input type="number" min={1} max={isAdminCode ? 5 : 50} value={addressed ? 1 : count} disabled={addressed} onChange={e => setCount(e.target.value)}
              style={{ width: "100%", marginTop: 7, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px", fontFamily: F.mono, fontSize: 14, outline: "none", background: addressed ? C.surface : C.white, color: addressed ? C.gray : C.ink, boxSizing: "border-box" }} />
          </div>
          <div>
            <Label>Expires in (days)</Label>
            <input type="number" min={1} max={365} value={days} onChange={e => setDays(e.target.value)}
              style={{ width: "100%", marginTop: 7, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px", fontFamily: F.mono, fontSize: 14, outline: "none", background: C.white, boxSizing: "border-box" }} />
          </div>
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            <Label>Note</Label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder={isAdminCode ? "Founder access" : isMenteeCode ? "Mentee seat" : "Founding cohort"}
              style={{ width: "100%", marginTop: 7, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px", fontFamily: F.sans, fontSize: 14, outline: "none", background: C.white, boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <Btn style={{ flex: 1, minWidth: 180, ...(isAdminCode ? { background: C.amber } : null) }} disabled={busy} onClick={mint}>
            {addressed ? <Send size={15} /> : <Plus size={15} />}
            {busy
              ? (addressed ? "Sending…" : "Minting…")
              : addressed
                ? `Mint & send to ${to.trim()}`
                : `Mint ${count} ${role} code${Number(count) === 1 ? "" : "s"}`}
          </Btn>
          {!isAdminCode && (
            <Btn kind="ghost" style={{ flex: "0 0 auto" }} onClick={openPreview}>
              <ExternalLink size={15} /> Preview as {previewName}
            </Btn>
          )}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 10, lineHeight: 1.7 }}>
          {isAdminCode
            ? "CLAIMING AN ADMIN CODE IS THE ONLY WAY TO JOIN THIS CONSOLE WITHOUT TOUCHING SERVER CONFIG."
            : "EACH CODE OPENS /MENTOR-INVITE.HTML PERSONALIZED WITH THEIR NAME. PREVIEW USES THE FIELDS ABOVE, IT DOESN'T MINT A CODE."}
        </div>
      </Card>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Label>Codes · {rows.length}</Label>
          <Label color={C.teal}>{rows.filter(r => r.state === "open").length} OPEN</Label>
        </div>
        {rows.length === 0 && <div style={{ padding: 18, fontSize: 13, color: C.gray }}>No codes yet. Mint a batch above.</div>}
        {rows.map((iv, i) => (
          <div key={iv.code} style={{ padding: "12px 16px", borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: F.mono, fontSize: 11.5, fontWeight: 700, flex: 1, minWidth: 170 }}>{iv.code}</span>
              {iv.role === "admin" && <Chip c={C.amber} bg={C.amberTint}>ADMIN</Chip>}
              {iv.role === "mentee" && <Chip c={C.teal} bg={C.tealTint}>MENTEE</Chip>}
              {iv.role === "mentor" && <Chip c={C.purple} bg={C.purpleTint}>MENTOR</Chip>}
              <Chip c={STATE_COLOR[iv.state]} bg={iv.state === "claimed" ? C.tealTint : iv.state === "revoked" ? C.coralTint : iv.state === "expired" ? C.surface : C.purpleTint}>{iv.state.toUpperCase()}</Chip>
              <button onClick={() => copyText(linkFor(iv)).then(() => toast(iv.role === "admin" ? "Admin link copied, send it directly" : "Invite link copied"))} title="Copy invite link"
                style={{ border: "none", background: C.surface, cursor: "pointer", borderRadius: 9, padding: "7px 9px", display: "flex" }}><Copy size={13} color={C.gray} /></button>
              <button onClick={() => window.open(linkFor(iv), "_blank", "noopener")} title={iv.role === "admin" ? "Open admin claim" : `Preview invite${iv.sentName ? ` for ${iv.sentName}` : ""}`}
                style={{ border: "none", background: C.surface, cursor: "pointer", borderRadius: 9, padding: "7px 9px", display: "flex" }}><ExternalLink size={13} color={C.gray} /></button>
              {iv.state === "open" && iv.role !== "admin" && (
                <button onClick={() => {
                  // No address on file means we have nowhere to send it, ask
                  // rather than firing a request that can only 400.
                  const dest = iv.sentTo || window.prompt(`Send ${iv.code} to which email?`, "");
                  if (dest) onResend(iv.code, dest.trim(), iv.sentName || undefined);
                }} title={iv.sentTo ? `Resend to ${iv.sentTo}` : "Send to someone"}
                  style={{ border: "none", background: C.purpleTint, cursor: "pointer", borderRadius: 9, padding: "7px 9px", display: "flex" }}><Send size={13} color={C.purple} /></button>
              )}
              {iv.state === "open" && (
                <button onClick={() => onRevoke(iv.code)} title="Revoke, kills the code, keeps the record"
                  style={{ border: "none", background: C.coralTint, cursor: "pointer", borderRadius: 9, padding: "7px 9px", display: "flex" }}><RotateCcw size={13} color={C.coral} /></button>
              )}
              <button onClick={() => onDelete(iv)} title="Delete the row entirely"
                style={{ border: "none", background: C.surface, cursor: "pointer", borderRadius: 9, padding: "7px 9px", display: "flex" }}><Trash2 size={13} color={C.gray} /></button>
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 6 }}>
              {iv.claimedBy
                ? `CLAIMED BY ${iv.claimedBy.name.toUpperCase()} · ${iv.claimedBy.email} · ${fmtDate(iv.redeemedAt)}`
                : `${(iv.note || "-").toUpperCase()} · MINTED ${fmtDate(iv.createdAt)}${iv.expiresAt ? ` · EXPIRES ${fmtDate(iv.expiresAt)}` : ""}`}
            </div>
            {iv.sentTo && (
              <div style={{ fontFamily: F.mono, fontSize: 9, color: iv.lastSendError ? C.coral : C.teal, marginTop: 4 }}>
                {iv.lastSendError
                  ? `SEND FAILED · ${iv.sentName ? iv.sentName.toUpperCase() + " · " : ""}${iv.sentTo} · ${iv.lastSendError.toUpperCase()}`
                  : `SENT TO ${iv.sentName ? iv.sentName.toUpperCase() + " · " : ""}${iv.sentTo} · ${fmtDate(iv.sentAt)}${iv.sentCount > 1 ? ` · ${iv.sentCount}×` : ""}`}
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ----- people ----- */
function People({ rows, q, setQ, role, setRole, onDelete, meId }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search size={14} color={C.gray} style={{ position: "absolute", left: 13, top: 14 }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or email"
            style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 12px 12px 34px", fontFamily: F.sans, fontSize: 14, outline: "none", background: C.white, boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", background: "#EFEEEA", borderRadius: 12, padding: 4 }}>
          {[["all", "All"], ["mentee", "Mentees"], ["mentor", "Mentors"], ["admin", "Admins"]].map(([id, l]) => (
            <button key={id} onClick={() => setRole(id)} style={{ border: "none", cursor: "pointer", borderRadius: 9, padding: "8px 12px", fontFamily: F.sans, fontWeight: 600, fontSize: 12.5, background: role === id ? C.white : "transparent", color: role === id ? C.ink : C.gray }}>{l}</button>
          ))}
        </div>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {rows.length === 0 && <div style={{ padding: 18, fontSize: 13, color: C.gray }}>Nobody matches that.</div>}
        {rows.map((u, i) => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none" }}>
            <Monogram name={u.name === "-" ? u.email : u.name} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {u.email} · JOINED {fmtDate(u.createdAt)}{u.emailVerified ? "" : " · UNVERIFIED"}
              </div>
            </div>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.gray, whiteSpace: "nowrap" }}>
              {u.role === "mentor" ? (u.impact != null ? `${u.impact} IMPACT` : "") : (u.xp != null ? `${u.xp} XP · WK ${u.week ?? 1}` : "")}
            </span>
            <Chip c={u.role === "mentor" ? C.teal : u.role === "admin" ? C.amber : C.purple}
              bg={u.role === "mentor" ? C.tealTint : u.role === "admin" ? C.amberTint : C.purpleTint}>{u.role.toUpperCase()}</Chip>
            {/* Your own row has no delete: the server refuses it anyway, and an
                armed button you can never legitimately press is just a trap. */}
            {u.id !== meId && (
              <button onClick={() => onDelete(u)} title={`Delete ${u.email}`}
                style={{ border: "none", background: C.coralTint, cursor: "pointer", borderRadius: 9, padding: "7px 9px", display: "flex", flexShrink: 0 }}>
                <Trash2 size={13} color={C.coral} />
              </button>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ----- destructive actions -----
   Everything below erases something a person made. Each one names exactly what
   is about to go, and deleting an account makes you type the address first: a
   stray click in a row of icon buttons must not be able to remove somebody. */
function ConfirmDelete({ open, title, lines = [], confirmWord, busy, onCancel, onConfirm }) {
  const [typed, setTyped] = useState("");
  useEffect(() => { if (open) setTyped(""); }, [open]);
  if (!open) return null;
  const ready = !confirmWord || typed.trim().toLowerCase() === String(confirmWord).trim().toLowerCase();
  return (
    <div onClick={busy ? undefined : onCancel} style={{
      position: "fixed", inset: 0, zIndex: 90, background: "rgba(20,16,40,.55)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.white, borderRadius: 18, padding: 22, width: "100%", maxWidth: 430, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.coralTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={17} color={C.coral} />
          </div>
          <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>{title}</div>
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 13.5, color: i === 0 ? C.ink : C.gray, lineHeight: 1.55, marginTop: i === 0 ? 14 : 8 }}>{l}</div>
        ))}
        {confirmWord && (
          <div style={{ marginTop: 15 }}>
            <Label>Type the address to confirm</Label>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus spellCheck={false} autoComplete="off"
              placeholder={confirmWord}
              style={{
                width: "100%", border: `1px solid ${ready ? C.teal : C.line}`, borderRadius: 12,
                padding: "12px 13px", fontFamily: F.mono, fontSize: 13, outline: "none", marginTop: 7, boxSizing: "border-box",
              }} />
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Btn kind="soft" style={{ flex: 1 }} disabled={busy} onClick={onCancel}>Cancel</Btn>
          <Btn style={{ flex: 1, background: ready && !busy ? C.coral : "#D9D6D0" }} disabled={!ready || busy} onClick={onConfirm}>
            {busy ? "Deleting…" : "Delete"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ----- posts ----- */
function Posts({ rows, loading, onDelete }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card>
        <Label color={C.purple}>Moderation</Label>
        <div style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.55, marginTop: 8 }}>
          Every live post on the platform, newest first. Removing one here hides it everywhere -
          feed, profile and public share page, and the author is not notified. The row itself is
          kept, so what was taken down stays auditable.
        </div>
      </Card>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}` }}>
          <Label>Posts · {rows.length}</Label>
        </div>
        {loading && <div style={{ padding: 18, fontSize: 13, color: C.gray }}>Loading…</div>}
        {!loading && rows.length === 0 && <div style={{ padding: 18, fontSize: 13, color: C.gray }}>Nothing posted yet.</div>}
        {rows.map((p, i) => (
          <div key={p.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none" }}>
            <Monogram name={p.authorName === "-" ? (p.authorEmail || "?") : p.authorName} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, wordBreak: "break-word" }}>
                {p.title ? <b>{p.title}{p.text ? " · " : ""}</b> : null}
                {(p.text || "").slice(0, 200)}
                {(p.text || "").length > 200 ? "…" : ""}
                {!p.title && !p.text && <span style={{ color: C.gray }}>({p.kind || "post"}, no text)</span>}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 6 }}>
                {(p.authorName || "-").toUpperCase()}{p.authorEmail ? ` · ${p.authorEmail}` : ""} · {fmtDate(p.createdAt)}
                {p.visibility ? ` · ${String(p.visibility).toUpperCase()}` : ""}
              </div>
            </div>
            <button onClick={() => onDelete(p)} title="Delete this post"
              style={{ border: "none", background: C.coralTint, cursor: "pointer", borderRadius: 9, padding: "7px 9px", display: "flex", flexShrink: 0 }}>
              <Trash2 size={13} color={C.coral} />
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ----- root ----- */
export default function RyznAdmin() {
  const isDesktop = useIsDesktop();
  /* "checking" until we know whether the cookie we already have is a founder's.
     This used to start at false and go straight to the sign-in form, so opening
     the console in a second tab demanded a re-login even though the session was
     valid and same-origin, which made "open the admin panel in a new window"
     an unusable flow. */
  const [boot, setBoot] = useState("checking");
  const [authed, setAuthed] = useState(false);
  const [gateError, setGateError] = useState(null);
  const [nav, setNav] = useState("overview");
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (m) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 2200); };

  const [stats, setStats] = useState(null);
  const [me, setMe] = useState(null);
  const [invites, setInvites] = useState([]);
  const [people, setPeople] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  /* One modal serves every destructive action: each caller supplies the copy
     and the `run` that does the work, so there is exactly one place where an
     irreversible thing can be confirmed. */
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  /* Runs on mount, not just after sign-in: an existing session is the common
     case when this opens in a new window. A 403 here is the real gate, the
     sign-in form only proves you have an account, lib/admin.js decides whether
     it's a founder's. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, iv, mine] = await Promise.all([adminStats(), adminInvites(), fetchMe().catch(() => null)]);
        if (cancelled) return;
        // Defense in depth with /api/admin: a mentee session must not land in
        // the console even if an older client still called the APIs.
        if (mine?.user && !mine.user.adminConsole) {
          setAuthed(false);
          setBoot("gate");
          setGateError("Only mentor admins can open this console.");
          return;
        }
        setStats(s);
        setInvites(iv.invites);
        setMe(mine?.user || null);
        setAuthed(true);
        setBoot("ready");
      } catch (e) {
        if (cancelled) return;
        setAuthed(false);
        setBoot("gate");
        // 401 just means signed out, that's the gate doing its job, not an error
        // worth shouting about on first paint.
        if (e.status === 403) setGateError("Only mentor admins can open this console.");
        else if (e.status !== 401) setGateError(messageFor(e, "Couldn’t load the console."));
      }
    })();
    return () => { cancelled = true; };
  }, [authed]);

  /* People search runs server-side. */
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { users } = await adminUsers({ q, role, limit: 100 });
        if (!cancelled) setPeople(users);
      } catch { /* the stats loader already surfaced any auth problem */ }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [authed, q, role]);

  const visiblePeople = people;

  /* Posts load only when that tab is opened, it is a moderation queue nobody
     needs on first paint, and it reads every author's feed at once. */
  const loadPosts = async () => {
    setPostsLoading(true);
    try {
      const { posts: rows } = await adminPosts();
      setPosts(rows || []);
    } catch (e) {
      toast(messageFor(e, "Couldn’t load posts."));
    } finally {
      setPostsLoading(false);
    }
  };
  useEffect(() => { if (authed && nav === "posts") loadPosts(); /* eslint-disable-next-line */ }, [authed, nav]);

  const mint = async ({ role: kind, count, expiresDays, note, to, name }) => {
    try {
      const res = await adminMintInvites({ role: kind, count, expiresDays, note, to, name });
      const { invites: fresh } = await adminInvites();
      setInvites(fresh);
      if (to) {
        // A failed send doesn't undo the mint, the code is live either way, so
        // say what actually happened instead of a blanket success.
        if (res.sent) toast(`Invitation sent to ${to}`);
        else { copyText(res.url || res.created[0]); toast(res.sendError || `Minted but not sent · link copied`); }
        return;
      }
      copyText(res.created.join("\n"));
      toast(`${res.created.length} code${res.created.length === 1 ? "" : "s"} minted · copied to clipboard`);
    } catch (e) { toast(messageFor(e, "Couldn’t mint those codes.")); }
  };

  const resend = async (code, to, name) => {
    try {
      const res = await adminResendInvite({ code, to, name });
      const { invites: fresh } = await adminInvites();
      setInvites(fresh);
      toast(res.sent ? `Resent to ${res.to}` : (res.sendError || "Couldn’t send that one."));
    } catch (e) { toast(messageFor(e, "Couldn’t resend that code.")); }
  };

  const revoke = async (code) => {
    try {
      await adminRevokeInvite(code);
      const { invites: fresh } = await adminInvites();
      setInvites(fresh);
      toast(`${code} revoked`);
    } catch (e) { toast(messageFor(e, "Couldn’t revoke that code.")); }
  };

  /*, deletes -
     Each `ask*` only describes the action; nothing happens until the modal's
     Delete is pressed and `run` fires. Reloading afterwards is deliberate:
     removing an account also revokes codes and changes the counts, so the
     whole console has to re-read rather than patch one row locally. */
  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      await confirm.run();
      setConfirm(null);
    } catch (e) {
      toast(messageFor(e, "Couldn’t delete that."));
    } finally {
      setConfirmBusy(false);
    }
  };

  const reloadAll = async () => {
    const [{ users }, { invites: fresh }, s] = await Promise.all([
      adminUsers({ q, role, limit: 100 }),
      adminInvites(),
      adminStats(),
    ]);
    setPeople(users);
    setInvites(fresh);
    setStats(s);
  };

  const askDeleteUser = (u) => setConfirm({
    title: "Delete this account?",
    confirmWord: u.email,
    lines: [
      `${u.name === "-" ? u.email : u.name} (${u.role}) will be erased, along with everything they own, profile, posts, comments, matches, messages, bookings and org seats.`,
      "Any invitation code they claimed is revoked, not returned to the pool.",
      "This cannot be undone.",
    ],
    run: async () => {
      const res = await adminDeleteUser(u.id);
      await reloadAll();
      if (nav === "posts") await loadPosts();
      const n = Object.values(res.removed || {}).reduce((a, b) => a + b, 0);
      toast(`${res.deleted.email} deleted · ${n} record${n === 1 ? "" : "s"} removed`);
    },
  });

  const askDeleteInvite = (iv) => setConfirm({
    title: "Delete this code?",
    lines: [
      `${iv.code} will be removed from the ledger entirely.`,
      iv.state === "claimed"
        ? "It has been claimed, deleting it erases the record of how that person joined. Their account and role are unaffected."
        : "Revoke instead if you only want to stop it working: that kills the code but keeps the record.",
    ],
    run: async () => {
      await adminDeleteInvite(iv.code);
      const { invites: fresh } = await adminInvites();
      setInvites(fresh);
      toast(`${iv.code} deleted`);
    },
  });

  const askDeletePost = (p) => setConfirm({
    title: "Delete this post?",
    lines: [
      `${p.authorName}'s post will be hidden everywhere, feed, profile and its public share link.`,
      "The author is not notified. The row is kept so it stays auditable.",
    ],
    run: async () => {
      await deletePost(p.id);
      await loadPosts();
      toast("Post removed");
    },
  });

  const leave = async () => {
    try { await signOut(); } catch { /* already gone */ }
    setAuthed(false);
    setNav("overview");
  };

  const splash = (label) => (
    <div className="full-h" style={{ background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, fontSize: 11, color: C.gray, letterSpacing: 1 }}>{label}</div>
  );

  if (boot === "checking") return splash("CHECKING ACCESS…");
  if (!authed) return <AdminGate onIn={() => { setGateError(null); setAuthed(true); }} error={gateError} />;
  if (!stats) return splash("LOADING CONSOLE…");

  const NAV = [["overview", "Overview", BarChart3], ["invites", "Invites", Send], ["people", "People", Users], ["posts", "Posts", Newspaper], ["teams", "Teams", Building2], ["settings", "Access", Settings]];
  // Signs the invitation. The server uses the same value when it mails one.
  const founderName = me?.name || "Ryzn";

  const body = {
    overview: <Overview stats={stats} />,
    invites: <Invites rows={invites} onMint={mint} onRevoke={revoke} onResend={resend} onDelete={askDeleteInvite} toast={toast} founderName={founderName} />,
    people: <People rows={visiblePeople} q={q} setQ={setQ} role={role} setRole={setRole} onDelete={askDeleteUser} meId={me?.id || null} />,
    posts: <Posts rows={posts} loading={postsLoading} onDelete={askDeletePost} />,
    teams: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card>
          <Label color={C.purple}>Ryzn for Teams</Label>
          <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8 }}>
            Live. Any mentor can create an organisation at <b>/app/#/teams</b> and owns it: they mint
            org-scoped mentor codes, seat their own people, promote org admins, and open an Orbit across
            them. Orgs are in <code style={{ fontFamily: F.mono, fontSize: 12 }}>orgs</code> and
            <code style={{ fontFamily: F.mono, fontSize: 12 }}> org_members</code>; the waitlist for
            companies with nobody on Ryzn yet still writes to
            <code style={{ fontFamily: F.mono, fontSize: 12 }}> teams_interest</code>.
          </div>
          <div style={{ fontSize: 13, color: C.gray, lineHeight: 1.55, marginTop: 10 }}>
            Org admin is scoped to one organisation and is not this console. An org code grants the
            <b> mentor</b> role and nothing more, only an admin code minted here opens the founder console.
          </div>
          <Btn kind="ghost" style={{ marginTop: 14 }} onClick={() => { window.location.hash = "#/teams"; }}><Building2 size={15} /> Open the Teams page</Btn>
        </Card>
        <Card>
          <Label>Mentor invite page</Label>
          <div style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.55, marginTop: 8 }}>
            Personalized with the mentor's name, your founder signature, and their code.
            Preview it from <b>Invites</b> using the name field, that opens the real page in preview mode without minting a code.
          </div>
          <Btn kind="ghost" style={{ marginTop: 14 }} onClick={() => setNav("invites")}><Send size={15} /> Go to Invites to preview</Btn>
        </Card>
      </div>
    ),
    settings: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card>
          <Label color={C.amber}>Adding another admin</Label>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 8 }}>
            Go to <b>Invites → Admin</b>, mint one code, send it to them directly. They sign in here with their own
            Ryzn account, paste the code, and they’re in. No config, no redeploy, no waiting on anyone.
          </div>
          <Btn kind="soft" style={{ marginTop: 14 }} onClick={() => setNav("invites")}><Send size={15} /> Mint an admin code</Btn>
        </Card>
        <Card>
          <Label>How access is actually decided</Label>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 8 }}>
            Checked server-side on every <span style={{ fontFamily: F.mono, fontSize: 12 }}>/api/admin/*</span> call. A caller passes if:
          </div>
          <ul style={{ margin: "10px 0 0 18px", padding: 0, fontSize: 13.5, lineHeight: 1.7, color: C.gray }}>
            <li>their account has <span style={{ fontFamily: F.mono, fontSize: 12, color: C.ink }}>role: "admin"</span>, set by claiming an admin code or <span style={{ fontFamily: F.mono, fontSize: 12, color: C.ink }}>admin:grant</span>, or</li>
            <li>they are a <span style={{ fontFamily: F.mono, fontSize: 12, color: C.ink }}>mentor</span> whose email is in <span style={{ fontFamily: F.mono, fontSize: 12, color: C.ink }}>ADMIN_EMAILS</span>.</li>
          </ul>
          <div style={{ fontSize: 13, color: C.gray, marginTop: 12, lineHeight: 1.6 }}>
            Mentees never get in, even when listed in ADMIN_EMAILS. Signing in only proves who you are.
          </div>
        </Card>
        <Card>
          <Label>Address</Label>
          <div style={{ fontFamily: F.mono, fontSize: 11.5, lineHeight: 2, color: C.ink, marginTop: 8 }}>RYZN.ONE/APP/#/ADMIN</div>
          <div style={{ fontSize: 13, color: C.gray, marginTop: 8, lineHeight: 1.55 }}>
            The console is a page inside the app, not a separate site, same origin, same session, same deploy.
          </div>
        </Card>
        <Card style={{ background: C.coralTint, border: "none" }}>
          <Label color={C.coral}>Read-only by design</Label>
          <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.55, marginTop: 8 }}>
            The console can mint invite codes, mail them, and revoke unclaimed ones. It cannot edit people or
            hand out the mentor role, that still happens only when a mentor claims a code themselves.
          </div>
        </Card>
      </div>
    ),
  }[nav];

  // alignSelf: stretch, not height: 100%, the row's height is set by the shell,
  // and a percentage height against it would collapse back to content height.
  const sidebar = (
    <div style={{ width: 212, flexShrink: 0, background: C.ink, display: "flex", flexDirection: "column", alignSelf: "stretch" }}>
      <div style={{ padding: "22px 18px 18px" }}>
        <div style={{ color: C.white, fontSize: 21, fontWeight: 700, letterSpacing: -1 }}>RYZN</div>
        <div style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: 1.6, color: "#8B8985", marginTop: 2 }}>FOUNDER CONSOLE</div>
      </div>
      <div style={{ flex: 1, padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setNav(id)} style={{
            display: "flex", alignItems: "center", gap: 11, padding: "10px 11px", borderRadius: 10, border: "none",
            cursor: "pointer", textAlign: "left", width: "100%", fontFamily: F.sans, fontWeight: 600, fontSize: 13,
            background: nav === id ? C.purple : "transparent", color: nav === id ? C.white : "#B5B3AE",
          }}><Icon size={16} color={nav === id ? C.white : "#8B8985"} />{label}</button>
        ))}
      </div>
      {/* Leaving the console and ending the session are different intentions -
          a founder checking the app still wants their cookie. */}
      <div style={{ padding: 12, borderTop: "1px solid #2C2C2C", display: "flex", flexDirection: "column", gap: 2 }}>
        <button onClick={goToApp} style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: "pointer", padding: "8px 10px", fontFamily: F.sans, fontWeight: 600, fontSize: 12.5, color: "#B5B3AE", textAlign: "left" }}>
          <ChevronLeft size={14} /> Back to the app
        </button>
        <button onClick={leave} style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: "pointer", padding: "8px 10px", fontFamily: F.sans, fontWeight: 600, fontSize: 12.5, color: "#8B8985", textAlign: "left" }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="full-h" style={{ fontFamily: F.sans, color: C.ink, background: C.surface, display: "flex", overflow: "hidden" }}>
      {isDesktop && sidebar}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Console replaces the shell, so this header sits at viewport y=0 and
            pads the status bar inset itself. */}
        <div style={{
          background: C.white, borderBottom: `1px solid ${C.line}`, padding: "14px 20px",
          paddingTop: "calc(14px + var(--safe-top))",
          paddingLeft: "max(20px, var(--safe-left))",
          paddingRight: "max(20px, var(--safe-right))",
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F.sans, fontSize: 18, fontWeight: 700, letterSpacing: -0.4 }}>{NAV.find(n => n[0] === nav)[1]}</div>
            <div style={{ fontFamily: F.mono, fontSize: 8.5, color: "#A5A39D", letterSpacing: 1, marginTop: 2 }}>RYZN PLATFORM · ALL COHORTS</div>
          </div>
          {!isDesktop && (
            <>
              <button onClick={goToApp} title="Back to the app" style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 10, cursor: "pointer", padding: 8, display: "flex" }}><ChevronLeft size={15} color={C.gray} /></button>
              <button onClick={leave} title="Sign out" style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 10, cursor: "pointer", padding: 8, display: "flex" }}><LogOut size={15} color={C.gray} /></button>
            </>
          )}
        </div>

        {!isDesktop && (
          <div style={{ display: "flex", gap: 4, padding: "10px 12px", background: C.white, borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
            {NAV.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setNav(id)} style={{
                display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer", borderRadius: 10,
                padding: "8px 11px", whiteSpace: "nowrap", fontFamily: F.sans, fontWeight: 600, fontSize: 12.5,
                background: nav === id ? C.purpleTint : "transparent", color: nav === id ? C.purple : C.gray,
              }}><Icon size={14} />{label}</button>
            ))}
          </div>
        )}

        <div className="app-scroll" style={{
          flex: 1, overflowY: "auto",
          padding: isDesktop ? "22px 26px 40px" : "16px 16px 40px",
          paddingBottom: "calc(40px + var(--safe-bottom))",
        }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>{body}</div>
        </div>
      </div>

      {/* Before the toast in the tree so a success message paints over it. */}
      <ConfirmDelete
        open={!!confirm}
        title={confirm?.title || ""}
        lines={confirm?.lines || []}
        confirmWord={confirm?.confirmWord}
        busy={confirmBusy}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirm}
      />
      {toastMsg && (
        <div className="sheet-up" style={{ position: "fixed", bottom: "calc(22px + var(--safe-bottom))", left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#B7AFF2", fontFamily: F.mono, fontSize: 12, fontWeight: 700, padding: "10px 16px", borderRadius: 12, zIndex: 95, display: "flex", alignItems: "center", gap: 7, maxWidth: "90%" }}>
          <Zap size={12} /> {toastMsg}
        </div>
      )}
    </div>
  );
}
