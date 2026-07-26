import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { Card, Label, Btn, Monogram, Field, XPPill, Ring, Bar, QR, BadgeGlyph, BadgeTile, Heatmap, HeaderRow, Glyph, TypingDots } from "./ui.jsx";

/* ————————————————— JOURNEY: AUTH ————————————————— */

export const Splash = ({ onEnter }) => (
  <div onClick={onEnter} style={{ position: "absolute", inset: 0, background: C.purple, zIndex: 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
    <div style={{ color: C.white, fontSize: 58, fontWeight: 700, letterSpacing: -2 }}>RYZN</div>
    <div style={{ color: "#DDD9F6", fontSize: 16, marginTop: 6, fontWeight: 500 }}>Rise now.</div>
    <div style={{ position: "absolute", bottom: 46, fontFamily: F.mono, fontSize: 10, letterSpacing: 2, color: "#B7AFF2" }}>TAP TO BEGIN · RYZN.ONE</div>
  </div>
);

export const Welcome = ({ role, go }) => (
  <div style={{ padding: "0 24px", height: "100%", display: "flex", flexDirection: "column" }}>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ color: C.purple, fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>RYZN</div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 18, lineHeight: 1.2 }}>
        {role === "mentee" ? <>You don’t need to figure this out alone.</> : <>You’re exactly who we built this for.</>}
      </div>
      <div style={{ fontSize: 15, color: C.gray, marginTop: 10, lineHeight: 1.55 }}>
        {role === "mentee"
          ? "We found the people who already did. A hand-picked roster, a 12-week program, and proof you can put on a resume."
          : "20 founding mentors. A public Impact Score, a real talent pipeline, and a movement worth your name. Invitation only."}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 22 }}>
        {(role === "mentee" ? [["2,140", "avg XP / cohort"], ["8", "verifiable badges"], ["$56K", "lifetime earnings lift"]] : [["847", "top Impact Score"], ["92%", "graduation rate"], ["4", "mentor tiers"]]).map(([n, l]) => (
          <div key={l}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.purple }}>{n}</div>
            <div style={{ fontFamily: F.mono, fontSize: 8, color: C.gray, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
    <div style={{ paddingBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
      <Btn onClick={() => go("register")}>{role === "mentee" ? "Apply to the next cohort" : "Enter your invitation"}</Btn>
      <Btn kind="ghost" onClick={() => go("login")}>Sign in</Btn>
    </div>
  </div>
);

export const Register = ({ role, go, onDone }) => {
  const [show, setShow] = useState(false);
  const [name, setName] = useState(role === "mentee" ? "Alex Reyes" : "Jordan Clarke");
  const [email, setEmail] = useState(role === "mentee" ? "alex@ryzn.one" : "jordan@harbourline.com");
  const [pw, setPw] = useState("••••••••••");
  const [inv, setInv] = useState("RYZ-INV-2026-0087");
  return (
    <div style={{ padding: "0 24px" }}>
      <button onClick={() => go("welcome")} style={{ background: "none", border: "none", cursor: "pointer", padding: "18px 0 0", margin: 0 }}><ArrowLeft size={20} color={C.ink} /></button>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 12 }}>{role === "mentee" ? "Create your account" : "Claim your invitation"}</div>
      <div style={{ fontSize: 13.5, color: C.gray, marginTop: 5 }}>{role === "mentee" ? "Two minutes to set up. XP starts counting immediately." : "The Roster is invitation-only. Your code was in the email."}</div>
      {role === "mentor" && (
        <div style={{ marginTop: 14 }}>
          <Label color={C.amber}>Invitation code</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.amberTint, border: `1px solid ${C.amber}`, borderRadius: 12, marginTop: 7, padding: "12px 12px" }}>
            <Shield size={15} color={C.amber} />
            <input value={inv} onChange={e => setInv(e.target.value)} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: F.mono, fontSize: 13, color: C.ink, minWidth: 0 }} />
            <span style={{ fontFamily: F.mono, fontSize: 9, color: C.teal, fontWeight: 700 }}>VALID ✓</span>
          </div>
        </div>
      )}
      <Field label="Full name" value={name} onChange={e => setName(e.target.value)} />
      <Field label="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <Field label="Password" type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)}
        right={<button onClick={() => setShow(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>{show ? <EyeOff size={16} color={C.gray} /> : <Eye size={16} color={C.gray} />}</button>} />
      <Btn style={{ marginTop: 20 }} onClick={onDone}>Create account · +10 XP</Btn>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
        <div style={{ flex: 1, height: 1, background: C.line }} /><Label>or</Label><div style={{ flex: 1, height: 1, background: C.line }} />
      </div>
      <Btn kind="ghost" onClick={onDone}><svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg> Continue with Google</Btn>
      <div style={{ textAlign: "center", fontSize: 12.5, color: C.gray, margin: "16px 0 24px" }}>Already in? <span onClick={() => go("login")} style={{ color: C.purple, fontWeight: 600, cursor: "pointer" }}>Sign in</span></div>
    </div>
  );
};

export const Login = ({ go, onDone, role }) => {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState(role === "mentee" ? "alex@ryzn.one" : "jordan@harbourline.com");
  const [pw, setPw] = useState("••••••••••");
  return (
    <div style={{ padding: "0 24px" }}>
      <button onClick={() => go("welcome")} style={{ background: "none", border: "none", cursor: "pointer", padding: "18px 0 0" }}><ArrowLeft size={20} color={C.ink} /></button>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 12 }}>Welcome back.</div>
      <div style={{ fontSize: 13.5, color: C.gray, marginTop: 5 }}>{role === "mentee" ? "Day 34 of your streak is waiting." : "Your cohort kept moving. Catch up inside."}</div>
      <Field label="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <Field label="Password" type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)}
        right={<button onClick={() => setShow(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>{show ? <EyeOff size={16} color={C.gray} /> : <Eye size={16} color={C.gray} />}</button>} />
      <div onClick={() => go("forgot")} style={{ textAlign: "right", fontSize: 12.5, color: C.purple, fontWeight: 600, marginTop: 10, cursor: "pointer" }}>Forgot password?</div>
      <Btn style={{ marginTop: 18 }} onClick={onDone}>Sign in</Btn>
      <div style={{ fontFamily: F.mono, fontSize: 9.5, color: "#A5A39D", textAlign: "center", marginTop: 12, letterSpacing: 0.6 }}>RETURNING USERS SKIP SETUP — STRAIGHT TO THE APP</div>
      <div style={{ textAlign: "center", fontSize: 12.5, color: C.gray, marginTop: 12 }}>New here? <span onClick={() => go("register")} style={{ color: C.purple, fontWeight: 600, cursor: "pointer" }}>Create an account</span></div>
    </div>
  );
};

export const Forgot = ({ go }) => {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("alex@ryzn.one");
  const [code, setCode] = useState(["8", "4", "2", "7"]);
  const [pw, setPw] = useState("");
  return (
    <div style={{ padding: "0 24px" }}>
      <button onClick={() => step === "email" || step === "done" ? go("login") : setStep(step === "reset" ? "sent" : "email")} style={{ background: "none", border: "none", cursor: "pointer", padding: "18px 0 0" }}><ArrowLeft size={20} color={C.ink} /></button>
      {step === "email" && <>
        <div style={{ width: 48, height: 48, background: C.purpleTint, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 16 }}><KeyRound size={20} color={C.purple} /></div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 14 }}>Reset your password</div>
        <div style={{ fontSize: 13.5, color: C.gray, marginTop: 5, lineHeight: 1.5 }}>Enter your email. We’ll send a 4-digit code — it expires in 10 minutes.</div>
        <Field label="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <Btn style={{ marginTop: 18 }} onClick={() => setStep("sent")}><Mail size={15} /> Send reset code</Btn>
      </>}
      {step === "sent" && <>
        <div style={{ width: 48, height: 48, background: C.tealTint, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 16 }}><Mail size={20} color={C.teal} /></div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 14 }}>Check your inbox</div>
        <div style={{ fontSize: 13.5, color: C.gray, marginTop: 5 }}>Code sent to <b style={{ color: C.ink }}>{email}</b>. Enter it below.</div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {code.map((d, i) => (
            <input key={i} value={d} maxLength={1} onChange={e => setCode(c => c.map((x, j) => j === i ? e.target.value : x))}
              style={{ width: 56, height: 60, textAlign: "center", fontFamily: F.mono, fontSize: 22, fontWeight: 700, border: `1.5px solid ${C.purple}`, borderRadius: 12, outline: "none", background: C.white, color: C.ink }} />
          ))}
        </div>
        <Btn style={{ marginTop: 20 }} onClick={() => setStep("reset")}>Verify code</Btn>
        <div style={{ textAlign: "center", fontFamily: F.mono, fontSize: 10.5, color: C.gray, marginTop: 14 }}>NO EMAIL? CHECK SPAM · RESEND IN 0:42</div>
      </>}
      {step === "reset" && <>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 20 }}>New password</div>
        <div style={{ fontSize: 13.5, color: C.gray, marginTop: 5 }}>Ten characters minimum. Make it one you’ll remember at 7 AM.</div>
        <Field label="New password" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••••" />
        <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: 4, background: pw.length > i * 4 ? C.teal : "#E2E1DC" }} />)}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 9.5, color: pw.length >= 10 ? C.teal : C.gray, marginTop: 5 }}>{pw.length >= 10 ? "STRONG ✓" : `${pw.length}/10 CHARACTERS`}</div>
        <Btn style={{ marginTop: 18 }} disabled={pw.length < 10} onClick={() => setStep("done")}>Save new password</Btn>
      </>}
      {step === "done" && <>
        <div style={{ width: 48, height: 48, background: C.tealTint, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 16 }}><Check size={22} color={C.teal} strokeWidth={3} /></div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 14 }}>Password reset.</div>
        <div style={{ fontSize: 13.5, color: C.gray, marginTop: 5 }}>You’re back in. Your streak never noticed you were gone.</div>
        <Btn style={{ marginTop: 20 }} onClick={() => go("login")}>Back to sign in</Btn>
      </>}
    </div>
  );
};

