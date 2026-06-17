# Requirements: TimeReward — Resend Email Integration (Milestone A)

**Defined:** 2026-06-17
**Core Value:** Auth/signup confirmation emails send reliably from `TimeReward <support@myfocusrewards.com>` via Resend (escaping Supabase's inbuilt SMTP hourly cap), and `RESEND_API_KEY` actually powers a live code path.

**Scope:** PRD Phases 1–3 only. Environments: development (local `.env`) + test (Vercel Preview branch `test`, Supabase `time-reward-test`, `test.myfocusrewards.com`). Production deferred to launch.

## v1 Requirements

Requirements for Milestone A. Each maps to a roadmap phase.

### Auth Email via Resend SMTP (Channel A)

<!-- PRD Phase 1 / FR-1.x. Mostly human dashboard + repo docs; the delivery gate for the milestone. -->

- [ ] **SMTP-01**: Resend dashboard shows the outbound domain/sender (`send.myfocusrewards.com` / `support@myfocusrewards.com`) as **Verified** before go-live
- [ ] **SMTP-02**: Supabase `time-reward-test` Authentication → Email → Custom SMTP is configured to Resend (`smtp.resend.com:587`, STARTTLS, username `resend`, password = `RESEND_API_KEY`, sender `TimeReward <support@myfocusrewards.com>`)
- [ ] **SMTP-03**: Supabase Site URL and `/confirm` redirect allow-list are set for local (`http://localhost:4000`) and test (`https://test.myfocusrewards.com`) so confirmation links return to the correct origin
- [ ] **SMTP-04**: Supabase `rate_limit_email_sent` is raised after custom SMTP is active so multiple signups within minutes do not hit the inbuilt cap
- [ ] **SMTP-05**: `.env.example` documents the `RESEND_SMTP_*` / sender variables (comments mirroring PopulistsUnite) for dev + test
- [ ] **SMTP-06**: With `NUXT_SKIP_EMAIL_CONFIRMATION=false`, a signup delivers a confirmation email from the app sender (not `noreply@mail.app.supabase.io`), visible as a send event in the Resend dashboard

### Resend Verification API + UI (Channel A request path)

<!-- PRD Phase 2 / FR-2.x. Calls supabase.auth.resend (still Channel A). Security gates are mandatory. -->

- [ ] **RVER-01**: `POST /api/auth/resend-verification` accepts `{ email }`, validates input (Valibot), calls `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })`, and returns a generic success message that does not reveal whether the email is registered (no enumeration)
- [ ] **RVER-02**: The register/login flow exposes a "resend verification email" action with a visible cooldown so an unconfirmed user can request another confirmation email
- [ ] **RVER-03**: The resend-verification endpoint is rate-limited to 5 requests/hour/IP (keyed `auth-resend-verification`, real client IP via `x-forwarded-for`, serverless-safe store) and returns HTTP 429 with a friendly message when exceeded

### Resend API Foundation (Channel B)

<!-- PRD Phase 3 / FR-3.x. Reusable send service, no queue tables. Parallelizable with Phase 2. -->

- [ ] **RAPI-01**: The `resend` npm dependency is added (major aligned with PopulistsUnite, `^6.x`)
- [ ] **RAPI-02**: `nuxt.config.ts` `runtimeConfig` wires `resendApiKey` plus nested `email.*` (`fromAddress`, `fromName`, `automationEnabled`, `dispatchIntervalMs`) per PRD §6.4, with the API key server-only (never in `public`)
- [ ] **RAPI-03**: `server/services/EmailDeliveryService.ts` exposes a thin wrapper with `send({ to, subject, html, text, tags?, replyTo? })` and an `isConfigured` boolean, sending via the Resend HTTP API
- [ ] **RAPI-04**: When `RESEND_API_KEY` is absent the service degrades gracefully (logs a warning, no send) and the app does not crash
- [ ] **RAPI-05**: A server route or health check can send a test email when `RESEND_API_KEY` is set, confirming the live code path

## v2 Requirements

Deferred to a future milestone. Tracked but not in this roadmap.

### Queued Transactional Email (PRD Phase 4)

- **QUEUE-01**: `email_queue` table + status lifecycle (`pending → processing → sent/failed`)
- **QUEUE-02**: `server/plugins/email-dispatcher.ts` honoring `EMAIL_AUTOMATION_ENABLED` / `EMAIL_DISPATCH_INTERVAL_MS`
- **QUEUE-03**: `scripts/dispatch-email.mjs` CLI for local/CI manual runs
- **QUEUE-04**: Failure logging to monitoring (`monitoring_events`)

### Password Recovery via Resend API (PRD Phase 5)

- **RECV-01**: `AccountRecoveryService` immediate send (when `/forgot-password` flow ships)
- **RECV-02**: Token table or Supabase-native reset decision, Turnstile, 60s cooldown, no enumeration

## Out of Scope

Explicitly excluded for Milestone A. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Queued email / Nitro dispatcher / dispatch CLI (Phase 4) | No product enqueue triggers defined yet; `EMAIL_AUTOMATION_*` stays reserved |
| Password recovery via Resend (Phase 5) | No `/forgot-password` flow exists; Supabase-native reset stays for now |
| Milestone B — timing/sync re-engineering | Separate later milestone (offline queue / AutoPause / multi-tab) |
| Production Supabase project + prod SMTP (`myfocusrewards.com`) | Deferred to launch; dev + test only |
| Send Email Hook / Edge Function intercept | PopulistsUnite `FORLATER`; not needed for v1 |
| Replacing Google Workspace inbound mail | Resend is outbound only |
| PopulistsUnite event/RSVP/user email queues | Domain-specific; no TimeReward equivalent triggers |

## Traceability

Which phases cover which requirements. Finalized during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SMTP-01 | Phase 1 | Pending |
| SMTP-02 | Phase 1 | Pending |
| SMTP-03 | Phase 1 | Pending |
| SMTP-04 | Phase 1 | Pending |
| SMTP-05 | Phase 1 | Pending |
| SMTP-06 | Phase 1 | Pending |
| RVER-01 | Phase 2 | Pending |
| RVER-02 | Phase 2 | Pending |
| RVER-03 | Phase 2 | Pending |
| RAPI-01 | Phase 3 | Pending |
| RAPI-02 | Phase 3 | Pending |
| RAPI-03 | Phase 3 | Pending |
| RAPI-04 | Phase 3 | Pending |
| RAPI-05 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-17*
*Last updated: 2026-06-17 after initial definition*
