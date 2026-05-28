# Extraction closure integrated with dev directions (Resend + GSD)

**Date:** 2026-05-28  
**Sources:** `discussions/04_12 remaining extraction.md`, `discussions/05_27 dev directions advice.md`, `docs/PRD for Resend use.md`

---

## Two different “finish lines”

| Track | Goal | Doc |
|-------|------|-----|
| **Extraction closure** | Repo is standalone, deploy/env/integration **policies are decided and verified**, another dev can onboard | `discussions/04_12 remaining extraction.md` |
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
| **§2** | Env mapping (partial) | `docs/vercel environment inventory.md`, `docs/ENV-SETUP.md`, `.env.example` |
| **§3 Stripe** | Keep | Implemented in `server/api/stripe/*`; “not configured” errors exist |
| **§1, §4, §6** | Historical docs, app language, junk | Closed per 04_12 + later session work |

### Still genuinely open (blocks “Done when”)

| § | Item | Why it still matters |
|---|------|----------------------|
| **§2** | Formal env reconciliation | Vercel inventory lists `RESEND_*`, `EMAIL_AUTOMATION_*`, `NUXT_PUBLIC_LAUNCH_SOON` — **not all in `.env.example` or wired in code** |
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
| **Stripe** | **Keep** — document preview vs prod env scope (`test` branch has keys; prod may differ) | Independent of Resend milestone |
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
2. **Env reconciliation pass** (closes §2 + §3):
   - Table: Vercel ↔ `.env.example` ↔ `ENV-SETUP.md` ↔ code usage
   - Label each var: **used | reserved | remove**
   - Especially: `RESEND_*`, `EMAIL_AUTOMATION_*`, `NUXT_PUBLIC_LAUNCH_SOON`
3. **Integration policy blurb** in `ENV-SETUP.md` or `release-operations-runbook.md` (closes §3):
   - Stripe: keep
   - Resend: keep, implement per PRD
   - Turnstile: optional/off until wired
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

## Single “master sequence” (if you want one ordered list)

```
1. [Extraction] Env reconciliation + integration policy doc     ← closes 04_12 §2–§3
2. [Extraction] npm run dev + smoke + §8 Supabase matrix        ← closes 04_12 §7–§8
3. [GSD A1]     Supabase → Resend SMTP + verify signup email    ← Resend PRD Phase 1
4. [GSD A2]     resend-verification API + UI                    ← Resend PRD Phase 2
5. [GSD A3]     resend package + EmailDeliveryService           ← Resend PRD Phase 3
6. [Housekeeping] 05_27 light links: README, canonical PRD §6.6, _FORLATER
7. [Extraction]  Update 04_12 checkboxes → mark extraction DONE
8. [GSD B]      Timing / sync re-engineering
9. [Optional]   Playwright §9, doc simplification §5, Resend Phases 4–5
```

Steps 1–2 and 3–5 can overlap slightly once env policy is written (step 1).

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

**Optional follow-up:** Update `04_12 remaining extraction.md` with this integrated sequence, refreshed checkboxes, and explicit pointers to `05_27` and the Resend PRD.
