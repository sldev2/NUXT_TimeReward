# 06_17 TODO (HIGH LEVEL) — Starting Milestone A (Resend)

**Date:** 2026-06-17  
**Context:** Extraction is complete. Next program track is **GSD Milestone A — Resend PRD Phases 1–3**. This doc captures how to bootstrap GSD vs planning directly from the existing Resend PRD.

---

## Question

Which do you recommend — **`gsd-new-project`** or **planning from `docs/PRD for Resend use.md`**?

---

## Short answer

**Neither alone is ideal.** For this repo, use **GSD initialized from the Resend PRD**, not a blank `gsd-new-project` and not “just read the PRD and code.”

---

## Why not each option by itself

| Approach | Problem |
|----------|---------|
| **`gsd-new-project` (default)** | Re-asks “what are we building?” after extraction. You already have canonical PRD, ENV-SETUP, PopulistsUnite traceability, and acceptance criteria. |
| **Plan only from `docs/PRD for Resend use.md`** | Phases 1–3 are clear, but you lose `.planning/` tracking, `/gsd-plan-phase`, `/gsd-execute-phase`, and verification loops. Easy to drift from FRs. |

There is **no `.planning/` yet** — GSD has never been bootstrapped on this repo.

---

## Recommendation

**Use `gsd-new-project --auto` with the Resend PRD (and minimal brownfield context) as the seed** — then `/gsd-plan-phase` for A1.

That matches [`discussions/05_27 dev directions advice.md`](../discussions/05_27%20dev%20directions%20advice.md): one **Milestone A** with three GSD phases mapped to PRD Phases 1–3:

```
Phase A1 → PRD Phase 1 (SMTP + docs + human verify)
Phase A2 → PRD Phase 2 (resend-verification API + UI)
Phase A3 → PRD Phase 3 (EmailDeliveryService + resend npm)
```

### Suggested bootstrap prompt

```text
/gsd-new-project --auto

@docs/PRD for Resend use.md
@discussions/05_28 extraction and dev directions.md (Layer 1 A1–A3)
@docs/ENV-SETUP.md
@discussions/04_12 remaining extraction.md

Milestone A: Resend integration (PRD Phases 1–3 only).
Extraction is complete. Scope: dev + test (time-reward-test, test.myfocusrewards.com).
Preview email confirm + post-confirm login already verified.
Phases 4–5 and Milestone B (sync) are out of scope.
```

**Alternative:** `/gsd-import --from` on the Resend PRD if you want GSD to ingest the doc structure directly — less questioning, but `--auto` new-project is usually smoother for a first milestone.

---

## What to do first after init

**Phase A1 is mostly human** (Resend domain verified → Supabase custom SMTP → rate limit → acceptance signup). GSD should treat A1 as checklist + verify, not heavy agent coding.

You can start A1 dashboard work **today** in parallel with GSD init; **A2/A3** are where `/gsd-execute-phase` pays off.

| GSD phase | PRD phase | Mostly |
|-----------|-----------|--------|
| **A1** | Phase 1 — Auth email via Resend SMTP | **Human** (Resend + Supabase dashboards; small doc/env updates) |
| **A2** | Phase 2 — Resend verification API + UI | **AI + human UAT** |
| **A3** | Phase 3 — Resend API foundation | **AI + smoke test** |

Detail checklist: [`discussions/05_28 extraction and dev directions.md`](../discussions/05_28%20extraction%20and%20dev%20directions.md) Layer 1 (A1–A3). Executable spec: [`docs/PRD for Resend use.md`](PRD%20for%20Resend%20use.md) §7.

---

## Already done (not A1 blockers)

- Extraction sign-off (dev + test)
- Preview auth confirmation redirect + post-confirm login on `test.myfocusrewards.com`
- Supabase Auth URL config for preview (see [`docs/06_16 supabase branch conventions.md`](06_16%20supabase%20branch%20conventions.md))

A1 still upgrades mail to **Resend SMTP**, **app sender branding** (`support@myfocusrewards.com`), and **higher send limits** — not a repeat of redirect work.

---

## Out of scope for Milestone A

- **Milestone B** — timing/sync re-engineering → [`docs/06_16 TODO (HIGH LEVEL).md`](06_16%20TODO%20(HIGH%20LEVEL).md)
- **PRD Phases 4–5** — queue / forgot-password (Milestone C, when product needs it)
- **Production launch** — separate Supabase project, prod env

---

## Bottom line

Don't pick “new-project *or* PRD” — **bootstrap GSD from the PRD** (`--auto`), then run **A1 → A2 → A3** as GSD phases. Skip blank `gsd-new-project` and skip ad-hoc PRD-only execution for the whole milestone.

**Next command:** `/gsd-new-project --auto` with the files listed above, then `/gsd-plan-phase 1` (A1).
