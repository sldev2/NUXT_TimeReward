# Extraction Guide Checklist

## Goal
Use this as the short execution checklist for extracting `NUXT_TimeReward` into its own standalone project.

This does **not** replace `junk/extraction guide.md`; it is the condensed version.

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
- Re-enter secrets manually as needed.
- Reconcile env naming across:
  - `.env.example`
  - `docs/ENV-SETUP.md`
  - `vercel.json`
- Then verify your actual local dev env file (`.env` or `.env.development`) matches that contract.
- Recreate deployment-platform secrets in the new project.

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
- Resolve the auth callback mismatch:
  - `nuxt.config.ts` points to `/confirm`
  - no `app/pages/confirm.vue` currently exists
- Decide whether to add the page or change the redirect target.

## Documentation cleanup
- Rewrite `NUXT_TimeReward/docs/README.md` for standalone use.
- Remove parent-repo references from core docs.
- Update `Playwright/index.md` so it no longer depends on `../Playwright2026/`.
- Declare `docs/REARCHITECT/PRD for NUXT.md` the canonical standalone PRD for the extracted repo.
- Treat `docs/REARCHITECT/historical/PRD for NUXT.extraction-ready.md` and `docs/REARCHITECT/historical/PRD for NUXT.handoff-ready.md` as historical derivative/reference docs, not the primary PRD.
- Update `docs/README.md` and extraction docs to reflect that decision explicitly.

## Historical docs decision
- Decide whether to keep migration-era docs as-is.
- Or archive them into a historical folder.
- Or remove the ones most likely to confuse future developers.

## Deployment review
- Decide whether the standalone app will stay on Vercel or move elsewhere.
- Verify:
  - build command
  - output directory
  - env mappings
  - region
  - security headers

## Validation
- Run:

```bash
npm install
npm run dev
npm run build
```

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
- Supabase is connected and migrated.
- Auth callback behavior is resolved.
- Deployment/env config is coherent.
- The canonical PRD is in the extracted repo.
- Another developer can set up the app using only the extracted repo.
