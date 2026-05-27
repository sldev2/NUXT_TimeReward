# PRD for Resend Use

## 1. Document purpose

This PRD defines how TimeReward should adopt [Resend](https://resend.com) for email delivery, using [`sldev2/PopulistsUnite`](https://github.com/sldev2/PopulistsUnite) as the reference implementation.

It supersedes the informal “reserved for future work” note in [`docs/ENV-SETUP.md`](ENV-SETUP.md) for Resend specifically, while remaining consistent with deferred items in [`docs/_FORLATER.md`](_FORLATER.md) until each phase is executed.

**Related docs:**

- [`docs/Resend Use by Environment.md`](Resend%20Use%20by%20Environment.md)
- [`docs/compare with Resend use in PopulistsUnite.md`](compare%20with%20Resend%20use%20in%20PopulistsUnite.md)
- [`docs/05_23 current auth email rate limit.md`](05_23%20current%20auth%20email%20rate%20limit.md)

---

## 2. Problem statement

Today TimeReward:

- Sends auth confirmation through **Supabase’s default SMTP** when `NUXT_SKIP_EMAIL_CONFIRMATION=false`, subject to a **very low hourly project cap**.
- Has **Vercel env vars** for Resend (`RESEND_API_KEY`, `EMAIL_FROM_*`, `EMAIL_AUTOMATION_*`) that **no code reads**.
- Cannot test production-like signup email flows locally without manual Supabase dashboard work.
- Has **no transactional email** path for future product notifications (subscription, trial, support).

PopulistsUnite solved this with a **dual-channel model**: Supabase Auth → Resend SMTP for auth templates; Nuxt server → Resend API for app-owned mail (queues + immediate sends).

---

## 3. Product goals

### 3.1 Primary goals

1. Deliver signup confirmation (and other Supabase Auth emails) from **`support@myfocusrewards.com`** (or approved sender) via **Resend SMTP in Supabase**, not `noreply@mail.app.supabase.io`.
2. Remove dependence on Supabase’s tiny **inbuilt SMTP hourly cap** for auth mail.
3. Wire **`RESEND_API_KEY` and `EMAIL_FROM_*`** into runtime config the same way PopulistsUnite does, so local dev and Vercel behave consistently.
4. Provide **resend verification** UX and API consistent with PopulistsUnite’s auth flow.
5. Establish a **reusable Resend API layer** for future transactional email (even if first release only uses auth + resend).

### 3.2 Non-goals (initial release)

- Event RSVP / reminder queues (PopulistsUnite-specific domain).
- Full parity with PopulistsUnite’s `event_email_queue` / `user_email_queue` unless TimeReward defines equivalent product triggers.
- Send Email Hook / Edge Function intercept (listed as future in PopulistsUnite `FORLATER`).
- Replacing Google Workspace inbound mail — Resend is **outbound only**.

---

## 4. Reference architecture (PopulistsUnite)

Adopt the **two-channel** pattern documented in PopulistsUnite’s `docs/Resend with and without Supabase Integrations.md`:

| Channel | Mechanism | Sends |
|---------|-----------|-------|
| **A — Auth** | Supabase dashboard → Custom SMTP → Resend (`smtp.resend.com:587`) | Signup confirm, magic link, Supabase-native password reset (if enabled) |
| **B — App-owned** | Nuxt `EmailDeliveryService` + `resend` npm → HTTP API | Queued notifications; **immediate** time-sensitive mail (PU: password reset) |

TimeReward Phase 1 implements **Channel A** only. Phase 2 implements **Channel B infrastructure** without requiring queue tables until product defines enqueue points.

---

## 5. Target behavior by environment

| Environment | Channel A (Auth SMTP) | Channel B (Resend API) | Dev convenience |
|-------------|----------------------|------------------------|-----------------|
| **Local (`localhost:4000`)** | Same Supabase project SMTP settings | API key from `.env`; optional automation off | `NUXT_SKIP_EMAIL_CONFIRMATION=true` remains valid for fast signup |
| **Preview (`test.myfocusrewards.com`)** | Resend SMTP on test Supabase project | `EMAIL_AUTOMATION_ENABLED=false` unless testing dispatcher | Real confirmation when skip flag false |
| **Production** | Resend SMTP on prod Supabase | Automation per product need | N/A |

**Hosting:** Vercel is **not** required for Resend. Local `npm run dev` must be able to call Resend API when keys are set (same as PopulistsUnite).

---

## 6. Environment variables

Align with PopulistsUnite and existing Vercel inventory ([`docs/vercel environment inventory.md`](vercel%20environment%20inventory.md)).

### 6.1 Required (when email features enabled)

| Variable | Purpose | PopulistsUnite equivalent |
|----------|---------|---------------------------|
| `RESEND_API_KEY` | Resend API + Supabase SMTP password | Same |
| `EMAIL_FROM_ADDRESS` | Verified sender (e.g. `support@myfocusrewards.com`) | Same |
| `EMAIL_FROM_NAME` | Display name (e.g. `TimeReward`) | Same |

### 6.2 Optional / automation

| Variable | Default | Purpose |
|----------|---------|---------|
| `EMAIL_AUTOMATION_ENABLED` | `false` locally | Gates Nitro email dispatcher plugin |
| `EMAIL_DISPATCH_INTERVAL_MS` | `60000` | Dispatcher poll interval (min 15000) |
| `RESEND_SMTP_HOST` | `smtp.resend.com` | Documented for Supabase dashboard setup only |
| `RESEND_SMTP_PORT` | `587` | Documented for Supabase dashboard setup only |

### 6.3 Existing TimeReward vars (unchanged)

| Variable | Interaction |
|----------|-------------|
| `NUXT_SKIP_EMAIL_CONFIRMATION` | When `true`, bypasses Channel A entirely (dev) |
| `NUXT_PUBLIC_APP_URL` | Redirect target for confirmation (`/confirm`) |

### 6.4 Runtime config shape (target)

Extend `nuxt.config.ts` to match PopulistsUnite:

```ts
runtimeConfig: {
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  email: {
    fromAddress: process.env.EMAIL_FROM_ADDRESS ?? 'support@myfocusrewards.com',
    fromName: process.env.EMAIL_FROM_NAME ?? 'TimeReward',
    automationEnabled: ['1', 'true', 'yes'].includes(String(process.env.EMAIL_AUTOMATION_ENABLED ?? '').trim()),
    dispatchIntervalMs: Number(process.env.EMAIL_DISPATCH_INTERVAL_MS || '60000'),
  },
  // ...existing keys
}
```

---

## 7. Functional requirements

### Phase 1 — Auth email via Resend SMTP (P0)

**FR-1.1** Human configures Supabase **Authentication → Email → SMTP** for each Supabase project (test + prod):

- Host: `smtp.resend.com`
- Port: `587`, STARTTLS
- Username: `resend`
- Password: `RESEND_API_KEY` (Email: Send or Full Access scope)
- Sender: `EMAIL_FROM_NAME <EMAIL_FROM_ADDRESS>`

**FR-1.2** Document Supabase redirect URLs:

- Production: `https://myfocusrewards.com/confirm` (and `www` if used)
- Preview: `https://test.myfocusrewards.com/confirm`
- Local: `http://localhost:4000/confirm`

**FR-1.3** Resend domain verification for `myfocusrewards.com` / `send` subdomain (DKIM already in GoDaddy per session notes).

**FR-1.4** Raise Supabase **`rate_limit_email_sent`** after custom SMTP is active (see `docs/05_23 current auth email rate limit.md`).

**FR-1.5** Update `.env.example` with `RESEND_SMTP_*` comments mirroring PopulistsUnite.

**Acceptance:**

- [ ] Signup with `NUXT_SKIP_EMAIL_CONFIRMATION=false` delivers mail from `support@myfocusrewards.com` (not Supabase default).
- [ ] Resend dashboard shows send events for auth mail.
- [ ] Two different users can register within minutes without hourly cap failure.

---

### Phase 2 — Resend verification API + UI (P0)

**FR-2.1** Add `POST /api/auth/resend-verification` modeled on PopulistsUnite:

- Body: `{ email }` (validated)
- Calls `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })`
- Generic success message (no email enumeration)

**FR-2.2** Register flow UI: post-signup screen or login/register links with **Resend verification email** action and cooldown (PU: 5/hr rate limit).

**FR-2.3** Server rate limit middleware entry: `auth-resend-verification` — 5 requests / hour / IP (match PU).

**Acceptance:**

- [ ] Unconfirmed user can request another verification email.
- [ ] Rate limit returns 429 with friendly message.
- [ ] Works on localhost with Supabase SMTP configured.

---

### Phase 3 — Resend API foundation (P1)

**FR-3.1** Add npm dependency: `resend` (match major version used in PopulistsUnite, currently `^6.x`).

**FR-3.2** Add `server/services/EmailDeliveryService.ts` (or `ResendEmailService.ts`) — thin wrapper:

- Constructor: `{ apiKey, fromAddress, fromName, siteUrl }`
- Method: `send({ to, subject, html, text, tags?, replyTo? })`
- Method: `isConfigured` boolean
- HTML wrapper styled for TimeReward (dark gradient brand optional; plain accessible HTML acceptable for v1)

**FR-3.3** No queue tables in Phase 3 unless a product trigger is defined — service is callable from server routes only.

**FR-3.4** Log send failures to console; optional `monitoring_events` table deferred to Phase 4.

**Acceptance:**

- [ ] Server route or health check can send a test email when `RESEND_API_KEY` is set.
- [ ] Missing API key fails gracefully with warning, not crash.

---

### Phase 4 — Queued transactional email (P2, when product defines triggers)

Implement PopulistsUnite-style automation **only when** TimeReward has enqueue points. Candidate triggers (TBD with product):

- Trial ending reminder
- Subscription receipt / renewal notice
- Account deletion confirmation (`deletemydata@` workflow)

**FR-4.1** Migration: `email_queue` table (single table acceptable initially vs PU’s split event/user queues).

Columns (minimum): `id`, `recipient_user_id`, `template`, `payload`, `status`, `queued_at`, `scheduled_for`, `processed_at`, `failure_reason`.

**FR-4.2** `server/plugins/email-dispatcher.ts` — copy PU pattern:

- Honor `EMAIL_AUTOMATION_ENABLED`
- Poll on `EMAIL_DISPATCH_INTERVAL_MS`
- Process pending rows via `EmailDeliveryService`

**FR-4.3** CLI script `scripts/dispatch-email.mjs` for local/CI manual runs (PopulistsUnite parity).

**FR-4.4** On failure: set `status=failed`, log to monitoring (PU: `monitoring_events`).

**Acceptance:**

- [ ] Enqueued row transitions `pending → processing → sent`.
- [ ] Failed send records `failure_reason` and monitoring entry.
- [ ] `pnpm run dispatch-emails` works locally without Vercel.

---

### Phase 5 — Password recovery via Resend API (P2, when forgot-password ships)

PopulistsUnite sends password reset **immediately** via Resend API (not queue). TimeReward has **no forgot-password flow today**.

**FR-5.1** When `/forgot-password` is product-ready, implement `AccountRecoveryService` pattern:

- Custom token table or Supabase reset — **decision required**
- If custom tokens: immediate `resend.emails.send` (PU Option B)
- Turnstile before send (PU pattern)
- Cooldown 60s between requests per user
- No email enumeration in API response

**Acceptance:**

- [ ] Reset email arrives within seconds, visible in Resend logs.
- [ ] Expired/consumed tokens rejected with clear UX.

---

## 8. Security and compliance

| Requirement | Detail |
|-------------|--------|
| **Secrets** | `RESEND_API_KEY` server-only; never in `public` runtimeConfig |
| **Input validation** | Valibot (or existing pattern) on all email-triggering endpoints before Supabase/Resend |
| **Rate limits** | Resend verification, recovery, and future enqueue flood protection |
| **PII in logs** | Log user IDs and job IDs; avoid full email bodies in production logs |
| **Privacy policy** | Already mentions Supabase/Resend — update if sender address or data flows change |
| **DMARC** | Current `_dmarc` is `p=none`; tighten when volume justifies |

---

## 9. DNS and sender identity

Existing infrastructure (from session notes):

- **Outbound:** `send.myfocusrewards.com` — Resend/SES DKIM (`resend._domainkey` in GoDaddy)
- **Inbound:** Google Workspace — separate from Resend
- **App sender:** `support@myfocusrewards.com` (`EMAIL_FROM_ADDRESS` in Vercel inventory)

**Requirement:** Resend dashboard must show domain/sender **Verified** before Phase 1 go-live.

---

## 10. Testing plan

| Test | Phase | Environment |
|------|-------|-------------|
| Skip confirmation dev signup | Existing | Local, `NUXT_SKIP_EMAIL_CONFIRMATION=true` |
| Real confirmation email | 1 | Local + Preview with SMTP |
| Back-to-back two signups | 1 | Preview (proves rate limit fix) |
| Resend verification button | 2 | Local + Preview |
| API send test | 3 | Local with `.env` key |
| Queue dispatch | 4 | Local CLI + Preview with automation on |
| Password reset | 5 | Preview |

Document results in `docs/Manual Testing Plan.md` Section 3.4 (currently deferred).

---

## 11. Rollout plan

| Step | Action | Owner |
|------|--------|-------|
| 1 | Verify Resend domain + sender in dashboard | Human |
| 2 | Configure Supabase SMTP (test project first) | Human |
| 3 | Merge Phase 1 docs + `.env.example` updates | Dev |
| 4 | Implement Phase 2 resend-verification | Dev |
| 5 | Test on `test.myfocusrewards.com` with skip flag false | Both |
| 6 | Configure prod Supabase SMTP | Human |
| 7 | Phase 3+ when product triggers exist | Dev |

**Rollback:** Revert Supabase to default SMTP in dashboard; set `NUXT_SKIP_EMAIL_CONFIRMATION=true` on preview if needed. App code changes are backward-compatible if API key absent.

---

## 12. Success criteria

1. Auth emails send from **`TimeReward <support@myfocusrewards.com>`** via Resend, not Supabase shared SMTP.
2. **`RESEND_API_KEY` in `.env` or Vercel actually powers at least one code path** (resend-verification + send helper).
3. Local development can test real emails **without Vercel** (Supabase SMTP + optional API key).
4. Architecture matches PopulistsUnite’s **documented two-channel split** (see compare doc).
5. Vercel env inventory vars (`EMAIL_AUTOMATION_*`) either wired or removed — no permanent dead config.

---

## 13. Open decisions

| # | Question | Default recommendation |
|---|----------|------------------------|
| D1 | Single `email_queue` vs split event/user tables? | Single table until multiple domains of templates exist |
| D2 | Password reset: Supabase native vs custom PU service? | Supabase native + SMTP for v1; custom API send in Phase 5 if branding/control needed |
| D3 | Enable `EMAIL_AUTOMATION_ENABLED` on Vercel serverless? | `false` until Phase 4; use CLI cron or Vercel cron invoking dispatch script |
| D4 | Reply-To header for auth mail? | Defer (PopulistsUnite `FORLATER` Send Email Hook) |

---

## 14. Implementation traceability (PopulistsUnite → TimeReward)

| PopulistsUnite artifact | TimeReward target | Phase |
|-------------------------|-------------------|-------|
| Supabase SMTP docs | `docs/Resend Use by Environment.md` + runbook update | 1 |
| `resend-verification.post.ts` | `server/api/auth/resend-verification.post.ts` | 2 |
| `EmailDeliveryService.ts` | `server/services/EmailDeliveryService.ts` (simplified v1) | 3–4 |
| `email-dispatcher.ts` | `server/plugins/email-dispatcher.ts` | 4 |
| `dispatch-email.mjs` | `scripts/dispatch-email.mjs` | 4 |
| `AccountRecoveryService.ts` | `server/services/AccountRecoveryService.ts` | 5 |
| Rate limit middleware | Extend `server/middleware` | 2, 5 |

---

## 15. Revision history

| Date | Change |
|------|--------|
| 2026-05-27 | Initial PRD based on PopulistsUnite analysis and TimeReward gap assessment |
