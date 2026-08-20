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
import { C, F, S, R, SP, TIER_COLOR, DECK_COLORS } from "./theme.js";
import { logoSrc, Brand } from "./branding.js";
import { spring, t, modalPop, backdrop, T_FAST, T_SLOW } from "./motion.js";
import { useIsDesktop } from "./useIsDesktop.js";

/* ----- Brand marks (from public/branding/ryzn-brand-kit) ----- */
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

/* ----- Primitives ----- */

/**
 * The card.
 *
 * Flat by design: a hairline edge and no resting shadow. Depth is a signal, and
 * a screen where every card is lifted off the page has spent that signal on
 * nothing — the only things that should look like they float are the ones that
 * actually do (sheets, menus, modals). What separates one card from the next
 * here is the gap between them, which is why `SP.gap` is a token and why the
 * edge got quieter rather than heavier.
 *
 * `18/16`, not the old `16/14`. The tighter pair came from a reference built
 * before the cards carried this much inside them; at 14px of padding a row of
 * avatar + two lines of copy + a button touches its own edge on a 384px phone.
 *
 * Hover still lifts, because that is feedback about *this* card under *this*
 * pointer rather than a permanent property of the surface — and it is inert on
 * touch, where the tap scale does the same job.
 */
export const Card = ({ style, children, onClick, className, ...rest }) => {
  const reduced = useReducedMotion();
  const base = { background: C.white, borderRadius: R.card, border: `1px solid ${C.hair}`, padding: SP.pad, cursor: onClick ? "pointer" : "default", ...style };
  if (!onClick) return <div className={className} style={base} {...rest}>{children}</div>;
  return (
    <motion.div className={className} onClick={onClick} whileTap={reduced ? undefined : { scale: 0.985 }}
      whileHover={reduced ? undefined : { y: -2, boxShadow: "0 6px 18px rgba(26,26,26,.05)" }}
      transition={spring(reduced)} style={base} {...rest}>{children}</motion.div>
  );
};

/**
 * A card with nothing in it yet.
 *
 * Every "no mentor matched", "no sessions booked", "add another" on every
 * screen. It replaces 23 separate `1.5px dashed #CFCDC7` borders — a dotted
 * outline reads as *broken* or *drop target*, and it was being used to draw
 * attention to the parts of the product with the least in them. A flat tint one
 * step back from white recedes instead, which is the honest treatment: an empty
 * slot is a real state, not an error and not a construction site.
 *
 * Same geometry as `Card` so a ghost and a real card in the same column line up
 * on the pixel.
 */
export const GhostCard = ({ style, children, onClick, className, ...rest }) => {
  const reduced = useReducedMotion();
  const base = { background: C.ghost, borderRadius: R.card, border: "1px solid transparent", padding: SP.pad, cursor: onClick ? "pointer" : "default", ...style };
  if (!onClick) return <div className={className} style={base} {...rest}>{children}</div>;
  return (
    <motion.div className={className} onClick={onClick} whileTap={reduced ? undefined : { scale: 0.985 }}
      whileHover={reduced ? undefined : { background: "#EDECE8" }}
      transition={spring(reduced)} style={base} {...rest}>{children}</motion.div>
  );
};

/** The square behind an icon inside a card. Screens hand-rolled this ~30 times
    as a bare `width/height/background` div and none of them set a radius, so a
    rounded card kept ending up with hard-cornered chips inside it. */
export const IconTile = ({ size = 44, bg = C.purpleTint, radius = R.tile, children, style }) => (
  <div style={{ width: size, height: size, borderRadius: radius, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...style }}>
    {children}
  </div>
);

/**
 * One band of a screen: a label, an optional counter or action on the right,
 * and a column of cards under it at a fixed gap.
 *
 * The rhythm used to be per-call-site — the mentee home alone opened sections
 * at `marginTop: 22` and spaced the cards inside them at 10, 11 and 12 — so no
 * two bands on the same scroll agreed on where a group started or ended. One
 * component owns both distances now, and `first` is the only knob, for the
 * section that sits directly under a header and shouldn't push off it.
 */
export const Section = ({ title, right, first, children, style }) => (
  <div style={{ marginTop: first ? 0 : SP.sec, ...style }}>
    {(title || right) && (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 11 }}>
        {title ? <Label>{title}</Label> : <span />}
        {right}
      </div>
    )}
    <div style={{ display: "flex", flexDirection: "column", gap: SP.gap }}>{children}</div>
  </div>
);
export const FormError = ({ children }) => children ? (
  <div role="alert" style={{ display: "flex", alignItems: "flex-start", gap: 8, background: C.coralTint, border: `1px solid ${C.coral}`, borderRadius: 12, padding: "11px 12px", marginTop: 14, fontSize: 13, color: C.ink, lineHeight: 1.45 }}>
    <span style={{ color: C.coral, fontWeight: 700, lineHeight: 1.3 }}>!</span>
    <span>{children}</span>
  </div>
) : null;
export const Label = ({ children, color = C.gray, style }) => (
  <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color, ...style }}>{children}</div>
);
/**
 * The button.
 *
 * Five looks, under both the app's names and the reference's, because the two
 * halves of this codebase spell the same button differently and renaming 84
 * call sites to fix a colour is how a design pass stalls:
 *
 *   solid  = dark    (ink)      purple = primary (brand)
 *   tint   = soft    (lilac)    ghost  (hairline)     danger (coral)
 *
 * Geometry is the reference's: 11/16 at 13.5, 7/12 at 12, radius 12. The old
 * 14/18 at 15 made every CTA a third taller than the design it came from.
 */
const BTN_KINDS = {
  solid: { background: C.ink, color: C.white, border: "none" },
  dark: { background: C.ink, color: C.white, border: "none" },
  purple: { background: C.purple, color: C.white, border: "none" },
  primary: { background: C.purple, color: C.white, border: "none" },
  ghost: { background: "transparent", color: C.ink, border: `1px solid ${C.line}` },
  tint: { background: C.purpleTint, color: C.deep, border: "none" },
  soft: { background: C.purpleTint, color: C.deep, border: "none" },
  danger: { background: C.coralTint, color: C.coral, border: "none" },
};
export const Btn = ({ children, kind = "primary", onClick, style, small, disabled, ...rest }) => {
  const reduced = useReducedMotion();
  return (
    <motion.button {...rest} onClick={disabled ? undefined : onClick}
      whileTap={disabled || reduced ? undefined : { scale: 0.97 }}
      transition={spring(reduced)}
      style={{
        fontFamily: F.sans, fontWeight: 600, borderRadius: 12,
        cursor: disabled ? "default" : "pointer", display: "inline-flex", alignItems: "center",
        justifyContent: "center", gap: 6, padding: small ? "7px 12px" : "11px 16px",
        fontSize: small ? 12 : 13.5, width: small ? "auto" : "100%",
        ...(BTN_KINDS[kind] || BTN_KINDS.primary),
        opacity: disabled ? 0.45 : 1,
        ...style,
      }}>{children}</motion.button>
  );
};
/* ----- Policy-facing primitives -----

   These four were each written twice, once in the consumer app and once in
   Teams, which is exactly the divergence v2 exists to end. A chip that means
   "this is the rule here" has to look identical on a phone and in a console, or
   the two stop reading as one product. No business logic lives in any of them.  */

/** Mono uppercase micro-label: tier, status, policy state, counts. A full pill,
    not a 7px-radius rectangle, which is the shape everything else on a card
    (avatars aside) is cut to. */
export const Chip = ({ children, c = C.purple, bg = C.purpleTint, style }) => (
  <span style={{
    fontFamily: F.mono, fontSize: 8.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase",
    color: c, background: bg, padding: "3px 9px", borderRadius: 999, display: "inline-flex",
    alignItems: "center", gap: 4, whiteSpace: "nowrap", ...style,
  }}>{children}</span>
);

/**
 * Segmented control. Drives Discover (3), Studio (2), Explore (2).
 *
 * Hugs its content rather than stretching edge to edge: the reference's segment
 * is a compact chip parked at the top-left of a screen, and a full-bleed bar
 * reads as a tab strip, which is a different control with a different promise.
 * Pass `style={{ display: "flex" }}` where a caller really does want the width.
 *
 * `options` takes plain strings or `[value, label]` pairs, Teams passes pairs
 * and used to render "mentorsMentors" into the button.
 */
export const Seg = ({ options = [], value, onChange, small, style }) => (
  <div style={{ display: "inline-flex", background: C.ghost, borderRadius: 10, padding: 3, gap: 2, ...style }}>
    {options.map((o) => {
      const [val, label] = Array.isArray(o) ? o : [o, o];
      const on = value === val;
      return (
        <button key={val} onClick={() => onChange(val)} aria-pressed={on} style={{
          border: "none", borderRadius: 8, cursor: "pointer", padding: small ? "5px 10px" : "7px 13px",
          fontFamily: F.sans, fontWeight: 600, fontSize: small ? 11 : 12,
          background: on ? C.white : "transparent",
          color: on ? C.ink : C.gray,
          boxShadow: on ? "0 1px 3px rgba(0,0,0,.08)" : "none",
        }}>{label}</button>
      );
    })}
  </div>
);

/** Policy booleans only. Anything with a third state is a `Seg`, not a toggle. */
export const Toggle = ({ on, onChange, disabled, label }) => (
  <button role="switch" aria-checked={!!on} aria-label={label} disabled={disabled}
    onClick={disabled ? undefined : () => onChange(!on)}
    style={{
      width: 38, height: 22, borderRadius: 999, border: "none", flexShrink: 0, position: "relative",
      background: on ? C.purple : "#D8D6D0", cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.5 : 1, transition: "background .15s",
    }}>
    <span style={{ position: "absolute", top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: C.white, display: "block", transition: "left .15s" }} />
  </button>
);

/**
 * The tab bar, with locks.
 *
 * `locked` is why this is a primitive rather than a map over buttons: a gated
 * tab renders *present and padlocked*, never hidden. Hiding it removes the goal
 * gradient, the mentee can't want a thing they can't see, and the padlock is
 * the single most load-bearing piece of the retention loop.
 *
 * `tabs` is [[id, label, Icon]]; a tab id present in `locked` is rendered with
 * the padlock and still fires `setTab`, because the locked screen is a designed
 * destination that explains the unlock condition, not a dead end.
 */
export const TabBar = ({ tabs, tab, setTab, locked = {} }) => (
  <nav className="mobile-tab-bar" style={{ borderTop: `1px solid ${C.line}` }}>
    {tabs.map(([id, label, Icon]) => {
      const on = tab === id;
      const isLocked = !!locked[id];
      return (
        <button key={id} onClick={() => setTab(id)} aria-current={on ? "page" : undefined}
          style={{
            flex: 1, border: "none", background: "none", cursor: "pointer",
            padding: "6px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            position: "relative",
          }}>
          <Icon size={20} color={on ? C.purple : C.mute} strokeWidth={on ? 2.4 : 2} />
          {isLocked && <Lock size={9} color={C.coral} style={{ position: "absolute", top: 2, right: "26%" }} />}
          <span style={{
            fontFamily: F.mono, fontSize: 8, letterSpacing: 0.6, textTransform: "uppercase",
            color: on ? C.purple : C.mute, fontWeight: on ? 700 : 400,
          }}>{label}</span>
        </button>
      );
    })}
  </nav>
);

/* ----- the top bar -----
   The strip the reference puts above every tab: which orbit you are standing
   in on the left, then the counters that make progress legible without opening
   a screen (streak, XP or Impact), the bell, and your own face as the way into
   Settings. The app had none of this — the orbit switcher was a separate line
   that appeared only with two orbits, and streak/XP were buried inside Home,
   so four of the five tabs showed no progress at all. */
export const TopBar = ({ orbit, orbits = [], onSwitchOrbit, right }) => {
  const [open, setOpen] = useState(false);
  const many = orbits.length > 1;
  const Icon = orbit?.icon;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 8px",
      paddingTop: "calc(10px + env(safe-area-inset-top, 0px))",
      background: C.surface, borderBottom: `1px solid ${C.line}`, position: "relative", flexShrink: 0,
    }}>
      {orbit && (
        <div style={{ position: "relative", minWidth: 0 }}>
          <button onClick={() => many && setOpen(v => !v)} style={{
            display: "flex", alignItems: "center", gap: 7, border: `1px solid ${C.line}`,
            background: C.white, borderRadius: 999, padding: "6px 11px", cursor: many ? "pointer" : "default",
            maxWidth: 190,
          }}>
            {Icon && <Icon size={13} color={orbit.accent || C.purple} style={{ flexShrink: 0 }} />}
            <span style={{ textAlign: "left", minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: F.sans, fontWeight: 700, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orbit.name}</span>
              <span style={{ display: "block", ...S.mono(5.5, C.mute) }}>{orbit.tag}</span>
            </span>
            {many && <ChevronDown size={12} color={C.mute} style={{ marginLeft: 2, flexShrink: 0 }} />}
          </button>
          {open && many && (
            <div className="sheet-up" style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0, background: C.white,
              border: `1px solid ${C.line}`, borderRadius: 14, boxShadow: "0 8px 24px rgba(26,26,26,.12)",
              zIndex: 101, minWidth: 220,
            }}>
              {orbits.map((o, i) => (
                <button key={o.id} onClick={() => { onSwitchOrbit?.(o.id); setOpen(false); }} style={{
                  display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "12px 14px",
                  border: "none", background: "none", cursor: "pointer", textAlign: "left",
                  borderBottom: i < orbits.length - 1 ? `1px solid ${C.line}` : "none",
                }}>
                  {o.icon && <o.icon size={13} color={o.accent || C.purple} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.sb(12.5)}>{o.name}</div>
                    <div style={S.mono(7.5, C.mute)}>{o.tag}</div>
                  </div>
                  {o.id === orbit.id && <div style={{ width: 6, height: 6, borderRadius: 3, background: C.teal, flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {open && many && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 100 }} />}
      <span style={{ flex: 1 }} />
      {right}
    </div>
  );
};

/** A round icon button sized for the TopBar's right slot, with an unread dot. */
export const BarBtn = ({ onClick, children, dot, title }) => (
  <button onClick={onClick} title={title} style={{
    position: "relative", border: `1px solid ${C.line}`, background: C.white, borderRadius: 999,
    minWidth: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", padding: "0 8px", gap: 5, flexShrink: 0,
  }}>
    {children}
    {dot && <span style={{ position: "absolute", top: 6, right: 7, width: 7, height: 7, borderRadius: 4, background: C.coral, border: `1.5px solid ${C.white}` }} />}
  </button>
);

/* ----- Settings chrome -----
   One sheet component serves both roles and all three orbit kinds; the sections
   inside it appear conditionally. See §6.4. */

/* A pushed full-screen layer. Ink header with a back chevron, not a white one
   with an X: the reference uses the dark bar to say "this is on top of the app"
   in a way an X on white never did, and the same chrome carries Settings,
   Notifications and every other sheet. */
export const Sheet = ({ title, onClose, children, footer, dark = true }) => (
  <div className="sheet-up" style={{ position: "absolute", inset: 0, background: C.surface, zIndex: 60, display: "flex", flexDirection: "column" }}>
    <header style={{
      display: "flex", alignItems: "center", gap: 10, padding: "13px 14px",
      paddingTop: "calc(13px + env(safe-area-inset-top, 0px))",
      background: dark ? C.ink : C.white, borderBottom: dark ? "none" : `1px solid ${C.line}`, flexShrink: 0,
    }}>
      <button onClick={onClose} aria-label="Close" style={{
        border: "none", background: dark ? "rgba(255,255,255,.15)" : "#EFEEE9", borderRadius: 9,
        width: 30, height: 30, cursor: "pointer", color: dark ? C.white : C.ink,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <ChevronLeft size={16} />
      </button>
      <span style={S.h(15, dark ? C.white : C.ink)}>{title}</span>
    </header>
    <div className="app-scroll" style={{
      flex: 1, overflowY: "auto", padding: 14,
      paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
      display: "flex", flexDirection: "column", gap: 11,
    }}>{children}</div>
    {footer}
  </div>
);

/* Sits inside a Card in most screens, so it carries only its own bottom margin.
   Used as a standalone row in a gapped column (Settings), pass
   `style={{ marginTop: 8, marginBottom: -2 }}` so it groups with the card
   below it rather than floating between two. */
export const SecLabel = ({ children, style }) => (
  <div style={{ ...S.mono(8, C.purple), marginBottom: 9, ...style }}>{children}</div>
);

/** A settings row: label, optional sub-line, control on the right. */
export const SettingRow = ({ label, sub, children, last }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: last ? "none" : `1px solid ${C.line}` }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={S.sb(12.5)}>{label}</div>
      {sub && <div style={S.b(11, C.gray)}>{sub}</div>}
    </div>
    {children}
  </div>
);
/** The reference's name for the same row. */
export const Row = SettingRow;

/**
 * A value that comes from somewhere else and cannot be edited here.
 *
 * In a company orbit, email and division come from SSO. Rendering them greyed
 * out with a padlock is a *trust signal*, not a limitation: it tells an employee
 * that their employer's directory is the source, and that Ryzn is not quietly
 * keeping a second copy of it. The identical screen in the public orbit makes
 * the same fields editable.
 */
export const Locked = ({ v, children }) => (
  <span style={{ ...S.b(12, C.gray), display: "inline-flex", alignItems: "center", gap: 5 }}>
    {v ?? children} <Lock size={10} color={C.mute} />
  </span>
);

/* Name helpers. Every screen greets people by first name and stamps initials on
   cards, and every one of those was a bare `name.split(" ")`, one null name
   anywhere threw during render. A missing name is a real state (Google sign-in
   can return one), so it degrades to a dash rather than taking a screen down. */
export const firstNameOf = (name) => String(name ?? "").trim().split(/\s+/)[0] || "-";
export const initialsOf = (name) =>
  (String(name ?? "").trim() || "-").split(/\s+/).map(w => w[0]).slice(0, 2).join("");

/* Single-select onboarding answers used to land on the profile as string[]
   (chat submits `sel`). Callers that did `track.toUpperCase()` then threw
   during render and took the screen down via SectionBoundary. Coerce first. */
export const labelOf = (v) => String(Array.isArray(v) ? (v[0] ?? "") : (v ?? "")).trim();

/* An account with no name on it is a real state, Google sign-in can return
   one, and so can a user bootstrapped from the CLI. This used to be
   `name.split(" ")`, so a single null name anywhere on a screen threw inside
   render and the app-wide boundary replaced the whole app with "Something
   broke". Falling back to a dash is the same thing every caller already did. */
export const Monogram = ({ name, size = 40, bg = C.purpleTint, color = C.deep, radius = 12 }) => (
  <div style={{ width: size, height: size, borderRadius: radius, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.sans, fontWeight: 700, fontSize: size * 0.34, flexShrink: 0 }}>
    {initialsOf(name)}
  </div>
);

/* A picture where there is one, initials where there isn't, every place a
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
export const Ring = ({ pct, size = 84, stroke = 8, color = C.purple, track = "#E9E7F5", children }) => {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(1, pct || 0))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .5s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
};
/* `pct` is a fraction (0…1), which is what every call site already passes.
   Rounded ends and a rounded track, so it reads as the same family as Ring. */
export const Bar = ({ pct, color = C.purple, h = 6 }) => (
  <div style={{ height: h, background: "#EFEEE9", borderRadius: h, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, (pct || 0) * 100)}%`, height: "100%", background: color, borderRadius: h, transition: "width .4s ease" }} />
  </div>
);
export const QR = ({ seed, size = 120, dark = C.ink, light = C.white }) => {
  const n = 21;
  const cells = useMemo(() => {
    // Two of the eight badge definitions carry no `code`, so an undefined seed
    // reaches here the moment either is earned and tapped, `for…of` on
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
/* The reference's six glyphs, in its order, then the two extra the app needs
   for badges 7 and 8. Order is load-bearing: a badge is identified by its shape
   as much as its name, so reshuffling these renames every badge people hold. */
export const BadgeGlyph = ({ i, color, size = 26 }) => {
  const s = size, g = [
    <polygon points={`${s / 2},2 ${s - 2},${s / 2} ${s / 2},${s - 2} 2,${s / 2}`} fill={color} />,
    <circle cx={s / 2} cy={s / 2} r={s / 2 - 2} fill={color} />,
    <rect x={3} y={3} width={s - 6} height={s - 6} rx={5} fill={color} />,
    <polygon points={`${s / 2},2 ${s - 2},${s - 2} 2,${s - 2}`} fill={color} />,
    <polygon points={`${s / 2},2 ${s * 0.93},${s * 0.35} ${s * 0.78},${s * 0.9} ${s * 0.22},${s * 0.9} ${s * 0.07},${s * 0.35}`} fill={color} />,
    <rect x={s * 0.18} y={s * 0.18} width={s * 0.64} height={s * 0.64} rx={4} fill={color} transform={`rotate(45 ${s / 2} ${s / 2})`} />,
    <g fill={color}><rect x={s * 0.16} y={s * 0.6} width={s * 0.18} height={s * 0.28} rx={2} /><rect x={s * 0.42} y={s * 0.36} width={s * 0.18} height={s * 0.52} rx={2} /><rect x={s * 0.68} y={s * 0.12} width={s * 0.18} height={s * 0.76} rx={2} /></g>,
    <polygon points={`${s / 2},4 ${s * 0.62},${s * 0.38} ${s - 4},${s * 0.38} ${s * 0.68},${s * 0.58} ${s * 0.78},${s - 4} ${s / 2},${s * 0.74} ${s * 0.22},${s - 4} ${s * 0.32},${s * 0.58} 4,${s * 0.38} ${s * 0.38},${s * 0.38}`} fill={color} />,
  ];
  return <svg width={size} height={size}>{g[i % g.length]}</svg>;
};
export const BadgeTile = ({ badge, i, size = 72, onClick, justEarned }) => {
  const earned = !!badge.earned, color = TIER_COLOR[badge.tier];
  return (
    <div onClick={onClick} style={{ cursor: onClick ? "pointer" : "default", width: size }}>
      <div className={justEarned ? "badge-pop" : ""} style={{ width: size, height: size, borderRadius: R.tile, background: earned ? C.white : C.ghost, border: `1.5px solid ${earned ? color : "#DBDAD5"}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {earned ? <BadgeGlyph i={i} color={color} size={size * 0.42} /> : <Lock size={size * 0.26} color="#B9B7B1" strokeWidth={2.2} />}
        {earned && <div style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: color }} />}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, marginTop: 6, color: earned ? C.ink : C.gray, lineHeight: 1.25 }}>{badge.name}</div>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 2 }}>{badge.when}</div>
    </div>
  );
};
/* Compact trend line for a corner of a card, cumulative values in, a line
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
/* Weeks run left to right, days top to bottom, the way every contribution grid
   people already read does. It used to be a 7-wide grid filled row-major, so
   six weeks rendered as six rows of days and the column-per-week reading
   (which is the only reason a heatmap beats a bar) was simply absent. */
export const Heatmap = ({ weeks = 6, seed = 42 }) => {
  const cells = useMemo(() => {
    const out = []; let s = seed;
    for (let i = 0; i < weeks * 7; i++) { s = (s * 16807) % 2147483647; out.push(s % 4); }
    return out;
  }, [weeks, seed]);
  const shades = ["#ECEBE7", "#C8C3EE", "#8F86DE", C.purple];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${weeks}, 1fr)`, gridAutoFlow: "column", gridTemplateRows: "repeat(7, 1fr)", gap: 3 }}>
      {cells.map((v, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: 3, background: shades[v] }} />)}
    </div>
  );
};
/* How much room a floating close button is taking out of the top-right corner,
   measured in from the right edge. Screens render the same JSX on phone and on
   desktop, so a header's `right` slot has no way of knowing that ModalShell has
   parked an X on top of it, this context is how the shell says so. Layers that
   cover the shell's chrome (DetailShell) reset it with <NoCloseGutter>. */
const CloseGutter = createContext(0);
export const NoCloseGutter = ({ children }) => (
  <CloseGutter.Provider value={0}>{children}</CloseGutter.Provider>
);

export const HeaderRow = ({ title, onBack, right }) => {
  const gutter = useContext(CloseGutter);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 14, paddingBottom: 10, paddingLeft: 16, paddingRight: Math.max(16, gutter) }}>
      {onBack && (
        <button onClick={onBack} style={{ border: "none", background: "#EFEEE9", borderRadius: 10, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ChevronLeft size={16} color={C.ink} />
        </button>
      )}
      {/* minWidth:0 lets a long title wrap instead of shoving `right` under the X. */}
      <div style={{ ...S.h(17), flex: 1, minWidth: 0 }}>{title}</div>
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

/* The card's height is normally `auto` so a short modal hugs its content. That
   makes every `height: 100%` inside it resolve to `auto` as well, a percentage
   height needs a *definite* containing block, and `min-height`/`max-height`
   alone do not make one. A screen that lays itself out as a full-height flex
   column (a header, then something with `flex: 1`) therefore collapses to its
   header: that is how Discover's map ended up invisible inside this modal.

   `fill` opts a screen into a definite card height, which is what those screens
   are asking for anyway. Content-sized modals leave it off and keep hugging. */
const MODAL_TALL = "min(78vh, 760px)";

export const ModalShell = ({ children, onClose, fill = false }) => {
  const reduced = useReducedMotion();
  /* Portaled to <body>, this modal is opened from screens nested inside a
     Framer Motion page-transition wrapper (fadeSlide/sheet animate `y`),
     which leaves a CSS transform on that ancestor even at rest. A transform
     anywhere up the tree makes its box the containing block for our
     `position: fixed` overlay instead of the real viewport, so the backdrop
     and modal were sized to the page content's box and got clipped by the
     nearest `overflow: hidden`, cutting off the Save/Cancel row on mobile.
     Rendering into `document.body` escapes that ancestor chain entirely. */
  return createPortal(
    <motion.div onClick={onClose} variants={backdrop} initial="initial" animate="animate" exit="exit"
      transition={t(reduced, T_FAST)}
      style={{ position: "fixed", inset: 0, background: "rgba(20,16,40,.5)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <motion.div onClick={e => e.stopPropagation()} variants={modalPop} initial="initial" animate="animate" exit="exit"
        transition={t(reduced, T_SLOW)}
        style={{
          width: "min(94vw, 640px)", maxHeight: MODAL_TALL, minHeight: 420,
          ...(fill ? { height: MODAL_TALL } : null),
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
        <div style={{ fontFamily: F.sans, fontSize: 18, fontWeight: 700 }}>{title}</div>
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
          in-app tabs as its own door, create org, roster, Activate Orbit. */}
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
      <Monogram name={name || "-"} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || "-"}</div>
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
   entire app, sidebar, tab bar and all, with "Something broke. Refresh to
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
        <div style={{ fontFamily: F.sans, fontSize: 17, fontWeight: 700, marginTop: 4 }}>This screen didn’t load.</div>
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

/* ----- Program timeline -----
   A mentor's authored phases, LinkedIn-timeline-styled (a vertical rail -
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

/* "Fill it out with AI", the panel above the phase fields.
   Deliberately not a one-tap magic button that also saves: it writes into the
   form the mentor is already looking at, says so, and leaves both the edit and
   the Save press to them. `onDraft` is injected by the screen (see
   CourseDesigner) so this file stays free of the data layer. */
const DraftPanel = ({ hint, setHint, drafting, error, drafted, onDraft, onUndo }) => (
  <div style={{
    marginTop: 14, padding: 13, borderRadius: R.tile,
    background: drafted ? C.tealTint : C.purpleTint,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <Sparkles size={13} color={drafted ? C.teal : C.purple} />
      <span style={{ fontFamily: F.sans, fontSize: 12.5, fontWeight: 700, color: drafted ? C.teal : C.deep }}>
        {drafted ? "AI draft — yours to edit" : "Fill it out with AI"}
      </span>
    </div>
    <div style={{ fontSize: 11.5, color: C.gray, lineHeight: 1.45, marginTop: 5 }}>
      {drafted
        ? "Nothing is saved yet. Change anything you like, then save the phase."
        : "Drafts a phase from your profile and the phases you've already written. You review it before anything saves."}
    </div>
    {!drafted && (
      <input
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !drafting) { e.preventDefault(); onDraft(); } }}
        placeholder="Optional: what should this phase cover?"
        style={{
          width: "100%", boxSizing: "border-box", marginTop: 10, padding: "10px 12px",
          border: `1px solid ${C.line}`, borderRadius: 10, background: C.white,
          fontFamily: F.sans, fontSize: 13, color: C.ink, outline: "none",
        }}
      />
    )}
    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
      <Btn kind={drafted ? "ghost" : "soft"} small disabled={drafting} onClick={onDraft}>
        <Sparkles size={13} /> {drafting ? "Drafting…" : drafted ? "Draft another" : "Draft this phase"}
      </Btn>
      {drafted && !drafting && (
        <Btn kind="ghost" small onClick={onUndo}><RotateCcw size={13} /> Undo draft</Btn>
      )}
    </div>
    {error && <div style={{ fontSize: 11.5, color: C.coral, marginTop: 9, lineHeight: 1.4 }}>{error}</div>}
  </div>
);

const PhaseForm = ({ initial, onCancel, onSave, onDirtyChange, onDraft }) => {
  const [title, setTitle] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  const [duration, setDuration] = useState(initial.duration || "");
  const [hasReward, setHasReward] = useState(!!initial.reward);
  const [rewardLabel, setRewardLabel] = useState(initial.reward?.label || "");
  const [rewardDesc, setRewardDesc] = useState(initial.reward?.description || "");
  const [rewardColor, setRewardColor] = useState(initial.reward?.color || "purple");

  /* AI drafting. `before` is whatever the form held the first time a draft
     landed, so Undo puts the mentor back where they were rather than blanking
     a phase they were halfway through editing. */
  const [hint, setHint] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [drafted, setDrafted] = useState(false);
  const before = useRef(null);

  const fill = (p) => {
    setTitle(p.title || "");
    setDuration(p.duration || "");
    setDescription(p.description || "");
    setHasReward(!!p.reward);
    setRewardLabel(p.reward?.label || "");
    setRewardDesc(p.reward?.description || "");
    setRewardColor(p.reward?.color || "purple");
  };

  const runDraft = async () => {
    if (drafting) return;
    setDrafting(true);
    setDraftError("");
    try {
      const phase = await onDraft({ hint: hint.trim() });
      if (!before.current) before.current = { title, duration, description, reward: hasReward ? { label: rewardLabel, description: rewardDesc, color: rewardColor } : null };
      fill(phase);
      setDrafted(true);
    } catch (err) {
      setDraftError(err?.message || "Couldn't draft that. Try again.");
    } finally {
      setDrafting(false);
    }
  };

  const undoDraft = () => {
    fill(before.current || {});
    before.current = null;
    setDrafted(false);
  };

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
     same "discard changes?" gate as the in-form Cancel button, an
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
      <div style={{ fontFamily: F.sans, fontSize: 18, fontWeight: 700 }}>{initial.id ? "Edit phase" : "Add phase"}</div>
      {onDraft && (
        <DraftPanel
          hint={hint} setHint={setHint} drafting={drafting} error={draftError}
          drafted={drafted} onDraft={runDraft} onUndo={undoDraft}
        />
      )}
      <Field label="Phase title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kickoff & goal-setting" />
      <Field label="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Weeks 1–2" />
      <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="What a mentee does in this phase." />
      <div onClick={() => setHasReward((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, cursor: "pointer" }}>
        <div style={{ width: 20, height: 20, borderRadius: 7, background: hasReward ? C.tealTint : C.ghost, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
        {/* The label names the gate: a drafted phase is a proposal until this
            press, and it should read that way rather than looking like the
            AI already put it in the course. */}
        <Btn style={{ flex: 1 }} disabled={!title.trim()} onClick={save}>
          {drafted ? "Looks good — save" : "Save phase"}
        </Btn>
      </div>
    </div>
  );
};

/**
 * `completedIds`: null when there's no single mentee to track progress for
 * (Studio builder, mentor's own public preview), phases render numbered
 * instead of checked. An array (possibly empty) means real progress: checks,
 * a highlighted "current" phase, and reward pills only for phases actually
 * completed.
 *
 * `onSave`/`onDelete`/`onMove` receive one phase (or index) at a time; the
 * caller reconstructs the full array and persists it, this component never
 * calls the save API itself.
 */
export const ProgramTimeline = ({ phases = [], completedIds = null, editable = false, onSave, onDelete, onMove, onToggle, onDraft, emptyText, autoOpenNew = false }) => {
  const isDesktop = useIsDesktop();
  const [editing, setEditing] = useState(null); // null | "new" | phase
  const dirtyRef = useRef(false);

  /* Auto-opening the form the instant this screen mounts drops a mobile
     mentor straight into a modal with zero context, they haven't even read
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
          {emptyText || "No phases yet, add the first step of your program."}
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
                <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14, color: C.ink }}>{p.title}</div>
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
                    <Award size={12} /><span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 700 }}>{p.reward.label}</span>
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
            /* An index so a draft knows where it lands: appending drafts the
               next step, editing phase 2 drafts a phase 2. */
            onDraft={onDraft && (({ hint }) => onDraft({
              hint,
              index: editing === "new" ? phases.length : phases.findIndex((p) => p.id === editing.id),
              replacing: editing !== "new",
            }))}
            onCancel={closeEditing}
            onDirtyChange={(d) => { dirtyRef.current = d; }}
            onSave={(phase) => { onSave(phase); setEditing(null); }}
          />
        </ModalShell>
      )}
    </>
  );
};

