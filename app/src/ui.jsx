import React, { useState, useEffect, useRef, useMemo, useId, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  Sparkles, Send, Eye, EyeOff, Mail, ArrowLeft, Check, Lock, Flame, Crown,
  Plus, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Linkedin, Award, Zap, User, MessageCircle,
  KeyRound, Shield, Home, MapPin, Bell, Settings, Calendar, Mic, Type,
  TrendingUp, LayoutGrid, ExternalLink, Users, School, LogOut, Play, FileText, Upload,
  X, SlidersHorizontal, RotateCcw, Search, Pencil, Trash2, Building2
} from "lucide-react";
import { C, F, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { logoSrc, Brand } from "./branding.js";
import { spring, t, modalPop, backdrop, T_FAST, T_SLOW } from "./motion.js";
import { useIsDesktop } from "./useIsDesktop.js";

/* ————— Brand marks (from public/branding/ryzn-brand-kit) ————— */
export const BrandLogo = ({
  variant = "horizontal",
  color = "purple",
  height = 28,
  alt = "Ryzn",
  style,
  ...rest
}) => (
  <img
    src={logoSrc(variant, color)}
    alt={alt}
    height={height}
    draggable={false}
    style={{ height, width: "auto", display: "block", ...style }}
    {...rest}
  />
);

export const BrandMark = ({ color = "purple", size = 28, alt = "Ryzn", style, ...rest }) => (
  <img
    src={logoSrc("mark", color)}
    alt={alt}
    width={size}
    height={size}
    draggable={false}
    style={{ width: size, height: size, display: "block", objectFit: "contain", ...style }}
    {...rest}
  />
);

export const BrandIcon = ({ size = 48, light = false, alt = "Ryzn", style, ...rest }) => (
  <img
    src={light ? Brand.icon.appLight : Brand.icon.app}
    alt={alt}
    width={size}
    height={size}
    draggable={false}
    style={{ width: size, height: size, display: "block", borderRadius: size * 0.235, ...style }}
    {...rest}
  />
);

/* ————— Primitives ————— */
export const Card = ({ style, children, onClick, className, ...rest }) => {
  const reduced = useReducedMotion();
  const base = { background: C.white, borderRadius: 18, border: `1px solid ${C.line}`, padding: 16, cursor: onClick ? "pointer" : "default", ...style };
  if (!onClick) return <div className={className} style={base} {...rest}>{children}</div>;
  return (
    <motion.div className={className} onClick={onClick} whileTap={reduced ? undefined : { scale: 0.985 }}
      whileHover={reduced ? undefined : { y: -2, boxShadow: "0 12px 28px rgba(26,26,26,.08)" }}
      transition={spring(reduced)} style={base} {...rest}>{children}</motion.div>
  );
};
export const FormError = ({ children }) => children ? (
  <div role="alert" style={{ display: "flex", alignItems: "flex-start", gap: 8, background: C.coralTint, border: `1px solid ${C.coral}`, borderRadius: 12, padding: "11px 12px", marginTop: 14, fontSize: 13, color: C.ink, lineHeight: 1.45 }}>
    <span style={{ color: C.coral, fontWeight: 700, lineHeight: 1.3 }}>!</span>
    <span>{children}</span>
  </div>
) : null;
export const Label = ({ children, color = C.gray, style }) => (
  <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color, ...style }}>{children}</div>
);
export const Btn = ({ children, kind = "primary", onClick, style, small, disabled, ...rest }) => {
  const kinds = {
    primary: { background: disabled ? "#C9C6E8" : C.purple, color: C.white },
    dark: { background: C.ink, color: C.white },
    ghost: { background: "transparent", color: C.ink, border: `1.5px solid ${C.ink}` },
    soft: { background: C.purpleTint, color: C.purple },
  };
  const reduced = useReducedMotion();
  return (
    <motion.button {...rest} onClick={disabled ? undefined : onClick}
      whileTap={disabled || reduced ? undefined : { scale: 0.97 }}
      transition={spring(reduced)}
      style={{
        fontFamily: F.sans, fontWeight: 600, border: "none", borderRadius: 12,
        cursor: disabled ? "default" : "pointer", display: "inline-flex", alignItems: "center",
        justifyContent: "center", gap: 8, padding: small ? "9px 14px" : "14px 18px",
        fontSize: small ? 13 : 15, width: small ? "auto" : "100%", ...kinds[kind], ...style,
      }}>{children}</motion.button>
  );
};
/* ————— Policy-facing primitives —————

   These four were each written twice, once in the consumer app and once in
   Teams, which is exactly the divergence v2 exists to end. A chip that means
   "this is the rule here" has to look identical on a phone and in a console, or
   the two stop reading as one product. No business logic lives in any of them.  */

/** Mono uppercase micro-label: tier, status, policy state, counts. */
export const Chip = ({ children, c = C.purple, bg = C.purpleTint, style }) => (
  <span style={{
    fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase",
    color: c, background: bg, padding: "4px 8px", borderRadius: 7, display: "inline-flex",
    alignItems: "center", gap: 5, whiteSpace: "nowrap", ...style,
  }}>{children}</span>
);

/** Segmented control. Drives Discover (3), Studio (2), Explore (2). */
export const Seg = ({ options, value, onChange, small, style }) => (
  <div style={{ display: "flex", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: 3, gap: 3, ...style }}>
    {options.map((o) => (
      <button key={o} onClick={() => onChange(o)} aria-pressed={value === o} style={{
        flex: 1, border: "none", borderRadius: 9, cursor: "pointer", padding: small ? "6px 8px" : "8px 10px",
        fontFamily: F.sans, fontWeight: 700, fontSize: small ? 11.5 : 12.5,
        background: value === o ? C.white : "transparent",
        color: value === o ? C.ink : C.gray,
        boxShadow: value === o ? "0 1px 3px rgba(26,26,26,.08)" : "none",
      }}>{o}</button>
    ))}
  </div>
);

/** Policy booleans only. Anything with a third state is a `Seg`, not a toggle. */
export const Toggle = ({ on, onChange, disabled, label }) => (
  <button role="switch" aria-checked={!!on} aria-label={label} disabled={disabled}
    onClick={disabled ? undefined : () => onChange(!on)}
    style={{
      width: 44, height: 26, borderRadius: 13, border: "none", padding: 3, flexShrink: 0,
      background: on ? C.purple : "#D8D6D0", cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.5 : 1, display: "flex", justifyContent: on ? "flex-end" : "flex-start",
    }}>
    <span style={{ width: 20, height: 20, borderRadius: 10, background: C.white, display: "block" }} />
  </button>
);

/**
 * The tab bar, with locks.
 *
 * `locked` is why this is a primitive rather than a map over buttons: a gated
 * tab renders *present and padlocked*, never hidden. Hiding it removes the goal
 * gradient — the mentee can't want a thing they can't see — and the padlock is
 * the single most load-bearing piece of the retention loop.
 *
 * `tabs` is [[id, label, Icon]]; a tab id present in `locked` is rendered with
 * the padlock and still fires `setTab`, because the locked screen is a designed
 * destination that explains the unlock condition, not a dead end.
 */
export const TabBar = ({ tabs, tab, setTab, locked = {} }) => (
  <nav style={{ display: "flex", borderTop: `1px solid ${C.line}`, background: C.white, flexShrink: 0 }}>
    {tabs.map(([id, label, Icon]) => {
      const on = tab === id;
      const isLocked = !!locked[id];
      return (
        <button key={id} onClick={() => setTab(id)} aria-current={on ? "page" : undefined}
          style={{
            flex: 1, border: "none", background: "transparent", cursor: "pointer",
            padding: "9px 2px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          }}>
          <span style={{ position: "relative", display: "block", lineHeight: 0 }}>
            <Icon size={19} color={on ? C.purple : isLocked ? C.mute : C.gray} />
            {isLocked && (
              <span style={{ position: "absolute", right: -6, top: -4, background: C.ink, borderRadius: 5, padding: 2, display: "flex" }}>
                <Lock size={8} color={C.white} />
              </span>
            )}
          </span>
          <span style={{ fontFamily: F.mono, fontSize: 8.5, letterSpacing: 0.5, textTransform: "uppercase", color: on ? C.purple : isLocked ? C.mute : C.gray }}>{label}</span>
        </button>
      );
    })}
  </nav>
);

/* ————— Settings chrome —————
   One sheet component serves both roles and all three orbit kinds; the sections
   inside it appear conditionally. See §6.4. */

export const Sheet = ({ title, onClose, children, footer }) => (
  <div className="app-scroll" style={{ position: "absolute", inset: 0, background: C.surface, zIndex: 60, display: "flex", flexDirection: "column" }}>
    <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: C.white, borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
      <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, display: "flex" }}>
        <X size={18} color={C.ink} />
      </button>
      <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 16 }}>{title}</span>
    </header>
    <div className="app-scroll sheet-up" style={{ flex: 1, overflowY: "auto", padding: 16 }}>{children}</div>
    {footer}
  </div>
);

export const SecLabel = ({ children }) => (
  <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 1.1, textTransform: "uppercase", color: C.purple, margin: "18px 2px 8px" }}>{children}</div>
);

/** A settings row: label, optional sub-line, control on the right. */
export const SettingRow = ({ label, sub, children, last }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "12px 0", borderBottom: last ? "none" : `1px solid ${C.line}` }}>
    <span style={{ minWidth: 0 }}>
      <span style={{ display: "block", fontFamily: F.sans, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{label}</span>
      {sub && <span style={{ display: "block", fontSize: 11.5, color: C.gray, marginTop: 2, lineHeight: 1.4 }}>{sub}</span>}
    </span>
    <span style={{ flexShrink: 0 }}>{children}</span>
  </div>
);

/**
 * A value that comes from somewhere else and cannot be edited here.
 *
 * In a company orbit, email and division come from SSO. Rendering them greyed
 * out with a padlock is a *trust signal*, not a limitation: it tells an employee
 * that their employer's directory is the source, and that Ryzn is not quietly
 * keeping a second copy of it. The identical screen in the public orbit makes
 * the same fields editable.
 */
export const Locked = ({ children }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: C.gray }}>
    {children} <Lock size={10} color={C.mute} />
  </span>
);

/* Name helpers. Every screen greets people by first name and stamps initials on
   cards, and every one of those was a bare `name.split(" ")` — one null name
   anywhere threw during render. A missing name is a real state (Google sign-in
   can return one), so it degrades to a dash rather than taking a screen down. */
export const firstNameOf = (name) => String(name ?? "").trim().split(/\s+/)[0] || "—";
export const initialsOf = (name) =>
  (String(name ?? "").trim() || "—").split(/\s+/).map(w => w[0]).slice(0, 2).join("");

/* Single-select onboarding answers used to land on the profile as string[]
   (chat submits `sel`). Callers that did `track.toUpperCase()` then threw
   during render and took the screen down via SectionBoundary. Coerce first. */
export const labelOf = (v) => String(Array.isArray(v) ? (v[0] ?? "") : (v ?? "")).trim();

/* An account with no name on it is a real state — Google sign-in can return
   one, and so can a user bootstrapped from the CLI. This used to be
   `name.split(" ")`, so a single null name anywhere on a screen threw inside
   render and the app-wide boundary replaced the whole app with "Something
   broke". Falling back to a dash is the same thing every caller already did. */
export const Monogram = ({ name, size = 44, bg = C.purpleTint, color = C.deep, radius = 12 }) => (
  <div style={{ width: size, height: size, borderRadius: radius, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>
    {initialsOf(name)}
  </div>
);

/* A picture where there is one, initials where there isn't — every place a
   person appears takes the same prop and neither case is a special case at the
   call site. Most accounts have no photo, so the monogram is the normal state,
   not a fallback for an error. A broken URL (a blob deleted out from under us)
   drops back to it too, rather than leaving the alt-text box browsers draw. */
export const Avatar = ({ src, name, size = 44, bg = C.purpleTint, color = C.deep, radius = 12, style }) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (!src || broken) return <Monogram name={name} size={size} bg={bg} color={color} radius={radius} />;
  return (
    <img src={src} alt={name ? `${name}’s profile picture` : "Profile picture"} onError={() => setBroken(true)}
      style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0, background: bg, display: "block", ...style }} />
  );
};

/* The strip behind a profile header. Falls back to a brand gradient rather than
   empty space, so a profile with no cover still reads as finished. The image is
   an <img> rather than a CSS background so a URL that fails to load can drop
   back to the gradient instead of leaving a blank band. */
export const Banner = ({ src, height = 104, radius = 0, children, style }) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return (
    <div style={{
      height, borderRadius: radius, position: "relative", overflow: "hidden",
      background: `linear-gradient(115deg, ${C.deep} 0%, ${C.purple} 55%, #7A6FE0 100%)`,
      ...style,
    }}>
      {src && !broken && (
        <img src={src} alt="" onError={() => setBroken(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      )}
      {children}
    </div>
  );
};
/* `rest` is load-bearing: every caller passes autoComplete, and the login screen
   passes onKeyDown for Enter-to-submit. Both used to be destructured away and
   dropped, so Enter did nothing and no password manager could fill the form. */
export const Field = ({ label, type = "text", right, ...rest }) => (
  <div style={{ marginTop: 18 }}>
    <Label>{label}</Label>
    <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, marginTop: 8, padding: "0 14px" }}>
      <input type={type} {...rest}
        style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "15px 2px", fontFamily: F.sans, fontSize: 16, color: C.ink, minWidth: 0 }} />
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
    // Two of the eight badge definitions carry no `code`, so an undefined seed
    // reaches here the moment either is earned and tapped — `for…of` on
    // undefined threw and took the whole app down with it.
    let h = 0; for (const ch of String(seed ?? "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
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
/* Compact trend line for a corner of a card — cumulative values in, a line
   (and, below two points, just a dashed placeholder) out. No fabricated
   points: a mentor with one post gets a two-point line, not a fake curve. */
export const Sparkline = ({ points = [], width = 84, height = 36, color = C.purple }) => {
  const gid = useId();
  if (!points || points.length < 2) {
    return (
      <svg width={width} height={height} style={{ display: "block" }}>
        <line x1={3} y1={height - 4} x2={width - 3} y2={height - 4} stroke={color} strokeWidth={1.5} strokeDasharray="1 4" strokeLinecap="round" opacity={0.4} />
      </svg>
    );
  }
  const pad = 3;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const stepX = (width - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => [pad + i * stepX, height - pad - ((p - min) / span) * (height - pad * 2)]);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${height} L${coords[0][0].toFixed(1)},${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r={2.5} fill={color} />
    </svg>
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
/* How much room a floating close button is taking out of the top-right corner,
   measured in from the right edge. Screens render the same JSX on phone and on
   desktop, so a header's `right` slot has no way of knowing that ModalShell has
   parked an X on top of it — this context is how the shell says so. Layers that
   cover the shell's chrome (DetailShell) reset it with <NoCloseGutter>. */
const CloseGutter = createContext(0);
export const NoCloseGutter = ({ children }) => (
  <CloseGutter.Provider value={0}>{children}</CloseGutter.Provider>
);

export const HeaderRow = ({ title, onBack, right }) => {
  const gutter = useContext(CloseGutter);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 14, paddingBottom: 10, paddingLeft: 20, paddingRight: Math.max(20, gutter) }}>
      {onBack && <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, margin: -4 }}><ChevronLeft size={22} color={C.ink} /></button>}
      {/* minWidth:0 lets a long title wrap instead of shoving `right` under the X. */}
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, flex: 1, minWidth: 0 }}>{title}</div>
      {right}
    </div>
  );
};
export const Glyph = ({ color = C.purple, size = 46 }) => (
  <svg width={size} height={size}><polygon points={`${size / 2},2 ${size - 2},${size / 2} ${size / 2},${size - 2} 2,${size / 2}`} fill={color} /></svg>
);
const CLOSE_SIZE = 32, CLOSE_INSET = 14, CLOSE_CLEARANCE = 10;
/* Everything the close button needs to itself, from the modal's right edge. */
const MODAL_CLOSE_GUTTER = CLOSE_INSET + CLOSE_SIZE + CLOSE_CLEARANCE;

export const ModalShell = ({ children, onClose }) => {
  const reduced = useReducedMotion();
  /* Portaled to <body> — this modal is opened from screens nested inside a
     Framer Motion page-transition wrapper (fadeSlide/sheet animate `y`),
     which leaves a CSS transform on that ancestor even at rest. A transform
     anywhere up the tree makes its box the containing block for our
     `position: fixed` overlay instead of the real viewport, so the backdrop
     and modal were sized to the page content's box and got clipped by the
     nearest `overflow: hidden` — cutting off the Save/Cancel row on mobile.
     Rendering into `document.body` escapes that ancestor chain entirely. */
  return createPortal(
    <motion.div onClick={onClose} variants={backdrop} initial="initial" animate="animate" exit="exit"
      transition={t(reduced, T_FAST)}
      style={{ position: "fixed", inset: 0, background: "rgba(20,16,40,.5)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <motion.div onClick={e => e.stopPropagation()} variants={modalPop} initial="initial" animate="animate" exit="exit"
        transition={t(reduced, T_SLOW)}
        style={{
          width: "min(94vw, 640px)", maxHeight: "min(78vh, 760px)", minHeight: 420,
          background: C.surface, borderRadius: 24, overflow: "hidden", position: "relative",
          display: "flex", flexDirection: "column", boxShadow: "0 40px 90px rgba(15,10,35,.35)",
        }}>
        <motion.button onClick={onClose} aria-label="Close" whileTap={reduced ? undefined : { scale: 0.9 }} transition={spring(reduced)}
          style={{ position: "absolute", top: CLOSE_INSET, right: CLOSE_INSET, zIndex: 5, width: CLOSE_SIZE, height: CLOSE_SIZE, borderRadius: CLOSE_SIZE / 2, border: "none", background: "rgba(26,26,26,.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={16} color={C.ink} />
        </motion.button>
        <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
          <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
            <CloseGutter.Provider value={MODAL_CLOSE_GUTTER}>{children}</CloseGutter.Provider>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

export const VideoCaptureModal = ({ title = "Record your video", hint, onClose, onDone }) => {
  const videoRef = useRef(null);
  const chunksRef = useRef([]);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState("choose"); // choose | live | recorded | error
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [file, setFile] = useState(null); // { url, blob, name }
  const timerRef = useRef(null);

  const stopStream = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  useEffect(() => () => { stopStream(); clearInterval(timerRef.current); }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setMode("live");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.play();
        }
      });
    } catch {
      setMode("error");
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : undefined;
    const rec = mime ? new MediaRecorder(streamRef.current, { mimeType: mime }) : new MediaRecorder(streamRef.current);
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const type = rec.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const url = URL.createObjectURL(blob);
      setFile({ url, blob, name: `recording.${ext}` });
      stopStream();
      setMode("recorded");
    };
    recorderRef.current = rec;
    rec.start();
    setRecording(true);
    setSecs(0);
    timerRef.current = setInterval(() => setSecs(s => s + 1), 1000);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setFile({ url, blob: f, name: f.name });
    stopStream();
    setMode("recorded");
  };

  const retake = () => {
    if (file?.url) URL.revokeObjectURL(file.url);
    setFile(null);
    setMode("choose");
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <ModalShell onClose={onClose}>
      <div style={{ padding: "24px 22px" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
        {hint && <div style={{ fontSize: 12.5, color: C.gray, marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}

        <div style={{ marginTop: 16, borderRadius: 16, overflow: "hidden", background: C.ink, aspectRatio: "16/10", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {mode === "choose" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "#B5B3AE" }}>
              <Play size={28} />
              <span style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 0.6 }}>NO VIDEO YET</span>
            </div>
          )}
          {mode === "error" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#E8A5A5", padding: 20, textAlign: "center" }}>
              <span style={{ fontFamily: F.mono, fontSize: 11 }}>CAMERA UNAVAILABLE</span>
              <span style={{ fontSize: 12, color: "#B5B3AE" }}>Check browser permissions, or upload a file instead.</span>
            </div>
          )}
          {mode === "live" && (
            <>
              <video ref={videoRef} playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {recording && (
                <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,.5)", padding: "5px 10px", borderRadius: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: "#E8544A" }} className="dot" />
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.white }}>{fmt(secs)}</span>
                </div>
              )}
            </>
          )}
          {mode === "recorded" && file && (
            <video src={file.url} controls playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {mode === "choose" && (<>
            <Btn style={{ flex: 1 }} onClick={startCamera}><Play size={15} /> Record with camera</Btn>
            <Btn kind="ghost" style={{ flex: 1 }} onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Upload file</Btn>
          </>)}
          {mode === "error" && (
            <Btn style={{ flex: 1 }} onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Upload file instead</Btn>
          )}
          {mode === "live" && !recording && (
            <Btn style={{ flex: 1 }} onClick={startRecording}>● Start recording</Btn>
          )}
          {mode === "live" && recording && (
            <Btn kind="dark" style={{ flex: 1 }} onClick={stopRecording}>■ Stop</Btn>
          )}
          {mode === "recorded" && (<>
            <Btn kind="ghost" style={{ flex: 1 }} onClick={retake}>Retake</Btn>
            <Btn style={{ flex: 1 }} onClick={() => onDone(file)}><Check size={15} /> Use this video</Btn>
          </>)}
        </div>
        <input ref={fileInputRef} type="file" accept="video/*" onChange={pickFile} style={{ display: "none" }} />
      </div>
    </ModalShell>
  );
};

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

export const Sidebar = ({ nav, tab, overlay, onSelect, role, name, adminConsole, org, onSettings, onLogout }) => {
  const reduced = useReducedMotion();
  const goTeams = () => { window.location.hash = "#/teams"; };
  return (
  <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${C.line}`, background: C.white, display: "flex", flexDirection: "column", height: "100%" }}>
    <div style={{ padding: "26px 22px 20px" }}>
      <BrandLogo variant="horizontal" color="purple" height={26} />
    </div>
    <div style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 2 }}>
      {nav.map(([id, Icon, label]) => {
        const active = tab === id && !overlay;
        return (
          <motion.button key={id} onClick={() => onSelect(id)} whileTap={reduced ? undefined : { scale: 0.98 }} transition={spring(reduced)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 12,
            border: "none", cursor: "pointer", textAlign: "left", fontFamily: F.sans, fontWeight: 600, fontSize: 14,
            background: active ? C.purpleTint : "transparent", color: active ? C.purple : C.ink, width: "100%",
            position: "relative",
          }}>
            {active && (
              <motion.div layoutId="sidebar-active" transition={spring(reduced)}
                style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 3, borderRadius: 2, background: C.purple }} />
            )}
            <Icon size={18} color={active ? C.purple : C.gray} strokeWidth={active ? 2.4 : 2} />
            {label}
          </motion.button>
        );
      })}
      {/* Mentors: Teams is a separate hash route (#/teams), so it sits under the
          in-app tabs as its own door — create org, roster, Activate Orbit. */}
      {role === "mentor" && (
        <motion.button type="button" onClick={goTeams} whileTap={reduced ? undefined : { scale: 0.98 }} transition={spring(reduced)}
          title="Ryzn for Teams"
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 12, marginTop: 8,
            border: `1px solid ${C.line}`, cursor: "pointer", textAlign: "left", fontFamily: F.sans, fontWeight: 600, fontSize: 14,
            background: C.surface, color: C.ink, width: "100%",
          }}>
          <Building2 size={18} color={C.purple} strokeWidth={2.2} />
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {org?.name || "Teams"}
          </span>
          <ExternalLink size={14} color={C.gray} />
        </motion.button>
      )}
    </div>
    <div style={{ padding: 14, borderTop: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
      <Monogram name={name || "—"} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || "—"}</div>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gray, letterSpacing: 0.6, textTransform: "uppercase" }}>{role}</div>
      </div>
      {adminConsole && (
        <button onClick={() => window.open("/app/#/admin", "_blank", "noopener")} title="Founder console"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" }}><Shield size={16} color={C.amber} /></button>
      )}
      <button onClick={onSettings} title="Settings" style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" }}><Settings size={16} color={C.gray} /></button>
      <button onClick={onLogout} title="Log out" style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" }}><LogOut size={16} color={C.gray} /></button>
    </div>
  </div>
  );
};

/* Containment for a screen that throws while rendering.

   There was one boundary, at the root, so any error in any panel replaced the
   entire app — sidebar, tab bar and all — with "Something broke. Refresh to
   rise again." and no way out but a manual browser refresh. Wrapping each
   screen keeps the failure in the panel that caused it: the nav still works,
   and moving to another tab (a changed `resetKey`) clears it without a reload. */
export class SectionBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error(`[ryzn] "${this.props.name || "screen"}" crashed:`, err, info); }
  componentDidUpdate(prev) {
    if (this.state.err && prev.resetKey !== this.props.resetKey) this.setState({ err: null });
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
        <Glyph color={C.coral} size={34} />
        <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>This screen didn’t load.</div>
        <div style={{ fontSize: 13, color: C.gray, lineHeight: 1.5, maxWidth: 300 }}>
          Nothing you did is lost. Try again, or move to another tab and come back.
        </div>
        <Btn small kind="soft" style={{ marginTop: 6 }} onClick={() => this.setState({ err: null })}>
          <RotateCcw size={14} /> Try again
        </Btn>
      </div>
    );
  }
}

export const TypingDots = () => (
  <div style={{ display: "flex", gap: 4, padding: "12px 14px", background: C.white, border: `1px solid ${C.line}`, borderRadius: "14px 14px 14px 4px", width: "fit-content" }}>
    {[0, 1, 2].map(i => <span key={i} className="dot" style={{ width: 6, height: 6, borderRadius: 3, background: "#B3AEE6", animationDelay: `${i * 0.15}s` }} />)}
  </div>
);

/* ————— Program timeline —————
   A mentor's authored phases, LinkedIn-timeline-styled (a vertical rail —
   visual inspiration only, no external LinkedIn integration). One component
   for three places: the Studio builder (editable), the mentor's own public
   preview (read-only, no one mentee's progress to show), and a mentee's own
   profile (read-only, with completedIds driving the checkmarks). */
const REWARD_COLOR = { purple: C.purple, teal: C.teal, coral: C.coral, amber: C.amber };
const REWARD_TINT = { purple: C.purpleTint, teal: C.tealTint, coral: C.coralTint, amber: C.amberTint };
const iconBtnStyle = { background: "none", border: "none", cursor: "pointer", padding: 5, display: "flex" };

const Textarea = ({ label, ...rest }) => (
  <div style={{ marginTop: 14 }}>
    <Label>{label}</Label>
    <textarea {...rest} style={{
      width: "100%", boxSizing: "border-box", border: `1px solid ${C.line}`, borderRadius: 12,
      marginTop: 7, padding: 12, fontFamily: F.sans, fontSize: 14, color: C.ink, resize: "vertical",
    }} />
  </div>
);

const PhaseForm = ({ initial, onCancel, onSave, onDirtyChange }) => {
  const [title, setTitle] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  const [duration, setDuration] = useState(initial.duration || "");
  const [hasReward, setHasReward] = useState(!!initial.reward);
  const [rewardLabel, setRewardLabel] = useState(initial.reward?.label || "");
  const [rewardDesc, setRewardDesc] = useState(initial.reward?.description || "");
  const [rewardColor, setRewardColor] = useState(initial.reward?.color || "purple");

  const save = () => {
    if (!title.trim()) return;
    onSave({
      id: initial.id || null,
      title: title.trim(),
      description: description.trim(),
      duration: duration.trim(),
      reward: hasReward && rewardLabel.trim()
        ? { label: rewardLabel.trim(), description: rewardDesc.trim(), color: rewardColor }
        : null,
    });
  };

  /* Reported up so the modal's backdrop click and X button can share the
     same "discard changes?" gate as the in-form Cancel button — an
     untouched form (or one restored to its original values) closes silently. */
  const dirty = title.trim() !== (initial.title || "")
    || description.trim() !== (initial.description || "")
    || duration.trim() !== (initial.duration || "")
    || hasReward !== !!initial.reward
    || (hasReward && rewardLabel.trim() !== (initial.reward?.label || ""))
    || (hasReward && rewardDesc.trim() !== (initial.reward?.description || ""));
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty]);

  return (
    <div style={{ padding: "20px 24px 24px" }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{initial.id ? "Edit phase" : "Add phase"}</div>
      <Field label="Phase title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kickoff & goal-setting" />
      <Field label="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Weeks 1–2" />
      <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="What a mentee does in this phase." />
      <div onClick={() => setHasReward((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, cursor: "pointer" }}>
        <div style={{ width: 20, height: 20, background: hasReward ? C.tealTint : "#EFEEEA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {hasReward && <Check size={12} color={C.teal} strokeWidth={3} />}
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Award a certificate or reward on completion</span>
      </div>
      {hasReward && (<>
        <Field label="Reward name" value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} placeholder="Product Fundamentals Certificate" />
        <Textarea label="Reward description" rows={2} value={rewardDesc} onChange={(e) => setRewardDesc(e.target.value)}
          placeholder="What earning this means." />
        <div style={{ marginTop: 14 }}>
          <Label>Accent color</Label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {Object.keys(REWARD_COLOR).map((c) => (
              <button key={c} type="button" onClick={() => setRewardColor(c)} aria-label={c} style={{
                width: 26, height: 26, borderRadius: "50%", background: REWARD_COLOR[c], cursor: "pointer",
                border: rewardColor === c ? `2px solid ${C.ink}` : "2px solid transparent", padding: 0,
              }} />
            ))}
          </div>
        </div>
      </>)}
      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <Btn kind="ghost" style={{ flex: 1 }} onClick={onCancel}>Cancel</Btn>
        <Btn style={{ flex: 1 }} disabled={!title.trim()} onClick={save}>Save phase</Btn>
      </div>
    </div>
  );
};

/**
 * `completedIds`: null when there's no single mentee to track progress for
 * (Studio builder, mentor's own public preview) — phases render numbered
 * instead of checked. An array (possibly empty) means real progress: checks,
 * a highlighted "current" phase, and reward pills only for phases actually
 * completed.
 *
 * `onSave`/`onDelete`/`onMove` receive one phase (or index) at a time; the
 * caller reconstructs the full array and persists it — this component never
 * calls the save API itself.
 */
export const ProgramTimeline = ({ phases = [], completedIds = null, editable = false, onSave, onDelete, onMove, onToggle, emptyText, autoOpenNew = false }) => {
  const isDesktop = useIsDesktop();
  const [editing, setEditing] = useState(null); // null | "new" | phase
  const dirtyRef = useRef(false);

  /* Auto-opening the form the instant this screen mounts drops a mobile
     mentor straight into a modal with zero context — they haven't even read
     what a "phase" is yet. Desktop has the whole page as context already;
     mobile gets a beat to look around first. */
  useEffect(() => {
    if (!autoOpenNew || phases.length > 0) return;
    if (isDesktop) { setEditing("new"); return; }
    const id = setTimeout(() => setEditing("new"), 900);
    return () => clearTimeout(id);
  }, [autoOpenNew, isDesktop]);

  const openEditing = (target) => { dirtyRef.current = false; setEditing(target); };
  const closeEditing = () => {
    if (dirtyRef.current && !window.confirm("Discard this phase? Your changes won’t be saved.")) return;
    setEditing(null);
  };

  if (!editable && phases.length === 0) return null;

  return (
    <>
      {phases.length === 0 && editable && emptyText !== "" && (
        <div className="fade-up" style={{ fontSize: 13, color: C.gray, lineHeight: 1.5, padding: "2px 0 16px" }}>
          {emptyText || "No phases yet — add the first step of your program."}
        </div>
      )}
      {phases.map((p, i) => {
        const done = !!completedIds?.includes(p.id);
        const current = !!completedIds && !done && phases.slice(0, i).every((ph) => completedIds.includes(ph.id));
        const showReward = p.reward && (!completedIds || done);
        return (
          <div key={p.id} className="fade-up" style={{ display: "flex", gap: 12, animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
              <div onClick={onToggle ? () => onToggle(p, !done) : undefined} style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 3,
                background: done ? C.teal : current ? C.purple : "#E6E5E1",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: onToggle ? "pointer" : "default",
              }}>
                {done
                  ? <Check size={11} color={C.white} strokeWidth={3} />
                  : !completedIds
                    ? <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, color: C.gray }}>{i + 1}</span>
                    : null}
              </div>
              {i < phases.length - 1 && (
                <div style={{ width: 2, flex: 1, minHeight: 22, marginTop: 2, background: done ? C.teal : "#E6E5E1", opacity: done ? 0.4 : 1 }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{p.title}</div>
                {editable && (
                  <div style={{ display: "flex", gap: 1, flexShrink: 0 }}>
                    {onMove && i > 0 && <button style={iconBtnStyle} onClick={() => onMove(i, -1)}><ChevronUp size={13} color={C.gray} /></button>}
                    {onMove && i < phases.length - 1 && <button style={iconBtnStyle} onClick={() => onMove(i, 1)}><ChevronDown size={13} color={C.gray} /></button>}
                    <button style={iconBtnStyle} onClick={() => openEditing(p)}><Pencil size={13} color={C.gray} /></button>
                    <button style={iconBtnStyle} onClick={() => { if (window.confirm(`Delete "${p.title}"?`)) onDelete(p.id); }}><Trash2 size={13} color={C.coral} /></button>
                  </div>
                )}
              </div>
              {p.duration && <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", letterSpacing: 0.5, marginTop: 3 }}>{p.duration.toUpperCase()}</div>}
              {p.description && <div style={{ fontSize: 12.5, color: C.gray, lineHeight: 1.5, marginTop: 6 }}>{p.description}</div>}
              {showReward && (
                <div style={{ marginTop: 9 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: REWARD_TINT[p.reward.color], color: REWARD_COLOR[p.reward.color], padding: "6px 10px", borderRadius: 10 }}>
                    <Award size={12} /><span style={{ fontSize: 12, fontWeight: 700 }}>{p.reward.label}</span>
                  </div>
                  {p.reward.description && <div style={{ fontSize: 11.5, color: C.gray, marginTop: 5, lineHeight: 1.4 }}>{p.reward.description}</div>}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {editable && (
        <Btn kind="soft" small onClick={() => openEditing("new")}><Plus size={14} /> Add phase</Btn>
      )}
      {editing && (
        <ModalShell onClose={closeEditing}>
          <PhaseForm
            initial={editing === "new" ? {} : editing}
            onCancel={closeEditing}
            onDirtyChange={(d) => { dirtyRef.current = d; }}
            onSave={(phase) => { onSave(phase); setEditing(null); }}
          />
        </ModalShell>
      )}
    </>
  );
};

