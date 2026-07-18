# Resend Milestone A — Checklists (GSD-free distill)

**Exported:** 2026-07-18 from planning research that previously lived under `.planning/`  
**Canonical product PRD:** [`PRD for Resend use.md`](PRD%20for%20Resend%20use.md) (always prefer the PRD for full FR wording)  
**Companion:** [`RESEND-DOMAIN-AND-PITFALLS.md`](RESEND-DOMAIN-AND-PITFALLS.md) — read before Phase 1 dashboard work  

**Scope:** PRD Phases **1–3** only. Environments: **dev** (local `.env`) + **test** (Vercel Preview `test`, Supabase `time-reward-test`, `test.myfocusrewards.com`). Production deferred.

**Core value:** Auth/signup confirmation emails send from a branded sender via Resend (escaping Supabase’s tiny inbuilt SMTP hourly cap), and `RESEND_API_KEY` powers at least one live code path.

**Architecture (two channels):**
- **Channel A** — Supabase Auth → Custom SMTP → Resend (`smtp.resend.com:587`). Signup confirm / magic link / `auth.resend`. Mostly dashboard.
- **Channel B** — Nuxt server `EmailDeliveryService` → Resend HTTP API (`resend` npm). Foundation only in Phase 3; no queue.

**Important:** Phase 2 `POST /api/auth/resend-verification` is still **Channel A** (calls `supabase.auth.resend`), not Channel B.

---

## Phase 1 — Auth email via Resend SMTP (Channel A)

**Goal:** Branded confirmation mail delivers on dev + test; escapes inbuilt cap.

### Requirements

- [ ] **SMTP-01**: Resend dashboard shows outbound domain/sender as **Verified** before go-live (see domain/`From` companion doc — do not assume DNS-present = Verified)
- [ ] **SMTP-02**: Supabase `time-reward-test` → Authentication → Email → Custom SMTP → Resend (`smtp.resend.com:587`, STARTTLS, username `resend`, password = `RESEND_API_KEY`, sender `TimeReward <…>` matching verified domain)
- [ ] **SMTP-03**: Site URL + `/confirm` redirect allow-list for local (`http://localhost:4000`) and test (`https://test.myfocusrewards.com`)
- [ ] **SMTP-04**: `rate_limit_email_sent` raised after custom SMTP so multiple signups within minutes do not hit the cap
- [ ] **SMTP-05**: `.env.example` documents `RESEND_SMTP_*` / sender vars (comments; dashboard-oriented)
- [ ] **SMTP-06**: With `NUXT_SKIP_EMAIL_CONFIRMATION=false`, signup delivers from app sender (not `noreply@mail.app.supabase.io`); Resend dashboard shows the send

### Success criteria

1. Confirmation email From branded sender; visible in Resend logs.  
2. Confirm links land on correct origin (local :4000 / test host) — not localhost:3000.  
3. Two signups within minutes both send.  
4. `.env.example` documents SMTP/sender vars for contributors.

---

## Phase 2 — Resend verification API + UI (Channel A request path)

**Goal:** Unconfirmed users can request another confirmation email safely.

### Requirements

- [ ] **RVER-01**: `POST /api/auth/resend-verification` — Valibot-validate `{ email }`, call `supabase.auth.resend({ type: 'signup', … })`, **generic** success (no email enumeration)
- [ ] **RVER-02**: Register/login UI — “resend verification” action + visible cooldown
- [ ] **RVER-03**: Rate limit **5/hour/IP** (key `auth-resend-verification`, real client IP via `x-forwarded-for`, serverless-safe store — prefer existing `@upstash/redis` / `server/utils/upstashRedis.ts`); HTTP **429** with friendly message

### Success criteria

1. Unconfirmed user receives a fresh confirmation email after API call.  
2. Identical generic response for known / unknown / already-confirmed.  
3. 6th request in an hour from same IP → 429.  
4. UI exposes resend + cooldown.

**Deps:** `valibot` (net-new); reuse Upstash Redis (already in app).

---

## Phase 3 — Resend API foundation (Channel B)

**Goal:** Thin reusable send service; prove live path; no crash when unconfigured.

### Requirements

- [ ] **RAPI-01**: Add `resend` npm (`^6.x`, align with PopulistsUnite)
- [ ] **RAPI-02**: `runtimeConfig` — `resendApiKey` + `email.*` (`fromAddress`, `fromName`, `automationEnabled`, `dispatchIntervalMs`) per PRD §6.4; API key **server-only** (never `public`)
- [ ] **RAPI-03**: `server/services/EmailDeliveryService.ts` — `send({ to, subject, html, text, tags?, replyTo? })`, `isConfigured`
- [ ] **RAPI-04**: Missing API key → warn + no-op; app does not crash (lazy-init SDK)
- [ ] **RAPI-05**: Test-send or health route sends when key set

### Success criteria

1. Test send delivers via HTTP API when key set.  
2. App boots with key absent.  
3. Handles Resend `{ data, error }` without throwing on provider errors.  
4. Key absent from client bundle.

**Note:** Phases 2 and 3 are parallelizable after Phase 1 docs/env shape; they share only the `nuxt.config.ts` `runtimeConfig` edit.

---

## Explicitly deferred (not Milestone A)

| Item | Reason |
|------|--------|
| Phase 4 — `email_queue`, Nitro dispatcher, `dispatch-email.mjs` | No product enqueue triggers yet; keep `EMAIL_AUTOMATION_*` reserved |
| Phase 5 — forgot-password / `AccountRecoveryService` | No `/forgot-password` flow yet |
| Production Supabase SMTP | Launch checklist |
| Sync / timing re-engineering | Separate track — see `SYNC-REENGINEERING-POINTERS.md` |

---

## Suggested OpenSpec packaging (later)

When implementing under intent-driven-template-cursor, typical split:

1. OpenSpec change: Channel A dashboard + docs (mostly human; thin repo docs)  
2. OpenSpec change: RVER API + UI  
3. OpenSpec change: EmailDeliveryService + test send  

Or combine 2+3 if you prefer fewer changes — do **not** mix with sync work.

---

*Distilled 2026-07-18. Prefer updating this file’s checkboxes as work completes; keep the full PRD for narrative FRs.*
