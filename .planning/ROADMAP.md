# Roadmap: TimeReward — Resend Email Integration (Milestone A)

## Overview

TimeReward already runs on Nuxt 3 + Supabase + Vercel, but its `RESEND_API_KEY` / `EMAIL_FROM_*` slots are declared and read by no code. Milestone A makes those keys power real email through the proven two-channel pattern from `sldev2/PopulistsUnite`, scoped to dev + test only. The journey: first route Supabase Auth's signup/confirm mail through Resend SMTP so branded confirmation email actually delivers and escapes Supabase's inbuilt hourly cap (Channel A, the delivery gate), then add a safe self-service resend-verification endpoint + UI for users who lost the first mail, and in parallel lay a thin reusable `EmailDeliveryService` foundation over the Resend HTTP API (Channel B) that degrades gracefully when unconfigured. No queue, dispatcher, or password-recovery infrastructure — those prerequisites genuinely don't exist yet.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Auth Email via Resend SMTP (Channel A)** - Branded signup/confirmation mail delivers through Resend SMTP, escaping Supabase's inbuilt cap
- [ ] **Phase 2: Resend Verification Endpoint + UI** - Unconfirmed users can safely request another confirmation email, enumeration-safe and rate-limited
- [ ] **Phase 3: Resend API Foundation (Channel B)** - Reusable thin `EmailDeliveryService` over the Resend HTTP API that no-ops gracefully when unconfigured

## Phase Details

### Phase 1: Auth Email via Resend SMTP (Channel A)
**Goal**: Signup confirmation email delivers reliably from the branded app sender via Resend SMTP, escaping Supabase's inbuilt hourly cap, on dev + test.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: SMTP-01, SMTP-02, SMTP-03, SMTP-04, SMTP-05, SMTP-06
**Success Criteria** (what must be TRUE):
  1. With `NUXT_SKIP_EMAIL_CONFIRMATION=false`, a signup delivers a confirmation email from `TimeReward <support@myfocusrewards.com>` (not `noreply@mail.app.supabase.io`), visible as a send event in the Resend dashboard.
  2. Confirmation links return to the correct origin for both local (`http://localhost:4000`) and test (`https://test.myfocusrewards.com`) — no 404 or dropped `emailRedirectTo`.
  3. Two signups within minutes both send their confirmation mail without hitting the inbuilt hourly cap (`rate_limit_email_sent` raised after custom SMTP is active).
  4. A new contributor can read `.env.example` and see the documented `RESEND_SMTP_*` / sender variables for dev + test.
**Plans**: TBD

Plans:
- [ ] 01-01: TBD

### Phase 2: Resend Verification Endpoint + UI
**Goal**: An unconfirmed user can request another confirmation email through a safe, enumeration-resistant, rate-limited endpoint and a clear UI action with cooldown.
**Mode:** mvp
**Depends on**: Phase 1 (real end-to-end delivery requires Channel A live; route/UI can be built and unit-tested behind it)
**Requirements**: RVER-01, RVER-02, RVER-03
**Success Criteria** (what must be TRUE):
  1. `POST /api/auth/resend-verification` accepts `{ email }`, validates it with Valibot, calls `supabase.auth.resend({ type: 'signup', ... })`, and a registered unconfirmed user receives a fresh confirmation email.
  2. The endpoint returns an identical generic success response whether or not the email is registered — no account-existence enumeration.
  3. After 5 requests within an hour from the same client IP, the 6th returns HTTP 429 with a friendly message (limit keyed `auth-resend-verification`, real `x-forwarded-for` IP, serverless-safe Upstash-backed store).
  4. The register/login flow exposes a "resend verification email" action with a visible cooldown.
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 02-01: TBD

### Phase 3: Resend API Foundation (Channel B)
**Goal**: A reusable thin server-side email send service exists over the Resend HTTP API, wired through server-only runtimeConfig, that proves a live send path and degrades gracefully when unconfigured.
**Mode:** mvp
**Depends on**: Phase 1 (shares only the `nuxt.config.ts` runtimeConfig edit; otherwise an independent code track parallelizable with Phase 2)
**Requirements**: RAPI-01, RAPI-02, RAPI-03, RAPI-04, RAPI-05
**Success Criteria** (what must be TRUE):
  1. With `RESEND_API_KEY` set, an operator can hit a test-send/health path and a real email is delivered via the Resend HTTP API, confirming the live code path.
  2. With `RESEND_API_KEY` absent, the app boots and runs without crashing — the service logs a warning, reports `isConfigured = false`, and performs no send.
  3. `EmailDeliveryService.send({ to, subject, html, text, tags?, replyTo? })` returns/handles the Resend `{ data, error }` shape without throwing on provider errors.
  4. `RESEND_API_KEY` is never exposed in the client bundle (server-only runtimeConfig, never `public`); `email.*` config (`fromAddress`, `fromName`, `automationEnabled`, `dispatchIntervalMs`) is wired per PRD §6.4.
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 (Phase 3 may parallelize with Phase 2 after Phase 1's runtimeConfig edit lands).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth Email via Resend SMTP (Channel A) | 0/TBD | Not started | - |
| 2. Resend Verification Endpoint + UI | 0/TBD | Not started | - |
| 3. Resend API Foundation (Channel B) | 0/TBD | Not started | - |
