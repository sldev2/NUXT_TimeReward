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

# The service-role / secret key (server-side ONLY, bypasses RLS)
# NEVER expose this in client-side code!
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Optional and feature-specific variables

See the repo root **`.env.example`** for the full list and naming (that file is the contract Nuxt and scripts were written against).

**Stripe (subscriptions / checkout):** Used when `NUXT_STRIPE_SECRET_KEY`, price IDs, and related keys are set. Server routes under `server/api/stripe/` return clear errors if Stripe is not configured (for example webhook responds that Stripe is not configured).

**Resend / Cloudflare Turnstile:** Slots exist on `runtimeConfig` in `nuxt.config.ts`, and keys may appear in `.env.example`, but **there is no current usage in `app/` or `server/` code paths**—treat them as reserved for future work unless you wire them in.

**Reserved UI flags (Vercel `test`; not wired yet):** These may be set on the test preview in Vercel but are **inactive** until landing/auth UI reads them. Safe to omit locally. See commented entries in `.env.example`.

| Variable | Intended use (when wired) |
|----------|---------------------------|
| `NUXT_PUBLIC_SHOW_TEST_USERS` | Show test-user affordances on landing/auth |
| `NUXT_PUBLIC_SHOW_PHONE_NUMBER` | Show phone number on landing/contact |
| `NUXT_PUBLIC_HIDE_LANDING_PAGE_COUNTERS` | Hide public counter widgets on landing |

**Geocoding (`GEOCODING_API_KEY`):** May be set on Vercel but is **not wired** in app code yet. Safe to omit locally until you implement geocoding. See commented entry in `.env.example`.

**App URL:** Use **`NUXT_PUBLIC_APP_URL`** only (not `NUXT_PUBLIC_SITE_URL`, which is legacy and unused). See `.env.example` for redirects, checkout return URLs, and legal page links.

**Local-only (not on Vercel `test`):** `TRIAL_DAYS`, `TRIAL_BYPASS`, `NUXT_SKIP_EMAIL_CONFIRMATION`, `ALLOW_DEMO_DATA`, `NUXT_PUBLIC_ALLOW_DEMO_DATA`, `UNDER_CONSTRUCTION`, `NUXT_PUBLIC_APP_ENV` — set in local `.env` for dev; preview uses code/DB defaults. Trial length at signup is **30 days from the database default**; `app/config/trial.ts` is **reserved, not wired** — see **`discussions/04_12 remaining extraction.md` §2a**.

**BOZ23:** When `BOZ23=1`, new registrations must include `boz23` in the username (`server/api/auth/register.post.ts`, `/api/auth/registration-policy`). Set on Vercel `test` for gated test signups.

**Keepalive / Vercel KV:** `KV_REST_API_URL` + `KV_REST_API_TOKEN` power `GET /api/keepalive` (Upstash ping). Other `KV_*` vars on Vercel are auto-provisioned defaults and unused.

## Getting Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select existing
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_KEY`
   - **service_role / secret key** → `SUPABASE_SECRET_KEY` (keep secret!)

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
| `vercel.json` | Declares build/output/runtime deployment settings only; environment variables are now expected to be managed in the Vercel project dashboard rather than through legacy `@secret` mappings in this file |
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

Current Vercel dashboard configuration for this project is summarized in
[`docs/vercel environment inventory.md`](vercel%20environment%20inventory.md).

Changing host means replacing or removing this file and re-documenting build/output/env in your new platform.

## External integrations (summary)

| Integration | Wired in code? | If unset |
|-------------|----------------|----------|
| Supabase | Yes (`@nuxtjs/supabase`, server routes) | App does not function for auth/data |
| Stripe | Yes (`server/api/stripe/*`, subscription pages) | Checkout/webhook routes fail with explicit configuration errors |
| Resend | No current usage | N/A |
| Turnstile | No current usage | N/A |
