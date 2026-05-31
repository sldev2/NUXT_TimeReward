# Extraction Guide Checklist

## Goal
Use this as the short execution checklist for extracting `NUXT_TimeReward` into its own standalone project.

This does **not** replace `junk/extraction guide.md`; it is the condensed version.

## Environment scope

Extraction sign-off covers **development** (local `.env`) and **test** (Vercel Preview branch `test` + Supabase `time-reward-test`) only. **Production env is deferred** until launch. Env **values** may live in a spreadsheet; repo docs describe names and usage.

## Before copy
- Decide whether the new repo will use fresh git history or filtered history.
- Decide whether the extracted app will use a new Supabase project or an existing one.
- Decide whether the extracted app will keep Stripe, Resend, and Turnstile enabled immediately.

## After copy
- Initialize/connect the new git repository.
- Make sure generated folders are not treated as source:
  - `node_modules`
  - `.nuxt`
  - `.output`
- Run:

```bash
npm install
npm run dev
```

## Environment and secrets
- Create a fresh `.env` in the extracted app.
- Do **not** blindly reuse the old real `.env`.
- Re-enter secrets manually as needed (spreadsheet OK as source of truth for values).
- Reconcile env naming across **dev + test**:
  - `.env.example`
  - `docs/ENV-SETUP.md`
  - `vercel.json`
  - Vercel Preview branch **`test`** (when deployed)
- Then verify your local dev env file (`.env`) matches that contract.
- Recreate **test** deployment secrets in Vercel; prod secrets at launch.

## Supabase
- Point the app at the correct Supabase project.
- Apply all migrations in `supabase/migrations`.
- Verify these exist and work:
  - `user_profiles`
  - `user_settings`
  - activities tables
  - rewards tables
  - breaks tables
  - `start_activity`
  - `stop_activity`
  - `auto_pause_activity`
  - `get_email_by_username`

## Code and config cleanup
- Auth callback: `nuxt.config.ts` uses `/confirm` and `app/pages/confirm.vue` exists (resolved).

## Documentation cleanup
- Rewrite `NUXT_TimeReward/docs/README.md` for standalone use.
- Remove parent-repo references from core docs.
- `Playwright/index.md` is standalone (no `Playwright2026` dependency); `baseURL` is `http://localhost:4000` in `playwright.config.ts`.
- Declare `docs/REARCHITECT/PRD for NUXT.md` the canonical standalone PRD for the extracted repo.
- Treat `docs/REARCHITECT/historical/PRD for NUXT.extraction-ready.md` and `docs/REARCHITECT/historical/PRD for NUXT.handoff-ready.md` as historical derivative/reference docs, not the primary PRD.
- Update `docs/README.md` and extraction docs to reflect that decision explicitly.

## Historical docs decision
- Migration-era rewards deltas and Group B plan live under `docs/historical/migration/` (see `README.md` there).
- Session notes archived under `docs/historical/session-notes/` (see `README.md` there).
- `CHANGELOG.md` at repo root: pruned stale migration appendix; points to `supabase/migrations/` and historical folders.

## Deployment review
- Decide whether the standalone app will stay on Vercel or move elsewhere.
- Verify for **dev + test** (not prod sign-off):
  - build command
  - output directory
  - env mappings (local `.env` + Vercel **`test`**)
  - region
  - security headers

## Validation
- Run:

```bash
npm install
npm run dev
npm run build
```

- **Automated (2026-04-24):** `npm install` and `npm run build` succeeded on this repo in a clean agent run. A developer should still run `npm run dev` and complete the manual smoke list below.

- Verify manually:
  - landing page
  - login page
  - register page
  - `/home`
  - `/settings`
  - `/rewards`

- Verify app behavior:
  - username login works
  - registration works
  - activities can be created and timed
  - AutoPause works
  - offline queue replays on reconnect
  - rewards work
  - breaks work
  - demo reset works when enabled

## Playwright
- Run `npm install` in `NUXT_TimeReward/Playwright`.
- Confirm Playwright assumptions still match the extracted app.
- Update stale test-doc references.
- Remember:
  - `Playwright/test-utils/reset-timers.ts` expects env vars from the app root `.env`

## Done when
- The app runs without depending on the parent repo.
- Core docs no longer depend on parent-repo references.
- **`time-reward-test`** Supabase is connected and migrated.
- Auth callback behavior is resolved.
- Deployment/env config is coherent for **development and test** (prod deferred).
- The canonical PRD is in the extracted repo.
- Another developer can set up the app using only the extracted repo (local + test preview).
