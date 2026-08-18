import React, { useEffect, useState } from "react";
import { Building2, Check, ChevronLeft, Users, Zap, Award, Mail, Radio, ArrowRight } from "lucide-react";
import { C, F } from "../theme.js";
import { Card, Label, Btn, Field, FormError, Glyph } from "../ui.jsx";
import { registerTeamsInterest, fetchMe, fetchOrg, createOrg, messageFor } from "../lib/auth-client.js";
import OrgConsole from "./OrgConsole.jsx";
import { useOrbits } from "../lib/orbits.js";

/* ————————————————— RYZN FOR TEAMS —————————————————

   What this was: a 2,500-line simulated org console — a fictional company
   ("Northbound"), four invented mentors with Impact scores, three invented
   mentees mid-programme, and three demo accounts whose passwords shipped in the
   JS bundle. It persisted to localStorage and talked to no server, so every
   figure in it was authored fiction. That got torn out and replaced with the
   pitch plus a waitlist, because a console that shows invented customers is one
   screenshot away from being quoted as real.

   What it is now: the org model exists, so the console is real. A mentor creates
   an organisation here, seats their own people with org-scoped invite codes, and
   opens an Orbit across them. Every number on it is counted from the database —
   see api/orgs.js.

   Four states, decided by who is asking:
     signed out          the pitch and the waitlist
     mentee              the pitch, and how to get a mentor seat
     mentor, no org      create one
     in an org           the console

   The waitlist stays for the first two: a company with nobody on Ryzn yet still
   has a way to raise their hand. */

const POINTS = [
  { icon: Users, title: "Your own Roster", body: "Invite your senior people as mentors. They keep their Ryzn profile and Impact Score." },
  { icon: Zap, title: "Cohorts, not one-offs", body: "Twelve-week programmes with structured exercises, so mentoring survives a busy quarter." },
  { icon: Award, title: "Proof for both sides", body: "Verifiable milestones for the mentee and a public contribution record for the mentor." },
];

const goToApp = () => {
  const { origin, pathname, search } = window.location;
  window.location.assign(`${origin}${pathname}${search || ""}`);
};

/* This route replaces the app shell rather than living inside it, so it owns
   both edges itself — see `.safe-page` in index.css. Without the top inset the
   "Back to Ryzn" button renders under the status bar clock. */
const Shell = ({ children }) => (
  <div className="full-h app-scroll safe-page" style={{ fontFamily: F.sans, color: C.ink, overflowY: "auto", background: C.surface }}>
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 24px calc(60px + var(--safe-bottom))" }}>
      <button onClick={goToApp}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 0", display: "flex", alignItems: "center", gap: 6, color: C.gray, fontFamily: F.sans, fontWeight: 600, fontSize: 13 }}>
        <ChevronLeft size={16} /> Back to Ryzn
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
        <div style={{ width: 46, height: 46, background: C.purple, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Building2 size={22} color={C.white} />
        </div>
        <div>
          <div style={{ color: C.purple, fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>RYZN FOR TEAMS</div>
          <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.gray, letterSpacing: 1 }}>MENTORSHIP, INSIDE YOUR COMPANY</div>
        </div>
      </div>

      {children}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 28, color: "#A5A39D" }}>
        <Glyph color="#C9C6C0" size={16} />
        <span style={{ fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1 }}>RYZN · RYZN.ONE · RISE NOW.</span>
      </div>
    </div>
  </div>
);

const Pitch = () => (
  <>
    <div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 24, lineHeight: 1.25 }}>
      The same programme, inside your company.
    </div>
    <div style={{ fontSize: 15, color: C.gray, marginTop: 10, lineHeight: 1.55 }}>
      Ryzn for Teams brings the mentor Roster, the twelve-week cohort structure and the
      milestone system to an organisation’s own people.
    </div>

    <div style={{ marginTop: 22 }}>
      <Label>What it does</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {POINTS.map(({ icon: Icon, title, body }) => (
          <Card key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 38, height: 38, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={17} color={C.purple} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14.5 }}>{title}</div>
              <div style={{ fontSize: 13, color: C.gray, marginTop: 3, lineHeight: 1.5 }}>{body}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  </>
);

/* ————— waitlist ————— */
function Waitlist() {
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [size, setSize] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setErr(null);
    if (!email.trim() || !email.includes("@")) return setErr("Enter a work email we can reach you on.");
    setBusy(true);
    try {
      await registerTeamsInterest({ email: email.trim(), org: org.trim(), size: size.trim() });
      setDone(true);
    } catch (e) {
      setErr(e.message || "Couldn’t save that. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ marginTop: 26 }}>
      {done ? (
        <div style={{ textAlign: "center", padding: "16px 8px" }}>
          <div style={{ width: 48, height: 48, background: C.tealTint, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={22} color={C.teal} strokeWidth={3} />
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 19, fontWeight: 700, marginTop: 14 }}>You’re on the list.</div>
          <div style={{ fontSize: 13.5, color: C.gray, marginTop: 6, lineHeight: 1.5 }}>
            We’ll email <b style={{ color: C.ink }}>{email}</b> and get your org set up.
          </div>
        </div>
      ) : (
        <>
          <Label color={C.purple}>Talk to us</Label>
          <div style={{ fontSize: 13, color: C.gray, marginTop: 6, lineHeight: 1.5 }}>
            Work email is all we need. The rest helps us seat the right people first.
          </div>
          <Field label="Work email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" />
          <Field label="Company (optional)" value={org} onChange={e => setOrg(e.target.value)} autoComplete="organization" />
          <Field label="Roughly how many people? (optional)" value={size} onChange={e => setSize(e.target.value)} placeholder="e.g. 40 engineers" />
          <FormError>{err}</FormError>
          <Btn style={{ marginTop: 18 }} disabled={busy} onClick={submit}>
            <Mail size={15} /> {busy ? "Saving…" : "Keep me posted"}
          </Btn>
        </>
      )}
    </Card>
  );
}

/* ————— create ————— */
function CreateOrg({ onCreated }) {
  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    setErr(null);
    if (name.trim().length < 2) return setErr("Give the organisation a name.");
    setBusy(true);
    try {
      onCreated(await createOrg({ name: name.trim(), size: size.trim(), website: website.trim() }));
    } catch (e) {
      setErr(messageFor(e, "Couldn’t create that organisation."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 24, lineHeight: 1.25 }}>
        Set up your organisation.
      </div>
      <div style={{ fontSize: 15, color: C.gray, marginTop: 10, lineHeight: 1.55 }}>
        You’ll own it. That makes you an admin of your own roster — seats, people and the Orbit —
        and changes nothing about your Ryzn account or your mentees.
      </div>

      <Card style={{ marginTop: 20 }}>
        <Label color={C.purple}>New organisation</Label>
        <Field label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Genie" autoComplete="organization"
          onKeyDown={e => e.key === "Enter" && submit()} />
        <Field label="Roughly how many people? (optional)" value={size} onChange={e => setSize(e.target.value)} placeholder="e.g. 40 engineers" />
        <Field label="Website (optional)" value={website} onChange={e => setWebsite(e.target.value)} placeholder="yourcompany.com" />
        <FormError>{err}</FormError>
        <Btn style={{ marginTop: 18 }} disabled={busy} onClick={submit}>
          <Building2 size={15} /> {busy ? "Creating…" : "Create the organisation"}
        </Btn>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 12, lineHeight: 1.7 }}>
          NEXT: SEAT YOUR PEOPLE WITH ORG INVITE CODES, THEN OPEN THE ORBIT.
        </div>
      </Card>

      <div style={{ marginTop: 22 }}>
        <Label>What you get</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {[
            { icon: Users, title: "A roster you control", body: "Mint single-use codes. Each one makes someone a Ryzn mentor and seats them in your org." },
            { icon: Radio, title: "An org Orbit", body: "One feed across everyone in the org — the profile posts your people already publish." },
            { icon: Award, title: "Org admins", body: "Promote someone to run the roster with you. Org admin is scoped to your org, nothing else." },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 38, height: 38, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={17} color={C.purple} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14.5 }}>{title}</div>
                <div style={{ fontSize: 13, color: C.gray, marginTop: 3, lineHeight: 1.5 }}>{body}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

/* ————— root ————— */
export default function RyznTeams() {
  /* "checking" until we know who's asking. Starting on the signed-out pitch and
     correcting a beat later would show a mentor with an org the waitlist form
     for their own company. */
  const [boot, setBoot] = useState("checking");
  const [me, setMe] = useState(null);
  const [ctx, setCtx] = useState(null);
  /* The console is a second root, so it loads its own orbit list rather than
     inheriting one. Enabled only once we know there's a session to ask with. */
  const orbits = useOrbits(boot === "ready");
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (m) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 2200); };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 401 on either call just means signed out — that's a state, not an error.
      const [mine, orgCtx] = await Promise.all([
        fetchMe().catch(() => null),
        fetchOrg().catch(() => null),
      ]);
      if (cancelled) return;
      setMe(mine);
      setCtx(orgCtx);
      setBoot("ready");
    })();
    return () => { cancelled = true; };
  }, []);

  if (boot === "checking") {
    return (
      <div className="full-h" style={{ background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, fontSize: 11, color: C.gray, letterSpacing: 1 }}>
        LOADING…
      </div>
    );
  }

  if (ctx?.org) {
    return (
      <>
        {/* The console writes the policy this orbit is governed by; the orbit
            payload is what it reads it back from. Same resolved object the
            phones read, so the two can never describe the rules differently. */}
        <OrgConsole ctx={ctx} me={me} onCtx={setCtx} onExit={goToApp} toast={toast}
          orbit={orbits.orbits.find((o) => o.id === ctx.org.id) || null}
          onOrbitsChanged={orbits.applyOrbits} />
        {toastMsg && (
          <div className="sheet-up" style={{ position: "fixed", bottom: "calc(22px + var(--safe-bottom))", left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#B7AFF2", fontFamily: F.mono, fontSize: 12, fontWeight: 700, padding: "10px 16px", borderRadius: 12, zIndex: 90, display: "flex", alignItems: "center", gap: 7, maxWidth: "90%" }}>
            <Zap size={12} /> {toastMsg}
          </div>
        )}
      </>
    );
  }

  if (ctx?.canCreate) {
    return <Shell><CreateOrg onCreated={setCtx} /></Shell>;
  }

  const signedIn = !!me?.user;

  return (
    <Shell>
      <Pitch />

      <Card style={{ marginTop: 20, border: `1.5px solid ${C.purple}`, background: C.purpleTint }}>
        <Label color={C.purple}>Who can start one</Label>
        <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.55, marginTop: 8 }}>
          {signedIn
            ? <>Organisations are created by mentors. Your account is on the mentee side, so claim a mentor
              invitation first — then this page becomes your org console.</>
            : <>Organisations are created by mentors, from inside their own account. If you already mentor on
              Ryzn, sign in and this page becomes your org console.</>}
        </div>
        <Btn kind="soft" style={{ marginTop: 14, background: C.white }} onClick={goToApp}>
          {signedIn ? "Go to Ryzn" : "Sign in to Ryzn"} <ArrowRight size={15} />
        </Btn>
      </Card>

      <div style={{ marginTop: 26 }}>
        <Label>No one from your company on Ryzn yet?</Label>
        <div style={{ fontSize: 13.5, color: C.gray, marginTop: 8, lineHeight: 1.55 }}>
          Leave your details and we’ll seat your first mentor ourselves.
        </div>
      </div>
      <Waitlist />
    </Shell>
  );
}
