# Resend — Domain, From address, and critical pitfalls

**Exported:** 2026-07-18 from research that previously lived under `.planning/research/` (especially PITFALLS + SUMMARY)  
**Use with:** [`RESEND-MILESTONE-A.md`](RESEND-MILESTONE-A.md), [`PRD for Resend use.md`](PRD%20for%20Resend%20use.md)  
**Why this file exists:** The PRD assumes `support@myfocusrewards.com` and mentions `send.myfocusrewards.com` DKIM. Those two facts can **conflict**. Losing the planning research meant re-learning that the hard way. This distill keeps the decision framework and failure modes without any planning-tool process.

---

## 1. Resend “Verified” ≠ DNS present

In Resend you verify a **domain**, not a single mailbox. Resend gives DNS records (DKIM, SPF-related, etc.). GoDaddy (or your DNS host) can show `resend._domainkey…` while Resend still shows **Pending**.

**Gate before flipping Supabase Custom SMTP:** Resend dashboard shows the relevant domain status as **Verified** (green). Optionally send a one-off test from the Resend dashboard and confirm inbox delivery.

---

## 2. Root domain vs `send.` subdomain vs `From` address

A verified domain only authorizes `From` addresses on that domain (rules per Resend’s current docs). Practical conflict for TimeReward:

| You verify in Resend | Typical allowed From | Matches PRD’s `support@myfocusrewards.com`? |
|----------------------|----------------------|-----------------------------------------------|
| Root `myfocusrewards.com` | `@myfocusrewards.com` | Yes |
| Subdomain `send.myfocusrewards.com` | `@send.myfocusrewards.com` | **No** — root `support@` is not on the verified subdomain |

Session/infra notes historically said outbound DKIM was set up around **`send.myfocusrewards.com`**, while the PRD / Vercel inventory target sender is **`support@myfocusrewards.com`** on the **root**. Resolve this before Phase 1 go-live.

### Option A — Verify root; From `support@myfocusrewards.com`

- **Pros:** Matches PRD wording; nicest-looking sender.  
- **Cons:** Root already has **Google Workspace** inbound MX and likely an SPF record. You must **merge** Resend into existing SPF (only one SPF TXT per name). Higher coupling with human mail reputation.

### Option B — Verify `send.`; From on `send.` (e.g. `support@send.myfocusrewards.com` or `noreply@send.…`)

- **Pros:** Recommended ESP pattern when root MX is Workspace; isolates transactional reputation; cleaner DNS for Resend.  
- **Cons:** Visible From is not bare `support@myfocusrewards.com`. Update `EMAIL_FROM_ADDRESS`, Supabase SMTP Sender field, PRD/env docs so they agree. Optional `Reply-To: support@myfocusrewards.com` for replies into Workspace.

### Broken hybrid (do not ship)

Verify only `send.` but send From `support@myfocusrewards.com` (root). Resend may reject or weaken deliverability; DMARC alignment gets confusing. **Pick A or B and align all three:** Resend verified domain, `EMAIL_FROM_ADDRESS`, Supabase SMTP sender.

### Decision checkbox

- [ ] `(human only)` Choose **Option A** or **Option B**  
- [ ] `(human only)` Confirm Resend shows that domain **Verified**  
- [ ] `(both)` Update env docs / `.env.example` / PRD sender line if B differs from historical PRD text  
- [ ] `(human only)` One real Gmail + Outlook check: headers show SPF/DKIM pass (and DMARC as expected); do not trust “Delivered” alone  

**DMARC note:** `_dmarc` may be `p=none` today — failures won’t bounce hard yet, but spam placement still hurts signup. Align first; tighten policy later when volume justifies.

---

## 3. Critical pitfalls (keep these in every Resend implementation plan)

### Pitfall — Wrong Supabase Site URL / redirect allow-list

Supabase builds confirmation links from **dashboard Site URL + Redirect URLs allow-list**, not merely from `NUXT_PUBLIC_APP_URL`. If Site URL is still `http://localhost:3000`, preview users get broken links even when Vercel env is correct.

**Fix:** Per env:

| Env | Site URL | Redirect examples |
|-----|----------|-------------------|
| Local | `http://localhost:4000` | `…/confirm`, `…/**` |
| Test | `https://test.myfocusrewards.com` | `…/confirm`, `…/**` |

App `devServer` / documented local port is **4000**, not 3000.

### Pitfall — SMTP username / port semantics

Resend SMTP:

- Host: `smtp.resend.com`  
- Port: **587** + STARTTLS (465 is different TLS mode — don’t mix)  
- Username: literal **`resend`** (not an email address)  
- Password: `RESEND_API_KEY`  

Wrong username → 535; wrong port/TLS → confusing handshake errors.

### Pitfall — Custom SMTP does not auto-raise the auth email rate limit

Switching to Resend SMTP **unlocks** higher limits but you must still raise **`rate_limit_email_sent`** (dashboard or Management API). Default after custom SMTP is still limited (~tens of new users/hour until raised — see Supabase docs / `docs/05_23 current auth email rate limit.md`).

**Acceptance:** two registrations within minutes both send.

### Pitfall — Email enumeration on resend-verification

Always return the **same generic success** whether the email is unknown, unconfirmed, or already confirmed. Log details server-side; never echo raw Supabase errors to the client.

### Pitfall — Rate limit wrong IP / in-memory on Vercel

On Vercel, `socket.remoteAddress` is often the proxy. Use real client IP from `x-forwarded-for` (e.g. H3 `getRequestIP(event, { xForwardedFor: true })`). Store counters in **Upstash Redis** (already used for keepalive) — not a process `Map` (resets per cold start / instance).

### Pitfall — API key in public runtimeConfig / crash when unset

Keep `resendApiKey` and `email.*` **server-only**. Lazy-init Resend client; `isConfigured` + no-op when key empty so local `npm run dev` without Resend still boots (mirror Stripe “not configured” patterns).

### Pitfall — Channel A vs Channel B sender drift

SMTP sender (Supabase dashboard) and API `from` (`EMAIL_FROM_*` / runtimeConfig) must stay the same identity. Prefer the same API key for SMTP password and HTTP API unless you intentionally split scopes.

### Pitfall — “Sent” ≠ inbox

After Phase 1, check real inboxes and headers; spam folder counts as failure for signup UX.

---

## 4. Stack reminders (for implementers)

| Piece | Notes |
|-------|--------|
| Channel A | No npm package; dashboard SMTP |
| Phase 2 | `valibot`; `supabase.auth.resend`; Upstash rate limit |
| Phase 3 | `resend@^6.x`; `{ data, error }` return shape (don’t assume throws) |
| Skip flag | `NUXT_SKIP_EMAIL_CONFIRMATION=true` remains valid for fast local signup |
| Automation | `EMAIL_AUTOMATION_*` reserved until a future queue phase — leave off |

Reference implementation: `sldev2/PopulistsUnite` dual-channel docs (SMTP + `EmailDeliveryService`).

---

## 5. Rollback (ops)

- Revert Supabase to default SMTP in dashboard if needed.  
- Set `NUXT_SKIP_EMAIL_CONFIRMATION=true` on preview for emergency.  
- App code should remain safe if API key absent.

---

*This file is the main reason to export planning research before discarding `.planning/` — the PRD alone under-specifies the domain/`From` trap and the Site URL / rate-limit / serverless rate-limit failure modes.*
