# Preview environment (email + auth testing)

Use the **`dev` branch** preview when you need real Postmark delivery, OAuth
callbacks, and a deployed URL — without touching production data on `ryzn.one`.

| | Production | Preview (`dev` branch) |
|---|---|---|
| URL | `https://ryzn.one` | `https://ryzn-git-dev-bos-studio.vercel.app` |
| Database | `ryzn` | `ryzn_dev` |
| Invite links in email | `https://ryzn.one/...` | stable branch URL above |
| Postmark | Production server token | Preview token (separate stream recommended) |

## One-time setup

From `.deploy/app`:

```bash
# 1. Push Preview env vars (reads .env.local, applies preview overrides)
node scripts/setup-preview-env.mjs

# 2. Create indexes in the preview database
MONGODB_DB=ryzn_dev npm run db:setup

# 3. Optional: seed test mentor invite codes
MONGODB_DB=ryzn_dev npm run db:invites

# 4. Create/push the dev branch (first time only)
git checkout -b dev
git push -u origin dev
```

Vercel auto-deploys every push to `dev`. The stable URL is always
`https://ryzn-git-dev-bos-studio.vercel.app` — use this in Postmark, Google
OAuth, and Turnstile instead of per-deployment URLs.

## Google OAuth (if used on preview)

In Google Cloud Console → Credentials → your OAuth client, add:

```
https://ryzn-git-dev-bos-studio.vercel.app/api/auth/callback/google
```

Then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the **Preview**
environment in Vercel (or add them to `.env.local` and re-run the setup script).

## LinkedIn OAuth (if used on preview)

Create an app at <https://www.linkedin.com/developers/apps>. It must be
associated with a LinkedIn **Company Page** you administer — that is a hard
requirement, not a formality, and it's the step that takes the longest.

Under **Products**, request **Sign In with LinkedIn using OpenID Connect**.
That's the only product needed here, and it self-approves in minutes. Under
**Auth → OAuth 2.0 settings**, add the redirect URL:

```
https://ryzn-git-dev-bos-studio.vercel.app/api/auth/callback/linkedin
```

Production is the same path on `https://ryzn.one`. Both can live on one app;
LinkedIn allows several redirect URLs, and they must match exactly — no
trailing slash, no query string.

Then set `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`. With either unset
the button isn't rendered and nothing else changes.

What this grants, in full: `sub`, `name`, `given_name`, `family_name`,
`picture`, `locale`, `email`, `email_verified`. There is no scope that adds a
headline, an employer, a vanity URL or a member's connections — those sit
behind LinkedIn's partner programmes. Don't design against getting them.

## Turnstile (if used on preview)

In Cloudflare Turnstile, add hostname `ryzn-git-dev-bos-studio.vercel.app` to
your widget, then set both `TURNSTILE_SECRET_KEY` and `VITE_TURNSTILE_SITE_KEY`
on Preview.

## Testing emails

1. Open `https://ryzn-git-dev-bos-studio.vercel.app/app/`
2. Sign up or use **Forgot password** — the OTP is sent via Postmark.
3. From the founder console (`/app/#/admin`), mint a mentor invite — the email
   link should point at the preview origin, not `ryzn.one`.

Check Postmark → Activity if a send fails (usually an unverified sender domain).

## Admin access on preview

`ADMIN_EMAILS` is set by the setup script to your git email. Create an account
at the preview URL first, then grant console access if needed:

```bash
MONGODB_DB=ryzn_dev npm run admin:grant -- you@example.com
```

## Re-sync env vars after local changes

```bash
node scripts/setup-preview-env.mjs
```

This overwrites Preview values for every key present in `.env.local`, plus the
preview-specific overrides (`MONGODB_DB`, `PUBLIC_ORIGIN`, `ADMIN_EMAILS`).
