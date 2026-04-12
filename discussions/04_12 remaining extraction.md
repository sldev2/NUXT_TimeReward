# 04_12 Remaining Extraction

This note captures the extraction work that still appears open after the recent standalone auth/docs cleanup.

## Already completed
- standalone repo shell created
- generated folders treated as non-source
- current `.env` handling decision made
- `/confirm` auth callback mismatch resolved
- `docs/README.md` rewritten for standalone use
- `Playwright/index.md` rewritten for standalone use
- canonical PRD decision made
  - `docs/REARCHITECT/PRD for NUXT.md` is canonical
  - historical PRD variants moved under `docs/REARCHITECT/historical/`

## Remaining extraction work

### 1. Historical docs decision
Decide what to do with migration-era or parent-context docs such as:

- `CHANGELOG.md`
- `docs/SESSION_NOTES_*.md`
- `docs/Group B Rewards Implementation Plan.md`
- `docs/PRD - Nuxt Supabase Migration.Rewards Deltas March11.md`

Possible outcomes:

- keep as historical context
- archive more explicitly into a historical/migration-history area
- remove the ones most likely to confuse future developers

### 2. Deployment review
Decide whether the standalone app will:

- stay on Vercel
- move to a different host
- remain local/dev only for now

If deploying, verify:

- build command
- output directory
- environment-variable mapping
- region choice
- security headers

### 3. External integrations review
Decide whether the standalone app should keep, enable, or temporarily disable:

- Stripe
- Resend
- Cloudflare Turnstile

If any are not ready, document that clearly and make sure the app fails gracefully rather than depending on ambiguous partial configuration.

### 4. Trim remaining parent-project language
Search for wording like:

- migration
- parent project
- parent directory
- remaining migration work
- subfolder until separation

Not every occurrence is wrong, but the noisy ones should be reduced in the standalone repo.

### 5. Optional documentation simplification
Consider consolidating or reorganizing:

- setup docs
- test docs
- release/deploy docs
- historical notes

This is optional, but it would improve handoff and onboarding.

### 6. Decide whether to keep `junk` materials
If any remaining `junk`-origin materials are now represented inside the repo, decide whether they belong in:

- `docs/`
- `docs/handoff/`
- `docs/archive/`

The extracted app should have one obvious canonical onboarding path.

### 7. Validation after extraction
Run:

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

### 8. Database/app behavior checks
Verify against the target Supabase project:

- user registration works
- user login by username works
- activities can be created and timed
- AutoPause triggers correctly
- offline queue replays commands after reconnect
- rewards load and can be created
- breaks load and can be created
- demo reset works when enabled

### 9. Playwright setup verification
After extraction:

- run `npm install` inside `Playwright`
- confirm Playwright assumptions still point to the extracted app
- update any stale test-doc references

Remember:

- `Playwright/test-utils/reset-timers.ts` expects environment values from the app root `.env`

## Practical next sequence
If the goal is to finish extraction efficiently, the next highest-value order is:

1. review deployment/env assumptions
2. verify the target Supabase project and app behavior
3. run install/dev/build plus smoke checks
4. decide how aggressively to archive or prune historical docs

## Done when
- the app runs from the extracted repo without depending on the parent repo
- core docs no longer point to parent-only resources for setup
- the correct Supabase project is connected and migrated
- deployment/env config is coherent
- the canonical PRD is inside the extracted repo
- another developer can set up the app using only the extracted repo
