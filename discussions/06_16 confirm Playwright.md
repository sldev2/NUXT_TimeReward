# 06_16 — Confirm Playwright config / baseURL / assumptions

**Date:** 2026-06-16  
**Context:** Elaboration on extraction §9 — `discussions/04_12 remaining extraction.md` checkbox: *Confirm Playwright config / `baseURL` / assumptions match the extracted app (`Playwright/playwright.config.ts`, `Playwright/index.md`).*

---

## What this checkbox is asking

Extraction §9 is **not** “run the full Playwright suite and pass every sync test.” It means:

1. **Config matches how the app actually runs** (port, URLs, no Blazor-era leftovers).
2. **Docs match config** (`Playwright/index.md` agrees with `playwright.config.ts` and repo layout).
3. **Selectors and test assumptions still match the Nuxt UI** (login flow, activity cards, settings, status line).
4. **Supporting tooling works** (`reset-timers.ts` reads the right `.env` and Supabase vars).
5. You’ve **smoke-verified** at least one path (login → home → start activity), even if long AutoPause tests are deferred.

That aligns with [`05_28 extraction and dev directions.md`](05_28%20extraction%20and%20dev%20directions.md): *“defer OK if not running E2E yet”* — but you should still **audit** config/docs/selectors before ticking the box.

---

## Already aligned (good to tick partially)

| Item | Config / doc | App reality |
|------|----------------|-------------|
| **`baseURL`** | `http://localhost:4000` in `playwright.config.ts` | `nuxt.config.ts` `devServer.port: 4000` |
| **Commented `webServer`** | Expects manual `npm run dev` at repo root | Matches `index.md` and extraction checklist |
| **Login route** | `/login`, `input#username`, `input#password`, “Sign In” | Present in `login.vue` |
| **Post-login target** | `waitForURL('**/home')` | `/home` uses `auth` + `subscription` middleware |
| **AutoPause status** | `#autopause-status`, `#status-message-container` | Still on `home.vue` |
| **Play button** | `button.w-12.h-12.rounded-full` | Still on activity cards |
| **Timer display** | `span.timer-display` | Still on activity rows |
| **Settings AutoPause** | `setAutoPauseInterval` → `/settings`, first `input[type="number"]` | First number field is still AutoPause minutes (after range slider) |
| **Test user** | `kyrie` / `@Password1` | Matches `docs/README.md`, Manual Testing Plan, seed scripts |
| **Reset timers env** | Loads `../../.env` from Playwright folder | Correct path to **repo root** `.env` |
| **Service role key name** | `SUPABASE_SECRET_KEY` | Matches post-extraction rename |
| **Historical Blazor table** | Documents `:5001` → `:4000` | Useful; not a runtime dependency |

So **`baseURL` and port are correct** — the main gap is **UI selectors and doc wording**, not the port.

---

## Stale or risky (fix or verify before fully checking §9)

### 1. Activity card selector — likely broken

`selectors.ts` still uses:

```typescript
export function getActivityCard(page: Page, activityName: string): Locator {
  return page.locator('div.group').filter({ hasText: activityName }).first();
}
```

`Playwright/index.md` still says activity cards are `div.group`.

**Current UI:** activity rows are a plain `div` with Tailwind classes (`relative backdrop-blur-sm rounded-xl…`) — **no `group` class** on `home.vue`.

**Impact:** `getActivityCard`, and anything built on it (`getActivityPlayButton`, `getActivityTime`), may **fail to find “Work”** even when the app is fine.

**Verification:** In Playwright headed mode, run a one-liner or short script that calls `getActivityPlayButton(page, 'Work')` after login; if it times out, update selectors (e.g. card by `h3` text + ancestor container, or `data-testid` if you add one later).

### 2. Doc path wording — minor but confusing

`Playwright/index.md` line 7 and `reset-timers.ts` line 30 still say **`NUXT_TimeReward/.env`**.

**Reality:** path is **repo root `.env`** (`Playwright/` → `../../.env`). Functionally correct; wording is subfolder-era.

**Verification tick:** Confirm `SUPABASE_URL` + `SUPABASE_SECRET_KEY` in root `.env` and run:

```bash
cd Playwright
npm run reset-timers
```

Expect “Timer reset complete for user: kyrie” (or a clear error if `kyrie` missing on your Supabase project).

### 3. Logout / “logged in” helpers — fragile

- Sign out on `/home` is an **icon button** with `title="Sign out"`, not visible text “Sign Out”.
- `isUserLoggedIn()` looks for `text=Logout` or `button:has-text("Sign Out")` — may **false-negative**.
- `performLogin()` fallback looks for `button:has-text("Sign out")` — icon may not match.

**Impact:** Login path may still work via URL `/home`; logout helpers are less trustworthy.

### 4. Tests assume **local dev + local Supabase**, not Vercel `test`

Playwright always hits **`http://localhost:4000`**. It does **not** validate `test.myfocusrewards.com`.

**Prerequisites for any run:**

- Repo root: `npm run dev`
- Root `.env` points at the Supabase project where **`kyrie` exists** with demo activities (typically same DB you use for manual testing — often `time-reward-test` or local)
- `kyrie` has **active subscription or unexpired trial** (`subscription` middleware on `/home`)
- `BOZ23=1` in `.env` does **not** block existing `kyrie` login (only new registrations)

### 5. Cross-browser test assumptions

`cross-browser-sync.spec.ts` and `multi-activity-sequence.spec.ts` launch **Chrome + Edge** via Playwright channels. Edge must be installed (`npx playwright install` / system Edge).

### 6. Long-running / flaky-by-design tests

| Test | Assumption | Note |
|------|------------|------|
| `multi-tab-sync.spec.ts` | Default **3 min** AutoPause wait | Needs `--timeout=300000` or env `AUTOPAUSE_MINUTES` |
| `cross-browser-sync.spec.ts` | Same + two browsers | Same |
| `multi-activity-sequence.spec.ts` | **6 min** AutoPause, **4 activities** | Uses `reset-timers` + `ensureTestActivities` first |

These are **sync re-engineering acceptance harnesses** (see [`docs/06_16 TODO (HIGH LEVEL).md`](../docs/06_16%20TODO%20(HIGH%20LEVEL).md)), not extraction blockers. Extraction §9 is satisfied by confirming **config + smoke**, not passing all three specs.

### 7. Related checkbox §9 line: “Update stale test-doc references”

Still open in `04_12`. Concrete items:

- `div.group` in `index.md` and `selectors.ts`
- `NUXT_TimeReward/.env` → “repo root `.env`”
- `performLogin` JSDoc example still shows email instead of username

---

## Suggested verification checklist (what “confirm” means in practice)

**A. Static audit (15 min, no long tests)**

- [ ] `playwright.config.ts` `baseURL` === `nuxt.config.ts` `devServer.port`
- [ ] `index.md` dev-server instructions say repo root `npm run dev`
- [ ] Grep Playwright for `3000`, `5001`, `Playwright2026`, `NUXT_TimeReward/` — fix or document exceptions
- [ ] Compare `selectors.ts` to current `login.vue`, `home.vue`, `settings.vue` (especially activity card wrapper)

**B. Tooling smoke**

```bash
# Terminal 1 — repo root
npm run dev

# Terminal 2
cd Playwright
npm install   # already done per progress log
npm run reset-timers
```

- [ ] No “Missing SUPABASE_URL or SUPABASE_SECRET_KEY”
- [ ] User `kyrie` found; timers reset

**C. Minimal E2E smoke (5 min)**

```bash
cd Playwright
npx playwright test multi-tab-sync.spec.ts --headed --grep "should sync" --timeout=120000
```

Or a tiny ad-hoc script: login → click Work play → read `#autopause-status`.

- [ ] Login reaches `/home`
- [ ] Play button locators work (if not, fix `div.group` first)

**D. Optional full sync pass (post-extraction / pre–Milestone B)**

- Run `multi-tab-sync` with `AUTOPAUSE_MINUTES=1` or `2` to shorten wait
- Run Manual Testing Plan §15–16 in parallel with Playwright results
- Record baseline failures for sync re-engineering “before” state

---

## How this ties to extraction vs later work

| When | Scope |
|------|--------|
| **Extraction §9** | Config + docs + selector audit + reset-timers + login/home smoke |
| **Extraction §8** | Manual Supabase matrix (registration, timers, offline) — overlaps conceptually but not Playwright-specific |
| **GSD Milestone B** | Use Playwright §15–16 + these three specs as **after** acceptance tests once sync is re-engineered |

[`05_28 extraction and dev directions.md`](05_28%20extraction%20and%20dev%20directions.md) explicitly says: extraction §8 gives the **before** baseline; don’t block extraction on passing full multi-tab/cross-browser Playwright unless you choose to.

---

## Recommended tick criteria for `04_12` §9

You can mark the main checkbox **[x]** when:

1. Static audit done; **`baseURL`/port confirmed** (already true).
2. Stale doc paths updated **or** noted in §9 with a follow-up commit.
3. **`reset-timers` succeeds** against your dev Supabase with root `.env`.
4. **Activity card selector fixed or verified** (likely needs a selector update).
5. **Login → `/home` → start one activity** works in headed Playwright once.

Keep **“Update any stale test-doc references”** as a separate sub-item until `div.group` / `.env` path wording is fixed.

---

## Bottom line

- **`baseURL: http://localhost:4000` is correct** for the extracted standalone repo.
- The checkbox is **mostly about selectors, env wiring, and doc accuracy**, not re-running 5-minute AutoPause suites.
- The **highest-risk mismatch** today is **`div.group` activity cards** — layout changed in the Nuxt UI but Playwright wasn’t fully updated.
- Full sync tests belong to **post-extraction / Milestone B**, but fixing selectors now makes §9 honest and unblocks a quick smoke run.

**Possible follow-ups:** exact selector replacements for `getActivityCard`; minimal patch list for `selectors.ts`, `index.md`, and `reset-timers.ts` warning text.
