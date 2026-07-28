import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Users, Send, Building2, Settings, Shield, Search, Copy, ExternalLink,
  Plus, LogOut, RotateCcw, Eye, EyeOff, Zap,
} from "lucide-react";
import { C, F } from "../theme.js";
import { Card, Label, Btn, Monogram, Field, FormError, Bar, Glyph } from "../ui.jsx";
import { useIsDesktop } from "../useIsDesktop.js";
import {
  signIn, signOut, messageFor, redeemInvite,
  adminStats, adminUsers, adminInvites, adminMintInvites, adminRevokeInvite,
} from "../lib/auth-client.js";
import { buildInviteUrl, copyText } from "../lib/invite-url.js";

/* ————————————————— RYZN ADMIN —————————————————
   The founders' console: platform analytics, the mentor invite Roster, and the
   people table. It's a page in the same app, routed at /app/#/admin — no second
   site, no subdomain, so it shares the origin and the session with everything else.

   Reads /api/admin/* behind an admin-only gate (lib/admin.js). The console had
   a second mode that rendered seeded sample numbers — invented users, invented
   invite codes, invented signup counts — for anyone who opened the URL without
   a database. It's gone: an admin console that can show fictional platform
   metrics is one screenshot away from being quoted as real.
*/


/* ————— small bits ————— */
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—");
const fmtAgo = (d) => {
  if (!d) return "—";
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

const STATE_COLOR = { open: C.purple, claimed: C.teal, expired: C.gray, revoked: C.coral };

const Tile = ({ label, value, color = C.ink, sub }) => (
  <Card style={{ padding: 14 }}>
    <Label>{label}</Label>
    <div style={{ fontSize: 26, fontWeight: 700, color, marginTop: 6, letterSpacing: -0.6 }}>{value}</div>
    {sub && <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 4 }}>{sub}</div>}
  </Card>
);

const Chip = ({ children, c = C.purple, bg = C.purpleTint }) => (
  <span style={{ fontFamily: F.mono, fontSize: 8.5, fontWeight: 700, letterSpacing: 0.6, color: c, background: bg, padding: "4px 8px", whiteSpace: "nowrap" }}>{children}</span>
);

/* ————— sign-in gate ————— */
/** An admin invite code arriving as /app/#/admin?code=… — prefilled so the
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
    <div style={{ fontFamily: F.sans, color: C.ink, minHeight: "100vh", background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "min(94vw, 400px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Glyph color={C.purple} size={30} />
          <div>
            <div style={{ color: C.white, fontSize: 24, fontWeight: 700, letterSpacing: -1 }}>RYZN</div>
            <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 1.6, color: "#8B8985" }}>FOUNDER CONSOLE</div>
          </div>
        </div>
        <div style={{ background: C.surface, borderRadius: 20, padding: 22, marginTop: 20 }}>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.4 }}>Sign in</div>
          <div style={{ fontSize: 13, color: C.gray, marginTop: 4, lineHeight: 1.5 }}>
            "Founding team only. Your account must be on the admin list."
          </div>
          <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <Field label="Password" type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)}
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
                Sign in with your normal Ryzn account — the code promotes it. One use only.
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCode(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: "12px 0 0", fontFamily: F.sans, fontWeight: 600, fontSize: 12.5, color: C.purple }}>
              Have an admin invite code?
            </button>
          )}

          <FormError>{err || error}</FormError>
          <Btn style={{ marginTop: 18 }} disabled={busy} onClick={submit}><Shield size={15} /> {busy ? "Checking…" : "Enter the console"}</Btn>
          {/* Without this the console is a dead end for anyone who doesn't
              already have a Ryzn account — there's no sign-up on this screen. */}
          <div style={{ textAlign: "center", fontSize: 12.5, color: C.gray, marginTop: 16 }}>
            No Ryzn account yet?{" "}
            <span onClick={() => { window.location.hash = ""; }} style={{ color: C.purple, fontWeight: 600, cursor: "pointer" }}>Create one</span>
            , then come back here.
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", textAlign: "center", marginTop: 12, letterSpacing: 0.6 }}>
            RYZN.ONE/APP/#/ADMIN
          </div>
        </div>
      </div>
    </div>
  );
}

/* ————— overview ————— */
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
              <span style={{ width: 9, height: 9, background: c }} />
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
            <Monogram name={u.name === "—" ? u.email : u.name} size={32} />
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

/* ————— invites ————— */
function Invites({ rows, onMint, onRevoke, toast }) {
  const [role, setRole] = useState("mentor");
  const [count, setCount] = useState(5);
  const [days, setDays] = useState(90);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const isAdminCode = role === "admin";

  const mint = async () => {
    setBusy(true);
    try { await onMint({ role, count: Number(count), expiresDays: Number(days), note }); }
    finally { setBusy(false); }
  };

  // Mentor codes open the branded claim page. Admin codes go to the console's
  // own sign-in, where the code field promotes an existing account.
  const linkFor = (iv) => iv.role === "admin"
    ? `${window.location.origin}/app/#/admin?code=${encodeURIComponent(iv.code)}`
    : buildInviteUrl({ code: iv.code, email: "", role: "Mentor", orgName: "Ryzn", adminName: "Bilal Shafi" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Label color={isAdminCode ? C.amber : C.purple}>Mint invites</Label>
          <Label>SINGLE-USE · ONE PERSON PER CODE</Label>
        </div>
        <div style={{ display: "flex", background: "#EFEEEA", borderRadius: 12, padding: 4, marginTop: 10 }}>
          {[["mentor", "Mentor"], ["admin", "Admin"]].map(([id, l]) => (
            <button key={id} onClick={() => { setRole(id); setCount(id === "admin" ? 1 : 5); }} style={{ flex: 1, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontFamily: F.sans, fontWeight: 600, fontSize: 13, background: role === id ? C.white : "transparent", color: role === id ? C.ink : C.gray }}>{l}</button>
          ))}
        </div>
        {isAdminCode && (
          <div style={{ background: C.amberTint, borderRadius: 12, padding: "11px 12px", marginTop: 10, display: "flex", gap: 9 }}>
            <Shield size={15} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
              An admin code hands over this whole console. Send it to one person, directly — never in a shared channel.
              They sign in at <span style={{ fontFamily: F.mono, fontSize: 11.5 }}>/app/#/admin</span> with their own Ryzn account and paste it.
            </div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 12 }}>
          <div>
            <Label>How many</Label>
            <input type="number" min={1} max={isAdminCode ? 5 : 50} value={count} onChange={e => setCount(e.target.value)}
              style={{ width: "100%", marginTop: 7, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px", fontFamily: F.mono, fontSize: 14, outline: "none", background: C.white, boxSizing: "border-box" }} />
          </div>
          <div>
            <Label>Expires in (days)</Label>
            <input type="number" min={1} max={365} value={days} onChange={e => setDays(e.target.value)}
              style={{ width: "100%", marginTop: 7, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px", fontFamily: F.mono, fontSize: 14, outline: "none", background: C.white, boxSizing: "border-box" }} />
          </div>
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            <Label>Note</Label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder={isAdminCode ? "Founder access" : "Founding cohort"}
              style={{ width: "100%", marginTop: 7, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px", fontFamily: F.sans, fontSize: 14, outline: "none", background: C.white, boxSizing: "border-box" }} />
          </div>
        </div>
        <Btn style={{ marginTop: 12, ...(isAdminCode ? { background: C.amber } : null) }} disabled={busy} onClick={mint}>
          <Plus size={15} /> {busy ? "Minting…" : `Mint ${count} ${role} code${Number(count) === 1 ? "" : "s"}`}
        </Btn>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 10, lineHeight: 1.7 }}>
          {isAdminCode
            ? "CLAIMING AN ADMIN CODE IS THE ONLY WAY TO JOIN THIS CONSOLE WITHOUT TOUCHING SERVER CONFIG."
            : "EACH CODE OPENS /MENTOR-INVITE.HTML WITH IT PRE-FILLED. CLAIMING IT IS THE ONLY WAY TO BECOME A MENTOR."}
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
              <Chip c={STATE_COLOR[iv.state]} bg={iv.state === "claimed" ? C.tealTint : iv.state === "revoked" ? C.coralTint : iv.state === "expired" ? C.surface : C.purpleTint}>{iv.state.toUpperCase()}</Chip>
              <button onClick={() => copyText(linkFor(iv)).then(() => toast(iv.role === "admin" ? "Admin link copied — send it directly" : "Invite link copied"))} title="Copy invite link"
                style={{ border: "none", background: C.surface, cursor: "pointer", borderRadius: 9, padding: "7px 9px", display: "flex" }}><Copy size={13} color={C.gray} /></button>
              <button onClick={() => window.open(linkFor(iv), "_blank", "noopener")} title="Open invite page"
                style={{ border: "none", background: C.surface, cursor: "pointer", borderRadius: 9, padding: "7px 9px", display: "flex" }}><ExternalLink size={13} color={C.gray} /></button>
              {iv.state === "open" && (
                <button onClick={() => onRevoke(iv.code)} title="Revoke"
                  style={{ border: "none", background: C.coralTint, cursor: "pointer", borderRadius: 9, padding: "7px 9px", display: "flex" }}><RotateCcw size={13} color={C.coral} /></button>
              )}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 6 }}>
              {iv.claimedBy
                ? `CLAIMED BY ${iv.claimedBy.name.toUpperCase()} · ${iv.claimedBy.email} · ${fmtDate(iv.redeemedAt)}`
                : `${(iv.note || "—").toUpperCase()} · MINTED ${fmtDate(iv.createdAt)}${iv.expiresAt ? ` · EXPIRES ${fmtDate(iv.expiresAt)}` : ""}`}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ————— people ————— */
function People({ rows, q, setQ, role, setRole }) {
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
            <Monogram name={u.name === "—" ? u.email : u.name} size={34} />
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
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ————— root ————— */
export default function RyznAdmin() {
  const isDesktop = useIsDesktop();
  const [authed, setAuthed] = useState(false);
  const [gateError, setGateError] = useState(null);
  const [nav, setNav] = useState("overview");
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (m) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 2200); };

  const [stats, setStats] = useState(null);
  const [invites, setInvites] = useState([]);
  const [people, setPeople] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");

  /* Load once signed in. A 403 here is the real gate — the sign-in form only
     proves you have an account, lib/admin.js decides whether it's a founder's. */
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, iv] = await Promise.all([adminStats(), adminInvites()]);
        if (cancelled) return;
        setStats(s);
        setInvites(iv.invites);
      } catch (e) {
        if (cancelled) return;
        setAuthed(false);
        setGateError(e.status === 403 ? "That account isn’t on the admin list." : messageFor(e, "Couldn’t load the console."));
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

  const mint = async ({ role: kind, count, expiresDays, note }) => {
    try {
      const { created } = await adminMintInvites({ role: kind, count, expiresDays, note });
      const { invites: fresh } = await adminInvites();
      setInvites(fresh);
      copyText(created.join("\n"));
      toast(`${created.length} code${created.length === 1 ? "" : "s"} minted · copied to clipboard`);
    } catch (e) { toast(messageFor(e, "Couldn’t mint those codes.")); }
  };

  const revoke = async (code) => {
    try {
      await adminRevokeInvite(code);
      const { invites: fresh } = await adminInvites();
      setInvites(fresh);
      toast(`${code} revoked`);
    } catch (e) { toast(messageFor(e, "Couldn’t revoke that code.")); }
  };

  const leave = async () => {
    try { await signOut(); } catch { /* already gone */ }
    setAuthed(false);
    setNav("overview");
  };

  if (!authed) return <AdminGate onIn={() => { setGateError(null); setAuthed(true); }} error={gateError} />;
  if (!stats) return (
    <div style={{ minHeight: "100vh", background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, fontSize: 11, color: C.gray, letterSpacing: 1 }}>LOADING CONSOLE…</div>
  );

  const NAV = [["overview", "Overview", BarChart3], ["invites", "Invites", Send], ["people", "People", Users], ["teams", "Teams", Building2], ["settings", "Access", Settings]];

  const body = {
    overview: <Overview stats={stats} />,
    invites: <Invites rows={invites} onMint={mint} onRevoke={revoke} toast={toast} />,
    people: <People rows={visiblePeople} q={q} setQ={setQ} role={role} setRole={setRole} />,
    teams: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card>
          <Label color={C.purple}>Ryzn for Teams</Label>
          <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8 }}>
            Not built. The org console that used to sit behind this button was a simulation —
            a fictional company, invented mentors and mentees, and shared demo passwords in the
            bundle. <b>/app/#/teams</b> is now the pitch plus a waitlist that writes to the
            <code style={{ fontFamily: F.mono, fontSize: 12 }}> teams_interest</code> collection.
          </div>
          <Btn kind="ghost" style={{ marginTop: 14 }} onClick={() => { window.location.hash = "#/teams"; }}><Building2 size={15} /> View the Teams page</Btn>
        </Card>
        <Card>
          <Label>Mentor invite page</Label>
          <div style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.55, marginTop: 8 }}>
            Every code you mint opens the branded claim page with the code pre-filled. Accepting
            now lands the mentor on sign-up with the code carried through — it used to send them
            into the Teams demo instead of creating an account.
          </div>
          <Btn kind="ghost" style={{ marginTop: 14 }} onClick={() => window.open("/mentor-invite.html", "_blank", "noopener")}><ExternalLink size={15} /> Preview the invite page</Btn>
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
            <li>their account has <span style={{ fontFamily: F.mono, fontSize: 12, color: C.ink }}>role: "admin"</span> — set by claiming an admin code, or</li>
            <li>their email is in <span style={{ fontFamily: F.mono, fontSize: 12, color: C.ink }}>ADMIN_EMAILS</span> — the break-glass path, for when nobody can get in.</li>
          </ul>
          <div style={{ fontSize: 13, color: C.gray, marginTop: 12, lineHeight: 1.6 }}>
            Signing in does not grant access — it only proves who you are. Everyone else gets a 403.
          </div>
        </Card>
        <Card>
          <Label>Address</Label>
          <div style={{ fontFamily: F.mono, fontSize: 11.5, lineHeight: 2, color: C.ink, marginTop: 8 }}>RYZN.ONE/APP/#/ADMIN</div>
          <div style={{ fontSize: 13, color: C.gray, marginTop: 8, lineHeight: 1.55 }}>
            The console is a page inside the app, not a separate site — same origin, same session, same deploy.
          </div>
        </Card>
        <Card style={{ background: C.coralTint, border: "none" }}>
          <Label color={C.coral}>Read-only by design</Label>
          <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.55, marginTop: 8 }}>
            The console can mint and revoke invite codes. It cannot edit people or hand out the mentor role —
            that still happens only when a mentor claims a code themselves.
          </div>
        </Card>
      </div>
    ),
  }[nav];

  // alignSelf: stretch, not height: 100% — the row's height is set by the shell,
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
      <div style={{ padding: 12, borderTop: "1px solid #2C2C2C" }}>
        <button onClick={leave} style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: "pointer", padding: "8px 10px", fontFamily: F.sans, fontWeight: 600, fontSize: 12.5, color: "#8B8985" }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: F.sans, color: C.ink, background: C.surface, minHeight: "100vh", height: "100vh", display: "flex", overflow: "hidden" }}>
      {isDesktop && sidebar}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ background: C.white, borderBottom: `1px solid ${C.line}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4 }}>{NAV.find(n => n[0] === nav)[1]}</div>
            <div style={{ fontFamily: F.mono, fontSize: 8.5, color: "#A5A39D", letterSpacing: 1, marginTop: 2 }}>RYZN PLATFORM · ALL COHORTS</div>
          </div>
          {!isDesktop && (
            <button onClick={leave} style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 10, cursor: "pointer", padding: 8, display: "flex" }}><LogOut size={15} color={C.gray} /></button>
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

        <div className="app-scroll" style={{ flex: 1, overflowY: "auto", padding: isDesktop ? "22px 26px 40px" : "16px 16px 40px" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>{body}</div>
        </div>
      </div>

      {toastMsg && (
        <div className="sheet-up" style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#B7AFF2", fontFamily: F.mono, fontSize: 12, fontWeight: 700, padding: "10px 16px", borderRadius: 12, zIndex: 90, display: "flex", alignItems: "center", gap: 7, maxWidth: "90%" }}>
          <Zap size={12} /> {toastMsg}
        </div>
      )}
    </div>
  );
}
