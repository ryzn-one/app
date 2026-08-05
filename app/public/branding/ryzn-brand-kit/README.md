# Ryzn Brand Kit v1.0

Everything needed to apply the Ryzn brand correctly, plus the tokens that keep the product and the
marketing in sync. Read `guidelines/Ryzn_Brand_Guidelines.pdf` first. It is 14 pages and it answers
most questions.

## Quick start

**Designers.** Use `logo/svg/`. The wordmark is outlined, so nothing depends on having the font
installed. Default to `ryzn-lockup-horizontal-purple.svg` on light backgrounds and
`ryzn-lockup-horizontal-white.svg` on dark.

**Developers.** Copy `tokens/ryzn-tokens.css` (or the JS, SCSS, or JSON version) into the project.
The values are identical to `src/theme.js` and `src/teams/theme.js` in the app repo. Favicons and
app icons are in `icon/`.

**Anyone making a deck or a document.** Use `logo/png/` at 2x, on a white or surface background,
with clear space equal to the height of the smallest diamond.

## Contents

```
logo/svg/     15 outlined vector logos: mark, wordmark, horizontal, stacked, 4 colourways
logo/png/     45 transparent rasters at 1x, 2x, 4x
icon/svg/     app icon, maskable, light, ink, and the single-diamond atom
icon/png/     1024, 512, 192, 180, 152, 120, favicon 16 to 64
icon/favicon.ico   16, 32, 48 bundled
color/        swatch sheet (svg + png), contrast.json with measured WCAG ratios
tokens/       ryzn-tokens.css, .scss, .js, .json
motifs/       tier marks, diamond pattern
social/       Open Graph 1200x630, banner 1500x500, avatar 400
fonts/        Space Grotesk, Space Mono, both OFL 1.1 licences
guidelines/   the brand book, PDF and HTML
```

## The five rules people break most

1. **Clear space.** X on all four sides, where X is the height of the smallest diamond. Nothing enters it.
2. **Never retype the wordmark.** Space Grotesk set live does not match the supplied tracking. Use the file.
3. **Minimum sizes.** Horizontal lockup 120 px. Mark 24 px. Below 32 px switch to the atom, except
   for browser favicons: `icon/png/favicon-*.png` and `icon/favicon.ico` carry the three-diamond mark
   at every size, because a lone diamond in a tab or a dashboard row reads as somebody else's product.
4. **Coral and amber are not body text on white.** They measure 3.87 and 3.72 to 1. Chips, bars, and
   large numerals only.
5. **No em dashes or en dashes in any Ryzn copy.** Full stop, comma, or colon instead. This applies to
   product strings, decks, email, and social.

## The mark

Three diamonds, growing as they climb. The diamond is already the atom of the product interface, where
it marks tiers, bullets, and badges. Repeated three times at a constant scale ratio of about 1.36 it
becomes the brand story: someone getting measurably bigger over time.

Geometry, in an 89 by 81 art box:

```
D1  centre (11, 70)  radius 11
D2  centre (40, 48)  radius 15
D3  centre (69, 20)  radius 20
```

Do not redraw it by eye and do not add a fourth diamond.

## Colour

| Role | Colour | Hex |
|---|---|---|
| Primary | Purple | `#5B4FCF` |
| Depth | Deep | `#2D2580` |
| Text | Ink | `#1A1A1A` |
| Success, Pathfinder tier | Teal | `#0F6E56` |
| Attention, Architect tier | Coral | `#D85A30` |
| Caution, Legend tier | Amber | `#BA7517` |
| Secondary text | Gray | `#5F5E5A` |
| Decorative | Lilac | `#B7AFF2` |
| Backgrounds | Surface, Line | `#F5F5F3`, `#E8E7E3` |

Tints for chips and fills: `#EEF0FC`, `#E1F5EE`, `#FAECE7`, `#F7EEDD`.

Measured contrast ratios for every colour are in `color/contrast.json` and on page 8 of the guidelines.

## Typography

**Space Grotesk** for language: headlines, body, buttons, names. Headlines at weight 700 with tracking
minus 0.02em.

**Space Mono** for system voice: labels, codes, stats, timestamps. Always uppercase, tracked 0.12em or
wider, never for sentences.

Both are OFL 1.1 and bundled in `fonts/`, so they can be self-hosted. Declared fallbacks are Century
Gothic and Consolas for decks and email.

## Licensing

The fonts are open source under the SIL Open Font Licence 1.1, included in `fonts/`. The Ryzn wordmark,
the Ascent mark, and this guidelines document are proprietary to Ryzn. Do not redraw, recolour, or
redistribute them outside Ryzn work.

## Regenerating

The kit is generated from source, not hand-drawn, so it can be rebuilt exactly:

```
python3 make_assets.py      # all SVGs from geometry and outlined type
python3 rasterize.py        # PNG, ICO, and the contrast table
python3 make_guidelines.py  # the brand book HTML, then print to PDF
```

Version 1.0, July 2026.
