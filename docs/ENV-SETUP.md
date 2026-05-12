# Environment Variables Setup

Create a `.env.development` file in the `NUXT_TimeReward` root folder for local development.

## Required Environment Variables (Phase 1)

```env
# ============================================
# SUPABASE - Required for @nuxtjs/supabase module
# ============================================

# Your Supabase project URL
SUPABASE_URL=https://your-project-id.supabase.co

# The "anon/public" key (safe for client-side, used with RLS)
# NOTE: Module expects SUPABASE_KEY, not SUPABASE_ANON_KEY
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# The "service_role" key (server-side ONLY, bypasses RLS)
# NEVER expose this in client-side code!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Optional and feature-specific variables

See the repo root **`.env.example`** for the full list and naming (that file is the contract Nuxt and scripts were written against).

**Stripe (subscriptions / checkout):** Used when `NUXT_STRIPE_SECRET_KEY`, price IDs, and related keys are set. Server routes under `server/api/stripe/` return clear errors if Stripe is not configured (for example webhook responds that Stripe is not configured).

**Resend / Cloudflare Turnstile:** Slots exist on `runtimeConfig` in `nuxt.config.ts`, and keys may appear in `.env.example`, but **there is no current usage in `app/` or `server/` code paths**—treat them as reserved for future work unless you wire them in.

**App URL:** `NUXT_PUBLIC_APP_URL` (see `.env.example`) for redirects and absolute links.

## Getting Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select existing
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## Local development

From the **repository root** (`NUXT_TimeReward/`), create `.env` (or `.env.development` if you prefer that convention):

```bash
cp .env.example .env
# Then edit .env with your real Supabase and optional keys
```

On Windows PowerShell, `Copy-Item .env.example .env` works the same way.

**Never commit `.env` to version control.**

## Reconcile names across surfaces

Before calling extraction “done”, align what you use locally with deployment:

| Surface | Notes |
|--------|--------|
| `.env.example` | Primary list of variable names for this repo |
| `vercel.json` | Declares `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_KEY` for the client; server-side and `@nuxtjs/supabase` still expect the usual `SUPABASE_*` keys in the environment—set matching values in the Vercel project dashboard for any key the app reads at build or runtime |
| `docs/release-operations-runbook.md` | Operational env table for releases |

## Post-extraction Supabase verification

Use the target Supabase project (not the parent repo’s project unless you intentionally share it):

1. Apply migrations: `supabase/migrations/` (see [docs/README.md](README.md) quick start).
2. **Auth:** register, email confirmation if enabled, username login, `/confirm` after magic link if applicable.
3. **Data:** create and run activities; AutoPause; offline queue replay after reconnect (see Manual Testing Plan).
4. **Rewards and breaks:** list/create flows; demo reset if `ALLOW_DEMO_DATA` / `NUXT_PUBLIC_ALLOW_DEMO_DATA` are enabled.
5. **RPCs:** `start_activity`, `stop_activity`, `auto_pause_activity`, `get_email_by_username` exist and succeed from the app.

## Deployment (Vercel)

[`vercel.json`](../vercel.json) in the repo root sets:

- `framework`: `nuxt`
- `buildCommand`: `npm run build`
- `outputDirectory`: `.output`
- `installCommand`: `npm install`
- `regions`: `iad1`
- Security headers on all routes

Changing host means replacing or removing this file and re-documenting build/output/env in your new platform.

## External integrations (summary)

| Integration | Wired in code? | If unset |
|-------------|----------------|----------|
| Supabase | Yes (`@nuxtjs/supabase`, server routes) | App does not function for auth/data |
| Stripe | Yes (`server/api/stripe/*`, subscription pages) | Checkout/webhook routes fail with explicit configuration errors |
| Resend | No current usage | N/A |
| Turnstile | No current usage | N/A |
