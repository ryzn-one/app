import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";

/* ————— Primitives ————— */
export const Card = ({ style, children, onClick }) => (
  <div onClick={onClick} style={{ background: C.white, borderRadius: 18, border: `1px solid ${C.line}`, padding: 16, cursor: onClick ? "pointer" : "default", ...style }}>{children}</div>
);
export const Label = ({ children, color = C.gray, style }) => (
  <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color, ...style }}>{children}</div>
);
export const FormError = ({ children }) => children ? (
  <div role="alert" style={{ display: "flex", alignItems: "flex-start", gap: 8, background: C.coralTint, border: `1px solid ${C.coral}`, borderRadius: 12, padding: "11px 12px", marginTop: 14, fontSize: 13, color: C.ink, lineHeight: 1.45 }}>
    <span style={{ color: C.coral, fontWeight: 700, lineHeight: 1.3 }}>!</span>
    <span>{children}</span>
  </div>
) : null;
export const Btn = ({ children, kind = "primary", onClick, style, small, disabled }) => {
  const kinds = {
    primary: { background: disabled ? "#C9C6E8" : C.purple, color: C.white },
    dark: { background: C.ink, color: C.white },
    ghost: { background: "transparent", color: C.ink, border: `1.5px solid ${C.ink}` },
    soft: { background: C.purpleTint, color: C.purple },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      fontFamily: F.sans, fontWeight: 600, border: "none", borderRadius: 12,
      cursor: disabled ? "default" : "pointer", display: "inline-flex", alignItems: "center",
      justifyContent: "center", gap: 8, padding: small ? "9px 14px" : "14px 18px",
      fontSize: small ? 13 : 15, width: small ? "auto" : "100%", ...kinds[kind], ...style,
    }}>{children}</button>
  );
};
export const Monogram = ({ name, size = 44, bg = C.purpleTint, color = C.deep, radius = 12 }) => (
  <div style={{ width: size, height: size, borderRadius: radius, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>
    {name.split(" ").map(w => w[0]).slice(0, 2).join("")}
  </div>
);
export const Field = ({ label, type = "text", placeholder, value, onChange, right }) => (
  <div style={{ marginTop: 14 }}>
    <Label>{label}</Label>
    <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, marginTop: 7, padding: "0 12px" }}>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "13px 2px", fontFamily: F.sans, fontSize: 15, color: C.ink, minWidth: 0 }} />
      {right}
    </div>
  </div>
);
export const XPPill = ({ xp, unit = "XP" }) => (
  <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, background: C.ink, color: "#B7AFF2", padding: "6px 10px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
    <Zap size={11} color="#B7AFF2" /> {xp} {unit}
  </span>
);
export const Ring = ({ pct, size = 96, stroke = 9, color = C.purple, track = "#E2E0F5", children }) => {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .9s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
};
export const Bar = ({ pct, color = C.purple, h = 6 }) => (
  <div style={{ height: h, background: "#E6E5E1", overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, pct * 100)}%`, height: "100%", background: color, transition: "width .6s ease" }} />
  </div>
);
export const QR = ({ seed, size = 120, dark = C.ink, light = C.white }) => {
  const n = 21;
  const cells = useMemo(() => {
    let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    let s = h || 7; const out = [];
    for (let i = 0; i < n * n; i++) { s = (s * 1103515245 + 12345) >>> 0; out.push((s >>> 16) & 1); }
    return out;
  }, [seed]);
  const u = size / n;
  const finder = (fx, fy) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx * u} y={fy * u} width={7 * u} height={7 * u} fill={dark} />
      <rect x={(fx + 1) * u} y={(fy + 1) * u} width={5 * u} height={5 * u} fill={light} />
      <rect x={(fx + 2) * u} y={(fy + 2) * u} width={3 * u} height={3 * u} fill={dark} />
    </g>
  );
  return (
    <svg width={size} height={size} style={{ display: "block", flexShrink: 0 }}>
      <rect width={size} height={size} fill={light} />
      {cells.map((c, i) => {
        const x = i % n, y = Math.floor(i / n);
        const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
        return c && !inF ? <rect key={i} x={x * u} y={y * u} width={u} height={u} fill={dark} /> : null;
      })}
      {finder(0, 0)}{finder(n - 7, 0)}{finder(0, n - 7)}
    </svg>
  );
};
export const BadgeGlyph = ({ i, color, size = 30 }) => {
  const s = size, g = [
    <polygon points={`${s / 2},2 ${s - 2},${s - 2} 2,${s - 2}`} fill={color} />,
    <rect x={s * 0.18} y={s * 0.18} width={s * 0.64} height={s * 0.64} fill={color} />,
    <circle cx={s / 2} cy={s / 2} r={s * 0.34} fill={color} />,
    <polygon points={`${s / 2},2 ${s - 2},${s / 2} ${s / 2},${s - 2} 2,${s / 2}`} fill={color} />,
    <g fill={color}><rect x={s * 0.16} y={s * 0.6} width={s * 0.18} height={s * 0.28} /><rect x={s * 0.42} y={s * 0.36} width={s * 0.18} height={s * 0.52} /><rect x={s * 0.68} y={s * 0.12} width={s * 0.18} height={s * 0.76} /></g>,
    <polygon points={`2,${s - 2} ${s / 2},2 ${s - 2},${s - 2} ${s / 2},${s * 0.62}`} fill={color} />,
    <g fill={color}><circle cx={s * 0.32} cy={s * 0.32} r={s * 0.16} /><circle cx={s * 0.68} cy={s * 0.68} r={s * 0.16} /><rect x={s * 0.28} y={s * 0.28} width={s * 0.44} height={s * 0.08} transform={`rotate(45 ${s / 2} ${s / 2})`} /></g>,
    <polygon points={`${s / 2},4 ${s * 0.62},${s * 0.38} ${s - 4},${s * 0.38} ${s * 0.68},${s * 0.58} ${s * 0.78},${s - 4} ${s / 2},${s * 0.74} ${s * 0.22},${s - 4} ${s * 0.32},${s * 0.58} 4,${s * 0.38} ${s * 0.38},${s * 0.38}`} fill={color} />,
  ];
  return <svg width={size} height={size}>{g[i % g.length]}</svg>;
};
export const BadgeTile = ({ badge, i, size = 72, onClick, justEarned }) => {
  const earned = !!badge.earned, color = TIER_COLOR[badge.tier];
  return (
    <div onClick={onClick} style={{ cursor: onClick ? "pointer" : "default", width: size }}>
      <div className={justEarned ? "badge-pop" : ""} style={{ width: size, height: size, background: earned ? C.white : "#EDECE8", border: `1.5px solid ${earned ? color : "#DBDAD5"}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {earned ? <BadgeGlyph i={i} color={color} size={size * 0.42} /> : <Lock size={size * 0.26} color="#B9B7B1" strokeWidth={2.2} />}
        {earned && <div style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, background: color }} />}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, marginTop: 6, color: earned ? C.ink : C.gray, lineHeight: 1.25 }}>{badge.name}</div>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 2 }}>{badge.when}</div>
    </div>
  );
};
export const Heatmap = ({ weeks = 6 }) => {
  const cells = useMemo(() => {
    const out = []; let s = 42;
    for (let i = 0; i < weeks * 7; i++) { s = (s * 1103515245 + 12345) >>> 0; out.push(weeks === 1 && i > 1 ? 0 : (s >>> 14) % 4); }
    if (weeks === 1) { out[0] = 3; out[1] = 2; }
    return out;
  }, [weeks]);
  const shades = ["#ECEBE7", "#C8C3EE", "#8F86DE", C.purple];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
      {cells.map((v, i) => <div key={i} style={{ aspectRatio: "1", background: shades[v], borderRadius: 3 }} />)}
    </div>
  );
};
export const HeaderRow = ({ title, onBack, right }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px 10px" }}>
    {onBack && <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, margin: -4 }}><ChevronLeft size={22} color={C.ink} /></button>}
    <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, flex: 1 }}>{title}</div>
    {right}
  </div>
);
export const Glyph = ({ color = C.purple, size = 46 }) => (
  <svg width={size} height={size}><polygon points={`${size / 2},2 ${size - 2},${size / 2} ${size / 2},${size - 2} 2,${size / 2}`} fill={color} /></svg>
);
export const ModalShell = ({ children, onClose }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,16,40,.5)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: "min(94vw, 640px)", height: "min(78vh, 760px)", minHeight: 420,
      background: C.surface, borderRadius: 24, position: "relative",
      display: "flex", flexDirection: "column", boxShadow: "0 40px 90px rgba(15,10,35,.35)",
    }}>
      <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, zIndex: 5, width: 32, height: 32, borderRadius: 16, border: "none", background: "rgba(26,26,26,.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <X size={16} color={C.ink} />
      </button>
      <div style={{ flex: 1, overflow: "hidden", borderRadius: 24 }}>
        <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  </div>
);

export const AuthCardShell = ({ children }) => (
  <div style={{
    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    background: "radial-gradient(120% 100% at 50% -10%, #F2F1EE 0%, #E9E8E4 45%, #DEDCD6 100%)",
  }}>
    <div style={{
      width: "min(94vw, 440px)", height: "min(82vh, 760px)", minHeight: 420,
      background: C.surface, borderRadius: 28, overflow: "hidden", position: "relative",
      boxShadow: "0 40px 90px rgba(15,10,35,.18), 0 0 0 1px rgba(0,0,0,.04)",
    }}>
      {children}
    </div>
  </div>
);

export const Sidebar = ({ nav, tab, overlay, onSelect, role, name, onSettings, onLogout }) => (
  <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${C.line}`, background: C.white, display: "flex", flexDirection: "column", height: "100%" }}>
    <div style={{ padding: "26px 22px 20px" }}>
      <div style={{ color: C.purple, fontSize: 22, fontWeight: 700, letterSpacing: -1 }}>RYZN</div>
    </div>
    <div style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 2 }}>
      {nav.map(([id, Icon, label]) => {
        const active = tab === id && !overlay;
        return (
          <button key={id} onClick={() => onSelect(id)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 12,
            border: "none", cursor: "pointer", textAlign: "left", fontFamily: F.sans, fontWeight: 600, fontSize: 14,
            background: active ? C.purpleTint : "transparent", color: active ? C.purple : C.ink, width: "100%",
          }}>
            <Icon size={18} color={active ? C.purple : C.gray} strokeWidth={active ? 2.4 : 2} />
            {label}
          </button>
        );
      })}
    </div>
    <div style={{ padding: 14, borderTop: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
      <Monogram name={name || "—"} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || "—"}</div>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gray, letterSpacing: 0.6, textTransform: "uppercase" }}>{role}</div>
      </div>
      <button onClick={onSettings} title="Settings" style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" }}><Settings size={16} color={C.gray} /></button>
      <button onClick={onLogout} title="Log out" style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" }}><LogOut size={16} color={C.gray} /></button>
    </div>
  </div>
);

export const TypingDots = () => (
  <div style={{ display: "flex", gap: 4, padding: "12px 14px", background: C.white, border: `1px solid ${C.line}`, borderRadius: "14px 14px 14px 4px", width: "fit-content" }}>
    {[0, 1, 2].map(i => <span key={i} className="dot" style={{ width: 6, height: 6, borderRadius: 3, background: "#B3AEE6", animationDelay: `${i * 0.15}s` }} />)}
  </div>
);

