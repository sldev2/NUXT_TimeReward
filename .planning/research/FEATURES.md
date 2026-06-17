# Feature Research

**Domain:** Auth + transactional email for a Nuxt 3 + Supabase app via Resend (PRD Phases 1–3)
**Researched:** 2026-06-17
**Confidence:** HIGH

> Scope note: This research covers **Milestone A = PRD Phases 1–3 only**: (1) auth confirmation mail via Resend SMTP from a verified sender, (2) resend-verification API + UI with cooldown + IP rate limit + enumeration-safe responses, (3) a thin `EmailDeliveryService` wrapper over the `resend` npm with graceful no-op. PRD Phases 4 (queue/dispatcher) and 5 (password recovery) are deliberately mapped as **anti-features** for this milestone.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must exist or the feature is broken / unsafe. "Users" here includes the people receiving the mail, the developer/operator, and the security reviewer.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Auth confirmation mail sent from a verified branded sender** (`TimeReward <support@myfocusrewards.com>`), not `noreply@mail.app.supabase.io` | Default Supabase sender looks untrustworthy and lands in spam; users expect mail from the brand they signed up with | LOW (config) | Channel A: Supabase Dashboard → custom SMTP → `smtp.resend.com:587`, STARTTLS, user `resend`, password = `RESEND_API_KEY`. Requires Resend domain/sender **Verified** first (PRD §9, FR-1.1/1.3). No app code. |
| **Confirmation link redirects back into the app** (`/confirm`) on the correct env URL | A confirm link that 404s or lands on the wrong host is a broken signup | LOW (config) | `emailRedirectTo` / Supabase redirect allowlist for local (`localhost:4000`), preview (`test.myfocusrewards.com`), prod (FR-1.2). Per-env URL must come from `NUXT_PUBLIC_APP_URL`, not hardcoded. |
| **Adequate auth-email send rate** (escape Supabase's tiny inbuilt SMTP hourly cap) | Two users registering minutes apart must both get mail; the cap is the core pain the project exists to fix | LOW (config) | Raise Supabase `rate_limit_email_sent` *after* custom SMTP is live (FR-1.4). This is an auth-provider limit, distinct from the app's own IP rate limit (Phase 2). |
| **"Resend verification email" action** for users who didn't get / lost the first mail | Confirmation mail gets lost, delayed, or spam-filtered constantly; without a resend path the user is permanently stuck unconfirmed | MEDIUM | `POST /api/auth/resend-verification` → `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })` (FR-2.1). Confirmed current method via Supabase docs. |
| **Generic / identical success response (no email enumeration)** on resend-verification | Returning "no account with that email" turns the endpoint into an account-existence oracle; this is a security defect, not a UX nicety | LOW–MEDIUM | Always return the same generic "If an account exists and is unconfirmed, we've sent a link" regardless of whether the email exists or is already confirmed. Supabase itself already obfuscates duplicate-signup responses for the same reason (confirmed in Supabase auth docs). |
| **Per-IP rate limit on resend-verification → HTTP 429** | An unauthenticated send endpoint is a spam/abuse amplifier and can burn Resend quota / domain reputation | MEDIUM | `auth-resend-verification`: **5 requests / hour / IP**, returns 429 (FR-2.3). Mirrors PopulistsUnite. Must key on real client IP (`x-forwarded-for` first hop on Vercel). |
| **Client-side cooldown after a resend** (disabled button + countdown) | Without it users mash the button, hit the 429 immediately, and think the app is broken | LOW | Post-action cooldown timer in register/login UI (FR-2.2). UX layer that *complements* (does not replace) the server rate limit. |
| **Friendly, actionable messaging for the 429 / cooldown** | A raw 429 or silent failure reads as a bug | LOW | e.g. "You've requested this a few times — please wait an hour before trying again." Never leak counts or whether the address exists. |
| **Input validation on the email-triggering endpoint** before hitting Supabase/Resend | Malformed/oversized/array payloads otherwise reach the provider and waste quota or error opaquely | LOW | Valibot schema on `{ email }` (PRD §8). Matches existing app validation pattern. |
| **Thin send service: `send({to,subject,html,text,tags?,replyTo?})`** | A single choke point for app-owned mail prevents per-route divergence and is the reusable foundation the whole project is justified by (success criterion #2) | MEDIUM | `server/services/EmailDeliveryService.ts`, constructor `{ apiKey, fromAddress, fromName, siteUrl }` (FR-3.2). Wrapper over `resend` npm `^6.x`. Note SDK uses **camelCase `replyTo`**; raw HTTP API uses `reply_to`. `tags` = array of `{name, value}` (ASCII, ≤256 chars). |
| **`isConfigured` flag + graceful no-op when `RESEND_API_KEY` is missing** | App must run on dev/preview without keys and not crash; backward-compat is a hard constraint | LOW | `isConfigured` = key present. When false, `send()` logs a warning and returns a no-op result instead of throwing (FR-3.2, acceptance "missing API key fails gracefully"). |
| **Honest send-result handling (don't crash on provider error)** | The `resend` SDK returns `{ data, error }` rather than throwing; ignoring `error` silently drops mail | LOW | Confirmed via Resend docs: success = `{ data: { id }, error: null }`, failure = `{ data: null, error: {...} }`. Service must inspect `error`, log failure (user/job id, not body), surface a boolean/throw deliberately. |
| **Auth-email-skip path stays valid for local dev** (`NUXT_SKIP_EMAIL_CONFIRMATION=true`) | Existing fast-signup dev workflow must keep working; bypasses Channel A entirely | LOW | Pre-existing behavior; ensure Phase 1–3 changes don't break it (PROJECT constraint). |
| **Secrets stay server-only; PII kept out of logs** | `RESEND_API_KEY` in public config or full email bodies in logs is a leak | LOW | Key in `runtimeConfig` (server), never `public` (PRD §8). Log user/job IDs only. |

### Differentiators (Competitive Advantage)

Not required for the feature to work, but raise quality/observability. Keep these cheap; this milestone is foundation, not polish.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Tagging sends** (`tags: [{name:'category', value:'confirm_email'}]`) | Enables filtering/analytics in the Resend dashboard and later per-category deliverability debugging | LOW | Native Resend feature; wrapper already exposes `tags?`. Cheap to adopt from day one. |
| **Branded HTML email wrapper** (TimeReward dark-gradient shell) | Consistent, on-brand transactional mail vs default plain text | LOW–MEDIUM | PRD explicitly says **plain accessible HTML is acceptable for v1** (FR-3.2). Treat brand polish as optional; always ship a `text` fallback for accessibility/deliverability. |
| **`replyTo` support on app-owned sends** | Lets transactional mail route replies to a real inbox (e.g. support) | LOW | Already in the `send()` signature. For *auth* (Channel A) mail, Reply-To is deferred (PRD D4). |
| **A reachable test-send path** (health route / dev-only endpoint) | Proves the key + service work end-to-end without waiting for a real signup; satisfies Phase 3 acceptance | LOW | "Server route or health check can send a test email when key is set" (FR-3.3 acceptance). Guard so it can't be abused in prod. |
| **Structured send-failure logging** (console with user/job id + Resend error name) | Makes the inevitable deliverability debugging tractable without a DB | LOW | Full `monitoring_events` table is explicitly deferred to Phase 4 (FR-3.4). Console logging is the v1 differentiator-lite. |
| **Local-without-Vercel sending** | `npm run dev` can call Resend directly when keys are set | LOW | Hosting-independence constraint; mostly "don't accidentally depend on Vercel-only env". |

### Anti-Features (Deliberately NOT Building in This Milestone)

Things that look like natural next steps but are explicitly out of scope. **PRD Phase 4 & 5 items map here.** Building any of these now is scope creep against a locked decision.

| Feature | Why Requested | Why Problematic (now) | Alternative |
|---------|---------------|-----------------------|-------------|
| **`email_queue` table + status lifecycle** (PRD Phase 4, FR-4.1) | "We'll want async/retryable email eventually" | No enqueue triggers are defined yet; building a queue with no producers is dead infrastructure (PRD D1, key decision "no queue tables in Phase 3") | Service is callable **synchronously from server routes only**. Add a queue when a real trigger exists. |
| **Nitro email dispatcher plugin** `server/plugins/email-dispatcher.ts` (Phase 4, FR-4.2) | Background processing of queued mail | Keep `EMAIL_AUTOMATION_ENABLED` unset/false through Milestone A; a poller with nothing to poll is live-but-broken config | Leave `EMAIL_AUTOMATION_*` reserved/inert. Wire only in Phase 4. |
| **`scripts/dispatch-email.mjs` CLI** (Phase 4, FR-4.3) | Manual/CI queue draining | Depends on the queue table that doesn't exist | Defer with the queue. |
| **`monitoring_events` table** (Phase 4, FR-4.4) | Persistent send-failure auditing | Premature persistence; v1 only needs to not lose mail silently | Console logging of failures now (FR-3.4). |
| **Password recovery / forgot-password via Resend** + `AccountRecoveryService` (PRD Phase 5) | "Users will need password reset" | **No `/forgot-password` flow ships today**; custom token tables, Turnstile, per-user cooldown are a whole feature (PRD D2) | Password reset stays **Supabase-native** for now; revisit in Phase 5 when the flow is product-ready. |
| **Supabase Send Email Hook / Edge Function intercept** | Full control over auth-email rendering (React Email, etc.) | Listed as future in PopulistsUnite FORLATER; adds an Edge Function + webhook secret surface for no current need | Custom SMTP (Channel A) already rebrands auth mail with zero code. Hook is a v2+ option. |
| **Event RSVP / reminder queues** (PopulistsUnite `event_email_queue` / `user_email_queue`) | Copy reference repo parity | Domain-specific to PopulistsUnite; TimeReward has no events/RSVP product surface | Don't port. Only build queues TimeReward's own triggers justify. |
| **Marketing/broadcast email, audiences, unsubscribe management** | "Email = newsletters too" | Different compliance + infra domain (CAN-SPAM, audiences); out of a transactional-auth milestone | Transactional only. Reconsider as a separate product initiative. |
| **Tightened DMARC enforcement (`p=quarantine/reject`)** | Better anti-spoofing | Current `_dmarc` is `p=none`; tightening before send volume exists risks self-inflicted delivery failures | Keep `p=none`; tighten when volume justifies (PRD §8). |
| **Production environment cutover** (prod Supabase SMTP, `myfocusrewards.com` prod sender) | "Do it all at once" | Milestone scope is dev + test only; prod is a launch-gated step | Configure prod SMTP at launch (PRD rollout step 6). |
| **Auth-mail `Reply-To` header** (PRD D4) | Replies to confirmation mail reach a human | Low value for confirm/magic-link mail; deferred decision | Defer; `replyTo` exists on the app-owned `send()` for transactional mail that wants it. |

---

## Feature Dependencies

```
[Resend domain + sender Verified]
    └──required by──> [Channel A: Supabase custom SMTP]   (Phase 1)
                          └──required by──> [Resend-able auth confirmation mail]
                                                └──required by──> [Resend-verification API/UI]  (Phase 2)

[Resend-verification API]
    ├──requires──> [Valibot email validation]
    ├──requires──> [IP rate limit 5/hr → 429]   (security gate)
    ├──requires──> [Generic/enumeration-safe response]   (security gate)
    └──enhanced by──> [Client cooldown UI]

[EmailDeliveryService.send()]   (Phase 3)
    ├──requires──> [resend npm ^6.x + runtimeConfig (resendApiKey, email.*)]
    ├──requires──> [isConfigured + graceful no-op]
    └──enhanced by──> [tags] [branded HTML] [replyTo] [test-send path]

[email_queue] ──requires──> [defined product triggers]   (ABSENT → Phase 4 blocked, correctly)
[email-dispatcher] ──requires──> [email_queue]            (Phase 4)
[AccountRecoveryService] ──requires──> [/forgot-password flow]  (ABSENT → Phase 5 blocked, correctly)
```

### Dependency Notes

- **Phase 2 depends on Phase 1:** resend-verification is pointless until auth mail actually flows through Resend SMTP with a working redirect. Order is fixed.
- **Phase 3 is largely independent of Phase 2** infra-wise (it's Channel B), but shares the runtimeConfig wiring (`resendApiKey`, `email.*`) and the same security posture (key server-only, no PII in logs). It can be built in parallel once env shape is settled.
- **Rate limit + generic response are hard gates on Phase 2**, not optional polish — shipping the endpoint without both is an enumeration + abuse vulnerability.
- **Client cooldown enhances but cannot replace** the server rate limit (client checks are trivially bypassed).
- **Phase 4 & 5 are correctly blocked by missing prerequisites** (no enqueue triggers; no forgot-password flow). This is *why* they're anti-features now, not just sequencing.
- **`replyTo` naming caveat:** the `resend` Node SDK accepts `replyTo` (camelCase) and maps to the API's `reply_to`. The service signature should expose `replyTo` to match the SDK.

---

## MVP Definition

### Launch With (v1 = Milestone A, Phases 1–3)

- [ ] **Channel A auth mail via Resend SMTP** — escapes the Supabase cap; the core reason this project exists.
- [ ] **Per-env confirm redirect URLs** — broken redirect = broken signup.
- [ ] **Raised `rate_limit_email_sent`** — two back-to-back signups must both deliver.
- [ ] **`POST /api/auth/resend-verification`** with Valibot validation — unblocks users who lost the first mail.
- [ ] **Enumeration-safe generic response + 5/hr/IP rate limit (429)** — security-mandatory, not optional.
- [ ] **Client-side cooldown + friendly messaging** — prevents instant self-inflicted 429s.
- [ ] **`EmailDeliveryService.send({to,subject,html,text,tags?,replyTo?})` + `isConfigured`** — the reusable foundation; proves `RESEND_API_KEY` powers a real code path.
- [ ] **Graceful no-op when key absent + provider-error handling** — backward-compat constraint.
- [ ] **Test-send path** (health/dev route) — satisfies Phase 3 acceptance without a real signup.

### Add After Validation (v1.x — only when a trigger appears)

- [ ] **First real transactional template** (e.g. trial-ending, subscription receipt) — trigger: product defines a concrete enqueue/notify point. This is what *justifies* moving toward Phase 4.
- [ ] **Branded HTML shell** — trigger: plain-HTML v1 proves the path; upgrade when design bandwidth exists.

### Future Consideration (v2+ — PRD Phases 4–5 and beyond)

- [ ] **`email_queue` + Nitro dispatcher + CLI** (Phase 4) — defer until ≥1 real async trigger exists.
- [ ] **`monitoring_events` persistence** (Phase 4) — defer until console logging proves insufficient.
- [ ] **Password recovery via Resend API + `AccountRecoveryService`** (Phase 5) — defer until `/forgot-password` ships.
- [ ] **Send Email Hook / Edge Function rendering** — defer; custom SMTP already covers rebranding.
- [ ] **Production SMTP cutover** — at launch.
- [ ] **DMARC tightening** — when volume justifies.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth mail via Resend SMTP (Channel A) | HIGH | LOW (config) | P1 |
| Per-env confirm redirect URLs | HIGH | LOW | P1 |
| Raised `rate_limit_email_sent` | HIGH | LOW | P1 |
| Resend-verification API | HIGH | MEDIUM | P1 |
| Enumeration-safe generic response | HIGH (security) | LOW–MEDIUM | P1 |
| IP rate limit 5/hr → 429 | HIGH (security) | MEDIUM | P1 |
| Client cooldown + messaging | MEDIUM | LOW | P1 |
| Valibot validation on endpoint | MEDIUM (security) | LOW | P1 |
| `EmailDeliveryService` + `isConfigured` | HIGH | MEDIUM | P1 |
| Graceful no-op + provider-error handling | HIGH | LOW | P1 |
| Test-send path | MEDIUM | LOW | P1 |
| Tagging sends | MEDIUM | LOW | P2 |
| Branded HTML wrapper | MEDIUM | LOW–MEDIUM | P2 |
| `replyTo` on app sends | LOW | LOW | P2 |
| Structured failure logging (console) | MEDIUM | LOW | P2 |
| `email_queue` + dispatcher (Phase 4) | LOW (no trigger yet) | HIGH | P3 |
| Password recovery (Phase 5) | LOW (no flow yet) | HIGH | P3 |
| Send Email Hook / Edge Function | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for this milestone (Phases 1–3)
- P2: Cheap quality wins; adopt opportunistically within Phase 3
- P3: Deferred (Phase 4/5+); anti-features for this milestone

## Competitor / Reference Feature Analysis

| Feature | PopulistsUnite (reference) | Supabase default | TimeReward Milestone A approach |
|---------|----------------------------|------------------|----------------------------------|
| Auth-mail sender | Resend SMTP, branded | Shared `mail.app.supabase.io`, low cap | Resend SMTP, `support@myfocusrewards.com` (adopt) |
| Resend-verification | API + UI, 5/hr limit | `auth.resend()` exists, no app UX | Same API + cooldown UI + 5/hr/IP (adopt) |
| Enumeration safety | Generic responses | Obfuscates duplicate signup natively | Generic responses on resend endpoint (adopt) |
| App-owned send service | `EmailDeliveryService` over `resend` HTTP API | n/a | Simplified thin v1 wrapper (adopt, trimmed) |
| Email queue / dispatcher | `event_email_queue` + `user_email_queue` + dispatcher | n/a | **NOT building** — no triggers (anti-feature) |
| Password reset | Immediate Resend API send + Turnstile | Supabase-native reset | Stay Supabase-native (defer custom to Phase 5) |
| RSVP/event reminders | Core domain feature | n/a | **NOT building** — not a TimeReward domain |

## Sources

- `docs/PRD for Resend use.md` (executable spec; Phases 1–5, acceptance criteria, §6 env, §8 security, §13 open decisions) — HIGH
- `.planning/PROJECT.md` (Milestone A scope, constraints, key decisions, out-of-scope) — HIGH
- Resend docs via Context7 (`/websites/resend`): `emails.send` params (`from/to/subject/html/text/react/cc/bcc/replyTo/headers/tags/attachments/scheduledAt/template`), `{ data, error }` return shape, tags format, SDK `^6.x` — HIGH
- Supabase Auth docs via Context7 (`/supabase/supabase`): `signUp` + `emailRedirectTo`, obfuscated duplicate-signup response to prevent user enumeration, Send Email Hook + Resend examples — HIGH
- Reference implementation `sldev2/PopulistsUnite` two-channel pattern (per PRD §4, §14) — MEDIUM (secondary, via PRD)

---
*Feature research for: Resend auth + transactional email (Nuxt 3 + Supabase), PRD Phases 1–3*
*Researched: 2026-06-17*
