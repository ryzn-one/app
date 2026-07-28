# Ryzn Web (`ryzn.one`)

Marketing site plus the Ryzn app, served from the same origin:

| Path | What |
|------|------|
| `/` | Landing page |
| `/mentor-invite.html` | Mentor invitation page |
| `/app/` | Vite + React app |
| `/app/#/teams` | Ryzn for Teams (org console + seats) |
| `/app/#/admin` | Founder console — analytics, invites, people |

All three are the same bundle on the same origin. See `docs/BACKEND.md` for how
the founder console is gated.

## Develop

```bash
# Marketing pages are static HTML in site/
# App (hot reload):
npm run dev
```

App runs on Vite’s default port. Open `/app/` paths after configuring `base` (already set to `/app/` in `app/vite.config.js`).

## Production build

```bash
npm run build
```

Produces `dist/`:

- `dist/index.html` — landing
- `dist/mentor-invite.html` — invite page
- `dist/app/` — app bundle (asset URLs prefixed with `/app/`)

Deploy `dist/` (Vercel reads `vercel.json` automatically).
