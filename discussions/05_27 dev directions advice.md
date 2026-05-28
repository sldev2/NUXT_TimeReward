# Dev directions advice — PRD hierarchy, Resend PRD, and sequencing vs re-engineering

**Date:** 2026-05-27  
**Context:** Whether `docs/PRD for Resend use.md` should merge into canonical PRD; advisability of implementing Resend before GSD re-engineering (timing/sync).

---

## Prior PRD documentation in this repo

| Document | Location | Role today |
|----------|----------|------------|
| **PRD for NUXT** (canonical) | `docs/REARCHITECT/PRD for NUXT.md` | **Source of truth** for current product scope, behavior, and implementation snapshot (auth, timers, rewards, offline, subscriptions). Explicitly *not* a migration/re-architecture plan. |
| PRD for NUXT (extraction-ready) | `docs/REARCHITECT/historical/PRD for NUXT.extraction-ready.md` | Historical derivative; archived |
| PRD for NUXT (handoff-ready) | `docs/REARCHITECT/historical/PRD for NUXT.handoff-ready.md` | Historical derivative; archived |
| PRD — Rewards Deltas | `docs/historical/migration/PRD - Nuxt Supabase Migration.Rewards Deltas March11.md` | Migration-era gap analysis vs parent Blazor app; not canonical |
| **PRD for Resend use** (new) | `docs/PRD for Resend use.md` | Forward-looking implementation spec for email/Resend |
| PRD-adjacent (not full PRDs) | `docs/Manual Testing Plan.md`, `docs/best practices.perplexity offline*.md`, session notes | Reference canonical PRD sections (e.g. 6.6 auth, 6.7 multi-tab); track versioned PRD edits in history |

`docs/README.md` and session notes from 2026-03-31 establish one rule: **`docs/REARCHITECT/PRD for NUXT.md` is the canonical PRD**. Everything else is historical, vertical, or supporting.

Related but not PRDs: `docs/_FORLATER.md` (deferred Resend SMTP), `docs/ENV-SETUP.md`, `docs/05_23 current auth email rate limit.md`, and the Resend docs (`docs/Resend Use by Environment.md`, `docs/compare with Resend use in PopulistsUnite.md`).

---

## Should `PRD for Resend use.md` be incorporated into the canonical PRD?

**Recommendation: keep it separate; link from the canonical PRD, don’t merge the body.**

### Why not merge

1. **Different document types** — Canonical PRD is a *current-state* spec (“what exists now”). Resend PRD is a *delivery plan* (“what to build, phased, with acceptance criteria”). Merging would blur the rule in §12 of the canonical PRD: label items as implemented / partial / open.

2. **Size and focus** — Canonical PRD is already ~530 lines covering timers, offline, rewards, Stripe, etc. Resend adds phases, env tables, PopulistsUnite traceability, and rollout — noise for anyone reading “how does the app work today?”

3. **Precedent** — Stripe is documented *in* the canonical PRD because it’s **implemented**. Resend is **not implemented yet**; it belongs with `_FORLATER`-class work until Phase 1 lands.

4. **GSD-friendly** — A standalone vertical PRD maps cleanly to one GSD phase/milestone (“Resend integration”) without editing the big canonical doc every sprint.

### What to do instead (light integration)

When ready (or as docs housekeeping):

| Action | Where |
|--------|--------|
| Add a short **§6.6 addendum** or bullet under auth: “Email delivery: **open** — see `docs/PRD for Resend use.md`” | `docs/REARCHITECT/PRD for NUXT.md` |
| Add Resend PRD + compare doc to **Recommended reading** | `docs/README.md` |
| Replace or narrow `_FORLATER.md` item 4 with “superseded by PRD for Resend use” | `docs/_FORLATER.md` |
| Optionally move to `docs/REARCHITECT/PRD for Resend use.md` for naming consistency | optional |

After implementation, **fold outcomes into §6.6** (auth email path, resend-verification route, env vars) and mark phases done in the Resend PRD — same pattern as Stripe in §6.7.

---

## Resend first, then GSD re-engineering — is that sensible?

**Yes. That sequencing is sound, with a few boundaries.**

### Why Resend first works well

| Factor | Assessment |
|--------|------------|
| **Orthogonality** | Resend touches Supabase dashboard SMTP, `server/api/auth/*`, optional `server/services/*`, env config, register/login UX. Timing sync lives in composables, RPCs, Realtime, offline queue — **almost no overlap**. |
| **Reference implementation** | PopulistsUnite gives copy-adapt patterns (SMTP setup, `resend-verification`, `EmailDeliveryService`, dispatcher). Lower risk than inventing on the re-architected codebase. |
| **Production value early** | Phase 1–2 fix real pain (Supabase SMTP cap, sender branding, testable signup on preview) without waiting for a large refactor. |
| **Merge/conflict risk** | Low if Resend lands on `test`/`main` before a long-lived re-engineering branch. Email code rarely touches `useActivities.ts` or timer RPCs. |
| **GSD fit** | Resend is a **well-scoped milestone** — ideal first GSD phase: clear FRs, acceptance tests, little coupling. Timing re-engineering is a **separate, harder milestone**. |

### Suggested order

```
1. Resend Phase 1–2 (SMTP + resend-verification)     ← ship first; mostly config + thin API
2. Resend Phase 3 (send helper + resend package)     ← small server layer
3. [Optional] Phase 4–5 when product needs them      ← queue / forgot-password
4. GSD re-engineering (timing / sync / offline)      ← parallel concern, bigger surface
```

Phase 1 is largely **Supabase + Resend dashboard + docs** — barely touches app logic. Phase 2 is a **single API route + UI** — unlikely to be thrown away by a timer refactor.

### Caveats (keep the work cheap to redo)

1. **Don’t over-build Phase 4 before you know triggers** — TimeReward may not need PopulistsUnite’s event queues for a long time. Phase 3 (thin `EmailDeliveryService`) is enough until you define subscription/trial emails.

2. **`EMAIL_AUTOMATION_ENABLED` on Vercel serverless** — PopulistsUnite’s Nitro interval dispatcher is awkward on serverless. Prefer CLI/cron for queue dispatch until re-engineering settles hosting patterns.

3. **Re-engineering might change “where” not “what”** — If GSD moves more logic server-side, you might relocate email services; you won’t re-do Supabase SMTP or Resend API semantics. Keep email in **`server/services/` + `server/api/`** as today.

4. **One branch strategy** — Finish Resend Phase 1–2 on `test`, merge to `main`, *then* branch for timing re-engineering. Avoid two long-lived branches touching `nuxt.config.ts` and auth at once.

5. **Manual Testing Plan §3.4** — Implementing Resend is a good time to **close** deferred email verification tests; that’s independent of timer work.

### When *not* to do Resend first

Only if the re-engineering plan includes **replacing Supabase Auth** or **username-first login** — it doesn’t, from the canonical PRD. Auth stays Supabase; Resend stays the transport layer.

---

## Bottom line

- **Existing PRD hierarchy:** one canonical doc (`REARCHITECT/PRD for NUXT.md`); historical and vertical PRDs beside it.
- **Resend PRD:** keep standalone; cross-link from canonical PRD and README; update §6.6 when built.
- **Sequencing:** implement Resend (at least Phases 1–3) **before** the timing/sync re-engineering — low coupling, high leverage, PopulistsUnite de-risks it. Use GSD for Resend as its own phase, then a separate GSD milestone for sync/offline.

**Optional follow-up:** light docs integration (README + canonical PRD pointer + `_FORLATER` update) in a small docs-only commit.

---

## Clarification addendum — GSD scope for Resend Phases 1–3

**Added:** 2026-05-27  
**Question:** Does “Use GSD for Resend as its own phase” mean GSD for Phases 1–3, or only for phases beyond Phase 3?

### Short answer

**Use GSD for the Resend build-out as a whole (Phases 1–3 as the minimum scope), not only for Phase 4+ and not mixed into the timing/sync re-engineering milestone.**

The “Bottom line” above bundles two separate ideas:

| Idea | Meaning |
|------|--------|
| **Sequencing** | Do Resend (at least Phases 1–3) **before** the timing/sync re-engineering. |
| **GSD structure** | Treat Resend as **its own GSD milestone/phase(s)**; treat sync/offline as a **separate** one later. |

So: **GSD for Resend Phases 1–3** — yes, that’s the intent. **GSD only after Phase 3** — no, that’s not the intent.

### How that maps to PRD phases in practice

Not every sub-phase needs the same amount of GSD ceremony:

| Phase | What it is | GSD fit |
|-------|------------|--------|
| **1 — Supabase → Resend SMTP** | Mostly **human** work in Supabase + Resend dashboards; small doc/env updates in repo | Light GSD (plan + checklist + verify); little or no agent execution |
| **2 — Resend verification API + UI** | Real code (`/api/auth/resend-verification`, UI, rate limits) | **Good GSD execute phase** |
| **3 — `resend` package + send helper** | Server service, runtime config wiring | **Good GSD execute phase** |
| **4–5 — Queue, forgot-password** | Later, when product needs them | Separate GSD phase(s) when ready |

One reasonable GSD layout:

```
Milestone A: Resend integration
  Phase A1: SMTP + docs + manual verify          (PRD Phase 1)
  Phase A2: resend-verification + UI           (PRD Phase 2)
  Phase A3: EmailDeliveryService foundation      (PRD Phase 3)

Milestone B: Timing / sync re-engineering        (later, separate)

Milestone C: Resend queue + password reset       (PRD Phases 4–5, optional, when needed)
```

### What this is **not** saying

- **Not:** “Implement Phases 1–3 by hand without GSD, then turn GSD on for Phase 4+.”
- **Not:** “Run Resend and sync re-engineering in one GSD milestone.”
- **Not:** “You must use GSD for Phase 1 dashboard work” — that part is inherently manual.

### Practical recommendation

If adopting GSD now, **start GSD with the Resend milestone** and include **Phases 1–3** in it. Phase 1 is mostly human verification; Phases 2–3 are where GSD execution pays off. Defer Phase 4–5 until there are concrete email triggers.

**Bottom line (clarified):** Use GSD for **Resend Phases 1–3 as one milestone** (with Phase 1 weighted toward human steps). Keep **sync/offline re-engineering as the next milestone**. Phase 4+ is a **later optional** Resend milestone, not a prerequisite for starting GSD on email.
