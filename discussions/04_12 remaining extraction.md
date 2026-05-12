# 04_12 Remaining Extraction

This note captures the extraction work that still appears open after the recent standalone auth/docs cleanup.

**Checkboxes:** `- [x]` = done in this repo as of the last update note at the bottom. `- [ ]` = still open or needs a human pass. Edit this file as you complete items.

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

- [ ] Build command
- [ ] Output directory
- [ ] Environment-variable mapping (platform ↔ `docs/ENV-SETUP.md` ↔ `.env.example`)
- [ ] Region choice
- [ ] Security headers

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

- [x] No `junk/` directory present in this workspace (removed or never shipped here). If a `junk` tree reappears, decide placement: `docs/`, `docs/handoff/`, or `docs/archive/`.

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

Verify against the **target** Supabase project:

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

1. [ ] Review deployment / env assumptions (§2, §3)
2. [ ] Verify target Supabase project and app behavior (§8)
3. [ ] `npm run dev` + install/build + smoke checks (§7)
4. [x] Historical-doc policy for `CHANGELOG.md` and session notes (§1) — closed 2026-05-10

## Done when

- [ ] The app runs from the extracted repo without depending on the parent repo *(verify via §7–§8)*
- [x] Core onboarding docs do not require the parent repo for setup *(standalone `docs/README.md`, `docs/ENV-SETUP.md`, extraction checklist)*
- [ ] The correct Supabase project is connected and migrated
- [ ] Deployment / env config is coherent end-to-end
- [x] The canonical PRD is inside the extracted repo (`docs/REARCHITECT/PRD for NUXT.md`)
- [ ] Another developer can set up the app using only the extracted repo *(blocked until §2–§3 decisions + §7–§8 verification)*

## Progress (automated / agent)

- **2026-04-24:** Repo-root `npm install` and `npm run build` succeeded; `Playwright/` `npm install` succeeded. Manual browser smoke and Supabase project checks remain **human** tasks—see `docs/EXTRACTION/extraction guide.checklist.md` and `docs/ENV-SETUP.md`.
- **2026-05-10:** Checkboxes + status pass; `app/` language pass; no `junk/`; session notes archived to `docs/historical/session-notes/`; `CHANGELOG.md` migration appendix pruned, Fixed/Removed merge corruption repaired, pointers to `supabase/migrations/` and historical docs added.
