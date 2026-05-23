# Current auth email rate limit

**Supabase project:** `time-reward-test` (Micro plan)  
**Context:** Second registration shortly after the first can fail with: *"Too many auth emails were sent recently. Please wait a while before trying again."*

---

## Short answer

**Micro plan does not relax Supabase’s built-in auth email cap.** That limit is separate from compute/database billing. A second signup a few seconds after the first can still fail if you’re on **Supabase’s default (inbuilt) SMTP**.

---

## Where the limit lives

**Supabase Auth (GoTrue)** — not Vercel, not Resend (unless Resend is configured as Supabase’s SMTP).

The app calls `supabase.auth.signUp()` when `NUXT_SKIP_EMAIL_CONFIRMATION` is not `"true"`, which triggers `/auth/v1/signup` and sends a confirmation email through **Supabase’s mail path**.

The friendly message is rewritten in the app from Supabase’s **“email rate limit exceeded”** / **429** response (`app/composables/useAuth.ts`).

---

## What Supabase actually limits

From [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits):

| Limit | Applies to | Adjustable? |
|--------|------------|-------------|
| **Inbuilt SMTP emails/hour** | All signup/recover/email-change sends, **project-wide total** | **Only if you switch to custom SMTP** — not by upgrading to Micro |
| **`rate_limit_email_sent`** | Same class of sends (with custom SMTP) | Yes — **Authentication → Rate Limits** (or Management API) |
| **Signup confirmation period** | Same **user/email** retrying signup | Yes — per-user cooldown, not “second different user” |
| **IP-based buckets** | Other auth endpoints | Partly — matters more when auth runs **server-side** |

So the failure pattern **user 1 OK → user 2 a few seconds later blocked** fits the **hourly project-wide inbuilt SMTP cap** (often very low — commonly cited as ~**2 emails/hour** on default SMTP), **not** “one email every few seconds.”

**Micro does not mean “1 email every few seconds” on built-in SMTP.**

---

## Is it settable?

**Partially:**

1. **Still on Supabase default SMTP**
   - The **emails-per-hour** cap for inbuilt SMTP is **not** something you crank up in the dashboard.
   - Supabase’s docs: change it only by using **custom SMTP**.
   - You *can* tune other auth limits (OTP, signup confirmation **period for the same email**, etc.) under **Authentication → Rate Limits**.

2. **Custom SMTP (e.g. Resend)**
   - **Authentication → Email → SMTP**
   - Then **Authentication → Rate Limits** — adjust **`rate_limit_email_sent`** (Management API: `rate_limit_email_sent` in `PATCH .../config/auth`).
   - Throughput then depends on **Resend’s** limits too, but you’re no longer on the tiny inbuilt cap.

3. **Test / dev without confirmation emails**
   - `NUXT_SKIP_EMAIL_CONFIRMATION=true` → `admin.createUser` with `email_confirm: true` → **no auth confirmation email** → no Supabase email rate limit on signup.
   - See `docs/Manual Testing Plan.md` and `server/api/auth/register.post.ts`.

---

## Extra nuance for this app

Registration runs **on the server** (`server/api/auth/register.post.ts` via Vercel), so Supabase often sees **Vercel’s IP**, not the browser’s. That mainly affects **IP-scoped** limits. **Email-send limits are project-wide**, so all signups share one bucket — which makes back-to-back test signups hit the cap quickly.

If you later need correct IP-based limits with server-side auth, Supabase supports **`Sb-Forwarded-For`** + **IP address forwarding** (secret key only). See [Supabase Auth rate limits — IP address forwarding](https://supabase.com/docs/guides/auth/rate-limits).

---

## Practical paths for `time-reward-test`

| Goal | Action |
|------|--------|
| **Quick testing (many signups)** | `NUXT_SKIP_EMAIL_CONFIRMATION=true` on preview/test |
| **Real confirmation emails at reasonable volume** | Custom SMTP in Supabase (Resend — see `docs/_FORLATER.md`) + raise `rate_limit_email_sent` |
| **Inspect current settings** | Supabase → **Authentication → Rate Limits** and **Authentication → Email** (built-in vs custom SMTP) |

---

## Management API (optional)

```bash
# Get your access token from https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="your-project-ref"

# Get current rate limits
curl -X GET "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq 'to_entries | map(select(.key | startswith("rate_limit_"))) | from_entries'

# Update rate limits (example — requires custom SMTP for email throughput)
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rate_limit_email_sent": 10
  }'
```

---

## Bottom line

The bottleneck is **Supabase Auth’s email-send quota on built-in SMTP**, which is **hourly and project-wide**, not Vercel. Micro does not fix that. For “one email every few seconds,” you need **custom SMTP** and a higher **`rate_limit_email_sent`**, or skip confirmation emails in test via **`NUXT_SKIP_EMAIL_CONFIRMATION`**.

---

## Related code and docs

- `app/composables/useAuth.ts` — maps Supabase rate-limit errors to the user-facing message
- `server/api/auth/register.post.ts` — `signUp` vs `admin.createUser` depending on `NUXT_SKIP_EMAIL_CONFIRMATION`
- `docs/_FORLATER.md` — custom SMTP / Resend for auth emails
- `docs/Manual Testing Plan.md` — registration testing notes
