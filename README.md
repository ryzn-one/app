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

`npm run dev` starts **Vite only**, so every `/api/*` call 404s. Two terminals:

```bash
vercel dev --listen 3000   # serves api/ — sign-in, roster, posts, admin
npm run dev                # Vite, proxies /api to :3000
```

Vite serves `app/`, not `site/` — so `localhost:5173/mentor-invite.html` does
not exist. Test the invite page against `vercel dev` on `:3000`, or build and
`npx serve dist`.

Uploads need `BLOB_READ_WRITE_TOKEN` (`vercel env pull` after creating the Blob
store). Email needs `POSTMARK_SERVER_TOKEN`; without it `sendEmail` logs to the
console and returns `{delivered:false}`, which is what you want locally.

For real email delivery on a deployed URL (not localhost), use the **Preview**
environment on the `dev` branch — see `docs/PREVIEW.md`.

Run `npm run db:setup` once after pulling — it creates the indexes idempotently,
including the ones `posts` and `post_events` need.

## Production build

```bash
npm run build
```

Produces `dist/`:

- `dist/index.html` — landing
- `dist/mentor-invite.html` — invite page
- `dist/app/` — app bundle (asset URLs prefixed with `/app/`)

Deploy `dist/` (Vercel reads `vercel.json` automatically).
