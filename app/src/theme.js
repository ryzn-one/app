/* ----- RYZN tokens -----
   These are the `T` palette from the ryzn-one reference build, verbatim. The
   app previously carried a darkened variant of the same ramp (teal #0F6E56,
   amber #BA7517, purple #5B4FCF); every screen read a shade heavier than the
   design it was built from, which is the single biggest reason the app and the
   reference never looked like the same product. One ramp now, and it is the
   reference's. */
export const C = {
  ink: "#1A1A1A", surface: "#F5F5F3", white: "#FFFFFF", line: "#E5E4E0",
  purple: "#6C5CE7", deep: "#3C3489", lilac: "#B7AFF2",
  teal: "#1D9E75", coral: "#D85A30", amber: "#E8A13B",
  gray: "#6E6D68", mute: "#A5A39D",
  purpleTint: "#EEEDFB", tealTint: "#E1F5EE", coralTint: "#FAECE7", amberTint: "#FAEEDA",
};

/* The reference calls these `T.ptint` / `T.ttint` / `T.ctint` / `T.atint`. Both
   spellings point at the same string so a block lifted from the reference and a
   block already in the app can sit in the same file without a rename pass. */
export const T = {
  ...C,
  ptint: C.purpleTint, ttint: C.tealTint, ctint: C.coralTint, atint: C.amberTint,
};

export const F = {
  sans: "'Space Grotesk', 'Century Gothic', system-ui, sans-serif",
  mono: "'Space Mono', 'Consolas', monospace",
};

/* ----- type scale -----
   The reference sets type inline through four helpers rather than through
   classes, and the sizes it picks (12.5 semibold rows, 11.5 body, 7-8px mono
   labels) are what give it its density. Screens that hand-rolled
   `{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }` drifted a half-point
   at a time until no two cards agreed. */
export const S = {
  h: (fs, c = C.ink) => ({ fontFamily: F.sans, fontWeight: 700, fontSize: fs, color: c, letterSpacing: "-0.02em" }),
  b: (fs, c = C.ink) => ({ fontFamily: F.sans, fontWeight: 400, fontSize: fs, color: c, lineHeight: 1.45 }),
  sb: (fs, c = C.ink) => ({ fontFamily: F.sans, fontWeight: 600, fontSize: fs, color: c }),
  mono: (fs, c = C.gray) => ({ fontFamily: F.mono, fontSize: fs, color: c, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 700 }),
};

/* Named tiers carry a colour; the four keys are also the reward/badge accents. */
export const TIER_COLOR = {
  purple: C.purple, teal: C.teal, coral: C.coral, amber: C.amber,
  Scout: C.amber, Pathfinder: C.teal, Architect: C.purple, Luminary: C.coral,
};

export const DECK_COLORS = [C.purple, C.deep, C.ink, C.teal, C.coral];

export const BREAKPOINT = 900;
