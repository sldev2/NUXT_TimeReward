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

- [x] `(human only)` Choose **Option A** or **Option B** — **Option A** (root `myfocusrewards.com` / From `support@myfocusrewards.com`)  
- [x] `(human only)` Confirm Resend shows that domain **Verified**  
- [x] `(both)` Update env docs / `.env.example` / PRD sender line if B differs from historical PRD text — **N/A for Option A** (PRD already matches). Added `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME` + `RESEND_SMTP_*` comments to `.env.example` (still unused in app code until Phase 3).  
- [ ] `(human only)` One real Gmail + Outlook check: headers show SPF/DKIM pass (and DMARC as expected); do not trust “Delivered” alone — **how-to below (§2.1)**

**DMARC note:** `_dmarc` may be `p=none` today — failures won’t bounce hard yet, but spam placement still hurts signup. Align first; tighten policy later when volume justifies.

### §2.1 What the Gmail + Outlook header check means

**Why this exists:** Resend (and Supabase) can report a send as **Delivered** / **sent** while the message still lands in **Spam**, is silently filtered, or fails authentication in ways users never see. Signup confirmation only works if a real human inbox accepts and shows the message. Provider dashboards are necessary but not sufficient.

**When to run it:** After Resend shows the **root** domain Verified (Option A) and you can send *some* mail from `support@myfocusrewards.com` (or `TimeReward <support@myfocusrewards.com>`). Prefer:

1. **Earliest / easiest:** Resend dashboard → send a test email to yourself, **or**
2. **Closer to production path:** after Supabase Custom SMTP is configured — register with `NUXT_SKIP_EMAIL_CONFIRMATION=false` and use the real confirmation mail.

You do **not** need the Nuxt `EmailDeliveryService` for this check. Channel A (dashboard / SMTP) is enough.

**What “pass” looks like (Authentication-Results / similar):**

| Check | What you want to see | Bad signs |
|-------|----------------------|-----------|
| **SPF** | `spf=pass` (receiving domain authorized the sending IP) | `spf=fail` / `softfail` — often broken or unmerged SPF on `myfocusrewards.com` (Workspace + Resend must share **one** SPF TXT) |
| **DKIM** | `dkim=pass` with a signature domain aligned with your From (Option A → signing/`d=` for `myfocusrewards.com`) | `dkim=fail` / missing DKIM — domain not fully verified or wrong domain signed |
| **DMARC** | `dmarc=pass` if policy is evaluated; with `p=none` you may still see `pass`/`fail` in results without rejection | `dmarc=fail` (alignment) — From domain doesn’t align with SPF/DKIM domains |

Also verify **human UX:** message is in **Inbox** (not Spam/Junk/Promotions-only if that blocks the confirm CTA), From shows the expected brand, and any confirm link looks correct.

**Do not treat as success:** Resend UI “Delivered”, Supabase “email sent”, or “I got *an* email” without opening headers — spam-foldered confirm mail = broken signup for many users.

#### Step A — Send one real message to Gmail

1. Use a **personal Gmail** address you control (not only Workspace if you can help it — consumer Gmail is a strict filter).  
2. Send from Resend test UI **or** trigger a real signup confirmation (skip flag false).  
3. In Gmail → open the message → **⋮ (More)** → **Show original** (or “View message details”).  
4. In the original, find **`Authentication-Results`** (and often `Received-SPF`, `DKIM-Signature`). Confirm `spf=pass`, `dkim=pass`, and DMARC as expected.  
5. Note whether the message landed in **Inbox** vs **Spam**.

#### Step B — Same check in Outlook / Microsoft 365

1. Send the **same style** of message to an Outlook.com or Microsoft 365 mailbox.  
2. Open the message → **…** / View → **View message details** / **View message source** (wording varies by Outlook web vs desktop).  
3. Again look for Authentication-Results / SPF / DKIM / DMARC.  
4. Confirm Inbox vs Junk.

Outlook and Gmail often disagree; **both** matter because your users use both.

#### Step C — Record the result

- [x] Gmail: Inbox? SPF/DKIM/DMARC notes: _______________  
- [FOR LATER] Outlook: Inbox? SPF/DKIM/DMARC notes: _______________  
- [ ] If either fails: fix DNS/SPF merge or Resend domain config **before** relying on signup email in test/prod; do not “hope Delivered is enough.”

**Option A–specific reminder:** Because root MX is Google Workspace, your SPF record on `myfocusrewards.com` must **include both** Google and Resend (single TXT). A common failure mode after “Verified” in Resend is still `spf=fail` at Gmail because the old SPF only had Google’s `include:`.

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
