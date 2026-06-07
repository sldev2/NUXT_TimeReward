# 04_12 Remaining Extraction

This note captures the extraction work that still appears open after the recent standalone auth/docs cleanup.

**Checkboxes:** `- [x]` = done in this repo as of the last update note at the bottom. `- [ ]` = still open or needs a human pass. Edit this file as you complete items.

## Environment scope (extraction sign-off)

Extraction closure applies to **development** and **test** only:

| Environment | Meaning in this repo |
|-------------|----------------------|
| **Development** | Local `.env` + `npm run dev` (localhost) |
| **Test** | Vercel Preview, Git branch **`test`** (`test.myfocusrewards.com`) + Supabase **`time-reward-test`** |

**Production / `main` deploy env is out of scope** for extraction checkboxes until launch. Track prod values in your spreadsheet when needed; do not block “Done when” on prod reconciliation.

**Source of truth for values:** your env spreadsheet. Repo docs (`.env.example`, `ENV-SETUP.md`) describe **names, usage, and dev/test expectations** — not a full copy of every cell.

## Already completed

- [x] Standalone repo shell created
- [x] Generated folders treated as non-source (`node_modules`, `.nuxt`, `.output`, etc.)
- [x] Current `.env` handling decision made
- [x] `/confirm` auth callback mismatch resolved (`nuxt.config.ts` + `app/pages/confirm.vue`)
- [x] `docs/README.md` rewritten for standalone use
- [x] `Playwright/index.md` rewritten for standalone use
- [x] Canonical PRD decision made
  - [x] `docs/REARCHITECT/PRD for NUXT.md` is canonical
  - [x] Historical PRD variants moved under `docs/REARCHITECT/historical/`

## Remaining extraction work

### 1. Historical docs decision

**Archived (migration-era product deltas):**

- [x] `docs/historical/migration/Group B Rewards Implementation Plan.md` (moved from `docs/` root)
- [x] `docs/historical/migration/PRD - Nuxt Supabase Migration.Rewards Deltas March11.md` (moved from `docs/` root)
- [x] Folder explainer: `docs/historical/migration/README.md` (points to canonical PRD)

**Policy closed (2026-05-10):**

- [x] `CHANGELOG.md` — kept at repo root; pruned confusing migration appendix (duplicate migration list, long Blazor stack block); added short “Historical context” pointer.
- [x] `docs/SESSION_NOTES_*.md` — moved to `docs/historical/session-notes/` (see `README.md` there).

### 2. Deployment review

**Hosting decision:**

- [x ] Decide: stay on Vercel 

**If deploying (verify and document):**
- [x] Build command
- [x] Output directory
- [x] Environment-variable mapping — **dev + test only** (local `.env` ↔ Vercel Preview branch `test` ↔ `.env.example` ↔ `docs/ENV-SETUP.md` ↔ code). Prod deferred at launch. See **§2a** table below.
- [x] Region choice
- [x] Security headers

### 2a. Env reconciliation table (dev + test)

One row per env var; one column per place it can be declared or used. Tracks **presence/usage, not secret values** (values live in your spreadsheet / `.env`). Scope: **development + test** (prod out of scope until launch).

**Legend:** ✓ = present/used · ✗ = absent · `comment` = commented placeholder in `.env.example` (name documented, unset locally) · `ph` = placeholder only (no real value) · `slot` = declared in `nuxt.config.ts` `runtimeConfig` but not actually read by code · `?` = verify.

Snapshot date: **2026-06-07**.

| Variable | local `.env` | Vercel `test` | `.env.example` | `ENV-SETUP.md` | code usage |
|----------|:---:|:---:|:---:|:---:|---|
| `SUPABASE_URL` | ✓ | ✓ | ✓ | ✓ | `@nuxtjs/supabase`; `config.public.supabaseUrl` (webhook, login, register) |
| `SUPABASE_KEY` | ✓ | ✓ | ✓ | ✓ | `@nuxtjs/supabase` anon key; `public.supabaseKey` (login, register) |
| `SUPABASE_SECRET_KEY` | ✓ | ✓ | ✓ | ✓ | `@nuxtjs/supabase` `serverSupabaseServiceRole`; `runtimeConfig.supabaseSecretKey`; Stripe webhook admin client; scripts |
| `NUXT_STRIPE_SECRET_KEY` | ✓ | ✓ | ✓ | ✓ | `stripeSecretKey`; all `server/api/stripe/*` |
| `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✓ | ✓ | ✓ | ~ | `public.stripePublishableKey` **`slot`** — declared, not read in code |
| `NUXT_STRIPE_WEBHOOK_SECRET` | ✓ | ✓ | ✓ | ✓ | `stripeWebhookSecret`; `webhook.post.ts` |
| `NUXT_STRIPE_PRICE_ID_MONTHLY` | ✓ | ✓ | ✓ | ~ | `stripePriceIdMonthly`; `plans.get.ts`, `checkout.post.ts` |
| `NUXT_STRIPE_PRICE_ID_QUARTERLY` | ✓ | ✓ | ✓ | ~ | `stripePriceIdQuarterly`; plans/checkout |
| `NUXT_STRIPE_PRICE_ID_YEARLY` | ✓ | ✓ | ✓ | ~ | `stripePriceIdYearly`; plans/checkout |
| `NUXT_PUBLIC_APP_URL` | ✓ | ✓ | ✓ | ✓ | `public.appUrl`; redirects, legal pages, checkout, register |
| `NUXT_PUBLIC_SHOW_TEST_USERS` | ✗ | ✓ | comment | ✓ (reserved) | **reserved** — on Vercel `test`; not wired; future landing/auth UI |
| `NUXT_PUBLIC_SHOW_PHONE_NUMBER` | ✗ | ✓ | comment | ✓ (reserved) | **reserved** — on Vercel `test`; not wired; future landing/contact UI |
| `NUXT_PUBLIC_HIDE_LANDING_PAGE_COUNTERS` | ✗ | ✓ | comment | ✓ (reserved) | **reserved** — on Vercel `test`; not wired; future landing UI |
| `BOZ23` | ✓ | ✓ | ✓ | ✗ | `runtimeConfig.boz23`; `registration-policy.get.ts` |
| `KV_REST_API_URL` | ✓ | ✓ | ✓ | ✗ | `kvRestApiUrl`; `/api/keepalive` |
| `KV_REST_API_TOKEN` | ✓ | ✓ | ✓ | ✗ | `kvRestApiToken`; `/api/keepalive` |
| `KV_REST_API_READ_ONLY_TOKEN` | ✗ | ✓ | ✗ | ✗ | ✗ — Vercel KV default, unused |
| `KV_REDIS_URL` | ✗ | ✓ | ✗ | ✗ | ✗ — Vercel KV default, unused |
| `KV_URL` | ✗ | ✓ | ✗ | ✗ | ✗ — Vercel KV default, unused |
| `GEOCODING_API_KEY` | ✗ | ✓ | ✗ | ✗ | ✗ — **set-but-unused (gap 3)** |
| `TURNSTILE_SITE_KEY` | `ph` | ✓ | ✓ | ✓ (reserved) | `public.turnstileSiteKey` **`slot`** — not wired |
| `TURNSTILE_SECRET_KEY` | `ph` | ✓ | ✓ | ✓ (reserved) | `turnstileSecretKey` **`slot`** — not wired |
| `RESEND_API_KEY` | `ph` | ✓ | ✓ | ✓ (reserved) | `resendApiKey` **`slot`** — not wired (PRD Phase 3) |
| `EMAIL_FROM_ADDRESS` | ✗ | ✓ | ✗ | ✗ | ✗ — reserved (Resend) |
| `EMAIL_FROM_NAME` | ✗ | ✓ | ✗ | ✗ | ✗ — reserved (Resend) |
| `EMAIL_AUTOMATION_ENABLED` | ✗ | ✓ | ✗ | ✗ | ✗ — reserved until Resend Phase 4 |
| `EMAIL_DISPATCH_INTERVAL_MS` | ✗ | ✓ | ✗ | ✗ | ✗ — reserved until Resend Phase 4 |

**~** in `ENV-SETUP.md` = covered only by the general "Stripe keys / price IDs" sentence, not named individually.

#### Gaps / actions surfaced (feed 2b/2c)

1. **`SUPABASE_SECRET_KEY` migration (2026-06-07):** Vercel dev/test/prod now use `SUPABASE_SECRET_KEY` (replaces `SUPABASE_SERVICE_ROLE_KEY`). Code updated: `nuxt.config.ts` → `supabaseSecretKey`, webhook, scripts, Playwright reset-timers.
2. **`NUXT_PUBLIC_SHOW_TEST_USERS` / `_SHOW_PHONE_NUMBER` / `_HIDE_LANDING_PAGE_COUNTERS` — resolved (2026-06-07):** Keep on Vercel `test`; label **reserved** in 2b. Documented in `.env.example` (commented) and `ENV-SETUP.md`. No code wiring until a future UI phase — inert today by design, not an oversight.
3. **`GEOCODING_API_KEY`** set on all envs but unused in code → **reserved or remove**.
4. **KV defaults** (`KV_REST_API_READ_ONLY_TOKEN`, `KV_REDIS_URL`, `KV_URL`) auto-added by Vercel KV; harmless. Only `KV_REST_API_URL` + `KV_REST_API_TOKEN` are used. Leave as-is.
5. **`KV_REST_API_*` and `BOZ23`** are used + in `.env.example` but **not described in `ENV-SETUP.md`** → add short notes in **2c**.
6. **Reserved (slot-only or documented, not wired):** `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, **`NUXT_PUBLIC_SHOW_*` / `_HIDE_LANDING_PAGE_COUNTERS`**, `TURNSTILE_*`, `RESEND_API_KEY`, `EMAIL_*` — intentional; label in **2b**.
7. **`NUXT_STRIPE_PRICE_ID_DEFAULT` removed (2026-06-07):** Legacy nameless checkout fallback deleted; `POST /api/stripe/checkout` requires `plan` or `priceId`. Remove from local `.env` / Vercel if still set.

### 3. External integrations review

**Policy + behavior:**

- [ ] Stripe — keep / disable / document “not configured” behavior
- [ ] Resend — keep / disable / document
- [ ] Cloudflare Turnstile — keep / disable / document  
  *Goal: no ambiguous partial config; graceful failure where a feature is off.*

### 4. Trim remaining parent-project language

**Scopes:**

- [x] **App/runtime code (`app/`):** checked for noisy setup-only phrasing (e.g. parent directory, subfolder until separation); clean for that pass.
- [ ] **Docs / onboarding path:** optional pass to reduce confusing “parent / migration” wording outside intentional historical docs (session notes, `docs/historical/`, PRD lineage). *Search hints:* `migration`, `parent project`, `parent directory`, `remaining migration work`, `subfolder until separation` — not every hit should be removed.

### 5. Optional documentation simplification

- [ ] Consolidate or reorganize setup docs
- [ ] Test docs
- [ ] Release / deploy docs
- [ ] Historical notes  
  *Optional; improves handoff.*

### 6. `junk` materials

- [x] No obsolete **parent-project** junk in tracked repo paths (`app/`, `docs/`, `server/`, etc.).
- [x] Local **`junk/`** allowed when **gitignored** (see `.gitignore`) — scratch/reference only; not part of extraction handoff. Obsolete parent extraction debris must not live in git.

### 7. Validation after extraction

**Commands:**

- [x] `npm install` (repo root) — see Progress log
- [x] `npm run build` (repo root) — see Progress log
- [ ] `npm run dev` (repo root) — confirm clean startup

**Manual smoke (browser):**

- [ ] Landing page loads
- [ ] Login page loads
- [ ] Register page loads
- [ ] Authenticated navigation reaches `/home`
- [ ] Settings page loads
- [ ] Rewards page loads
- [ ] Connection state UI behaves normally

### 8. Database / app behavior checks

Verify against Supabase **`time-reward-test`** (test environment — not prod):

- [ ] User registration works
- [ ] User login by username works
- [ ] Activities can be created and timed
- [ ] AutoPause triggers correctly
- [ ] Offline queue replays commands after reconnect
- [ ] Rewards load and can be created
- [ ] Breaks load and can be created
- [ ] Demo reset works when enabled

### 9. Playwright setup verification

- [x] `npm install` inside `Playwright/` — see Progress log
- [ ] Confirm Playwright config / `baseURL` / assumptions match the extracted app (`Playwright/playwright.config.ts`, `Playwright/index.md`)
- [ ] Update any stale test-doc references

**Reminder:**

- [ ] `Playwright/test-utils/reset-timers.ts` expects environment values from the app root `.env` (verify when running tests)

## Practical next sequence

If the goal is to finish extraction efficiently, the next highest-value order is:

1. [ ] Review deployment / env assumptions for **dev + test** (§2, §3)
2. [ ] Verify target Supabase project and app behavior (§8)
3. [ ] `npm run dev` + install/build + smoke checks (§7)
4. [x] Historical-doc policy for `CHANGELOG.md` and session notes (§1) — closed 2026-05-10

## Done when

- [ ] The app runs from the extracted repo without depending on the parent repo *(verify via §7–§8 on dev + test)*
- [x] Core onboarding docs do not require the parent repo for setup *(standalone `docs/README.md`, `docs/ENV-SETUP.md`, extraction checklist)*
- [ ] **`time-reward-test`** is connected and migrated *(test Supabase — prod project deferred)*
- [ ] Deployment / env config is coherent for **development and test** *(local `.env` + Vercel Preview `test`; prod not required)*
- [x] The canonical PRD is inside the extracted repo (`docs/REARCHITECT/PRD for NUXT.md`)
- [ ] Another developer can set up the app using only the extracted repo *(local dev + test preview; prod launch checklist separate)*

## Progress (automated / agent)

- **2026-04-24:** Repo-root `npm install` and `npm run build` succeeded; `Playwright/` `npm install` succeeded. Manual browser smoke and Supabase project checks remain **human** tasks—see `docs/EXTRACTION/extraction guide.checklist.md` and `docs/ENV-SETUP.md`.
- **2026-05-10:** Checkboxes + status pass; `app/` language pass; no `junk/`; session notes archived to `docs/historical/session-notes/`; `CHANGELOG.md` migration appendix pruned, Fixed/Removed merge corruption repaired, pointers to `supabase/migrations/` and historical docs added.
