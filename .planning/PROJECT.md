# TimeReward — Resend Email Integration (Milestone A)

## What This Is

TimeReward is an existing Nuxt 3 + Supabase productivity app (activities, timers, rewards, subscriptions) deployed on Vercel. This project wires up [Resend](https://resend.com) for email delivery so that signup/auth confirmation mail is sent from the app's own verified sender instead of Supabase's shared default SMTP, and lays a reusable foundation for future transactional email. Scope is **Milestone A = PRD Phases 1–3** only, targeting the **development** (local `.env`) and **test** (Vercel Preview branch `test`, Supabase `time-reward-test`, `test.myfocusrewards.com`) environments. Implementation mirrors the proven two-channel pattern from the reference repo `sldev2/PopulistsUnite`.

## Core Value

Auth/signup confirmation emails send reliably from `TimeReward <support@myfocusrewards.com>` via Resend — escaping Supabase's tiny inbuilt SMTP hourly cap — and `RESEND_API_KEY` actually powers a live code path.

## Requirements

### Validated

<!-- Inferred from the existing, extracted codebase. Locked unless explicitly revisited. -->

- ✓ Standalone Nuxt + Supabase app runs on dev + test — existing (extraction closed 2026-06-16)
- ✓ Signup with `NUXT_SKIP_EMAIL_CONFIRMATION=true` creates a pre-confirmed user (no email) — existing
- ✓ Real Supabase confirmation email + `/confirm` redirect + post-confirm login verified on `test.myfocusrewards.com` — existing (2026-06-16)
- ✓ Stripe subscription/checkout wired with documented "not configured" behavior — existing
- ✓ `RESEND_API_KEY` / `EMAIL_FROM_*` declared in `nuxt.config.ts` runtimeConfig slot but read by no code — existing (the gap this project closes)

### Active

<!-- Milestone A scope. Building toward these. -->

- [ ] Phase 1 — Auth email delivered via Resend SMTP (Channel A): Supabase custom SMTP documented/configured for `time-reward-test`, redirect URLs for local + test, raised `rate_limit_email_sent`, `.env.example` updated with `RESEND_SMTP_*`
- [ ] Phase 2 — `POST /api/auth/resend-verification` (Valibot, generic success, no email enumeration) + register/login resend-verification UI with cooldown + `auth-resend-verification` rate limit (5/hr/IP, 429)
- [ ] Phase 3 — Resend API foundation: `resend` npm dependency, `runtimeConfig` wiring per PRD §6.4 (`resendApiKey` + `email.*`), `server/services/EmailDeliveryService.ts` thin wrapper, graceful no-op when API key missing, test send path

### Out of Scope

<!-- Explicit boundaries with reasoning to prevent re-adding. -->

- Phase 4 — Queued transactional email (`email_queue`, Nitro dispatcher, `dispatch-email.mjs`) — deferred until product defines enqueue triggers; `EMAIL_AUTOMATION_*` stays reserved
- Phase 5 — Password recovery via Resend API (`AccountRecoveryService`) — no forgot-password flow exists yet
- Milestone B — Timing/sync re-engineering (offline queue / AutoPause / multi-tab) — separate later milestone
- Production environment (prod Supabase project, `myfocusrewards.com` prod SMTP) — deferred until launch; dev + test only
- Replacing Google Workspace inbound mail — Resend is outbound only
- PopulistsUnite event/RSVP queues — domain-specific, not a TimeReward product need

## Context

- **Reference implementation:** `sldev2/PopulistsUnite` (GitHub) uses a dual-channel model — Supabase Auth → Resend SMTP for auth templates (Channel A), and a Nuxt server `EmailDeliveryService` → Resend HTTP API for app-owned mail (Channel B). TimeReward Phase 1 implements Channel A; Phase 3 builds Channel B infrastructure without queue tables.
- **Existing infra (from session notes):** Outbound domain `send.myfocusrewards.com` with Resend/SES DKIM (`resend._domainkey` in GoDaddy); inbound via Google Workspace; app sender `support@myfocusrewards.com`. Resend dashboard must show domain/sender Verified before Phase 1 go-live.
- **Current auth-email behavior:** `NUXT_SKIP_EMAIL_CONFIRMATION=true` (local) → pre-confirmed user, no email; `false`/unset (preview) → Supabase `signUp` sends confirmation via Supabase Auth default SMTP. Resend vars are currently inert in code.
- **Env reconciliation done** for dev + test (`discussions/04_12 remaining extraction.md` §2a): `RESEND_API_KEY` is a declared-but-unread `slot`; `EMAIL_FROM_*` and `EMAIL_AUTOMATION_*` are reserved on Vercel `test`.
- **Human vs AI work:** Resend dashboard verification, Supabase dashboard SMTP/redirect/rate-limit config are human (dashboard) tasks; API routes, UI, service wrapper, env docs are AI/code tasks. Phase 1 is mostly human + docs; Phases 2–3 are mostly code.
- **Key docs:** `docs/PRD for Resend use.md` (executable spec), `docs/ENV-SETUP.md`, `discussions/05_28 extraction and dev directions.md` (Layer 1 A1–A3), `docs/Resend Use by Environment.md`, `docs/compare with Resend use in PopulistsUnite.md`, `docs/05_23 current auth email rate limit.md`.

## Constraints

- **Tech stack**: Nuxt 3, `@nuxtjs/supabase`, Supabase Auth, Vercel, `resend` npm (`^6.x`, match PopulistsUnite major) — extend existing `nuxt.config.ts` runtimeConfig; do not introduce a different email provider.
- **Environment scope**: Dev + test only. Production Supabase/SMTP reconciliation deferred until launch — not a gate for this milestone.
- **Security**: `RESEND_API_KEY` server-only, never in `public` runtimeConfig. Valibot validation on all email-triggering endpoints. Generic responses (no email enumeration). Rate limits on resend-verification. Log user/job IDs, not full email bodies.
- **Backward compatibility**: App must behave gracefully (no crash) when `RESEND_API_KEY`/`EMAIL_FROM_*` are absent. `NUXT_SKIP_EMAIL_CONFIRMATION=true` must remain a valid fast-signup path for local dev.
- **Hosting independence**: Local `npm run dev` must be able to call the Resend API when keys are set — Vercel is not required for Resend to function.
- **Dispatcher off**: `EMAIL_AUTOMATION_ENABLED` stays unset/false through Milestone A — no background queue or Nitro dispatcher (that is Phase 4).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Scope to PRD Phases 1–3 (Milestone A), defer 4–5 | Phases 1–3 deliver real auth-email value; 4–5 need product triggers / forgot-password flow that don't exist yet | — Pending |
| Dev + test environments only | Extraction sign-off covers dev + test; prod deferred to launch | — Pending |
| Mirror PopulistsUnite two-channel pattern | Proven reference implementation reduces design risk | — Pending |
| Single thin `EmailDeliveryService` in Phase 3, no queue tables | No enqueue points defined yet; avoid premature infrastructure (PRD D1) | — Pending |
| Password reset stays Supabase-native for now | No `/forgot-password` flow shipped; custom Resend send is Phase 5 (PRD D2) | — Pending |
| `EMAIL_AUTOMATION_*` remain reserved | Dispatcher is Phase 4; avoid dead/live-but-broken config | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-17 after initialization*
