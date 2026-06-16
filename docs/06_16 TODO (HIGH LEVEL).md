# 06_16 TODO (HIGH LEVEL) — Timing / sync re-engineering & GSD milestones

**Date:** 2026-06-16  
**Context:** After extraction is complete, a re-engineering pass is needed because keeping time intervals synchronized across browsers and tabs is tricky. This doc summarizes documentation pointers and recommends GSD milestone structure.

---

## What the documentation already points to

There is **no dedicated “sync re-engineering PRD”** yet (unlike Resend, which has `docs/PRD for Resend use.md`). Re-engineering is referenced as **“TBD”** in program docs, while the **problem surface** is spread across the canonical PRD, testing plan, session notes, and discussions.

### Program sequencing (most explicit)

| Doc | What it says |
|-----|----------------|
| [`discussions/05_27 dev directions advice.md`](../discussions/05_27%20dev%20directions%20advice.md) | **Milestone B: Timing / sync re-engineering** — separate from Resend (Milestone A) and Resend queue/forgot-password (Milestone C). **Do not** mix Resend and sync in one GSD milestone. Finish Resend Phases 1–3 first. |
| [`discussions/05_28 extraction and dev directions.md`](../discussions/05_28%20extraction%20and%20dev%20directions.md) | **Layer 2 = GSD Milestone B**. Run **after** extraction §8 baseline **and** Resend merged to `test`/`main`. §8 offline/AutoPause/multi-tab is the “before” picture; re-engineering is the “after” acceptance target. |

Recommended order already written:

```
Layer 0 — Extraction closure
Layer 1 — GSD Milestone A: Resend (PRD Phases 1–3)
Layer 2 — GSD Milestone B: Timing / sync re-engineering
Layer 3 — GSD Milestone C: Resend Phases 4–5 (optional)
```

### Canonical product behavior today

[`docs/REARCHITECT/PRD for NUXT.md`](REARCHITECT/PRD%20for%20NUXT.md) frames the re-engineering surface:

- **§6.3 AutoPause** — cumulative thresholds, replay after offline
- **§6.4 Offline** — `useOfflineQueue`, START/STOP/AUTO_PAUSE replay
- **§6.5 Real-time sync** — multi-tab / cross-browser via Realtime + composables
- **§9.2** — idempotent RPCs + timestamp params (migrations 025–028) as *partial* hardening, not a full redesign

Core value in §2: *“Keep timer state synchronized across reconnects and multiple browser contexts.”*

### Known pain points (why re-engineering is needed)

| Area | Doc pointer | Issue |
|------|-------------|--------|
| **Multi-tab + Supabase auth** | [`docs/multi tab problems.perplexity.md`](multi%20tab%20problems.perplexity.md), [`docs/multi tab problems.answer 1.perplexity.md`](multi%20tab%20problems.answer%201.perplexity.md) | `isSingleton: true` hardcoded in `@nuxtjs/supabase`; WiFi drop + second tab can hang until reload; suggestions: leader tab / `BroadcastChannel`, less aggressive refresh |
| **Mitigations already shipped** | CHANGELOG, [`SESSION_NOTES_2026-03-21.md`](historical/session-notes/SESSION_NOTES_2026-03-21.md) | `supabase-no-lock.client.ts`, singleton guards on `useClockSync` / daily rollover — **partial fixes**, not architectural |
| **Offline time lost** | [`docs/_FORLATER.md`](_FORLATER.md) §2, [`discussions/lost offline time.md`](../discussions/lost%20offline%20time.md) | Replay uses server `NOW()`; proposed `client_timestamp` with ~5 min drift cap |
| **Clock display** | `app/composables/useClockSync.ts` | Client/server offset for display; separate from authoritative timer state |
| **Testing debt** | [`docs/Manual Testing Plan.md`](Manual%20Testing%20Plan.md) §15–16 | Many multi-tab / cross-browser cases still **unchecked** |
| **E2E harness** | `Playwright/multi-tab-sync.spec.ts`, `cross-browser-sync.spec.ts` | Intended “after” acceptance tests for Milestone B |
| **Research (not a decision)** | [`docs/best practices.perplexity offline.md`](best%20practices.perplexity%20offline.md) | Local-first queues, PowerSync/RxDB — background reading only |

### What is **not** in scope for re-engineering (per docs)

From `05_27`: re-engineering does **not** replace Supabase Auth or username-first login. Resend stays a transport layer. Email work should not ride on the sync branch.

---

## Should this be GSD milestone(s)?

**Yes — and the docs already assume that.** The open question is not “GSD or not?” but **how many milestones/phases** and **whether you write a vertical PRD first**.

### Recommended GSD shape

**Use GSD milestones, not ad-hoc work**, matching the existing A/B/C model:

| GSD unit | Scope | When |
|----------|--------|------|
| **Milestone A** (already planned) | Resend PRD Phases 1–3 | After / parallel with extraction close-out |
| **Milestone B** | Timing / sync / offline re-engineering | **After** A merged; **after** extraction §8 baseline recorded |
| **Milestone C** (optional) | Resend Phases 4–5 (queues, forgot-password) | When product needs it — independent of B |

**Do not** fold Milestone B into extraction closure or Resend Milestone A. `05_27` is explicit: different surface area, different branch strategy, different acceptance tests.

### Should Milestone B be one milestone or several?

**One GSD milestone with multiple phases inside it** is the best fit initially — same pattern as Resend (A1/A2/A3 inside Milestone A).

Reasons:

1. Problems are **coupled**: offline queue, Realtime sync, multi-tab auth locks, AutoPause replay, and display clock all touch `useActivities`, RPCs, and connection lifecycle.
2. Docs already treat this as **one “bigger surface”** milestone, not a list of unrelated features.
3. Playwright + Manual Testing Plan §15–16 are **one acceptance envelope** (multi-tab + cross-browser + offline).

Split into **separate GSD milestones** only if you later discover incompatible delivery tracks, e.g.:

- **B1 — Multi-tab / Supabase client architecture** (leader tab, auth refresh, Realtime lifecycle)
- **B2 — Offline authority model** (`client_timestamp`, queue semantics, lost offline time)
- **B3 — AutoPause / server-authoritative intervals**

That split is reasonable **after** a `/gsd-discuss-phase` or a dedicated sync PRD defines boundaries. Right now the docs don’t justify three milestones yet — only one “TBD” bucket.

### Prerequisite before `/gsd-plan-phase`

Resend has `docs/PRD for Resend use.md`; sync re-engineering **does not**. Before GSD planning, add something parallel, e.g. **`docs/PRD for Sync Re-engineering.md`** (or `/gsd-spec-phase`), covering:

- Target architecture (server-authoritative vs hybrid; tab leader; what stays Realtime)
- In/out of scope (auth stays Supabase; no Resend; no Group B rewards)
- Acceptance criteria mapped to Manual Testing Plan §15–16 + Playwright specs
- Explicit “before” baseline from completed extraction §8

Then:

```
/gsd-new-project   (or /gsd-new-milestone after extraction)
/gsd-map-codebase  (if not done)
/gsd-discuss-phase 1..N   (Milestone B)
/gsd-plan-phase …
/gsd-execute-phase …
```

---

## Practical sequence (aligned with existing docs)

1. **Finish extraction** — especially §8 Supabase matrix + §15–16 baseline notes (even if some tests fail — that’s the “before” record).
2. **GSD Milestone A — Resend 1–3** (already specced).
3. **Write sync re-engineering PRD/spec** (biggest doc gap today).
4. **GSD Milestone B** — one milestone, likely 3–5 phases (multi-tab auth → Realtime consistency → offline timestamps → AutoPause replay → Playwright/UAT).
5. **Optional Milestone C** — Resend 4–5 when triggers exist.

---

## Bottom line

- Documentation **already recommends** timing/sync re-engineering as **GSD Milestone B**, **after** extraction baseline and **after** Resend, **not** mixed with email work.
- It should be **a GSD milestone (with multiple phases)**, not a loose refactor — but you still need a **vertical PRD** like Resend’s before planning executes well.
- Splitting into **multiple GSD milestones** is optional later; start with **one Milestone B** unless discuss-phase reveals hard boundaries.

**Possible follow-ups:** draft `PRD for Sync Re-engineering.md` table of contents from the docs above; map Milestone B phases to Manual Testing Plan §15–16 line items.
