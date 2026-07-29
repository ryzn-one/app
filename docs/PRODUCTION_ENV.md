# Production environment variables

If Bilal (or another team admin) needs to add these in the Vercel dashboard,
use **Production** — **not** a git branch. Branch-scoped vars (Preview → `dev`)
cannot be copied to Production; that is what causes the dashboard error.

## Add these on Production

In Vercel → **ryzn** → **Settings** → **Environment Variables** → **Add**:

| Key | Value | Notes |
|-----|-------|-------|
| `MONGODB_URI` | `mongodb+srv://...` | Same Atlas cluster as local |
| `MONGODB_DB` | `ryzn` | **Not** `ryzn_dev` |
| `BETTER_AUTH_SECRET` | `<openssl rand -base64 32>` | Invalidates sessions if changed |
| `BETTER_AUTH_URL` | `https://ryzn.one` | Must match browser origin |
| `PUBLIC_ORIGIN` | `https://ryzn.one` | Invite links in emails |
| `ADMIN_EMAILS` | `bilal@ryzn.one` | Comma-separated founder emails |
| `POSTMARK_SERVER_TOKEN` | from Postmark | Required for real email |
| `EMAIL_FROM` | `Ryzn <hello@ryzn.one>` | Must be verified in Postmark |
| `BLOB_READ_WRITE_TOKEN` | from Blob store | Required for uploads |

For each variable:
1. Environment: **Production** only (or Production + Preview if shared)
2. **Do not** select a custom git branch
3. Save

## After adding

Redeploy production so functions pick up the new vars:

```bash
vercel deploy --prod
```

Or in the dashboard: Deployments → latest → **Redeploy**.

## CLI (if you have Production env permissions)

From `.deploy/app`:

```bash
npm run production:env
vercel deploy --prod
```

Reads `.env.local` and pushes production values (overrides `MONGODB_DB`, `PUBLIC_ORIGIN`, `BETTER_AUTH_URL` automatically).

## Preview vs Production

| | Preview (`dev` branch) | Production |
|---|---|---|
| URL | `https://ryzn-git-dev-bos-studio.vercel.app` | `https://ryzn.one` |
| `MONGODB_DB` | `ryzn_dev` | `ryzn` |
| Env scope | Preview + git branch `dev` | Production, no branch |

Both can exist at the same time with different values.
