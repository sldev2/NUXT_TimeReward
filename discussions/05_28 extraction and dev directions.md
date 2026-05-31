# Extraction closure integrated with dev directions (Resend + GSD)

**Date:** 2026-05-28  
**Sources:** `discussions/04_12 remaining extraction.md`, `discussions/05_27 dev directions advice.md`, `docs/PRD for Resend use.md`

**Master TODO:** Work from the [Working checklist](#working-checklist-master-todo) below until extraction is closed and Resend PRD Phases 1–3 (GSD Milestone A) are done. Detail checklists: `discussions/04_12 remaining extraction.md`, `docs/PRD for Resend use.md`.

**Environment scope:** Extraction sign-off covers **development** (local `.env`) and **test** (Vercel Preview branch `test` + Supabase `time-reward-test`) only. **Production is deferred** until launch — not a gate for Layer 0. Env **values** live in your spreadsheet; repo docs track names, usage, and dev/test expectations.

**Checkbox legend:** Marker immediately after `[ ]` — `(human)` = you in browser/dashboard/UAT; `(ai)` = agent can draft or implement in repo; `(both)` = pair (e.g. AI drafts table or doc, you verify Vercel/Supabase). Elaboration sub-bullets can be added under any item as you work through it — ask to expand in this file.

---

## Working checklist (master TODO)

Tick in order when practical; steps 1–3 and 4–6 may overlap once env policy (step 1) is written.

### Layer 0 — Extraction closure

#### Quick verify (likely done — confirm then tick)

- [x] `(human)` §2: Vercel hosting decision still correct for this repo
- [x] `(both)` §2: `vercel.json` build command, output dir, region (`iad1`), security headers match deployed app
- [X] `(both)` §2: Env docs exist and are usable (`docs/ENV-SETUP.md`, `.env.example`; Vercel **`test`** branch vars tracked in spreadsheet + optional `docs/vercel environment inventory.md` reference)
- [x] `(both)` §3: Stripe routes exist and “not configured” behavior is acceptable
- [x] `(both)` §1 / §4 / §6: Historical docs, app language pass, no obsolete **parent** junk in git — gitignored local `junk/` OK

#### Open extraction work (blocks “Done when” in `04_12`)

- [ ] `(both)` **1.** Refresh `discussions/04_12 remaining extraction.md` — tick §2 deployment sub-items that match `vercel.json` + **test** inventory/spreadsheet; note remaining **dev + test** gaps
- [ ] `(both)` **2a.** Env reconciliation table: **local `.env`** ↔ **Vercel Preview `test`** ↔ `.env.example` ↔ `ENV-SETUP.md` ↔ code usage *(prod out of scope)*
- [ ] `(both)` **2b.** Label every listed var for **dev + test**: **used | reserved | remove** (priority: `RESEND_*`, `EMAIL_AUTOMATION_*`, `NUXT_PUBLIC_LAUNCH_SOON`)
- [ ] `(both)` **2c.** Update `.env.example` and `ENV-SETUP.md` from reconciliation results *(structure/usage; values stay in spreadsheet)*
- [ ] `(both)` **3a.** Integration policy written for **dev + test** (Stripe keep on test preview; Resend keep + PRD Phases 1–3; Turnstile optional/off; `EMAIL_AUTOMATION_*` reserved until Phase 4; **prod: TBD at launch**) — in `ENV-SETUP.md` and/or release runbook
- [ ] `(both)` **3b.** Copy Resend one-liner into `04_12` §3 (see suggested one-liner under [§3 Resend](#3-external-integrations--resend-closes-the-ambiguity) below)
- [ ] `(human)` **4.** `npm run dev` at repo root — clean startup, no blocking errors
- [ ] `(human)` **5a.** Browser smoke: landing, login, register load
- [ ] `(human)` **5b.** Browser smoke: `/home`, settings, rewards after login
- [ ] `(human)` **5c.** Browser smoke: connection-state UI behaves normally
- [ ] `(human)` **6a.** §8 Supabase matrix on **time-reward-test**: registration, username login, activities/timers, AutoPause
- [ ] `(human)` **6b.** §8: offline queue replay after reconnect
- [ ] `(human)` **6c.** §8: rewards and breaks CRUD; demo reset if enabled
- [ ] `(human)` **6d.** §8: email path row deferred until [A1 acceptance](#a1--phase-1-auth-email-via-resend-smtp) — signup confirmation via Resend SMTP when skip flag false
- [ ] `(both)` **7.** Playwright: `baseURL` and assumptions match app; fix stale refs in `Playwright/index.md` / config — *defer OK if not running E2E yet*

#### Layer 0 — optional (not blocking extraction DONE)

- [ ] `(both)` §4 docs: optional trim of parent/migration wording outside `docs/historical/`
- [ ] `(both)` §5: consolidate setup / test / release docs

### Layer 1 — GSD Milestone A (Resend PRD Phases 1–3)

Start after or in parallel with Layer 0 steps **1–3** (env policy clear). Executable detail: `docs/PRD for Resend use.md`.

#### A1 — Phase 1: Auth email via Resend SMTP

- [ ] `(human)` Resend dashboard: domain/sender **Verified** for outbound (`support@myfocusrewards.com` / `send` subdomain)
- [ ] `(human)` Supabase **`time-reward-test`**: Authentication → Email → Custom SMTP → Resend (`smtp.resend.com:587`, user `resend`, password = API key) *(prod Supabase deferred to launch)*
- [ ] `(both)` Supabase redirect URLs documented and set for **local + test** (`/confirm` per PRD FR-1.2; prod URLs at launch)
- [ ] `(human)` Raise Supabase `rate_limit_email_sent` after custom SMTP active (see `docs/05_23 current auth email rate limit.md`)
- [ ] `(both)` `.env.example` updated with `RESEND_SMTP_*` comments (PRD FR-1.5)
- [ ] `(human)` **Acceptance:** Signup with `NUXT_SKIP_EMAIL_CONFIRMATION=false` sends from app sender, not Supabase default
- [ ] `(human)` **Acceptance:** Resend dashboard shows auth send events
- [ ] `(human)` **Acceptance:** Two registrations within minutes without hourly cap failure
- [ ] `(human)` Tick **6d** (§8 email path) after A1 acceptance

#### A2 — Phase 2: Resend verification API + UI

- [ ] `(ai)` `POST /api/auth/resend-verification` (Valibot, generic success, no enumeration)
- [ ] `(ai)` Register/login UI: resend verification action + cooldown UX
- [ ] `(ai)` Rate limit: `auth-resend-verification` — 5/hr/IP, 429 message
- [ ] `(human)` **Acceptance:** Unconfirmed user can request another verification email
- [ ] `(human)` **Acceptance:** Rate limit returns 429 with friendly message
- [ ] `(human)` **Acceptance:** Works on localhost with Supabase SMTP configured
- [ ] `(both)` Close Manual Testing Plan §3.4 deferred email tests

#### A3 — Phase 3: Resend API foundation

- [ ] `(ai)` Add `resend` npm dependency (align major with PopulistsUnite)
- [ ] `(ai)` `runtimeConfig` wiring for `resendApiKey` + `email.*` per PRD §6.4
- [ ] `(ai)` `server/services/EmailDeliveryService.ts` (or equivalent thin wrapper)
- [ ] `(both)` **Acceptance:** Test send route or health check sends when key set; graceful when missing
- [ ] `(human)` Merge Milestone A to `test` → `main` before timing/sync work

### Housekeeping and extraction DONE

- [ ] `(both)` `docs/README.md`: Resend PRD + compare doc in recommended reading
- [ ] `(both)` `docs/REARCHITECT/PRD for NUXT.md`: §6.6 pointer — email delivery open → link to Resend PRD
- [ ] `(both)` `docs/_FORLATER.md`: item 4 superseded by Resend PRD
- [ ] `(both)` `discussions/04_12 remaining extraction.md`: all “Done when” boxes ticked; pointers to `05_27` / Resend PRD
- [ ] `(both)` `docs/EXTRACTION/extraction guide.checklist.md` synced with closed `04_12`
- [ ] `(both)` `docs/README.md` one-liner: *Extraction closed YYYY-MM-DD; next: sync re-engineering (TBD)*

### After scope (do not block Resend A1–A3)

*Layer 2 — timing/sync re-engineering (GSD Milestone B); Layer 3 — Resend Phases 4–5; optional Playwright/doc trim.*

---

## Two different “finish lines”

| Track | Goal | Doc |
|-------|------|-----|
| **Extraction closure** | Repo is standalone; **dev + test** env/integration policies decided and verified; another dev can onboard locally and on `test` | `discussions/04_12 remaining extraction.md` |
| **Product milestones (GSD)** | Ship Resend, then timing/sync re-engineering | `discussions/05_27 dev directions advice.md`, `docs/PRD for Resend use.md` |

Extraction is **“is the repo a coherent standalone product?”**  
GSD milestones are **“what do we build next?”**

You should **close extraction first (or in parallel with Resend Phase 1)**, then run GSD Milestone A (Resend). Do **not** wait for extraction to be 100% before starting Resend Phase 1 — but **do** resolve §2–§3 policies so Resend work isn’t blocked by ambiguous env/deploy state.

---

## What `04_12` still open — and current reality

Since `04_12` was last updated (2026-05-10), a lot happened (Vercel/DNS, legal pages, BOZ23, `UNDER_CONSTRUCTION`, Resend docs). The checklist is **stale** but still useful if you refresh it.

### Mostly done (tick these off after a quick verify)

| § | Item | Evidence |
|---|------|----------|
| **§2 Deployment** | Stay on Vercel | Decision marked done |
| **§2** | Build/output/region/headers | `vercel.json`: `npm run build`, `.output`, `iad1`, security headers |
| **§2** | Env mapping (partial, **dev + test**) | Local `.env`, Vercel Preview **`test`**, `docs/ENV-SETUP.md`, `.env.example`, spreadsheet |
| **§3 Stripe** | Keep | Implemented in `server/api/stripe/*`; “not configured” errors exist |
| **§1, §4, §6** | Historical docs, app language, junk policy | Parent junk not in git; gitignored `junk/` OK for local scratch |

### Still genuinely open (blocks “Done when”)

| § | Item | Why it still matters |
|---|------|----------------------|
| **§2** | Formal env reconciliation (**dev + test**) | Spreadsheet + Vercel **`test`** vs `.env.example` / code — **`RESEND_*`, `EMAIL_AUTOMATION_*`, etc.** not all wired |
| **§3** | Integration **policy** written down | Stripe/Resend/Turnstile need explicit keep/disable/document decisions |
| **§7** | `npm run dev` + browser smoke | Never checked off |
| **§8** | Supabase behavior matrix | Registration, timers, offline, rewards, etc. |
| **§9** | Playwright config vs app | `baseURL`, stale refs |
| **§4–§5** | Optional doc trim | Nice for handoff, not blocking |

**“Done when” (bottom of 04_12)** is still false mainly because of **§7–§8** and **§2–§3 coherence**, not because PRD or repo shell is missing.

---

## How `05_27` advice maps onto extraction sections

### §3 External integrations — **Resend closes the ambiguity**

`04_12` asks: *Resend — keep / disable / document?*

`05_27` + Resend PRD answer: **Keep — implement per `docs/PRD for Resend use.md` (Phases 1–3 first).**

That is a valid extraction closure:

- **Policy:** Resend is **on** for auth (Supabase SMTP) + future app mail (API).
- **Until implemented:** Document “graceful off” — same as today (`NUXT_SKIP_EMAIL_CONFIRMATION=true` locally; no app code calls Resend yet).
- **Do not** treat Vercel `EMAIL_AUTOMATION_*` as live until Phase 4 — mark as **reserved** in env docs.

Suggested one-liner for `04_12` §3:

> **Resend:** Keep. Implement Milestone A (PRD Phases 1–3). Env vars reserved; automation disabled until queue work (Phase 4).

### §3 — Stripe and Turnstile

| Integration | Extraction decision | Tie to GSD |
|-------------|---------------------|----------|
| **Stripe** | **Keep** — configured on **test** preview (`test` branch); local via `.env`. **Prod deferred at launch.** | Independent of Resend milestone |
| **Turnstile** | **Disable / document optional** — keys in Vercel inventory but **not wired** in TimeReward code | Wire only if a feature needs it (e.g. PU-style recovery); not required for Resend Phases 1–3 |

### §8 Database checks — overlaps with Resend Phase 1 testing

When you run extraction §8, add one row for **email path**:

- With `NUXT_SKIP_EMAIL_CONFIRMATION=false` + Supabase Resend SMTP → registration sends confirmation (Resend PRD Phase 1 acceptance).

That merges extraction validation with Milestone A1 verify step.

### §7 Smoke tests — prerequisite for everything

Run before GSD execute on Resend Phase 2 (code changes). Confirms baseline app works so email work isn’t debugging a broken extract.

---

## Recommended integrated roadmap

Think in **three layers**, not one linear list:

```
Layer 0 — Extraction closure (finish 04_12)
Layer 1 — GSD Milestone A: Resend (05_27 Phases 1–3)
Layer 2 — GSD Milestone B: Timing / sync re-engineering
Layer 3 — GSD Milestone C: Resend Phases 4–5 (optional, later)
```

### Layer 0 — Extraction closure (~1–2 sessions, mostly human)

**Goal:** Check “Done when” boxes in `04_12` except optional §5.

1. **Refresh `04_12`** — mark §2 deployment sub-items done where `vercel.json` + inventory already match; note gaps.
2. **Env reconciliation pass** (closes §2 + §3) — **dev + test only**:
   - Table: local `.env` ↔ Vercel Preview **`test`** ↔ `.env.example` ↔ `ENV-SETUP.md` ↔ code usage
   - Label each var: **used | reserved | remove**
   - Especially: `RESEND_*`, `EMAIL_AUTOMATION_*`, `NUXT_PUBLIC_LAUNCH_SOON`
   - Values: spreadsheet; repo docs = names + usage
3. **Integration policy blurb** for **dev + test** in `ENV-SETUP.md` or runbook (closes §3):
   - Stripe: keep on test preview + local
   - Resend: keep, implement per PRD
   - Turnstile: optional/off until wired
   - Production: **TBD at launch** (one line — not an extraction gate)
4. **§7:** `npm run dev` + browser smoke list
5. **§8:** Supabase behavior checklist on `time-reward-test`
6. **§9:** Playwright `baseURL` + doc pass (can defer if you don’t run E2E yet)

**GSD fit:** Optional **Phase 0** — “Extraction closure” — mostly discuss/plan + verify UAT; little code.

### Layer 1 — GSD Milestone A: Resend (05_27)

Start **after or in parallel with** Layer 0 steps 1–3 (env policy clear). **Do not wait** for full §5 doc simplification.

| GSD phase | PRD | Extraction tie-in |
|-----------|-----|-------------------|
| **A1** | Phase 1 SMTP | Closes §3 Resend policy; extends §8 with email test |
| **A2** | Phase 2 resend-verification | Closes Manual Testing Plan §3.4 |
| **A3** | Phase 3 send helper | Closes “reserved” `RESEND_API_KEY` in code |

Merge to `test` → `main` before Layer 2 (per 05_27 branch strategy).

### Layer 2 — GSD Milestone B: Timing / sync

Only after Milestone A (or at least A1–A2) is merged.

**Why after extraction + Resend:** §8 offline/AutoPause/multi-tab is exactly the surface you plan to re-engineer. Extraction §8 gives you a **before** baseline; re-engineering gives you **after** acceptance tests.

### Layer 3 — Optional

Resend queue / forgot-password when product needs them — not extraction, not sync refactor.

---

## Single “master sequence” (summary)

Same order as [Working checklist](#working-checklist-master-todo): **1–2** = Layer 0 open items + verify; **3–5** = A1–A3; **6–7** = housekeeping + mark extraction DONE; **8–9** = after scope (sync, optional).

Steps 1–2 and 3–5 can overlap once env policy (checklist items **2a–3b**) is written.

---

## Doc structure — how pieces fit together

| Doc | Role after integration |
|-----|------------------------|
| `04_12 remaining extraction.md` | **Closure checklist** — update and archive when Layer 0 done |
| `05_27 dev directions advice.md` | **Program sequencing** — extraction → Resend GSD → sync GSD |
| `docs/PRD for Resend use.md` | **Executable spec** for Milestone A |
| `docs/REARCHITECT/PRD for NUXT.md` | **Canonical current state** — add §6.6 pointer when Resend lands |
| `docs/EXTRACTION/extraction guide.checklist.md` | Short form of 04_12 — sync when 04_12 closes |

Do **not** merge extraction into Resend PRD or canonical PRD. Instead:

- Add a **“Post-extraction milestones”** section to `04_12` or `05_27` pointing to Milestones A/B/C, **or**
- When extraction is done, add one line to `docs/README.md`: *Extraction closed 2026-__-__; next: Resend (PRD), then sync re-engineering (TBD).*

---

## Practical takeaway

1. **Finish extraction as a verification + policy pass**, not as a big refactor. Most code cleanup is already done.
2. **Resolve §3 Resend with “keep + PRD Phases 1–3”** — that unifies 04_12 and 05_27.
3. **Use GSD Milestone A for Resend (Phases 1–3)**, not for extraction smoke tests (those are human/UAT).
4. **Use GSD Milestone B only after** extraction baseline (§8) and Resend are merged — so you have before/after tests for the timing work.
5. **Refresh `04_12`** — several §2 items are effectively done but unchecked; updating the file avoids double work.

**Optional follow-up:** ~~Update `04_12` with integrated sequence~~ — use this file’s [Working checklist](#working-checklist-master-todo) as master; refresh `04_12` when closing extraction (housekeeping section).
