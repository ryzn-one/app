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

  /* ----- the two surface tokens the v3 layout pass added -----
     `line` stays what it always was: the divider *inside* a card, and the
     chrome rule under the top bar / over the tab bar. Those separate two things
     that touch, and they need to be seen.

     `hair` is the card's own outline. A card is separated from the page by the
     gap around it, not by a rule, so its edge only has to stop the white from
     bleeding into the surface — at #F0EFEC against #F5F5F3 it does exactly that
     and nothing more. The old build drew both jobs with `line`, which is why a
     column of cards read as a stack of boxed-in panels.

     `ghost` is the resting fill for a card with nothing in it yet — an unmatched
     mentor slot, an empty session list, an "add another". These were 23
     hand-rolled `1.5px dashed #CFCDC7` borders; a dotted outline is the loudest
     thing on a screen and it was reserved for the emptiest. A tint that sits
     one step back from white says the same thing without the stitching. */
  hair: "#F0EFEC", ghost: "#F2F1EE", ghostTile: "#E7E5E0",
};

/* Radius scale. Three steps, so nothing gets to invent a fourth: the card, the
   thing inside the card (icon tile, thumbnail, inline button), and the pill. */
export const R = { card: 18, tile: 12, pill: 999 };

/* Vertical rhythm. `gap` is between cards inside one section, `sec` is between
   one section and the next, `pad` is a card's own inset. Call sites used to
   pick marginTop by eye — 10, 11, 12 and 22 all appear on the mentee home
   alone — and no two sections landed on the same rhythm. */
export const SP = { gap: 12, sec: 26, pad: 16 };

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
