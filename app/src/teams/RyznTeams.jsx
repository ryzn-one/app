import React, { useState } from "react";
import { Building2, Check, ChevronLeft, Users, Zap, Award, Mail } from "lucide-react";
import { C, F } from "../theme.js";
import { Card, Label, Btn, Field, FormError, Glyph } from "../ui.jsx";
import { registerTeamsInterest } from "../lib/auth-client.js";

/* ————————————————— RYZN FOR TEAMS —————————————————

   What this was: a 2,500-line simulated org console — a fictional company
   ("Northbound"), four invented mentors with Impact scores, three invented
   mentees mid-programme, a community feed, a badge wall, an at-risk-pairs
   dashboard, and three demo accounts whose passwords shipped in the JS bundle
   and were printed on the sign-in screen. It persisted to localStorage and
   talked to no server, so every figure in it was authored fiction.

   It was linked from the consumer sign-up screen, which meant a real founding
   mentor could click through to something that looked like a working product
   with real customers.

   What it is now: the pitch, honestly labelled as not yet available, plus a
   waitlist that writes to the database. When the org model exists the console
   gets rebuilt on top of it, rather than in front of it. */

const POINTS = [
  { icon: Users, title: "Your own Roster", body: "Invite your senior people as mentors. They keep their Ryzn profile and Impact Score." },
  { icon: Zap, title: "Cohorts, not one-offs", body: "Twelve-week programmes with structured exercises, so mentoring survives a busy quarter." },
  { icon: Award, title: "Proof for both sides", body: "Verifiable milestones for the mentee and a public contribution record for the mentor." },
];

export default function RyznTeams() {
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
    <div className="full-h app-scroll" style={{ fontFamily: F.sans, color: C.ink, overflowY: "auto", background: C.surface }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 24px 60px" }}>
        <button
          onClick={() => { window.location.hash = ""; }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 0", display: "flex", alignItems: "center", gap: 6, color: C.gray, fontFamily: F.sans, fontWeight: 600, fontSize: 13 }}
        >
          <ChevronLeft size={16} /> Back to Ryzn
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
          <div style={{ width: 46, height: 46, background: C.purple, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={22} color={C.white} />
          </div>
          <div>
            <div style={{ color: C.purple, fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>RYZN FOR TEAMS</div>
            <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.gray, letterSpacing: 1 }}>IN DEVELOPMENT</div>
          </div>
        </div>

        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 24, lineHeight: 1.25 }}>
          The same programme, inside your company.
        </div>
        <div style={{ fontSize: 15, color: C.gray, marginTop: 10, lineHeight: 1.55 }}>
          Ryzn for Teams brings the mentor Roster, the twelve-week cohort structure and the
          milestone system to an organisation’s own people. It isn’t built yet — we’re focused
          on the founding mentor cohort first.
        </div>

        <Card style={{ marginTop: 20, border: "1.5px dashed #CFCDC7", background: "#EFEEEA" }}>
          <div style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.55 }}>
            <b style={{ color: C.ink }}>Not available yet.</b> There’s no org console to sign into.
            Leave your details and you’ll be first to see it — no product tour, no demo account,
            nothing pretending to be live.
          </div>
        </Card>

        <div style={{ marginTop: 26 }}>
          <Label>What it will do</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {POINTS.map(({ icon: Icon, title, body }) => (
              <Card key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 38, height: 38, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={17} color={C.purple} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{title}</div>
                  <div style={{ fontSize: 13, color: C.gray, marginTop: 3, lineHeight: 1.5 }}>{body}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Card style={{ marginTop: 26 }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "16px 8px" }}>
              <div style={{ width: 48, height: 48, background: C.tealTint, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={22} color={C.teal} strokeWidth={3} />
              </div>
              <div style={{ fontSize: 19, fontWeight: 700, marginTop: 14 }}>You’re on the list.</div>
              <div style={{ fontSize: 13.5, color: C.gray, marginTop: 6, lineHeight: 1.5 }}>
                We’ll email <b style={{ color: C.ink }}>{email}</b> when Teams is real enough to show you.
              </div>
            </div>
          ) : (
            <>
              <Label color={C.purple}>Register interest</Label>
              <div style={{ fontSize: 13, color: C.gray, marginTop: 6, lineHeight: 1.5 }}>
                Work email is all we need. The rest helps us build the right thing first.
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

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 28, color: "#A5A39D" }}>
          <Glyph color="#C9C6C0" size={16} />
          <span style={{ fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1 }}>RYZN · RYZN.ONE · RISE NOW.</span>
        </div>
      </div>
    </div>
  );
}
