# Session Notes - 2026-05-30

## Summary

Continuation of extraction / Stripe work: **quarterly subscription plan** wired and deployed to **`test`**, Vercel test Stripe price IDs updated, **`/subscription/expired` UI consistency** fixes, and **`discussions/05_28 Section 3.md`** Stripe verification guide expanded.

Prior context (Resend docs, GSD sequencing, extraction roadmap): **`SESSION_NOTES_2026-05-28.md`**.

---

## Quarterly Stripe plan

### Problem

After adding `NUXT_STRIPE_PRICE_ID_QUARTERLY` in Vercel, **`/subscription/expired` still showed only Monthly + Yearly**.

**Cause:** Quarterly code was **committed locally but not on `origin/test`** until `develop` was merged into `test` and pushed. Remote `test` previously had only `monthly` + `yearly` in `plans.get.ts` / `nuxt.config.ts` (not semiannual — that was removed in May).

### Implementation (`4111c74`)

| File | Change |
|------|--------|
| `nuxt.config.ts` | `stripePriceIdQuarterly` ← `NUXT_STRIPE_PRICE_ID_QUARTERLY` |
| `server/api/stripe/plans.get.ts` | Fetch quarterly price; order **monthly → quarterly → yearly** |
| `server/api/stripe/checkout.post.ts` | `plan: 'quarterly'` |
| `app/pages/subscription/expired.vue` | 3-column grid; billing labels |
| `.env.example` | `NUXT_STRIPE_PRICE_ID_QUARTERLY` |

### Vercel env (Preview / branch `test`)

User updated Stripe **test** prices and Vercel vars:

| Variable | Example value (test) |
|----------|----------------------|
| `NUXT_STRIPE_PRICE_ID_MONTHLY` | `price_1TcdCRDOzxk5yxuTDnxtZIwd` |
| `NUXT_STRIPE_PRICE_ID_QUARTERLY` | `price_1TcdqeDOzxk5yxuTRWVZgt3K` |
| `NUXT_STRIPE_PRICE_ID_YEARLY` | `price_1TcdrXDOzxk5yxuTGXnX2YQj` |

Also ensure `NUXT_STRIPE_SECRET_KEY` is the **test-mode** key matching those prices.

**Plans API cache:** 15 minutes in `plans.get.ts` — redeploy or wait after Stripe/env changes.

---

## Subscription page UI (`61cc96d` — `subscription tweaks`)

On **`test` only** (not yet on `develop` / `main`):

1. **Consistent buttons** — all three cards: same blue→purple gradient, label **Subscribe Now** (was “Select Plan” on non-selected cards; Quarterly had grey button).
2. **Billing cadence copy** — Quarterly shows `billed every N months` from Stripe `interval_count` (intended **4 months**, not 3). Static fallback `intervalCount: 4` in `plans.get.ts`.

**Verify in Stripe Dashboard:** quarterly price billing period should be **every 4 months** if copy should read “billed every 4 months” and per-month math should divide by 4.

---

## Git state at session end

| Branch | Tip | vs remote |
|--------|-----|-----------|
| **`test`** | `61cc96d` subscription tweaks | **in sync** with `origin/test` |
| **`develop`** | `1febf80` (no `61cc96d`) | in sync with `origin/develop` |
| **`main`** | behind `test` / `develop` on Stripe work | in sync with `origin/main` |

Recent commits on **`test`**:

1. `4111c74` — feat(stripe): add quarterly subscription plan between monthly and yearly
2. `1febf80` — save (Section 3 Network tab docs in `discussions/05_28 Section 3.md`)
3. `61cc96d` — subscription tweaks (button + 4-month billing label)

Working tree: **clean**.

---

## Docs / discussions

| File | Status |
|------|--------|
| `discussions/05_28 Section 3.md` | Stripe route verification + how to use Network tab / direct URL for `/api/stripe/plans` |
| `discussions/05_28 extraction and dev directions.md` | Integrated extraction + Resend GSD roadmap (see 05-28 session notes) |
| `discussions/05_27 dev directions advice.md` | PRD hierarchy + GSD Milestone A/B/C (clarification addendum committed via `1febf80` chain) |

---

## Extraction §3 Stripe (progress)

User verified subscription offerings on **`test.myfocusrewards.com`** after deploy:

- Three plans visible after push
- Checkout path available per plan

Still open for full extraction closure: env reconciliation doc, integration policy write-up, §7–§8 smoke/Supabase matrix — see `discussions/04_12 remaining extraction.md` and `05_28 extraction and dev directions.md`.

---

## Practical restart (next chat)

1. **Confirm Stripe quarterly price** in dashboard = **every 4 months** (matches UI copy and $/month math).
2. **Merge `test` → `develop` → `main`** when ready (`61cc96d` subscription UI fixes only on `test` today).
3. **Extraction Layer 0** — env reconciliation + §7–§8 verification per `05_28 extraction and dev directions.md`.
4. **GSD Milestone A — Resend** — `docs/PRD for Resend use.md` Phases 1–3 (orthogonal to Stripe).
5. **Production Stripe** — inventory still has `NUXT_STRIPE_*` mainly on Preview/`test`; prod checkout policy TBD.

---

## Key doc index

| Doc | Role |
|-----|------|
| `discussions/05_28 Section 3.md` | How to verify Stripe routes and `/api/stripe/plans` |
| `docs/PRD for Resend use.md` | Next major build milestone (email) |
| `discussions/05_28 extraction and dev directions.md` | Extraction + sequencing |
| `SESSION_NOTES_2026-05-28.md` | Resend docs, GSD advice, earlier handoff |

---

## Not done this session

- Resend implementation (still no `resend` npm package / SMTP config)
- Merge subscription tweaks to `develop` / `main`
- Full extraction “Done when” checklist
- Google Workspace alias follow-up
