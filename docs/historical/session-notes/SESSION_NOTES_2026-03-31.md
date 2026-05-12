# Session Notes - 2026-03-31

## Summary

**This session**: Focused on extraction cleanup and documentation consolidation for the standalone `NUXT_TimeReward` repo. Confirmed `docs/REARCHITECT/PRD for NUXT.md` as the canonical standalone PRD, archived derivative PRDs under `docs/REARCHITECT/historical/`, strengthened the canonical PRD around rewards, breaks, auth, and subscription behavior, and updated extraction docs to record provenance and remaining extraction work.

---

## Canonical PRD Decision

Confirmed the extracted repo should treat:

- `docs/REARCHITECT/PRD for NUXT.md`

as the canonical standalone PRD.

Historical derivative/reference PRDs were retained, but moved under:

- `docs/REARCHITECT/historical/PRD for NUXT.extraction-ready.md`
- `docs/REARCHITECT/historical/PRD for NUXT.handoff-ready.md`

Short archival notes were added to both historical files so they are not mistaken for the maintained source of truth.

---

## PRD Cleanup and Reconciliation

The canonical PRD was updated to better match the extracted app's real current state:

- stale `/confirm` "missing page" statements were removed
- the route inventory now includes `/confirm`
- auth behavior now documents:
  - username-first login
  - offline-aware auth UI
  - confirmation-required vs auto-confirm registration behavior
  - `confirm.vue` as part of the auth flow
- subscription behavior now documents:
  - environment-sensitive trial duration defaults
  - expired/subscription-gated redirect behavior
  - Stripe checkout/update/webhook alignment with `user_profiles.subscription_status`
- breaks behavior now documents:
  - open-ended breaks
  - baseline behavior for newly created breaks
  - no auto-resume after a break ends
  - recurring vs non-recurring reset semantics
- rewards behavior now documents:
  - currently implemented reward-type-specific work-goal semantics
  - inherited parent-project reward requirements for timed, prorated, and expiring rewards

---

## README and Extraction Docs

Updated the standalone docs so the PRD decision is explicit:

- `docs/README.md` now points readers to the canonical PRD
- extraction docs no longer present the PRD choice as unresolved
- the extraction guide now records provenance:
  - parent source path
  - extraction-base commit
  - extraction-base tag
- the extraction guide also records that `get-shit-done` was not in use in the parent repo at extraction time, and that this standalone repo is being prepared for GSD introduction after extraction cleanup

---

## Remaining Extraction Note

Created:

- `discussions/04_12 remaining extraction.md`

This note captures the still-open extraction work after the recent auth/docs cleanup, including:

- historical-doc decisions
- deployment review
- external integration review
- remaining parent-language cleanup
- validation/build/smoke checks
- Supabase/app behavior verification
- Playwright setup verification

---

## Parent Repo Provenance Check

Confirmed that the standalone repo was extracted from:

- `DEV_RewardTimersStandalone/NUXT_TimeReward`
- extraction-base commit `29f7f1b3995e6b9c3ee1aa0727a522d29bfc5cb5`
- parent tag `nuxt-timereward-extraction-base`

Also checked the parent snapshot for workflow traces:

- no evidence of `get-shit-done` usage was found at the extraction-base commit
- the parent snapshot did contain older `Task Master`-style `.claude` command files, but those are no longer relevant to the current intended workflow

---

## Commits Made During This Stretch

1. `85b729b` — `feat: finalize standalone auth flow and PRD structure`
2. `64206bb` — `docs: clarify extraction env checks and provenance`

---

## Practical Status

The extraction effort is now in a cleaner state:

- standalone auth/docs cleanup is substantially complete
- canonical PRD structure is settled
- historical PRD variants are archived
- provenance is recorded

The main extraction work still remaining is operational rather than structural:

- deployment/env review
- Supabase target verification
- build/smoke validation
- decisions about broader historical docs
