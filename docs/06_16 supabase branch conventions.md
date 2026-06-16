# 06_16 — Supabase branch conventions vs Git / Vercel

**Date:** 2026-06-16  
**Context:** Manual smoke on `test.myfocusrewards.com` surfaced confusion: the **`time-reward-test`** Supabase project shows **`main (PRODUCTION)`** in the dashboard while testing the Git **`test`** branch.

---

## Short answer

**"main (PRODUCTION)" in Supabase is not the same thing as your Git `test` branch or `myfocusrewards.com` production.**

| What you see | What it means |
|--------------|----------------|
| **Project: `time-reward-test`** | Your **test/preview** Supabase project — correct for `test.myfocusrewards.com` |
| **Branch: `main` (PRODUCTION)** | Supabase's **primary database branch inside that project** — not "live prod traffic" |

Supabase labels the default branch **PRODUCTION** because it's the **persistent, primary DB** for that project. Every project starts with one branch called `main`. The branch dropdown typically shows only `main` until you create additional Supabase preview branches.

That badge does **not** mean this project is wired to Vercel production or `myfocusrewards.com`.

---

## Environment map (this repo)

This repo intentionally uses **separate Supabase projects**, not Supabase database branching, to separate environments:

| Layer | Test / preview (what you're doing now) | Production (deferred) |
|-------|----------------------------------------|------------------------|
| **Git** | branch `test` | branch `main` |
| **Vercel** | Preview → `test.myfocusrewards.com` | Production → `myfocusrewards.com` |
| **Supabase** | project **`time-reward-test`** | separate prod project (later) |
| **Supabase branch** | `main` ← the only branch; badge says PRODUCTION | (future prod project also has its own `main`) |

So: **Git `test` + Vercel preview + Supabase `time-reward-test` + Supabase `main` branch** is the expected setup. Nothing is miswired just because Supabase says PRODUCTION.

See also: `discussions/04_12 remaining extraction.md` (environment scope), `docs/ENV-SETUP.md`.

---

## Why the wording is confusing

Supabase **Database Branching** (Pro feature: "+ Create branch") is meant for `main` plus ephemeral preview DB branches tied to PRs. This project is **not** using that — and does not need to for extraction. A dedicated **`time-reward-test`** project is the right pattern.

Do not conflate:

- **Supabase project name** (`time-reward-test`) — which backend the app talks to
- **Supabase DB branch** (`main`) — internal branching within one project
- **Git branch** (`test` vs `main`) — source control
- **Vercel environment** (Preview vs Production) — deployment target

---

## Auth URL configuration (on `time-reward-test`)

On **`time-reward-test` → Authentication → URL configuration** (even though the header says `main PRODUCTION`):

1. **Site URL:** `https://test.myfocusrewards.com`
2. **Redirect URLs:** add at least:
   - `https://test.myfocusrewards.com/confirm`
   - `https://test.myfocusrewards.com/**`
3. Remove or deprioritize stale `http://localhost:3000/**` if still present (causes confirmation links to redirect to localhost).

**Verified 2026-06-16:** Full preview path on `test.myfocusrewards.com`: register → confirmation email → `/confirm` redirect (not localhost) → login after confirm.

If **Site URL** is still `http://localhost:3000` on the test Supabase project, confirmation links will redirect there even when Vercel `NUXT_PUBLIC_APP_URL` is `https://test.myfocusrewards.com`.

Full table: `docs/ENV-SETUP.md` (Supabase Auth redirect URLs).

---

## When to actually worry

| Scenario | Risk |
|----------|------|
| Vercel **Production** env vars point at `time-reward-test` Supabase keys | Preview DB could serve live users — misconfiguration |
| Destructive migrations on what will become the **real** prod Supabase project | Data loss on launch |
| Editing Auth URLs on **`time-reward-test`** while smoke-testing preview | **Expected and safe** |

---

## Bottom line

- **`time-reward-test`** = your test database project.
- **`main (PRODUCTION)`** = Supabase's name for that project's primary branch, not "I'm on prod."
- Safe to update Site URL and redirect URLs on this project for `test.myfocusrewards.com` smoke testing.
