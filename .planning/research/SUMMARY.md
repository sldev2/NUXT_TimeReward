# Project Research Summary

**Project:** TimeReward — Resend Email Integration (Milestone A)
**Domain:** Transactional/auth email delivery for an existing Nuxt 3 + Supabase + Vercel app (Resend, PRD Phases 1–3; dev + test scope)
**Researched:** 2026-06-17
**Confidence:** HIGH

## Executive Summary

This is a **bounded integration milestone**, not a greenfield build: TimeReward is an already-working Nuxt 3 + `@nuxtjs/supabase` + Vercel app whose `RESEND_API_KEY` / `EMAIL_FROM_*` slots are declared but read by no code. The job is to make those keys power real email through the proven **two-channel pattern** from the reference repo `sldev2/PopulistsUnite`: **Channel A** routes Supabase Auth's signup/confirm/magic-link templates through Resend SMTP (`smtp.resend.com:587`, user `resend`, password = the API key) — pure dashboard config, no app code; **Channel B** is a thin server-side `EmailDeliveryService` over the `resend` npm SDK (`^6.x`) for future app-owned mail. The single net-new code surface is one endpoint (`POST /api/auth/resend-verification`), small UI edits, and the service wrapper. Net-new dependencies are just **`resend`** and **`valibot`** — `@upstash/redis`, `@nuxtjs/supabase`, and `dotenv` are already installed.

The recommended approach is deliberately minimal and additive. Channel A delivers the core value (escaping Supabase's tiny inbuilt SMTP cap, branding the sender as `TimeReward <support@myfocusrewards.com>`) with **zero code** — it is mostly a human/dashboard + docs task. Channel B is built as a *foundation only*: it has **no production caller** in this milestone (exercised solely by a test/health send), it must expose `isConfigured` and **gracefully no-op** when the key is absent, and it must lazy-init the SDK so a missing key never crashes boot. The whole milestone explicitly **refuses** to build a queue table, Nitro dispatcher, CLI, `monitoring_events` table, or password-recovery service — those are PRD Phases 4–5 and are blocked by genuinely missing prerequisites (no enqueue triggers, no `/forgot-password` flow), so building them now would be dead infrastructure.

The dominant risks are **configuration and security**, not algorithmic complexity. The two URL systems (Nuxt runtimeConfig vs Supabase dashboard Site URL/redirect allow-list) look interchangeable but aren't — a stale `localhost:3000` Site URL silently breaks confirm links. Custom SMTP **unlocks** but does not auto-raise `rate_limit_email_sent` (default ~30/hr), so it must be raised explicitly. The unauthenticated resend endpoint is an abuse + enumeration surface: it needs Valibot validation, a serverless-safe **Upstash-backed** rate limit keyed on the real `x-forwarded-for` client IP (in-memory counters are useless on Vercel), and a **generic identical response** regardless of account state. And `RESEND_API_KEY` (which doubles as the SMTP password) must stay server-only — one careless edit into `runtimeConfig.public` leaks domain-wide send access to the browser.

## Key Findings

### Recommended Stack

The existing app stack is fixed and not re-researched. For Milestone A the only additions are two tiny, dependency-light packages plus reuse of already-installed infra. Channel A needs **no package at all** — it is 100% Supabase dashboard SMTP configuration sharing the same `RESEND_API_KEY`. See `STACK.md` for verified API surfaces and wiring snippets.

**Core technologies:**
- `resend@^6.12.4` (npm Node SDK) — Channel B HTTP client for `EmailDeliveryService` (Phase 3) — official SDK, matches PopulistsUnite major; v6 returns `{ data, error }` and does **not** throw on API errors.
- Supabase Auth **Custom SMTP → Resend** (`smtp.resend.com:587`, STARTTLS, user `resend`, pass = API key) — Channel A (Phase 1) — pure dashboard config, removes the inbuilt hourly cap (the core value).
- `valibot@^1.4.1` — input validation on `resend-verification` (Phase 2) — tiny, dependency-free, PRD-named; stable v1 API (`v.object`/`v.pipe`/`v.email`/`v.safeParse`).
- `@upstash/redis@^1.38.0` (**already installed**) — serverless-safe backing store for the 5/hr/IP rate limit; reuse `server/utils/upstashRedis.ts` (hand-rolled `INCR`+`EXPIRE`). Optional upgrade `@upstash/ratelimit@^2.0.8` only if sliding-window precision is wanted.

### Expected Features

`FEATURES.md` frames the milestone as Phases 1–3 table stakes, with Phases 4–5 explicitly mapped as **anti-features**. The bar is "branded auth mail that actually delivers, plus a safe resend path and a reusable send foundation" — not polish.

**Must have (table stakes):**
- Auth confirmation mail from a verified branded sender (`TimeReward <support@myfocusrewards.com>`), not the Supabase default — Channel A.
- Per-env confirm redirect URLs (`/confirm`) + raised `rate_limit_email_sent` — a broken redirect or unraised cap = broken signup.
- `POST /api/auth/resend-verification` via `supabase.auth.resend({ type:'signup' })` with Valibot validation.
- **Enumeration-safe generic response** + **5/hr/IP rate limit → 429** — security-mandatory hard gates, not polish.
- Client-side cooldown + friendly messaging (complements, never replaces, the server limit).
- `EmailDeliveryService.send({to,subject,html,text,tags?,replyTo?})` with `isConfigured` + graceful no-op + provider-error (`{data,error}`) handling.

**Should have (competitive / cheap wins within Phase 3):**
- Send tagging (`tags:[{name,value}]`) for Resend dashboard analytics.
- A reachable test-send/health path (satisfies Phase 3 acceptance without a real signup).
- Structured console failure logging (user/job id only); `replyTo` on app-owned sends.

**Defer (v2+ / PRD Phases 4–5 — anti-features now):**
- `email_queue` table, Nitro `email-dispatcher` plugin, `dispatch-email.mjs` CLI, `monitoring_events` table (Phase 4) — no enqueue triggers exist.
- Password recovery via Resend + `AccountRecoveryService` (Phase 5) — no `/forgot-password` flow.
- Supabase Send Email Hook / Edge Function rendering, prod SMTP cutover, DMARC tightening, marketing/broadcast mail.

### Architecture Approach

`ARCHITECTURE.md` describes a **two-channel, no-queue** design that plugs into the existing host shape (Nitro `server/api/`, `server/utils/`, `runtimeConfig`) without changing it. The two channels **never share a code path**: Channel A is Supabase emitting templates through human-configured SMTP; Channel B is app code calling the Resend HTTP API. Critically, the Phase 2 `resend-verification` route is **Channel A** (it delegates to `supabase.auth.resend`), *not* Channel B. Phases 2 and 3 are independent code tracks that can be built in parallel after Phase 1's docs land; their only shared edit is the `nuxt.config.ts` `runtimeConfig` block, which must be sequenced/merged carefully.

**Major components:**
1. Supabase Auth Custom SMTP (Channel A) — renders/delivers auth templates via Resend SMTP — **human/dashboard owned**.
2. `server/api/auth/resend-verification.post.ts` + `server/utils/rateLimit.ts` (Phase 2) — validate, rate-limit (named key `auth-resend-verification`), call `supabase.auth.resend`, return generic success.
3. `server/services/EmailDeliveryService.ts` (Phase 3) — Channel B thin Resend-SDK wrapper with `isConfigured` + no-op; **foundation, no callers yet**.
4. `nuxt.config.ts` `runtimeConfig` (server-only) — surfaces `resendApiKey` + `email.*`; UI edits to `register.vue`/`login.vue` for the resend action + cooldown.

### Critical Pitfalls

Top risks from `PITFALLS.md` (10 documented, mapped to phases):

1. **Stale Supabase Site URL (`localhost:3000`) / redirect not allow-listed** — confirm links 404 or `emailRedirectTo` is silently dropped. Set per-env Site URL + add exact `/confirm` and wildcard to the Redirect URLs allow-list; standardize on port **4000**. (Phase 1)
2. **Domain/DKIM not actually "Verified" in Resend** before flipping SMTP on — DNS-present ≠ dashboard-Verified; ensure the `From` domain matches the verified domain. Make "Verified" an explicit Phase 1 gate. (Phase 1)
3. **Custom SMTP does NOT auto-raise the email rate limit** — it only unlocks it (default ~30/hr). Raise `rate_limit_email_sent` as a separate required step. (Phase 1)
4. **Email enumeration + weak rate limiting on resend-verification** — return identical generic responses; rate-limit on the real `x-forwarded-for` IP via **Upstash Redis** (not in-memory, which resets per lambda/cold start on Vercel). (Phase 2)
5. **`RESEND_API_KEY` leaking into the public bundle / app crashing when key absent** — keep key + `email.*` server-only (never `public`); implement `isConfigured` + lazy-init + no-op so missing-key dev boots cleanly. (Phase 3)

## Implications for Roadmap

The PRD already prescribes the phase structure and research confirms it is correct — dependencies and the human-vs-code split make the ordering essentially fixed. Suggested roadmap mirrors PRD Phases 1–3.

### Phase 1: Auth Email via Resend SMTP (Channel A)
**Rationale:** Delivers the core value (branded sender + escape the cap) with zero app code and is the hard prerequisite for Phase 2 (resend is pointless until auth mail actually flows). Mostly human/dashboard + thin docs.
**Delivers:** Resend domain Verified gate; Supabase custom SMTP on `time-reward-test`; per-env Site URL + `/confirm` redirect allow-list; raised `rate_limit_email_sent`; `.env.example` `RESEND_SMTP_*`/`EMAIL_FROM_*` + `docs/Resend Use by Environment.md` / `ENV-SETUP.md` updates.
**Addresses:** Branded verified sender, per-env redirects, adequate send rate (FR-1.1–1.5).
**Avoids:** Pitfalls 1 (Site URL), 2 (DKIM verify), 3 (SMTP credential/port semantics), 4 (rate-limit not raised), 9 (deliverability/spam).

### Phase 2: Resend-Verification Endpoint + UI (Channel A re-send)
**Rationale:** Depends on Phase 1 for real end-to-end delivery, but route + UI can be built/unit-tested behind it. Unblocks users who lost the first mail; the security gates here are mandatory.
**Delivers:** `POST /api/auth/resend-verification` (Valibot, generic success, `supabase.auth.resend`); `server/utils/rateLimit.ts` (named key `auth-resend-verification`, 5/hr/IP → 429, Upstash-backed, fail-open locally); register/login resend action + client cooldown.
**Uses:** `valibot`, reused `@upstash/redis`, `serverSupabaseClient`, `resolveAppBaseUrl` (existing).
**Implements:** Component 2 (resend route + rate-limit util + UI); Patterns "named rate-limit key + generic response."
**Avoids:** Pitfalls 5 (enumeration), 6 (wrong client IP / in-memory limiter).

### Phase 3: Resend API Foundation (Channel B)
**Rationale:** Independent code track from Phase 2 (different files; only shares the `runtimeConfig` edit) — can run in parallel once env shape is settled. Establishes the reusable send foundation that justifies the project, without committing to a queue.
**Delivers:** `resend` npm dep; `runtimeConfig` `resendApiKey` + `email.*` (server-only) per PRD §6.4; `server/services/EmailDeliveryService.ts` with `isConfigured` + graceful no-op + `{data,error}` handling; a guarded test-send/health path.
**Uses:** `resend@^6.x`.
**Implements:** Component 3 (`EmailDeliveryService`); Patterns "graceful no-op service."
**Avoids:** Pitfalls 7 (key in public bundle), 8 (crash on missing key), 10 (Channel A/B sender drift).

### Phase Ordering Rationale
- **Dependency-driven:** Phase 2 requires Channel A live to deliver (Phase 1 first); Phase 3 is infra-independent of 1–2 and can parallelize with Phase 2.
- **Human-vs-code split:** Phase 1 ≈ mostly human (dashboard/DNS) + docs; Phases 2–3 ≈ entirely code with no further dashboard action.
- **Single coordination point:** all three touch `nuxt.config.ts` `runtimeConfig` — sequence/merge that one file to avoid conflicts.
- **Avoids scope creep:** queue/dispatcher/recovery are deliberately excluded; their prerequisites are genuinely absent.

### Research Flags

Phases likely needing deeper research during planning:
- **None require new external research.** All three phases are backed by HIGH-confidence Context7-verified docs (Resend SDK/SMTP, Supabase Auth SMTP + rate limits, Valibot) and direct repo inspection. Stack, API surfaces, and wiring are already pinned in `STACK.md`/`ARCHITECTURE.md`.

Phases with standard patterns (skip `--research-phase`):
- **Phase 1:** Well-documented dashboard config; runbook values verified against Resend/Supabase docs.
- **Phase 2:** Established endpoint + Upstash rate-limit + Valibot patterns; mirrors existing `register.post.ts`.
- **Phase 3:** Thin SDK wrapper mirroring the documented PopulistsUnite service and the repo's existing "not configured" (Stripe/Upstash) precedent.

> The only items needing *verification* (not research) are operational facts: which Supabase project each env points at, current Resend domain "Verified" status, and the exact verified `From` domain vs subdomain.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | npm versions + Resend/Valibot API surfaces Context7-verified 2026-06-17; deps already in repo confirmed by inspection. |
| Features | HIGH | Driven by the executable PRD + PROJECT.md; acceptance criteria and anti-features explicit. |
| Architecture | HIGH | Two-channel design verified against existing repo files and the PopulistsUnite reference; only the exact latest `resend` major is pinned by convention (`^6.x`). |
| Pitfalls | HIGH | Supabase SMTP/rate-limit and Resend SMTP/domain facts Context7-verified; repo-specific traps verified against source and existing docs. |

**Overall confidence:** HIGH

### Gaps to Address

- **Supabase project ↔ environment mapping & Site URL:** Confirm which project each env points at and that Site URL/redirects use port **4000** (not 3000/8080) before Phase 2 testing. Handle as a Phase 1 verification checklist item.
- **Resend domain "Verified" + From alignment:** DNS-present ≠ Verified; confirm dashboard status and that `EMAIL_FROM_ADDRESS` (`support@myfocusrewards.com`, root) aligns with the verified DKIM domain (`send.myfocusrewards.com` subdomain) for DMARC. Gate Phase 1 go-live; send one real Gmail+Outlook test and check headers.
- **Rate-limit helper choice:** hand-rolled `INCR`/`EXPIRE` vs `@upstash/ratelimit` — pick one in Phase 2 planning (default: hand-rolled, zero new dep); decide fail-open behavior when KV unset locally.
- **`resend` exact latest major:** pinned `^6.x` by PopulistsUnite/PRD convention; confirm the precise version at install time (`^6.12.4` verified now).

## Sources

### Primary (HIGH confidence)
- Context7 `/resend/resend-examples` & `/websites/resend` — `new Resend(apiKey)`, `emails.send({from,to,subject,html,text,replyTo,tags})`, `{data,error}` return shape, SMTP host/ports (587 STARTTLS vs 465 SMTPS), domain verification, SPF/DKIM/DMARC as #1 spam cause.
- Context7 `/websites/supabase` & `/open-circle/valibot` — custom SMTP fields, default 2/hr → ~30/hr with custom SMTP, `rate_limit_email_sent`, obfuscated duplicate-signup; Valibot `v.object`/`v.pipe`/`v.email`/`v.safeParse`.
- npm registry — `resend@6.12.4`, `valibot@1.4.1`, `@upstash/ratelimit@2.0.8`, `@nuxtjs/supabase@2.0.9`, `@supabase/supabase-js@2.108.2` (verified 2026-06-17).
- Repo inspection — `package.json`, `nuxt.config.ts` (`runtimeConfig.resendApiKey` slot), `server/utils/{upstashRedis,resolveAppBaseUrl}.ts`, `server/api/auth/register.post.ts`, `docs/PRD for Resend use.md` (§6.4/§7/§8/§9/§13), `docs/ENV-SETUP.md`, `docs/05_23 current auth email rate limit.md`, `.planning/PROJECT.md`.

### Secondary (MEDIUM confidence)
- Reference implementation `sldev2/PopulistsUnite` two-channel pattern (via PRD §4/§14 and `docs/compare with Resend use in PopulistsUnite.md`).
- Nuxt/H3 `getRequestIP(event, { xForwardedFor: true })` for client IP behind Vercel (standard platform behavior, not separately Context7-verified this run).

### Tertiary (LOW confidence)
- Operational/runtime facts requiring live verification (current Resend domain "Verified" status; which Supabase project each env targets) — confirm during Phase 1.

---
*Research completed: 2026-06-17*
*Ready for roadmap: yes*
