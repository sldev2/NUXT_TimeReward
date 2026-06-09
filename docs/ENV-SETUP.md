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

### Stripe (subscriptions / checkout)

**Extraction policy (dev + test):** **Keep** — Stripe is active on Vercel Preview branch **`test`** and via local `.env`. Production Stripe is deferred until launch.

**Required when testing checkout:** `NUXT_STRIPE_SECRET_KEY`, `NUXT_STRIPE_WEBHOOK_SECRET`, price IDs (`NUXT_STRIPE_PRICE_ID_MONTHLY` / `_QUARTERLY` / `_YEARLY`), and `NUXT_PUBLIC_APP_URL`. Checkout requires `plan` or `priceId` in the POST body (no default price fallback).

**When Stripe is not configured** (`NUXT_STRIPE_SECRET_KEY` unset):

| Route | Behavior |
|-------|----------|
| `GET /api/stripe/plans` | **HTTP 200** — static placeholder plans ($10 / $34 / $90), `"stripeConfigured": false`. Subscription UI can still render. |
| `POST /api/stripe/checkout` | **HTTP 500** — `"Stripe is not configured..."` |
| `POST /api/stripe/update-subscription` | **HTTP 500** — `"Stripe is not configured"` |
| `POST /api/stripe/webhook` | **HTTP 500** — `"Stripe webhook is not configured"` |

**When Stripe is configured but a price ID is missing for a plan:** checkout returns **HTTP 400** with a message naming the plan and env var.

**When Stripe is configured but the user is not logged in:** checkout returns **HTTP 401** (not a “not configured” signal).

**Verify locally or on test:** step-by-step drills in [`discussions/05_28 Section 3.md`](../discussions/05_28%20Section%203.md).

### Resend (auth email + future transactional mail)

**Extraction policy (dev + test):** **Keep** env vars on Vercel; implement per [`docs/PRD for Resend use.md`](PRD%20for%20Resend%20use.md) (Phases **1–3** first). **`EMAIL_AUTOMATION_*` reserved** until Phase 4 (no dispatcher in app today). Production Resend/SMTP reconciliation deferred until launch.

**Not implemented in app code yet:** no `resend` npm package, no `EmailDeliveryService`, no `/api/auth/resend-verification`. Setting `RESEND_API_KEY` or `EMAIL_FROM_*` in `.env` or Vercel **does not change app behavior** until PRD phases land.

**Auth email today (regardless of Resend vars on Vercel):**

| Setting | Behavior |
|---------|----------|
| `NUXT_SKIP_EMAIL_CONFIRMATION=true` (typical local `.env`) | `POST /api/auth/register` creates a **pre-confirmed** user via admin API — **no** Supabase confirmation email |
| `NUXT_SKIP_EMAIL_CONFIRMATION=false` or unset on preview | Normal `signUp` → Supabase sends confirmation email via **Supabase Auth SMTP** (dashboard default until Phase 1 custom SMTP) |
| Resend vars set, PRD not implemented | Same as above — vars are **inert** in code |

**Target after PRD Phase 1 (human + Supabase dashboard):** Supabase **Authentication → Email → Custom SMTP** → Resend (`smtp.resend.com:587`); auth mail from `EMAIL_FROM_ADDRESS`. See [`docs/Resend Use by Environment.md`](Resend%20Use%20by%20Environment.md) and [`docs/05_23 current auth email rate limit.md`](05_23%20current%20auth%20email%20rate%20limit.md).

**When transactional automation is “off” (now and until Phase 4):** `EMAIL_AUTOMATION_ENABLED` unset or `false` — expected; no background email queue or Nitro dispatcher (nothing to fail).

**Env vars (Vercel inventory):** `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` — **reserved** until PRD wiring; `EMAIL_AUTOMATION_ENABLED`, `EMAIL_DISPATCH_INTERVAL_MS` — **reserved until Phase 4**.

### Cloudflare Turnstile (bot protection)

**Extraction policy (dev + test):** **Optional / off** — keys may stay on Vercel for future use; **not required** for extraction, Resend Phases 1–3, or current auth/subscription flows.

**Not wired in code:** `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` map to empty `runtimeConfig` slots only (`public.turnstileSiteKey`, `turnstileSecretKey`). No Turnstile widget in `app/`, no server-side token verification.

**When Turnstile is unset or set:** **No difference** — app behavior is unchanged. Safe to omit locally; safe to leave on Vercel as **reserved**.

**When to wire:** only if a feature needs bot protection (e.g. forgot-password or public forms), per product decision — not an extraction blocker.

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

| Integration | Wired in code? | If unset / not implemented |
|-------------|----------------|----------------------------|
| Supabase | Yes (`@nuxtjs/supabase`, server routes) | App does not function for auth/data |
| Stripe | Yes (`server/api/stripe/*`, subscription pages) | Plans: static placeholders; checkout/webhook: explicit 500 (see Stripe section above) |
| Resend | **No** — PRD Phases 1–3 not implemented | Vars inert; auth uses Supabase + `NUXT_SKIP_EMAIL_CONFIRMATION` (see Resend section above) |
| Turnstile | **No** | No effect — optional reserved keys only (see Turnstile section above) |
