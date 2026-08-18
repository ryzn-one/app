import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Monogram, Field, FormError, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, BrandMark, TypingDots } from "./ui.jsx";
import { authClient, signIn, signUp, messageFor, validateInvite, redeemInvite } from "./lib/auth-client.js";
import { stashPendingInvite, clearPendingInvite } from "./lib/pending-invite.js";
import { useTurnstile } from "./lib/turnstile.js";

/* ————————————————— JOURNEY: AUTH —————————————————
   Every screen below makes real Better Auth calls against /api/auth/*. There is
   no prototype mode and no prefilled credentials: a form that arrived already
   filled with someone else's name is how a signed-in user ended up being
   greeted as "Jordan".
*/

export const Splash = ({ onEnter, isDesktop }) => (
  <div onClick={isDesktop ? undefined : onEnter} style={{
    position: "absolute", inset: 0, zIndex: 60, cursor: isDesktop ? "default" : "pointer", overflow: "hidden",
    background: `radial-gradient(120% 90% at 50% 8%, #7A6FE0 0%, ${C.purple} 42%, ${C.deep} 100%)`,
  }}>
    <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.09) 1px, transparent 1px)", backgroundSize: "18px 18px", opacity: 0.5 }} />
    <div style={{ position: "absolute", top: "-18%", left: "50%", transform: "translateX(-50%)", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.16), transparent 70%)" }} />
    <div className="splash-in" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 68, height: 68, borderRadius: 20, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 18px 40px rgba(20,10,60,.35)", marginBottom: 22 }}>
        {/* The launch screen is the app's biggest logo moment, and it was
            showing the single diamond — the atom we use for bullets and tiers,
            not the mark. Anyone opening the installed app saw the wrong logo. */}
        <BrandMark color="white" size={34} />
      </div>
      <div style={{ color: C.white, fontSize: 52, fontWeight: 700, letterSpacing: -2 }}>RYZN</div>
      <div style={{ color: "#E4E1FA", fontSize: 15.5, marginTop: 6, fontWeight: 500 }}>Rise now.</div>
      {isDesktop && (
        <button onClick={onEnter} style={{
          marginTop: 30, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
          background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.28)", borderRadius: 12,
          padding: "12px 22px", color: C.white, fontFamily: F.sans, fontWeight: 600, fontSize: 14.5,
        }}>Enter Ryzn <ChevronRight size={16} /></button>
      )}
    </div>
    {!isDesktop && (
      <div className="splash-in" style={{ position: "absolute", bottom: 54, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, animationDelay: ".15s" }}>
        <div style={{ width: 30, height: 2, borderRadius: 2, background: "rgba(255,255,255,.4)" }} />
        <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 2, color: "#C9C3F2" }}>TAP TO BEGIN · RYZN.ONE</div>
      </div>
    )}
  </div>
);

export const RoleSelect = ({ onPick }) => (
  <div style={{ padding: "44px 24px 0", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ color: C.purple, fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>RYZN</div>
      <div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 18, lineHeight: 1.2 }}>Who’s rising today?</div>
      <div style={{ fontSize: 15, color: C.gray, marginTop: 10, lineHeight: 1.55 }}>Pick a path — mentees and mentors get two different experiences from here on.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 26 }}>
        {[
          { role: "mentee", title: "I’m a mentee", sub: "Get matched with a vetted mentor and a 12-week program.", icon: Zap, color: C.purple, tint: C.purpleTint },
          { role: "mentor", title: "I’m a mentor", sub: "Join the Roster — invitation only, build public Impact.", icon: Award, color: C.teal, tint: C.tealTint },
        ].map(({ role, title, sub, icon: Icon, color, tint }) => (
          <button key={role} onClick={() => onPick(role)} style={{
            display: "flex", alignItems: "center", gap: 14, textAlign: "left", cursor: "pointer",
            border: `1.5px solid ${C.line}`, borderRadius: 16, padding: 16, background: C.white, fontFamily: F.sans,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 15, color: C.ink }}>{title}</div>
              <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
            </div>
            <ChevronRight size={18} color={C.gray} />
          </button>
        ))}
      </div>
    </div>
  </div>
);

export const Welcome = ({ role, go }) => (
  <div style={{ padding: "44px 24px 0", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 28 }}>
      <div style={{ color: C.purple, fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>RYZN</div>
      <div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 28, lineHeight: 1.2 }}>
        {role === "mentee" ? <>You don’t need to figure this out alone.</> : <>You’re exactly who we built this for.</>}
      </div>
      <div style={{ fontSize: 15, color: C.gray, marginTop: 14, lineHeight: 1.6 }}>
        {role === "mentee"
          ? "We found the people who already did. A hand-picked roster, a 12-week program, and proof you can put on a resume."
          : "20 founding mentors. A public Impact Score, a real talent pipeline, and a movement worth your name. Invitation only."}
      </div>
      {/* Structural facts about how the program is built — not performance
          claims. The numbers that used to sit here ("avg XP / cohort",
          "$56K lifetime earnings lift", "92% graduation rate") described
          outcomes the platform has not produced yet. */}
      <div style={{ display: "flex", gap: 14, marginTop: 36 }}>
        {(role === "mentee"
          ? [["12", "week program"], ["8", "verifiable badges"], ["3", "mentor seats"]]
          : [["20", "founding mentors"], ["12", "week cohort"], ["4", "mentor tiers"]]
        ).map(([n, l]) => (
          <div key={l} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, color: C.purple, letterSpacing: -0.4, lineHeight: 1 }}>{n}</div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gray, letterSpacing: 0.4, textTransform: "uppercase", marginTop: 8, lineHeight: 1.35 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
    <div style={{ paddingBottom: "max(36px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 14 }}>
      <Btn onClick={() => go("register")}>{role === "mentee" ? "Apply to the next cohort" : "Enter your invitation"}</Btn>
      <Btn kind="ghost" onClick={() => go("login")} style={{ background: C.white, border: `1.5px solid ${C.line}` }}>Sign in</Btn>
    </div>
  </div>
);

/* Exported for the founder console's gate, which offers the same Google path. */
export const GoogleMark = () => (
  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
);

/** `initialInvite` arrives from /app/#/join?code=… — a mentor who clicked
    through from the invitation email, so the code is already confirmed and
    shouldn't have to be retyped. It still gets re-validated below, and the
    claim itself is atomic and server-side. */
export const Register = ({ role, go, onDone, initialInvite = "" }) => {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [dob, setDob] = useState("");
  const [inv, setInv] = useState(initialInvite || "");
  const [inviteState, setInviteState] = useState("idle"); // idle|checking|valid|invalid
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const turnstile = useTurnstile();

  // Debounced, read-only check so the mentor sees VALID ✓ before committing.
  // The actual single-use claim is a separate atomic server-side operation.
  useEffect(() => {
    if (role !== "mentor") return;
    const code = inv.trim();
    if (!code) { setInviteState("idle"); return; }
    setInviteState("checking");
    const t = setTimeout(async () => {
      try {
        const { valid } = await validateInvite(code);
        setInviteState(valid ? "valid" : "invalid");
      } catch {
        setInviteState("invalid");
      }
    }, 450);
    return () => clearTimeout(t);
  }, [inv, role]);

  const submit = async () => {
    setErr(null);
    if (!name.trim()) return setErr("Enter your full name.");
    if (pw.length < 10) return setErr("Passwords need at least 10 characters.");
    if (role === "mentor" && inviteState !== "valid") return setErr("Enter a valid invitation code.");
    if (turnstile.required && !turnstile.token) return setErr("Complete the verification check.");

    setBusy(true);
    try {
      const { error } = await signUp.email(
        {
          name: name.trim(),
          email: email.trim(),
          password: pw,
          ...(dob ? { dateOfBirth: new Date(dob) } : {}),
        },
        turnstile.token
          ? { fetchOptions: { headers: { "x-captcha-response": turnstile.token } } }
          : undefined
      );
      if (error) throw error;

      /* Claim the invitation — mentee codes included. This ran for mentors
         only, on the reasoning that a mentee needs no promotion: `mentee` is
         already the default role, so the sign-up looked like it worked. What
         it skipped was everything else the claim does — spending the code so
         it stops working for the next person who gets the link, recording who
         accepted, and seating a company invite in the org that sent it. */
      const code = inv.trim();
      if (code) {
        // This path spends the code directly, so nothing is left for the
        // stash-based claim on the next boot to retry.
        clearPendingInvite();
        try {
          await redeemInvite(code);
        } catch (e) {
          // The account exists either way. A mentor whose claim fails would
          // land on the mentee side without being told, so surface it and let
          // them retry; a mentee is already where the code would have put them.
          if (role === "mentor") throw e;
          console.error("[ryzn] mentee invite claim failed:", e);
        }
      }

      onDone();
    } catch (e) {
      setErr(messageFor(e, "Couldn’t create your account. Try again."));
    } finally {
      setBusy(false);
    }
  };

  /* Google leaves the app and comes back to /app/ with no hash, so a code held
     only in this component dies on the round trip. Stash it first; RyznApp
     claims it on the way back, once there is a session to claim it with. */
  const google = () => {
    stashPendingInvite(inv.trim());
    signIn.social({ provider: "google", callbackURL: "/app/" });
  };

  const inviteBadge = {
    idle: null,
    checking: <span style={{ fontFamily: F.mono, fontSize: 9, color: C.gray, fontWeight: 700 }}>CHECKING…</span>,
    valid: <span style={{ fontFamily: F.mono, fontSize: 9, color: C.teal, fontWeight: 700 }}>VALID ✓</span>,
    invalid: <span style={{ fontFamily: F.mono, fontSize: 9, color: C.coral, fontWeight: 700 }}>NOT VALID</span>,
  }[inviteState];

  return (
    <div style={{ padding: "0 24px" }}>
      <button onClick={() => go("welcome")} style={{ background: "none", border: "none", cursor: "pointer", padding: "18px 0 0", margin: 0 }}><ArrowLeft size={20} color={C.ink} /></button>
      <div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 12 }}>{role === "mentee" ? "Create your account" : "Claim your invitation"}</div>
      <div style={{ fontSize: 13.5, color: C.gray, marginTop: 5 }}>{role === "mentee" ? "Two minutes to set up. XP starts counting immediately." : "The Roster is invitation-only. Your code was in the email."}</div>
      {role === "mentor" && (
        <div style={{ marginTop: 14 }}>
          <Label color={C.amber}>Invitation code</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.amberTint, border: `1px solid ${inviteState === "invalid" ? C.coral : C.amber}`, borderRadius: 12, marginTop: 7, padding: "12px 12px" }}>
            <Shield size={15} color={inviteState === "invalid" ? C.coral : C.amber} />
            <input value={inv} onChange={e => setInv(e.target.value)} placeholder="RYZ-INV-…" autoComplete="off" spellCheck={false}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: F.mono, fontSize: 16, color: C.ink, minWidth: 0, textTransform: "uppercase" }} />
            {inviteBadge}
          </div>
        </div>
      )}
      <Field label="Full name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
      <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
      <Field label="Password" type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password"
        right={<button onClick={() => setShow(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>{show ? <EyeOff size={16} color={C.gray} /> : <Eye size={16} color={C.gray} />}</button>} />
      {role === "mentee" && (
        // Captured at signup: backfilling DOB once you have real users is
        // painful, and under-18 accounts need guardian consent before any
        // mentor contact opens.
        <Field label="Date of birth" type="date" value={dob} onChange={e => setDob(e.target.value)} autoComplete="bday" />
      )}
      {turnstile.required && <div ref={turnstile.ref} style={{ marginTop: 16 }} />}
      <FormError>{err}</FormError>
      <Btn style={{ marginTop: 20 }} disabled={busy || (turnstile.required && !turnstile.token)} onClick={submit}>{busy ? "Creating…" : "Create account · +10 XP"}</Btn>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
        <div style={{ flex: 1, height: 1, background: C.line }} /><Label>or</Label><div style={{ flex: 1, height: 1, background: C.line }} />
      </div>
      <Btn kind="ghost" onClick={google}><GoogleMark /> Continue with Google</Btn>
      <div style={{ textAlign: "center", fontSize: 12.5, color: C.gray, margin: "16px 0 0" }}>Already in? <span onClick={() => go("login")} style={{ color: C.purple, fontWeight: 600, cursor: "pointer" }}>Sign in</span></div>
      <TeamsCrossSell />
    </div>
  );
};

/** Ryzn for Teams lives at #/teams in this same bundle — the Router in main.jsx
    picks it up off the hash, so this is a plain hash change, not a page load. */
export const TeamsCrossSell = ({ style }) => (
  <div style={{ textAlign: "center", margin: "18px 0 26px", ...style }}>
    <div style={{ height: 1, background: C.line, margin: "0 0 16px" }} />
    <div style={{ fontSize: 12.5, color: C.gray, lineHeight: 1.5 }}>Want to build your own company orbit?</div>
    <button onClick={() => { window.location.hash = "#/teams"; }} style={{
      marginTop: 8, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer",
      background: C.purpleTint, border: "none", borderRadius: 11, padding: "9px 14px",
      fontFamily: F.sans, fontWeight: 700, fontSize: 13, color: C.purple,
    }}><Users size={14} /> Get Ryzn for Teams <ChevronRight size={14} /></button>
  </div>
);

export const Login = ({ go, onDone, role }) => {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { error } = await signIn.email({ email: email.trim(), password: pw });
      if (error) throw error;
      onDone();
    } catch (e) {
      setErr(messageFor(e, "Couldn’t sign you in. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const google = () => signIn.social({ provider: "google", callbackURL: "/app/" });

  return (
    <div style={{ padding: "0 24px", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <button onClick={() => go("welcome")} style={{ background: "none", border: "none", cursor: "pointer", padding: "22px 0 0", alignSelf: "flex-start" }}><ArrowLeft size={20} color={C.ink} /></button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 20 }}>
        <div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.2 }}>Welcome back.</div>
        {/* Was "Day 34 of your streak is waiting." — a specific claim about a
            person the sign-in screen has not identified yet. */}
        <div style={{ fontSize: 14.5, color: C.gray, marginTop: 10, lineHeight: 1.5 }}>{role === "mentee" ? "Pick up where you left off." : "Your cohort kept moving. Catch up inside."}</div>
        <div style={{ marginTop: 10 }}>
          <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          <Field label="Password" type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password"
            onKeyDown={e => e.key === "Enter" && submit()}
            right={<button onClick={() => setShow(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>{show ? <EyeOff size={16} color={C.gray} /> : <Eye size={16} color={C.gray} />}</button>} />
        </div>
        <div onClick={() => go("forgot")} style={{ textAlign: "right", fontSize: 13, color: C.purple, fontWeight: 600, marginTop: 16, cursor: "pointer" }}>Forgot password?</div>
        <FormError>{err}</FormError>
        <Btn style={{ marginTop: 24 }} disabled={busy} onClick={submit}>{busy ? "Signing in…" : "Sign in"}</Btn>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.line }} /><Label>or</Label><div style={{ flex: 1, height: 1, background: C.line }} />
        </div>
        <Btn kind="ghost" onClick={google} style={{ background: C.white, border: `1.5px solid ${C.line}` }}><GoogleMark /> Continue with Google</Btn>
      </div>
      <div style={{ paddingBottom: "max(32px, env(safe-area-inset-bottom))", paddingTop: 8, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.gray }}>New here? <span onClick={() => go("register")} style={{ color: C.purple, fontWeight: 600, cursor: "pointer" }}>Create an account</span></div>
      </div>
    </div>
  );
};

// 4 digits is 10,000 combinations — too weak to guard an account reset,
// especially on a platform where most accounts belong to minors.
const OTP_LEN = 6;

export const Forgot = ({ go }) => {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(Array(OTP_LEN).fill(""));
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const boxes = useRef([]);

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, "").slice(-1);
    setCode(c => c.map((x, j) => (j === i ? d : x)));
    if (d && i < OTP_LEN - 1) boxes.current[i + 1]?.focus();
  };
  const onKey = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) boxes.current[i - 1]?.focus();
  };
  const otp = code.join("");

  const sendCode = async () => {
    setErr(null); setBusy(true);
    try {
      const { error } = await authClient.forgetPassword.emailOtp({ email: email.trim() });
      if (error) throw error;
      setStep("sent");
    } catch (e) {
      setErr(messageFor(e, "Couldn’t send the code. Check the address and try again."));
    } finally { setBusy(false); }
  };

  const savePassword = async () => {
    setErr(null); setBusy(true);
    try {
      const { error } = await authClient.emailOtp.resetPassword({ email: email.trim(), otp, password: pw });
      if (error) throw error;
      setStep("done");
    } catch (e) {
      // The OTP is only verified at this call, so a wrong code surfaces here.
      setErr(messageFor(e, "Couldn’t reset your password. Check the code and try again."));
    } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: "0 24px" }}>
      <button onClick={() => step === "email" || step === "done" ? go("login") : setStep(step === "reset" ? "sent" : "email")} style={{ background: "none", border: "none", cursor: "pointer", padding: "18px 0 0" }}><ArrowLeft size={20} color={C.ink} /></button>
      {step === "email" && <>
        <div style={{ width: 48, height: 48, background: C.purpleTint, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 16 }}><KeyRound size={20} color={C.purple} /></div>
        <div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 14 }}>Reset your password</div>
        <div style={{ fontSize: 13.5, color: C.gray, marginTop: 5, lineHeight: 1.5 }}>Enter your email. We’ll send a {OTP_LEN}-digit code — it expires in 10 minutes.</div>
        <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        <FormError>{err}</FormError>
        <Btn style={{ marginTop: 18 }} disabled={busy} onClick={sendCode}><Mail size={15} /> {busy ? "Sending…" : "Send reset code"}</Btn>
      </>}
      {step === "sent" && <>
        <div style={{ width: 48, height: 48, background: C.tealTint, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 16 }}><Mail size={20} color={C.teal} /></div>
        <div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 14 }}>Check your inbox</div>
        <div style={{ fontSize: 13.5, color: C.gray, marginTop: 5 }}>Code sent to <b style={{ color: C.ink }}>{email}</b>. Enter it below.</div>
        <div style={{ display: "flex", gap: 6, marginTop: 20, maxWidth: "100%" }}>
          {code.map((d, i) => (
            <input key={i} ref={el => (boxes.current[i] = el)} value={d} inputMode="numeric" autoComplete="one-time-code" maxLength={1}
              onChange={e => setDigit(i, e.target.value)} onKeyDown={e => onKey(i, e)}
              style={{ flex: 1, minWidth: 0, height: 58, textAlign: "center", fontFamily: F.mono, fontSize: 20, fontWeight: 700, border: `1.5px solid ${C.purple}`, borderRadius: 12, outline: "none", background: C.white, color: C.ink }} />
          ))}
        </div>
        <FormError>{err}</FormError>
        <Btn style={{ marginTop: 20 }} disabled={otp.length < OTP_LEN} onClick={() => setStep("reset")}>Verify code</Btn>
        <div style={{ textAlign: "center", fontFamily: F.mono, fontSize: 10.5, color: C.gray, marginTop: 14 }}>
          NO EMAIL? CHECK SPAM · <span onClick={sendCode} style={{ color: C.purple, cursor: "pointer", fontWeight: 700 }}>RESEND</span>
        </div>
      </>}
      {step === "reset" && <>
        <div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 20 }}>New password</div>
        <div style={{ fontSize: 13.5, color: C.gray, marginTop: 5 }}>Ten characters minimum. Make it one you’ll remember at 7 AM.</div>
        <Field label="New password" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••••" autoComplete="new-password" />
        <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: 4, background: pw.length > i * 4 ? C.teal : "#E2E1DC" }} />)}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 9.5, color: pw.length >= 10 ? C.teal : C.gray, marginTop: 5 }}>{pw.length >= 10 ? "STRONG ✓" : `${pw.length}/10 CHARACTERS`}</div>
        <FormError>{err}</FormError>
        <Btn style={{ marginTop: 18 }} disabled={pw.length < 10 || busy} onClick={savePassword}>{busy ? "Saving…" : "Save new password"}</Btn>
      </>}
      {step === "done" && <>
        <div style={{ width: 48, height: 48, background: C.tealTint, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 16 }}><Check size={22} color={C.teal} strokeWidth={3} /></div>
        <div style={{ fontFamily: F.sans, fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 14 }}>Password reset.</div>
        <div style={{ fontSize: 13.5, color: C.gray, marginTop: 5 }}>You’re back in. Your streak never noticed you were gone.</div>
        <Btn style={{ marginTop: 20 }} onClick={() => go("login")}>Back to sign in</Btn>
      </>}
    </div>
  );
};
