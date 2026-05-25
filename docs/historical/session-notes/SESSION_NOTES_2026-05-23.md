# Session Notes - 2026-05-23

## Summary

This session covered custom-domain DNS for `myfocusrewards.com`, production deploy fixes (`main` vs `test`), BOZ23 test-registration gating, auth email rate-limit documentation, legal pages, and GoDaddy email/DNS investigation.

---

## DNS migration (GoDaddy → Vercel)

Domain: **`myfocusrewards.com`** (GoDaddy DNS, nameservers `ns17/ns18.domaincontrol.com`).

### Completed via domain-suite MCP

- **Deleted** `TXT asuid` (legacy Azure App Service verification)
- **Updated** apex `A` → Vercel (`76.76.21.21` at time of change; later DNS showed `216.150.1.1` — verify live records in GoDaddy if troubleshooting)
- **Updated** `CNAME www` → Vercel (`cname.vercel-dns.com` initially; later project-specific `*.vercel-dns-*.com` in dashboard)

### Not completed via API

- **`CNAME test`** — `create_dns_record` failed with GoDaddy `Not Found` (updates/deletes worked). User may have added manually; live DNS later showed `test` → `16d8c8e2cb2296eb.vercel-dns-016.com`.

### Vercel domain assignment issue

- `test.myfocusrewards.com` was initially attached to **Production** (`main`) instead of **Preview / branch `test`**. Fix: Vercel → **Settings → Domains** → move `test` to Preview linked to Git branch `test`. Production should be `myfocusrewards.com` + `www` only.

### MCP limits

- **domain-suite:** DNS read/write on GoDaddy; no email product or mailbox APIs.
- **Vercel MCP:** no DNS write tools when nameservers stay on GoDaddy; `vercel-get-project-domain` failed to accept parameters in-session. Used standard external DNS targets + CLI where needed.

---

## Production deploy error (`main` branch)

Deploying **`main`** to production failed:

> Environment Variable "NUXT_PUBLIC_SUPABASE_URL" references Secret "supabase-url", which does not exist.

**Cause:** Legacy `vercel.json` `env` block existed on **`main`** but was removed on **`test`** in commit `bfb903f`. **`test` was merged into `main`** during this period to align branches.

**Correct Supabase env names:** `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (not `NUXT_PUBLIC_SUPABASE_*` in `vercel.json`).

---

## Repo hygiene

- Added **`.vercel`** to `.gitignore` (local `vercel link` metadata; commit `1f85cf5 save` on `main`).

---

## BOZ23 test registration gating

Implemented env-controlled registration restriction (commit **`1920c81`**):

| `BOZ23` | Behavior |
|---------|----------|
| unset / `0` | Normal registration |
| `1` | New usernames must contain **`boz23`** (case-insensitive) |

- **Login unchanged** for existing users without `boz23` in username.
- Server enforcement: `server/utils/boz23Registration.ts`, `server/api/auth/register.post.ts`
- Client policy + toast: `server/api/auth/registration-policy.get.ts`, `app/pages/register.vue`, `app/components/AppToast.vue`, `app/layouts/auth.vue`
- Config: `BOZ23` / `NUXT_BOZ23` in `nuxt.config.ts`, documented in `.env.example`

User set `BOZ23=1` on Vercel for test/production manually (CLI attempt partially ran before user chose manual setup).

---

## Auth email rate limits

Documented Supabase inbuilt SMTP limits (commit **`d1ba259`**, **`docs/05_23 current auth email rate limit.md`**):

- Second signup shortly after first can fail with “Too many auth emails…” even on **Micro** plan if using **default Supabase SMTP** (hourly project-wide cap).
- **Not** Vercel or Resend (unless Resend is Supabase custom SMTP).
- Mitigations: custom SMTP in Supabase, `NUXT_SKIP_EMAIL_CONFIRMATION=true` for test envs, or wait for rate window.

---

## Legal pages

Added Privacy Policy and Terms of Service (commit **`aba8fd5`**):

- `/privacy-policy`, `/terms-of-service`
- Components: `LegalPageLayout`, `LegalFooterLinks`
- Linked from landing, login, register; register includes agreement line
- Supabase auth `exclude` updated for both routes
- Contact: `support@myfocusrewards.com`; site URL from `NUXT_PUBLIC_APP_URL`

---

## GoDaddy email investigation

domain-suite cannot list GoDaddy Email / M365 subscriptions or mailboxes.

From **DNS on `myfocusrewards.com`**:

- **Inbound @ domain:** Google (`aspmx.l.google.com` MX records)
- **Transactional send:** Resend/Amazon SES (`send` subdomain MX, `resend._domainkey` DKIM)
- App/Vercel: `support@myfocusrewards.com` as `EMAIL_FROM_ADDRESS`

---

## Database spot-checks (`time-reward-test`)

Usernames in `user_profiles` at session time:

| Username | Email |
|----------|-------|
| `bluto` | xcjgfrlgvatqyncorl@nespf.com |
| `kyrie` | kyrie@timereward.local |
| `samboz23goo` | ijrbkhxgczebtzsjqc@onldm.net |
| `slarresboz233` | sbozzy@gmail.com |

`speroboz23` — **not** present.

---

## Git state

Commits on **`test`** since 2026-05-21 session (`2ff2269 save`):

1. `1920c81` — feat(auth): gate registration when BOZ23=1 requires boz23 in username
2. `d1ba259` — docs: explain Supabase inbuilt auth email rate limits
3. `aba8fd5` — feat(legal): add privacy policy and terms of service pages

At end of session:

- branch: **`test`**
- ahead of **`origin/test`** by **1** commit (`aba8fd5`; prior commits may already be pushed)

---

## Practical restart state

- **DNS:** Confirm apex/www/test in GoDaddy match Vercel Domains panel; `test` on Preview branch `test`.
- **Env:** `BOZ23`, `NUXT_SKIP_EMAIL_CONFIRMATION`, Supabase `SUPABASE_*` per environment in Vercel dashboard.
- **Legal:** `/privacy-policy` and `/terms-of-service` live; lawyer review still optional.
- **Email:** Inbound Google; transactional Resend/SES; Supabase auth email rate limits documented in `docs/05_23 current auth email rate limit.md`.
- **Push:** `git push origin test` if `aba8fd5` not yet on remote; merge/push `main` when production deploy is ready.

---

## Google Workspace aliases (follow-up — handoff for next chat)

User **removed old Microsoft 365 / Outlook mailboxes** and wants addresses as **aliases** of **`spero@myfocusrewards.com`** in Google Workspace.

### Working

- **`admin@myfocusrewards.com`** — alias for `spero@`, receives mail correctly.

### Not working (reported)

- `deletemydata@myfocusrewards.com`
- `contact@myfocusrewards.com`
- `info@myfocuserewards.com` — **likely typo:** domain is `myfocuserewards.com` (missing **`s`** in `focus`); should probably be `@myfocusrewards.com`.

### DNS context (unchanged — mail routing OK for Google)

Apex MX still points to **Google** only (`aspmx.l.google.com` + alts). No Microsoft MX on `@`. Transactional **`send`** subdomain still SES/Resend (unaffected by GW inbox aliases).

### Next steps to troubleshoot (see user-facing walkthrough in chat)

1. Fix **`info@`** spelling to `@myfocusrewards.com` in Admin Console if typo.
2. Confirm all aliases are on **User → spero@ → Email aliases** (not separate users, not Groups unless intended).
3. Remove stale **GoDaddy / M365** forwards or mail products if any remain.
4. Test inbound with **Admin → Reporting → Email log search**.
5. Optional: add **`support@`** as GW alias if desired for human inbox (app may still send via Resend separately).

### Open items

- Session notes file **`SESSION_NOTES_2026-05-23.md`** updated; not yet committed.
- Legal pages commit **`aba8fd5`** may still need push to `origin/test`.
