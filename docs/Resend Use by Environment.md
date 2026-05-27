# Resend Use by Environment

**Project:** TimeReward (`NUXT_TimeReward`)  
**Last updated:** 2026-05-27

---

## Short answer

**Yes — Resend works without Vercel.** Resend is a hosted email API. Any environment with internet access and a valid API key can send mail, including `localhost`. Vercel is not required.

In **this repo today**, the situation is slightly different from what the Vercel env inventory suggests.

---

## What this app actually does today

| Email type | Who sends it | Uses `RESEND_API_KEY` in app code? |
|------------|--------------|-------------------------------------|
| Registration / auth confirmation | **Supabase Auth** | **No** |
| Transactional app email | Not implemented yet | **No** |

From [`docs/ENV-SETUP.md`](ENV-SETUP.md):

> **Resend:** Slots exist on `runtimeConfig`, but **there is no current usage in `app/` or `server/` code paths**.

There is also **no `resend` npm package** in this project. Putting `RESEND_API_KEY` in local `.env` today **does nothing** unless you wire up code or configure Supabase to use Resend.

Registration uses Supabase directly (`server/api/auth/register.post.ts`):

- When `NUXT_SKIP_EMAIL_CONFIRMATION=true` (typical local dev): admin API creates a pre-confirmed user — **no email sent**.
- When `NUXT_SKIP_EMAIL_CONFIRMATION=false`: `supabase.auth.signUp()` triggers Supabase’s built-in confirmation email path (default Supabase SMTP unless custom SMTP is configured in the Supabase dashboard).

---

## Two different ways “using Resend” could mean

### 1. Auth emails (signup confirmation, password reset)

These are sent by **Supabase**, not by the Nuxt server directly.

To use Resend here:

1. Resend dashboard → create an **SMTP credential** (or use Resend SMTP settings).
2. Supabase → **Authentication → Email → SMTP** → enter Resend SMTP (`smtp.resend.com`, port `587`, username `resend`, password = Resend API key, STARTTLS).
3. Set sender to a verified address (e.g. `support@myfocusrewards.com`).

That works from **localhost** the same as from Vercel: the app calls Supabase; **Supabase** sends the email via Resend.

**Local dev extras when testing real confirmation emails:**

- `NUXT_SKIP_EMAIL_CONFIRMATION=false` in `.env`
- `NUXT_PUBLIC_APP_URL=http://localhost:4000`
- Supabase → **Authentication → URL configuration** → add `http://localhost:4000/confirm` to redirect URLs

Confirmation links will point at localhost, which is fine for testing.

See also: [`docs/05_23 current auth email rate limit.md`](05_23%20current%20auth%20email%20rate%20limit.md).

### 2. App transactional email (future)

If you later add code that calls Resend’s API (notifications, receipts, etc.), that also works from localhost:

```env
RESEND_API_KEY=re_...
EMAIL_FROM_ADDRESS=support@myfocusrewards.com
EMAIL_FROM_NAME=TimeReward
```

Nuxt reads these via `runtimeConfig` on the **server** during `npm run dev`. No Vercel involved.

DNS for outbound mail on the `send` subdomain (Resend/SES DKIM) is a **DNS + Resend account** concern, not a hosting concern.

---

## Environment matrix

| Environment | Host | Resend in app code? | Typical auth email path | Notes |
|-------------|------|---------------------|-------------------------|-------|
| **Local dev** | `localhost:4000` | No | Skip confirmation (`NUXT_SKIP_EMAIL_CONFIRMATION=true`) OR Supabase default/custom SMTP | Resend API key optional until wired |
| **Preview** (`test.myfocusrewards.com`) | Vercel Preview | No | Same as prod config per env vars | Shared Vercel env may list `RESEND_*` but unused in code |
| **Production** | `myfocusrewards.com` | No | Supabase (default SMTP today) | `UNDER_CONSTRUCTION=1` blocks app but not Supabase SMTP config |

---

## What local dev usually does (and why Resend feels unused)

Most local setups use:

```env
NUXT_SKIP_EMAIL_CONFIRMATION=true
```

That bypasses Supabase confirmation emails completely, so you never hit Resend **or** Supabase’s default SMTP limits. That is intentional for fast iteration.

To test the real email path locally: set the skip flag to `false` and configure Supabase SMTP (Resend or otherwise).

---

## Vercel env vars vs local `.env`

The Vercel inventory ([`docs/vercel environment inventory.md`](vercel%20environment%20inventory.md)) lists:

- `RESEND_API_KEY`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME`
- `EMAIL_AUTOMATION_ENABLED`
- `EMAIL_DISPATCH_INTERVAL_MS`

These mirror the **PopulistsUnite** pattern but are **not referenced in current TimeReward app code**. For local dev, copy only what the app actually uses from [`.env.example`](../.env.example) plus Supabase/Stripe keys.

---

## Practical summary

| Question | Answer |
|----------|--------|
| Can Resend work on localhost without Vercel? | **Yes** |
| Does this app call Resend today? | **No** |
| Where would Resend matter for auth? | **Supabase SMTP settings**, not Nuxt |
| Easiest local dev? | Keep `NUXT_SKIP_EMAIL_CONFIRMATION=true` |
| Test real confirmation emails locally? | Supabase custom SMTP (Resend) + skip flag off + localhost in Supabase redirect URLs |

---

## Related docs

- [`docs/compare with Resend use in PopulistsUnite.md`](compare%20with%20Resend%20use%20in%20PopulistsUnite.md) — side-by-side with `sldev2/PopulistsUnite`
- [`docs/PRD for Resend use.md`](PRD%20for%20Resend%20use.md) — planned adoption
- [`docs/_FORLATER.md`](_FORLATER.md) — custom SMTP for auth emails (deferred)
