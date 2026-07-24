# Ryzn — youth mentorship platform (production scaffold)

Premium mentorship for high-school and university students, matched with vetted professionals
through a 12-week program. Brand: `ryzn.one` · "Rise now."

## Quick start

```bash
npm install
npm run dev        # local dev server
npm run build      # production bundle (verified: ~88 KB gzipped)
npm run preview    # serve the production build locally
```

## Project structure

```
src/
  theme.js        Brand tokens (Brand Profile v1.0): palette, fonts, tier colors
  data.js         All mock/seed data — the single file to replace with API calls
  ui.jsx          Primitives: Card, Btn, Ring, QR, BadgeTile, Heatmap, chat bubbles…
  auth.jsx        Splash, welcome, register (mentor invite code), login, forgot-password
  chatmatch.jsx   Ryzn AI onboarding chat, badge/tier unlocks, swipe decks, filters,
                  mentor & mentee detail sheets
  adddecks.jsx    In-app "add a mentor / add mentees" decks (max 3)
  app-mentee.jsx  Home, exercises, badges, cohort boards, DM thread, mentor profile view
  app-mentor.jsx  Impact dashboard, mentee detail, sessions, leaderboard, content studio
  app-shared.jsx  Mentor Meets, notifications, settings, badge modal, unlock overlays
  RyznApp.jsx     Root state machine: journey → app, session model, gamification rules
  main.jsx        Entry point with error boundary
```

## Demo controls

`RyznApp.jsx` exports a `DEMO` flag (default `true`) that shows the role switcher and
stage tracker above the phone frame. Set it to `false` for a clean single-role build.

Two entry paths are modeled: **Register** runs the one-time AI onboarding then enters the
app with fresh Day-1 state; **Sign in** skips setup entirely and loads a returning user.

## What is mocked

Everything in `src/data.js`, all timers that simulate replies/acceptances, the pseudo-QR
codes, and all XP/Impact math (which lives in `RyznApp.jsx`). See `docs/PRODUCTION.md`
for the service-by-service replacement plan, API surface, and launch checklist.
