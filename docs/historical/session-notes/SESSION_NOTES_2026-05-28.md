# Session Notes - 2026-05-28

## Summary

This session focused on **Resend/email strategy**, **PRD and program sequencing** (Resend before timing/sync re-engineering), **integrating remaining extraction work** with that plan, and **branch merges**. No new application code beyond prior sessions (`UNDER_CONSTRUCTION`, legal pages, BOZ23).

---

## Resend documentation (committed on `develop`, merged to `main`)

### Created

| File | Purpose |
|------|---------|
| `docs/Resend Use by Environment.md` | Localhost vs Vercel; Supabase SMTP vs app API; env matrix |
| `docs/compare with Resend use in PopulistsUnite.md` | Analysis of `sldev2/PopulistsUnite` dual-channel Resend pattern vs TimeReward (no wired code yet) |
| `docs/PRD for Resend use.md` | Phased implementation PRD (Phases 1–5); reference PopulistsUnite |

### Commits

On **`develop`**, then merged to **`main`**:

1. **`df3f59a`** — `docs: add Resend environment guide, PopulistsUnite comparison, and PRD`
2. **`3f4a7de`** — `docs: record PRD hierarchy and Resend-before-re-engineering advice`
3. **`3f66525`** — `Merge branch 'develop' into main`

---

## Dev directions and sequencing (`discussions/`)

### `05_27 dev directions advice.md`

- Keep **`docs/PRD for Resend use.md` separate** from canonical `docs/REARCHITECT/PRD for NUXT.md`; cross-link only.
- **Sequence:** Resend (Phases 1–3) **before** GSD timing/sync re-engineering — low coupling; PopulistsUnite as reference.
- **GSD:** Milestone A = Resend Phases 1–3; Milestone B = sync/offline; Milestone C = Resend Phases 4–5 optional.

### Clarification addendum (2026-05-27, in file — **not yet committed**)

- GSD applies to **Resend Phases 1–3 as one milestone**, not only Phase 4+.
- Phase 1 = mostly human (Supabase/Resend dashboards); Phases 2–3 = good GSD execute targets.

### `05_28 extraction and dev directions.md` (**uncommitted**)

Integrated roadmap:

```
Layer 0 — Extraction closure (finish 04_12)
Layer 1 — GSD Milestone A: Resend (PRD Phases 1–3)
Layer 2 — GSD Milestone B: Timing / sync re-engineering
Layer 3 — GSD Milestone C: Resend Phases 4–5 (optional)
```

Master sequence: env reconciliation → smoke/§8 Supabase → Resend A1–A3 → housekeeping links → mark extraction done → sync GSD.

**§3 Resend policy for extraction:** Keep; implement per Resend PRD; `EMAIL_AUTOMATION_*` reserved until Phase 4.

---

## Remaining extraction (`discussions/04_12 remaining extraction.md`)

Checklist **stale since 2026-05-10** but still the closure tracker.

### Effectively done (verify and tick)

- §2 Vercel hosting decision; `vercel.json` build/output/region/headers
- §3 Stripe — keep (implemented)
- §1 historical docs, §4 app language, §6 junk

### Still open (blocks “Done when”)

- §2 formal env reconciliation (Vercel inventory vs `.env.example` vs code — many `RESEND_*` / `EMAIL_AUTOMATION_*` unused)
- §3 integration policy written down (Stripe/Resend/Turnstile)
- §7 `npm run dev` + browser smoke
- §8 Supabase behavior matrix (+ email path when Resend Phase 1 done)
- §9 Playwright config/docs

### Local edit (**uncommitted**)

User added **`[ S K I P ]`** under §2 deployment “If deploying (verify and document)” — intent: skip or defer that subsection; confirm in next session.

---

## Prior session work (context, already on `main`)

| Topic | Notes |
|-------|--------|
| **`UNDER_CONSTRUCTION`** | `9610f80` — production-only env gate; `test.myfocusrewards.com` unaffected |
| **Legal pages** | `aba8fd5` — `/privacy-policy`, `/terms-of-service` |
| **BOZ23 registration gating** | `1920c81` |
| **Auth email rate limits doc** | `docs/05_23 current auth email rate limit.md` |
| **Google Workspace aliases** | Handoff in `SESSION_NOTES_2026-05-23.md`; `discussions/05_25 fix email alias.md` |
| **Branch merges (earlier)** | `test` → `main`; `test` → `develop` (fast-forward) |

---

## Resend / email — current code reality

- **`resend` npm package:** not installed
- **`RESEND_API_KEY`:** in `nuxt.config.ts` slot + Vercel inventory; **unused in app/server code**
- **Auth email:** Supabase path via `register.post.ts`; local dev typically `NUXT_SKIP_EMAIL_CONFIRMATION=true`
- **DNS:** apex MX → Google; outbound `send` subdomain DKIM for Resend/SES (GoDaddy)

---

## Git state at session end

- **Branch:** `main` (up to date with `origin/main` for **committed** work)
- **Uncommitted:**
  - `discussions/05_28 extraction and dev directions.md` (new)
  - `discussions/05_27 dev directions advice.md` (clarification addendum)
  - `discussions/04_12 remaining extraction.md` (`[ S K I P ]` marker)

---

## Practical restart (next chat)

1. **Commit** uncommitted discussion docs (or discard `[ S K I P ]` if accidental).
2. **Layer 0 — Extraction closure** per `05_28 extraction and dev directions.md`:
   - Env reconciliation table (Vercel ↔ `.env.example` ↔ code)
   - Integration policy in `ENV-SETUP.md` or runbook (Stripe keep, Resend keep per PRD, Turnstile optional/off)
   - §7 smoke + §8 Supabase matrix on `time-reward-test`
3. **GSD Milestone A — Resend** per `docs/PRD for Resend use.md`:
   - **A1:** Supabase → Resend SMTP (human) + verify signup email
   - **A2:** `/api/auth/resend-verification` + UI
   - **A3:** `resend` package + `EmailDeliveryService` foundation
4. **Optional housekeeping:** README + canonical PRD §6.6 pointer + `_FORLATER.md` update (from `05_27`).
5. **Later:** GSD Milestone B timing/sync re-engineering — **after** extraction baseline + Resend A1–A2 merged.
6. **Production:** `UNDER_CONSTRUCTION=1` on Vercel Production only when ready to show coming-soon on `myfocusrewards.com`.

---

## Key doc index

| Doc | Role |
|-----|------|
| `docs/REARCHITECT/PRD for NUXT.md` | Canonical current-state PRD |
| `docs/PRD for Resend use.md` | Resend implementation spec |
| `discussions/05_27 dev directions advice.md` | PRD hierarchy + sequencing + GSD clarification |
| `discussions/05_28 extraction and dev directions.md` | Extraction + dev directions integrated roadmap |
| `discussions/04_12 remaining extraction.md` | Extraction closure checklist |
| `docs/Resend Use by Environment.md` | Local vs Vercel Resend behavior |

---

## Not done this session

- No Resend implementation (code or Supabase SMTP config)
- No extraction §7–§8 verification runs recorded
- No light docs integration (README / `_FORLATER` / canonical PRD §6.6)
- Google Workspace alias troubleshooting not revisited
