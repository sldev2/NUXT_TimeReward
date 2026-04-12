# Extraction Guide

## Purpose
This guide is for the remaining work needed to make `NUXT_TimeReward` stand on its own, other than physically copying the `NUXT_TimeReward` folder and its contents.

It is written as a practical checklist, not as a migration plan.

## What this guide assumes
- You are extracting `NUXT_TimeReward` as a standalone app.
- The code inside `NUXT_TimeReward` is the source of truth.
- You do not need guidance on the actual copy/paste step.

## Provenance note
- The standalone `NUXT_TimeReward` repo was extracted from `DEV_RewardTimersStandalone/NUXT_TimeReward`.
- The parent extraction-base snapshot is commit `29f7f1b3995e6b9c3ee1aa0727a522d29bfc5cb5`.
- In the parent repo, that snapshot is tagged `nuxt-timereward-extraction-base`.
- `get-shit-done` was not in use in the parent repo at the time of extraction; this standalone repo is being prepared for GSD introduction after extraction cleanup.

## Recommended order

### 1. [x] Create the standalone repository shell
Do these immediately after copying the folder:

- Initialize a new git repository, or create the destination repository and connect the copied folder to it.
- Decide whether you want fresh history or filtered history from the parent repo.
- Add a `.gitignore` appropriate for a Nuxt app if one is not already present in the extracted project.

### 2. [x] Do not treat generated folders as source
When extracting, make sure the standalone repo is based on source, not generated artifacts.

Generated/transient folders to ignore or regenerate:

- `node_modules`
- `.nuxt`
- `.output`

These should be rebuilt in the new home with:

```bash
npm install
npm run dev
```

## Must-do follow-up tasks

### 3. [ok] Recreate environment configuration in the new location
The standalone app depends on environment variables and external services.

Use these files as the starting point:

- `NUXT_TimeReward/.env.example`
- `NUXT_TimeReward/docs/ENV-SETUP.md`
- `NUXT_TimeReward/vercel.json`

Do these tasks:

- Create a fresh `.env` for the extracted project.
- Re-enter secrets manually instead of carrying over an old real `.env`.
- Verify the required Supabase keys are present.
- Verify Stripe environment variables if subscription flows are needed.
- Verify optional Resend and Turnstile variables only if you plan to use those features.
- Recreate deployment-platform secrets in the new environment instead of relying on parent-repo state.

Important note:

- Before extraction is considered complete, reconcile environment-variable naming across:
  - `.env.example`
  - `docs/ENV-SETUP.md`
  - `vercel.json`
- Then verify that your actual local dev env file (`.env` or `.env.development`, whichever you use) matches that agreed contract.

They are close, but should be treated as something to verify together in the standalone repo.

### 4. [skip] Provision or connect the correct Supabase project
The extracted app is not self-contained unless the database side comes with it.

You need to:

- decide whether the standalone app uses a brand-new Supabase project or an existing one
- apply the migrations in `NUXT_TimeReward/supabase/migrations`
- verify Auth, Realtime, tables, and RPCs are all present in the destination project

Minimum database-side verification:

- authentication works
- `user_profiles` and `user_settings` exist
- activity tables exist
- rewards tables exist
- breaks tables exist
- timer RPCs exist and are callable:
  - `start_activity`
  - `stop_activity`
  - `auto_pause_activity`
- username lookup RPC exists:
  - `get_email_by_username`

### 5. [x] Decide the fate of the current `.env`
There is already a real `.env` inside `NUXT_TimeReward`.

For extraction:

- do not rely on copying that file blindly
- decide whether to omit it from transfer
- regenerate secrets in the target environment when possible

This is both a safety step and a cleanliness step.

### 6. [x] Fix the auth callback mismatch
Status:

- `nuxt.config.ts` still configures Supabase callback redirect to `/confirm`
- `app/pages/confirm.vue` now exists, so the route/config mismatch is resolved

What was verified:

- auth flows now reach `/confirm` instead of failing on a missing page
- callback error states can be surfaced from the auth redirect instead of falling through to a missing-route failure

What is still separate from this item:

- default/shared Supabase SMTP has delivery and rate-limit limitations
- magic-link and confirmation-email reliability should be treated as email infrastructure work, not as a callback-route mismatch

If needed later, track SMTP improvements separately rather than reopening this item.

## Strongly recommended cleanup tasks

### 7. [x] Update `docs/README.md`
`NUXT_TimeReward/docs/README.md` is still written like a migration-era document and still points back to parent-repo materials.

Concrete issues currently present:

- says the app is built with "Nuxt 4"
- says to run SQL migrations from `docs/database/` which does not match the actual migration location
- points to `../docs/PRD - Nuxt Supabase Migration.md`
- points to parent-repo best-practices docs outside the extracted app
- describes the app as being developed in a subfolder until separation

This file should be rewritten for the standalone repo.

### 8. [x] Update `Playwright/index.md`
Current issue:

- `NUXT_TimeReward/Playwright/index.md` still references `../Playwright2026/`

That cross-reference will be wrong or useless in the extracted repo.

Update it so the Playwright docs stand on their own.

### 9. [ ] Decide which historical docs stay
The extracted app contains a lot of useful documentation, but some of it is still framed as migration work from the parent project.

Examples:

- `CHANGELOG.md`
- many `docs/SESSION_NOTES_*.md` files
- `docs/Group B Rewards Implementation Plan.md`
- `docs/PRD - Nuxt Supabase Migration.Rewards Deltas March11.md`

Decide whether to:

- keep them as historical context
- archive them into a `historical/` or `migration-history/` area
- or remove the ones that will confuse a future developer

### 10. [ ] Make the new PRD the canonical one
You now have stronger standalone documents in `/junk`.

For the extracted repo, treat:

- `docs/REARCHITECT/PRD for NUXT.md`

as the canonical standalone PRD.

Treat these as historical derivative/reference documents rather than the primary PRD:

- `docs/REARCHITECT/historical/PRD for NUXT.extraction-ready.md`
- `docs/REARCHITECT/historical/PRD for NUXT.handoff-ready.md`

Update `docs/README.md` and the extraction docs so they state this explicitly and do not imply that the PRD decision is still unresolved.

### 11. [ ] Review deployment configuration
`NUXT_TimeReward/vercel.json` exists, so the app already has platform-specific assumptions.

You should decide whether the standalone app will:

- stay on Vercel
- move to a different host
- or remain local/dev only for now

If deploying, verify:

- build command
- output directory
- environment variable mapping
- region choice
- security headers

### 12. [ ] Review external integrations
The app can depend on more than just Nuxt and Supabase.

Review whether the standalone app should keep, enable, or temporarily disable:

- Stripe
- Resend
- Cloudflare Turnstile

If any of these are not ready in the extracted app, document that clearly and fail gracefully rather than leaving partial configuration ambiguous.

## Nice-to-have cleanup tasks

### 13. [ ] Trim parent-project language from docs
Search the extracted repo for wording like:

- migration
- parent project
- parent directory
- remaining migration work
- subfolder until separation

Not all of it is wrong, but it will be noisy once the app is standalone.

### 14. [ ] Simplify app-specific documentation
After extraction, it may help to consolidate:

- setup docs
- test docs
- release/deploy docs
- historical notes

This is optional, but it will make the extracted repo easier to hand off.

### 15. [ ] Decide whether to keep `junk` materials
If you move any of the newly created PRDs or this guide into the extracted repo, decide whether they belong in:

- `docs/`
- `docs/handoff/`
- `docs/archive/`

The extracted app should have one obvious canonical onboarding path.

## Validation checklist

### 16. [ ] Minimum validation after extraction
Run these in the standalone copy:

```bash
npm install
npm run dev
npm run build
```

Then verify manually:

- landing page loads
- login page loads
- register page loads
- authenticated navigation reaches `/home`
- settings page loads
- rewards page loads
- connection state UI behaves normally

### 17. [ ] Database/app behavior checks
Verify these against the target Supabase project:

- user registration works
- user login by username works
- activities can be created and timed
- AutoPause triggers correctly
- offline queue still replays commands after reconnect
- rewards load and can be created
- breaks load and can be created
- demo reset works when enabled

### 18. [ ] Playwright test setup
The Playwright suite is a separate work area inside the app.

After extraction:

- run `npm install` inside `NUXT_TimeReward/Playwright`
- confirm its environment assumptions still point to the extracted app
- update any stale docs references

Useful note:

- `Playwright/test-utils/reset-timers.ts` expects environment variables from the app root `.env`

## Suggested definition of done
The extraction is functionally complete when all of these are true:

- the app runs from the extracted repo without depending on the parent repo
- docs no longer point to parent-only resources for core setup
- the correct Supabase project is connected and migrated
- auth callback behavior is resolved
- deployment/env config is coherent
- the new canonical PRD is inside the extracted repo
- a new developer can set up the app using only the extracted repo

## Short version
If you want the shortest practical punch list, it is this:

1. Create the new repo shell.
2. Rebuild env/secrets in the new location.
3. Apply/verify Supabase migrations and RPCs.
4. Fix the `/confirm` callback mismatch.
5. Rewrite `docs/README.md` so it no longer points to parent-repo docs.
6. Remove or rewrite stale parent-repo references in Playwright/docs.
7. Choose and move the new canonical PRD into the extracted repo.
8. Run install, dev, build, and a small end-to-end smoke check.
