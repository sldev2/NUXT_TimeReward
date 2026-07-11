# Session Notes - 2026-06-17

## Summary

**Extraction (Layer 0) closed** for dev + test. Completed **Playwright §9**, **auth redirect hardening** for preview, **preview email-confirm UAT** on `test.myfocusrewards.com`, and extraction sign-off docs. Decided **cold-start onboarding by another dev** is optional/deferred. Confirmed **next program track: GSD Milestone A (Resend PRD Phases 1–3)** — bootstrap via `/gsd-new-project --auto` seeded from `docs/PRD for Resend use.md`.

Prior session context: **`SESSION_NOTES_2026-06-16.md`**.

---

## Git state at session end

| Item | Value |
|------|--------|
| **Branch** | `test` (synced with `origin/test` after pushes) |
| **Recent commits** | `ea90d9e` extraction close-out + preview auth UAT docs; `c179947` Supabase conventions; `b5e8eda` auth redirect hardening; `d05d18c` Playwright §9 |
| **Uncommitted** | `docs/06_17 TODO (HIGH LEVEL).md` (Milestone A bootstrap recommendation) |

---

## Committed this session

### `d05d18c` — fix(playwright): align activity selectors and close extraction §9

- Replaced stale `div.group` activity card locators with `div.space-y-3 > div` + `h3` heading match
- Added `getActivityNameHeadings()`; updated three spec files
- `reset-timers.ts` ESM `__dirname` fix; repo root `.env` wording in docs
- `multi-tab-sync` smoke passed (`AUTOPAUSE_MINUTES=1`)
- §9 checkboxes ticked in `04_12` and `06_16 confirm Playwright.md`

### `b5e8eda` — fix(auth): harden confirmation redirect URLs on preview deploys

- `resolveAppBaseUrl`: forwarded headers, allowlisted `redirectOrigin` from browser, don't let wrong server localhost beat `NUXT_PUBLIC_APP_URL`
- Register sends `window.location.origin` from client
- `ENV-SETUP.md`: Supabase Auth redirect URL table for local/preview/prod

### `c179947` — docs: add Supabase branch conventions vs Git and Vercel

- `docs/06_16 supabase branch conventions.md` — explains `time-reward-test` **`main (PRODUCTION)`** is primary DB branch, not live prod

### `ea90d9e` — docs(extraction): close sign-off and record preview auth verification

- `04_12`: extraction core complete; Practical next sequence rewritten; Done when closed; optional onboarding deferred
- `NUXT_PUBLIC_SITE_URL` confirmed removed from Vercel `test`
- Preview email confirm redirect + **post-confirm login** verified on `test.myfocusrewards.com`
- Manual Testing Plan §3.4 preview items ticked
- `extraction guide.checklist.md`, `vercel environment inventory.md` synced

---

## Extraction status (final for Layer 0)

| Item | Status |
|------|--------|
| **§1–§4, §6–§9** | Closed |
| **Done when** | All required items **[x]**; cold-start onboarding **[~] optional/deferred** |
| **§5 doc simplification** | Optional — not blocking |
| **Production launch** | Out of scope until launch |
| **Program doc** | `discussions/04_12 remaining extraction.md` — Practical next sequence points to Milestone A then B |

---

## Preview auth / Supabase (manual smoke)

| Step | Result |
|------|--------|
| Deploy auth redirect commits to `test` | Done |
| Supabase `time-reward-test` Auth URL config | Site URL + redirect URLs for `test.myfocusrewards.com` |
| Register → confirmation email | Works |
| Click link | Lands on `https://test.myfocusrewards.com/confirm` (not localhost) |
| Post-confirm login | Works |

**Note:** Mail still via Supabase default SMTP until **Milestone A1** (Resend custom SMTP). Redirect path is fixed; A1 adds branded sender + rate limits.

---

## GSD status

| Item | Value |
|------|--------|
| **`/gsd-update`** | Already on **1.4.5** (latest stable) |
| **`.planning/`** | Still **not initialized** |
| **Next** | `/gsd-new-project --auto` with Resend PRD + extraction context → Milestone A phases A1–A3 |
| **Recommendation doc** | `docs/06_17 TODO (HIGH LEVEL).md` *(uncommitted)* |

### Milestone map (unchanged)

```
Layer 0 — Extraction          ✓ complete
Layer 1 — Milestone A         ← next (Resend PRD Phases 1–3)
Layer 2 — Milestone B         timing/sync re-engineering (after A)
Layer 3 — Milestone C         Resend Phases 4–5 (optional)
```

---

## New / updated docs (this session)

| File | Purpose |
|------|---------|
| [`docs/06_16 supabase branch conventions.md`](../../06_16%20supabase%20branch%20conventions.md) | Supabase `main (PRODUCTION)` vs Git/Vercel; Auth URL setup |
| [`docs/06_17 TODO (HIGH LEVEL).md`](../../06_17%20TODO%20(HIGH%20LEVEL).md) | How to start Milestone A — `--auto` bootstrap from Resend PRD |
| [`discussions/06_16 confirm Playwright.md`](../../../discussions/06_16%20confirm%20Playwright.md) | §9 audit checkboxes closed |
| [`docs/06_16 TODO (HIGH LEVEL).md`](../../06_16%20TODO%20(HIGH%20LEVEL).md) | Milestone B planning (from prior session) |

---

## Env / Vercel reminders

- **`NUXT_PUBLIC_APP_URL`** on Vercel `test` = `https://test.myfocusrewards.com` (correct)
- **`NUXT_PUBLIC_SITE_URL`** — removed from Vercel (legacy; app uses `NUXT_PUBLIC_APP_URL` only)
- Demo button on preview: `NUXT_PUBLIC_ALLOW_DEMO_DATA=true` and `ALLOW_DEMO_DATA=true` (strict string `'true'`, not `1`)

---

## Recommended next session (after chat restart)

> **Superseded:** See [`SESSION_NOTES_2026-07-11.md`](SESSION_NOTES_2026-07-11.md). GSD Milestone A was bootstrapped (`/gsd-new-project --auto`); Phase 1 not yet planned/executed. Next: domain/From decision + `/gsd-discuss-phase 1` or `/gsd-plan-phase 1`.

1. **Commit** `docs/06_17 TODO (HIGH LEVEL).md` (and this session note if desired).
2. **Bootstrap GSD:** `/gsd-new-project --auto` with `@docs/PRD for Resend use.md`, `@discussions/05_28 extraction and dev directions.md`, `@docs/ENV-SETUP.md`, `@discussions/04_12 remaining extraction.md` — Milestone A, Phases 1–3 only.
3. **`/gsd-plan-phase 1`** — Phase A1 (mostly human: Resend domain verify → Supabase custom SMTP → acceptance signup from `support@myfocusrewards.com`).
4. **Optional:** tick remaining Manual Testing Plan §3.4 local-only items when testing Resend SMTP locally.
5. **Do not start Milestone B** until Resend A1–A3 merged; sync PRD still TBD (`docs/06_16 TODO (HIGH LEVEL).md`).

---

## Related files

- `discussions/04_12 remaining extraction.md` — extraction closed
- `discussions/05_28 extraction and dev directions.md` — Layer 1 A1–A3 checklist
- `docs/PRD for Resend use.md` — Milestone A spec
- `docs/ENV-SETUP.md` — env + Supabase redirect URLs
- `Playwright/index.md` — E2E smoke (Milestone B acceptance harness)
