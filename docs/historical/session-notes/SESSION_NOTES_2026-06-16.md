# Session Notes - 2026-06-16

## Summary

Extraction cleanup continued: **§4 docs/onboarding pass** (committed), **auth confirmation redirect fix** (localhost port mismatch), **§7 local smoke** marked complete (committed), **§8 Supabase matrix** marked complete on `time-reward-test` (local checklist edit, not yet committed). Planning docs added for **GSD Milestone B (timing/sync re-engineering)** and **Playwright §9 verification**. Investigated **Reset Demo Data** visibility on Vercel test (`NUXT_PUBLIC_ALLOW_DEMO_DATA` must be `true`, not `1`).

Prior context: env reconciliation §2a, Resend/Turnstile ENV-SETUP policy, Stripe checkout — see commits from 2026-06-07 onward and **`SESSION_NOTES_2026-05-30.md`**.

---

## Git state at session end

| Item | Value |
|------|--------|
| **Branch** | `test` |
| **Recent commits** | `d370b34` §7 smoke; `56eec9f` auth redirect fix; `e7cc14b` §4 docs; earlier `342bb49` Resend/Turnstile ENV-SETUP |
| **Uncommitted** | `discussions/04_12 remaining extraction.md` (§8 checkboxes); `docs/06_16 TODO (HIGH LEVEL).md`; `discussions/06_16 confirm Playwright.md` |

---

## Committed this session (or just before handoff)

### `e7cc14b` — docs(extraction): complete section 4 onboarding path cleanup

- Repo-root paths in `docs/README.md`, `ENV-SETUP.md`, PRD, runbook, extraction docs
- Moved prorated-rewards discussion → `docs/historical/migration/legacy-blazor-prorated-rewards.md`
- §4 checkbox marked in `04_12`

### `56eec9f` — fix(auth): use request origin for confirmation redirect URLs

- **Bug:** Signup confirmation emails linked to `localhost:3000` while dev server runs on **4000**
- **Cause:** `.env` had `NUXT_PUBLIC_APP_URL=http://localhost:3000`
- **Fix:** `server/utils/resolveAppBaseUrl.ts` — register + Stripe checkout prefer **request origin** over stale env
- Updated `.env.example`, `docs/ENV-SETUP.md`; local `.env` set to `:4000`

### `d370b34` — docs(extraction): mark section 7 local smoke checks complete

- §7 browser smoke items checked in `04_12`

---

## Extraction checklist (`discussions/04_12 remaining extraction.md`)

| § | Status | Notes |
|---|--------|--------|
| **§2a env** | Mostly done | Spreadsheet 2b label pass may remain |
| **§3 integrations** | Done in docs | Stripe, Resend, Turnstile policies in ENV-SETUP |
| **§4 docs/onboarding** | **[x]** | Committed 2026-06-07 |
| **§7 validation / smoke** | **[x]** | Local dev; committed in `d370b34` |
| **§8 Supabase matrix** | **[x]** locally | Verified on **`time-reward-test`**; **uncommitted** diff in `04_12` |
| **§9 Playwright** | **Open** | Config/`baseURL` OK; selectors/docs need work — see below |
| **Done when** | Partial | §7–§8 largely closed; §9 + deployment coherence + “another dev can set up” still open |

---

## Reset Demo Data button (Vercel test)

- **UI:** `NUXT_PUBLIC_ALLOW_DEMO_DATA=true` (client — shows button on `/home`)
- **API:** `ALLOW_DEMO_DATA=true` (server — allows `POST /api/admin/load-demo-data`; required on preview because `NODE_ENV !== 'development'`)
- **Gotcha:** Value **`1` does not work** — code checks strict `=== 'true'`. User set `NUXT_PUBLIC_ALLOW_DEMO_DATA=1` on test; button stayed hidden until changed to **`true`**.

---

## GSD status

- User ran **`gsd doctor`** — no such command; equivalent is **`/gsd-health`**
- **`validate health`:** **BROKEN** — no `.planning/` (expected until `/gsd-new-project` or post-extraction GSD init)
- **Agents:** all 18 expected GSD agents installed under `~/.cursor/agents/`
- **Program sequence** (from `05_27` / `05_28`): Layer 0 extraction → Milestone A Resend 1–3 → **Milestone B timing/sync re-engineering** → optional Resend 4–5

---

## New planning docs (uncommitted)

| File | Purpose |
|------|---------|
| [`docs/06_16 TODO (HIGH LEVEL).md`](../../06_16%20TODO%20(HIGH%20LEVEL).md) | Doc pointers for sync re-engineering; recommend **one GSD Milestone B** with multiple phases; need vertical PRD before `/gsd-plan-phase` |
| [`discussions/06_16 confirm Playwright.md`](../../../discussions/06_16%20confirm%20Playwright.md) | §9 elaboration: what “confirm Playwright” means, audit checklist, tick criteria |

---

## Playwright §9 — key findings (not fixed in code yet)

- **`baseURL: http://localhost:4000`** — correct; matches `nuxt.config.ts` `devServer.port`
- **Stale selector:** `getActivityCard()` uses `div.group` but **`home.vue` activity cards no longer have `group` class** — likely breaks play-button locators
- **Stale doc paths:** `Playwright/index.md` and `reset-timers.ts` warn text say `NUXT_TimeReward/.env` → should say **repo root `.env`**
- **`reset-timers.ts`:** loads `../../.env`; expects `SUPABASE_URL` + `SUPABASE_SECRET_KEY` — verify with `npm run reset-timers` in `Playwright/`
- Full multi-tab/cross-browser specs are **Milestone B acceptance**, not extraction blockers

---

## Auth / env reminders

- Confirmation emails: ensure Supabase redirect URLs include `http://localhost:4000/confirm` for local dev
- Local `.env`: `NUXT_SKIP_EMAIL_CONFIRMATION=false` when testing real signup email path
- Test user for manual/Playwright: **`kyrie` / `@Password1`** on target Supabase project

---

## Recommended next session (after chat restart)

1. **Commit** uncommitted docs + `04_12` §8 checkbox update (if accurate).
2. **§9 Playwright:** fix `div.group` selector (and doc paths); run `reset-timers` + login/home smoke.
3. **Close extraction “Done when”** — deployment/env coherence for dev + test; optional `docs/README.md` one-liner (*Extraction closed; next: Resend then sync re-engineering*).
4. **Vercel test:** confirm `NUXT_PUBLIC_ALLOW_DEMO_DATA=true` and `ALLOW_DEMO_DATA=true` if demo button needed on preview.
5. **GSD:** after extraction closed — `/gsd-map-codebase` + `/gsd-new-project` or start **Milestone A (Resend 1–3)** per `docs/PRD for Resend use.md`.
6. **Before Milestone B:** draft `docs/PRD for Sync Re-engineering.md`; use §8 + Playwright + Manual Testing Plan §15–16 as **before** baseline.

---

## Related files

- `discussions/04_12 remaining extraction.md` — master extraction checklist
- `discussions/05_28 extraction and dev directions.md` — Layer 0–3 roadmap
- `discussions/05_27 dev directions advice.md` — GSD Milestone A/B/C sequencing
- `docs/ENV-SETUP.md` — env + integration policy
- `docs/EXTRACTION/extraction guide.checklist.md` — short close-out list
