# Pitfalls Research

**Domain:** Resend email (Supabase Auth custom SMTP + Nuxt 3 server-side transactional API) for an existing Nuxt 3 + Supabase app (TimeReward), dev + test scope
**Researched:** 2026-06-17
**Confidence:** HIGH (Supabase Auth SMTP + rate-limit facts and Resend SMTP/domain facts verified via Context7 official docs; repo specifics verified against source)

> Scope reminder: dev (local `.env`, `localhost:4000`) + test (Vercel Preview branch `test`, Supabase `time-reward-test`, `test.myfocusrewards.com`) only. Production is deferred, so prod-only failure modes are flagged but not prioritized. Phase numbers refer to PRD Phases 1–3 (Milestone A): **Phase 1** = Auth via Resend SMTP (Channel A, mostly human/dashboard + docs), **Phase 2** = `resend-verification` API/UI + rate limit, **Phase 3** = `EmailDeliveryService` Resend API foundation (Channel B).

## Critical Pitfalls

### Pitfall 1: Site URL left at `localhost:3000` — confirmation links point to the wrong place

**What goes wrong:**
Supabase Auth builds the `{{ .ConfirmationURL }}` in emails from the project's **Site URL** (plus allowed Redirect URLs), *not* from the app's `NUXT_PUBLIC_APP_URL` or the `emailRedirectTo` passed in code unless that exact URL is in the allow-list. On `time-reward-test` the Site URL is a known suspect for still being `http://localhost:3000`. Result: a tester on `test.myfocusrewards.com` gets an email whose confirm link sends them to `localhost:3000/confirm` (dead), or `emailRedirectTo` is silently dropped back to Site URL because it isn't allow-listed.

**Why it happens:**
Two independent URL systems (Nuxt runtimeConfig vs Supabase dashboard) look interchangeable but aren't. The app already documents `NUXT_PUBLIC_APP_URL` correctly, which creates false confidence that redirects are handled in code. The repo's own `register.post.ts` passes `emailRedirectTo: ${appUrl}/confirm`, but Supabase ignores any redirect target not present in the Redirect URLs allow-list and falls back to Site URL.

**How to avoid:**
In Supabase → Authentication → URL Configuration, set Site URL per environment and add **both** the exact `/confirm` path and a wildcard for each env (the repo's own `ENV-SETUP.md` table is the source of truth):
- Local: Site URL `http://localhost:4000`; Redirect URLs `http://localhost:4000/confirm`, `http://localhost:4000/**`
- Preview: Site URL `https://test.myfocusrewards.com`; Redirect URLs `https://test.myfocusrewards.com/confirm`, `https://test.myfocusrewards.com/**`

Note: a single Supabase project has **one** Site URL — since dev and test share behavior but are different projects, confirm which Supabase project each environment points at and that `port 4000` (not 3000, not 8080) is used everywhere.

**Warning signs:**
Confirmation link host doesn't match where you signed up; clicking the link lands on a connection-refused page or a different environment; `emailRedirectTo` in code looks right but the email link ignores it; "redirect_to is not allowed" / fallback-to-Site-URL behavior.

**Phase to address:** Phase 1 (FR-1.2). Verify before Phase 2 testing, since resend-verification reuses the same redirect.

---

### Pitfall 2: Domain/DKIM not actually "Verified" in Resend before flipping Supabase SMTP on

**What goes wrong:**
Supabase SMTP send begins, but Resend rejects or quarantines mail because the sending domain/subdomain isn't fully verified, or the `From` address uses a domain Resend doesn't own. Auth emails silently fail or land in spam, and Supabase surfaces only a generic SMTP error. The session notes say DKIM (`resend._domainkey`) is in GoDaddy and outbound is `send.myfocusrewards.com`, but DNS-present ≠ Resend-dashboard-Verified.

**Why it happens:**
DNS propagation lag; the DKIM/SPF records were added but Resend hasn't re-checked / shows "Pending"; mismatch between the verified domain (`send.myfocusrewards.com`) and the configured sender (`support@myfocusrewards.com`, which is on the root domain). Resend requires the `From` domain to be a verified domain in the account.

**How to avoid:**
Make "Resend dashboard shows domain **Verified**" an explicit Phase 1 gate (PRD §9). Confirm which domain is verified (`myfocusrewards.com` root vs `send.` subdomain) and ensure `EMAIL_FROM_ADDRESS` is on a verified domain. Per Resend docs, SPF + DKIM are configured during domain verification; do not proceed to "configure Supabase SMTP" until Resend status is green. Send one real test from the Resend dashboard first.

**Warning signs:**
Resend dashboard domain status "Pending"/"Not Started"; first auth email never arrives; Resend logs show no send events (vs. failed sends); `From` domain differs from the verified domain.

**Phase to address:** Phase 1 (FR-1.3), strictly before FR-1.1.

---

### Pitfall 3: Supabase custom SMTP misconfiguration (username/password/port semantics)

**What goes wrong:**
SMTP auth fails or TLS negotiation breaks because of the non-obvious Resend credential scheme. The two most common errors: (a) putting the sender email in the username field, and (b) port/encryption mismatch.

**Why it happens:**
For most providers the SMTP username is an email address; **for Resend the username is the literal string `resend`** and the **password is the `RESEND_API_KEY`** (`re_...`). Also port semantics differ: per Resend docs, **587/2587/25 use STARTTLS** (explicit TLS), while **465/2465 use implicit SMTPS**. Choosing 465 with a STARTTLS setting (or 587 with implicit-TLS) yields a confusing handshake failure.

**How to avoid:**
Document and configure exactly (PRD FR-1.1, verified against Resend docs):
- Host: `smtp.resend.com`
- Port: `587` (STARTTLS)
- Username: `resend` (literal, not an email)
- Password: `RESEND_API_KEY` with **"Sending access"** scope (Full Access not required for SMTP send)
- Sender: `TimeReward <support@myfocusrewards.com>` on a verified domain

Capture this in `.env.example` as `RESEND_SMTP_HOST/PORT` comments (FR-1.5) so the dashboard values are reproducible.

**Warning signs:**
"535 authentication failed" (username/password wrong), TLS/SSL handshake errors or timeouts (port/encryption mismatch), works from dashboard test send but not via Supabase SMTP (credential scope/typo).

**Phase to address:** Phase 1 (FR-1.1).

---

### Pitfall 4: Forgetting that custom SMTP does NOT auto-raise the email rate limit

**What goes wrong:**
After wiring Resend SMTP, back-to-back signups still 429 with "Too many auth emails were sent recently." The team assumes custom SMTP removed the cap; it didn't — it only **unlocked** the ability to change it. Per Supabase docs the inbuilt default is **2 emails/hour project-wide**, and with custom SMTP the default becomes **~30 new users/hour** until you raise `rate_limit_email_sent` manually.

**Why it happens:**
The cap and the SMTP provider are configured in different places; switching SMTP feels like it should fix throughput. The repo's own `docs/05_23 current auth email rate limit.md` documents this exact trap.

**How to avoid:**
Treat raising `rate_limit_email_sent` as a required, separate Phase 1 step (FR-1.4): Authentication → Rate Limits in the dashboard, or `PATCH /v1/projects/{ref}/config/auth` with `rate_limit_email_sent`. Set a test-appropriate value (e.g. 10–30/hr) and record it. Keep `NUXT_SKIP_EMAIL_CONFIRMATION=true` as the local fast-signup escape hatch for bulk testing.

**Warning signs:**
Second signup within an hour fails after SMTP is "done"; `useAuth.ts` shows the rewritten "Too many auth emails" message; Resend dashboard shows far fewer sends than signup attempts.

**Phase to address:** Phase 1 (FR-1.4). Acceptance test "two users register within minutes" (FR-1.1) directly verifies it.

---

### Pitfall 5: Email enumeration leak via resend-verification responses

**What goes wrong:**
`POST /api/auth/resend-verification` returns different responses/timing/status for "email exists & unconfirmed" vs "email unknown" vs "already confirmed," letting an attacker enumerate which emails have accounts. Also leaking Supabase's raw error (e.g. "User already registered" / "user not found") defeats the purpose.

**Why it happens:**
`supabase.auth.resend()` returns distinguishable errors, and the natural implementation surfaces them. Developers optimize for helpful UX ("this email isn't registered") and accidentally build an oracle.

**How to avoid:**
Always return a **generic success** ("If an account exists and is unconfirmed, we've sent a new link") regardless of outcome (PRD §8, FR-2.1). Never echo Supabase errors to the client; log them server-side with user/job IDs only (PRD §8 PII rule). Keep response shape and (ideally) timing uniform. Validate input with Valibot before calling Supabase.

**Warning signs:**
API returns 404/409 for unknown vs known emails; different JSON for "already confirmed"; client UI says "no account found"; raw Supabase messages visible in network tab.

**Phase to address:** Phase 2 (FR-2.1).

---

### Pitfall 6: Weak/incorrect rate limiting on resend-verification (wrong client IP on Vercel)

**What goes wrong:**
The `auth-resend-verification` limit (target 5/hr/IP, FR-2.3) keys off the wrong IP and is trivially bypassed or wrongly shared. On Vercel serverless, `event.node.req.socket.remoteAddress` is the proxy/internal IP, so **every user shares one bucket** (false 429s) or the limit is keyed on a spoofable header. Naive in-memory counters also reset on every cold start / per lambda instance, so the limit barely applies.

**Why it happens:**
Serverless has no shared process memory; the real client IP only arrives via `x-forwarded-for` (Vercel sets it, leftmost entry = client). H3's `getRequestIP(event, { xForwardedFor: true })` must be opted in. Developers reuse a localhost-correct pattern that silently breaks in production-like preview.

**How to avoid:**
- Derive client IP from `x-forwarded-for` (use `getRequestIP(event, { xForwardedFor: true })` or parse the leftmost hop) and document that this is trusted only because Vercel overwrites the header at the edge.
- Use **serverless-safe shared storage**: the repo already wires `@upstash/redis` (`server/utils/upstashRedis.ts` via `KV_REST_API_URL` / `KV_REST_API_TOKEN`). Implement the counter there (e.g. `INCR` + `EXPIRE` on key `rl:auth-resend-verification:{ip}`, or add `@upstash/ratelimit`). Do **not** use a module-level `Map`.
- Degrade gracefully when Redis is unconfigured (local dev without KV): fail-open with a warning, or fall back to a per-instance limiter, but never crash the endpoint.
- Pair server limit with a client-side cooldown (FR-2.2) for UX, but never rely on the client alone.

**Warning signs:**
All users hit 429 together (shared proxy IP); limit never triggers under load (cold-start memory reset); 429 count doesn't match Redis keys; limit bypassed by reopening the page; `remoteAddress` logged as a 10.x/internal Vercel IP.

**Phase to address:** Phase 2 (FR-2.3). IP-extraction helper is reusable for Phase 5 recovery later.

---

### Pitfall 7: `RESEND_API_KEY` leaking into the public (client) bundle

**What goes wrong:**
The API key (which doubles as the SMTP password and grants send access to the whole domain) ends up readable in the browser because it was placed under `runtimeConfig.public` or referenced via a `NUXT_PUBLIC_*` / `import.meta.client` path. Anyone can scrape it and send mail as your domain.

**Why it happens:**
Nuxt's `runtimeConfig.public` is bundled to the client; the boundary is easy to cross by accident (e.g. copying the `email.*` block under `public`, or reading the key in a composable). The PRD's target config (§6.4) correctly keeps `resendApiKey` and `email.*` server-side, but the existing config already has a `public:` block, so the line is one careless edit away.

**How to avoid:**
Keep `resendApiKey` and the entire `email` object as **top-level** server-only keys in `runtimeConfig` (never under `public`), exactly as PRD §6.4 shows. Only ever read it in `server/**` via `useRuntimeConfig()`. Add a guard: grep the built client bundle / verify the key is absent from `/_nuxt/*` and the page source. Use a sending-scoped Resend key, not full-access, to limit blast radius. Never log the key.

**Warning signs:**
Key visible in browser devtools → Sources or `window.__NUXT__`; `resendApiKey` appears under `public` in `nuxt.config.ts`; any `.client.ts` or component imports it; Resend shows sends you didn't initiate.

**Phase to address:** Phase 3 (FR-3.2 wiring), but the config shape is locked in nuxt.config when runtimeConfig is extended — review at first config edit.

---

### Pitfall 8: App crashes (or 500s) when `RESEND_API_KEY` is absent

**What goes wrong:**
`new Resend(apiKey)` or a send call throws when the key is empty, taking down a route — or worse, the `EmailDeliveryService` is constructed at server-plugin/module load and crashes boot. This breaks the explicit backward-compat constraint (PROJECT.md, FR-3.2 acceptance: "Missing API key fails gracefully with warning, not crash"). Today the key defaults to `''`, so an unguarded path will fail in exactly the dev configurations that omit it.

**Why it happens:**
The `resend` SDK constructor and config (§6.4) default the key to empty string, not undefined; truthiness checks get skipped; service is eagerly instantiated. The team tests only with the key present.

**How to avoid:**
- Implement an `isConfigured` boolean on `EmailDeliveryService` (FR-3.2) that checks `Boolean(apiKey?.trim())`, mirroring the repo's existing `isUpstashRedisConfigured` / Stripe "not configured" pattern.
- `send()` should early-return a structured `{ skipped: true }` (or no-op with `console.warn`) when not configured — never throw.
- Lazy-instantiate the Resend client inside `send()`, not at import time.
- Add an explicit test: call the send path with no key and assert no throw (FR-3.2 acceptance).

**Warning signs:**
Local `npm run dev` 500s on a route that touches email; server won't boot when key unset; error "Missing API key" from the resend SDK; works on Vercel (key set) but not locally.

**Phase to address:** Phase 3 (FR-3.2). Mirror Stripe's documented "not configured" behavior from `ENV-SETUP.md`.

---

### Pitfall 9: Deliverability — auth mail landing in spam (DMARC `p=none`, From/domain mismatch)

**What goes wrong:**
Emails send successfully (Resend logs green) but land in spam or are silently dropped by Gmail/Outlook. Per Resend docs, missing/misconfigured SPF/DKIM/DMARC is the #1 cause. The PRD notes current `_dmarc` is `p=none`, and inbound is Google Workspace on the same root domain — a From/identity mismatch (sending as `support@myfocusrewards.com` while DKIM is verified for `send.myfocusrewards.com`) weakens alignment.

**Why it happens:**
"Send succeeded" is conflated with "inbox delivered." DKIM alignment requires the signing domain to align with the From domain; using a subdomain for DKIM but the root for From can break DMARC alignment. Reputation is cold for a new sender.

**How to avoid:**
- Confirm SPF + DKIM are verified for the **exact From domain** in Resend, and that DMARC alignment holds (signing domain aligns with `From`).
- For dev+test, accept `p=none` but verify with a real Gmail + Outlook inbox and check headers (`SPF=pass`, `DKIM=pass`, `DMARC=pass`) rather than trusting Resend's "sent" status.
- Avoid spammy subject/body; ensure both HTML and plain-text parts exist (FR-3.2 `text` field).
- Defer tightening DMARC to `quarantine/reject` until volume justifies (PRD §8) — but verify alignment now so the later switch is safe.

**Warning signs:**
Resend shows "Delivered" but recipient inbox empty; mail in Spam/Promotions; email headers show `dkim=fail` or `dmarc=fail (alignment)`; only some providers (e.g. Outlook) drop it.

**Phase to address:** Phase 1 (DNS/sender, FR-1.3 / §9) for auth mail; revisit in Phase 3 for app-owned mail templates.

---

### Pitfall 10: Two channels drift — Channel A (SMTP) and Channel B (API) use different senders/keys

**What goes wrong:**
Auth emails (Supabase SMTP) come from one sender while app-owned emails (`EmailDeliveryService` API) come from another, or use different API keys/scopes, causing inconsistent branding, split Resend analytics, and one channel verified while the other isn't. Users see `support@` for confirmation but a different address for app mail.

**Why it happens:**
The SMTP sender is set in the Supabase dashboard (human), while the API `from` is set in code/runtimeConfig (`email.fromAddress`). They're configured independently and drift apart. One key is pasted into Supabase, a different key into Vercel env.

**How to avoid:**
Single source of truth for sender: `EMAIL_FROM_NAME <EMAIL_FROM_ADDRESS>` used for both the Supabase SMTP "Sender" field and `runtimeConfig.email.fromAddress`. Prefer the **same** `RESEND_API_KEY` for SMTP password and API (PRD §6.1 says they're the same var) unless you intentionally split scopes. Document both in `.env.example`.

**Warning signs:**
Confirmation and app emails have different From addresses; Resend analytics split unexpectedly; one channel works, the other 403s (wrong key scope).

**Phase to address:** Phase 3 (when Channel B lands); align against Phase 1 SMTP sender.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| In-memory `Map` rate limiter instead of Upstash Redis | No Redis dependency; trivial code | Useless on Vercel serverless (per-instance, resets on cold start); false sense of protection | **Never** for the Vercel-deployed limit; OK only as a local-dev fallback when KV unset |
| Skip raising `rate_limit_email_sent` ("we'll do it if it breaks") | One less dashboard step | Test signups 429 unpredictably; flaky UAT; masks real bugs | Never — it's a one-line Phase 1 step |
| Hardcode redirect/Site URL for one env | Fast first green test | Breaks the moment you test another env; confirmation links rot | Only within a single throwaway local test session |
| Surface raw Supabase auth errors to client for "better debugging" | Easier debugging | Email enumeration oracle; leaks internal state | Never in resend-verification; use server logs instead |
| Construct `Resend`/`EmailDeliveryService` at module/plugin load | Simpler singletons | Crashes boot when key absent (breaks dev) | Never — lazy-init inside `send()` |
| Reuse full-access Resend key everywhere | One key to manage | Larger blast radius if leaked | OK for dev/test; use sending-scoped key before prod |
| Trust Resend "Delivered" as proof of inbox | Skips manual inbox checks | Spam-foldered auth mail goes unnoticed | Acceptable only after one real Gmail+Outlook header check per domain |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase custom SMTP | Username = sender email | Username is literal `resend`; password is `RESEND_API_KEY` |
| Supabase custom SMTP | Port 465 with STARTTLS (or 587 with implicit TLS) | 587 = STARTTLS (recommended); 465 = implicit SMTPS — match port to encryption |
| Supabase Auth redirects | Relying on `emailRedirectTo` / `NUXT_PUBLIC_APP_URL` alone | Add exact URL to Supabase Redirect URLs allow-list; set per-project Site URL |
| Supabase rate limits | Assuming custom SMTP removes the cap | Custom SMTP only *unlocks* `rate_limit_email_sent`; raise it explicitly (default ~30/hr) |
| Supabase `auth.resend()` | Returning provider errors to client | Generic success response; log details server-side |
| Resend domain | From domain ≠ verified domain | Send only from a Resend-verified domain; align From with DKIM domain |
| Resend API key | Placed in `runtimeConfig.public` | Server-only top-level runtimeConfig; never `public`, never client imports |
| Resend SDK | `new Resend('')` at import time | Guard with `isConfigured`; lazy-init; no-op when unset |
| Vercel serverless | `req.socket.remoteAddress` as client IP | Parse leftmost `x-forwarded-for` (`getRequestIP(event, { xForwardedFor: true })`) |
| Upstash Redis | New `Redis()` per request | Reuse the cached singleton from `server/utils/upstashRedis.ts` |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-instance/in-memory counters | Limit ineffective or wildly inconsistent | Centralize in Upstash Redis (`INCR`+`EXPIRE`) | Immediately on Vercel (multiple lambdas / cold starts) |
| Shared proxy-IP rate bucket | All users 429 together | Key on real client IP from `x-forwarded-for` | As soon as 2 users hit it concurrently |
| Synchronous email send blocking the request | Slow API responses on the resend/send path | Keep sends fast (Resend API is quick); defer bulk to Phase 4 queue | Higher volume / multiple recipients |
| Supabase auth email cap | Signups 429 in bursts | Raise `rate_limit_email_sent`; use skip flag in test | >2/hr on default SMTP; >~30/hr on custom until raised |
| New Redis client per request | Connection churn / latency | Reuse singleton client | Under load / many endpoints |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `RESEND_API_KEY` in public runtimeConfig / client bundle | Domain-wide email send hijack, spoofing | Server-only runtimeConfig; verify absent from client bundle; sending-scoped key |
| Email enumeration via resend-verification | Account discovery, targeted phishing | Generic responses; uniform status/shape; Valibot-validate input |
| Missing/spoofable IP source for rate limit | Limit bypass → email-bomb a victim / abuse Resend quota | Trusted `x-forwarded-for` (Vercel-set) + Redis-backed counter |
| Logging full email bodies / addresses | PII exposure in logs | Log user IDs and job IDs only (PRD §8) |
| Trusting `Sb-Forwarded-For` / forwarding without secret key | IP spoofing of Supabase-side limits | Only enable IP forwarding with service-role; don't trust client-set headers |
| No DMARC alignment | Spoofing / phishing as your domain | Verify DKIM/SPF aligned with From; plan DMARC tighten post-volume |
| Reusing one full-access key for SMTP + API + future | Large blast radius on leak | Scope keys; rotate if exposed |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No resend-verification affordance | Stuck unconfirmed users abandon | Post-signup screen + login/register "Resend verification" action (FR-2.2) |
| No client cooldown on resend button | Users spam-click, hit 429, see error | Visible cooldown timer; disable button during cooldown |
| 429 with a raw/technical message | Confusing dead-end | Friendly "please wait N minutes" message (match existing `useAuth.ts` style) |
| Generic success hides "already confirmed" | User waits for an email that won't come | Generic copy that also says "if already confirmed, just log in" |
| Confirmation link to wrong env | Click → broken page, lost signup | Correct Site URL/redirects per env (Pitfall 1) |
| Auth mail in spam | Users never confirm, think app is broken | Deliverability checks (Pitfall 9); tell users to check spam |

## "Looks Done But Isn't" Checklist

- [ ] **Custom SMTP configured:** Often missing the `rate_limit_email_sent` raise — verify two signups within minutes both send (FR-1.1 acceptance).
- [ ] **Redirect URLs:** Often missing the wildcard or pointing at port 3000 — verify the confirm link host matches the environment you signed up in.
- [ ] **Domain verified:** Often "Pending" in Resend despite DNS present — verify dashboard shows **Verified** and From domain matches.
- [ ] **resend-verification API:** Often leaks enumeration — verify identical response for known/unknown/confirmed emails.
- [ ] **Rate limit:** Often per-instance in-memory — verify counter persists across requests/instances (Redis keys present) and uses real client IP.
- [ ] **Missing-key behavior:** Often crashes — verify `npm run dev` with no `RESEND_API_KEY` boots and the send path no-ops with a warning (FR-3.2 acceptance).
- [ ] **Secret hygiene:** Often slips into public config — verify `resendApiKey` is absent from the client bundle / page source.
- [ ] **Deliverability:** Often only "sent" not "inboxed" — verify a real Gmail + Outlook inbox and that headers show SPF/DKIM/DMARC pass.
- [ ] **Plain-text part:** Often HTML-only — verify `text` alternative is sent to reduce spam scoring.
- [ ] **Channel sender parity:** Often drifts — verify auth (SMTP) and app (API) emails share the same From identity.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Site URL / redirect wrong | LOW | Fix Site URL + Redirect URLs in dashboard; re-trigger confirmation; no code change |
| Custom SMTP cap not raised | LOW | PATCH `rate_limit_email_sent` or set in dashboard; wait for window reset |
| SMTP credential/port wrong | LOW | Correct username `resend` / API-key password / port 587; re-test |
| Domain not verified | LOW–MEDIUM | Re-check DNS in Resend; wait for propagation; re-verify; resend test |
| API key leaked to client | MEDIUM | **Rotate the Resend key immediately**; move to server-only config; redeploy; audit Resend send logs |
| Email enumeration shipped | MEDIUM | Patch endpoint to generic responses; review logs for scraping attempts |
| Ineffective rate limiter | MEDIUM | Re-implement on Upstash Redis with real IP; backfill test coverage |
| Crash on missing key | LOW | Add `isConfigured` guard + lazy init; add no-key test |
| Mail in spam | MEDIUM–HIGH | Fix SPF/DKIM/DMARC alignment; warm sender; ask users to check spam meanwhile |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Site URL `localhost:3000` / redirect misconfig | Phase 1 | Confirm link host matches env; `/confirm` completes login |
| 2. Domain/DKIM not verified | Phase 1 | Resend dashboard "Verified"; test send arrives |
| 3. SMTP username/password/port wrong | Phase 1 | Auth email sends from `support@`; no 535/TLS errors |
| 4. Rate limit not raised | Phase 1 | Two signups within minutes both succeed |
| 5. Email enumeration leak | Phase 2 | Identical response for known/unknown/confirmed |
| 6. Weak/IP-wrong rate limit | Phase 2 | 429 after 5/hr per real IP; Redis keys present; survives cold start |
| 7. API key in public bundle | Phase 3 (config review at first runtimeConfig edit) | Key absent from client bundle/page source |
| 8. Crash when key absent | Phase 3 | `npm run dev` boots without key; send no-ops with warning |
| 9. Deliverability / spam | Phase 1 (auth), revisit Phase 3 (app mail) | Gmail+Outlook inbox; SPF/DKIM/DMARC pass in headers |
| 10. Channel sender/key drift | Phase 3 | Auth and app emails share From identity |

## Sources

- Context7 → /websites/supabase (`guides/auth/auth-smtp`, `guides/platform/going-into-prod`, `guides/integrations/build-a-supabase-integration`): custom SMTP fields, **default 2 emails/hour**, **~30 new users/hour** with custom SMTP, `rate_limit_email_sent` via dashboard/Management API — **HIGH**
- Context7 → /websites/resend (`docs/send-with-smtp`, `docs/send-with-laravel-smtp`, `docs/api-reference/domains/verify-domain`, `docs/knowledge-base/why-are-my-emails-going-to-spam`, `docs/dashboard/domains/dmarc`): SMTP host/username `resend`/password=API key, ports 25/465/587/2465/2587 STARTTLS vs SMTPS, domain verification, SPF/DKIM/DMARC as #1 spam cause — **HIGH**
- Repo: `docs/05_23 current auth email rate limit.md`, `docs/ENV-SETUP.md` (Site URL pitfall), `docs/PRD for Resend use.md` (§6.4, §8, §9, §13), `server/utils/upstashRedis.ts`, `server/api/keepalive.get.ts`, `server/api/auth/register.post.ts`, `nuxt.config.ts` — **HIGH**
- Nuxt/H3 `getRequestIP(event, { xForwardedFor: true })` for client IP behind proxy; Vercel sets `x-forwarded-for` at the edge — **MEDIUM** (standard platform behavior; not separately Context7-verified this run)

---
*Pitfalls research for: Resend + Supabase Auth + Nuxt 3 transactional/auth email (TimeReward Milestone A, dev+test)*
*Researched: 2026-06-17*
