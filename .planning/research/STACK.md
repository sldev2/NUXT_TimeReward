# Stack Research

**Domain:** Transactional/auth email delivery for an existing Nuxt 3 + Supabase + Vercel app (Resend integration, PRD Phases 1–3)
**Researched:** 2026-06-17
**Confidence:** HIGH

> Scope guard: This covers ONLY the stack to add Resend for PRD **Phases 1–3** (Auth custom SMTP, `resend-verification` endpoint + UI + IP rate limit, thin server-side `EmailDeliveryService`). The existing app stack (Nuxt 3, `@nuxtjs/supabase`, Stripe, Vercel) is already chosen and working and is **not** re-researched here. **No** queue table, **no** Nitro dispatcher, **no** forgot-password/recovery service — those are Phases 4–5 and explicitly out of scope.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `resend` (npm, Node SDK) | `^6.12.4` (latest `6.x`, verified npm 2026-06-17) | Channel B — server-side HTTP API client for `EmailDeliveryService` (Phase 3) | Official Resend SDK; mirrors PopulistsUnite's `^6.x` major (PROJECT.md constraint). Stable v6 API surface is exactly `new Resend(apiKey)` → `resend.emails.send(...)` returning `{ data, error }` (no throw on API errors). Zero extra runtime deps beyond itself. |
| Supabase Auth **Custom SMTP → Resend** | `smtp.resend.com:587` (STARTTLS) | Channel A — Supabase sends signup-confirm / magic-link / resend mail through Resend instead of Supabase's shared SMTP (Phase 1) | Pure **dashboard configuration**, no code/package. Removes the tiny inbuilt hourly cap (the core value). Uses the *same* `RESEND_API_KEY` as Channel B (username `resend`, password = the API key). |
| `valibot` | `^1.4.1` (verified npm 2026-06-17; v1.0 is stable GA) | Input validation on the `resend-verification` endpoint (and any new email-triggering route) — Phase 2 | Tiny (≈1.3 kB tree-shaken), dependency-free, type-safe; satisfies the PRD §8 "Valibot validation on all email-triggering endpoints" constraint. v1 API is stable (`v.object`, `v.pipe`, `v.email`, `v.safeParse`). No existing validator in the repo, so this is a net-new (but minimal) dependency. |
| `@upstash/redis` | `^1.38.0` (**already installed**) | Backing store for IP rate limiting on `/api/auth/resend-verification` (Phase 2) | **Already a dependency** and already wired via `KV_REST_API_URL` / `KV_REST_API_TOKEN` (powers `/api/keepalive`) with a ready helper `server/utils/upstashRedis.ts`. Serverless-safe: shared cross-instance state on Vercel, where in-memory counters do **not** survive between lambda invocations. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@upstash/ratelimit` | `^2.0.8` (verified npm 2026-06-17) | Drop-in sliding/fixed-window limiter on top of `@upstash/redis` | **Optional upgrade.** Use it *instead of* a hand-rolled `INCR`/`EXPIRE` only if you want sliding-window precision and analytics out of the box. For the simple "5 / hour / IP" rule, the zero-new-dependency hand-rolled helper (below) is sufficient and lighter. Pick one; don't add both patterns. |
| `@supabase/supabase-js` (transitive via `@nuxtjs/supabase`) | `2.108.x` | `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })` for the resend endpoint | Already present transitively (do **not** add it directly). The `auth.resend` method is the Phase 2 server call; `serverSupabaseClient(event)` from `#supabase/server` provides the client, matching the existing `register.post.ts` pattern. |

> No new SDK is needed for Channel A (Phase 1) — it is 100% Supabase-dashboard SMTP config. No HTML/templating library is needed for Phase 3; the PRD permits "plain accessible HTML" string templates inside the service.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `dotenv` (`^16.4.5`, already present) | Local `.env` loading so `npm run dev` can call Resend without Vercel | PRD §5: local dev must reach Resend when keys are set. No change needed. |
| Resend dashboard | Domain/sender verification + send-event log inspection | Human task (PROJECT.md): `send.myfocusrewards.com` DKIM must show **Verified** before Phase 1 go-live; use the dashboard logs as the Phase 1/3 acceptance check. |
| Supabase dashboard | Auth → Email → SMTP, URL config (redirects), `rate_limit_email_sent` | Human tasks for FR-1.1 / FR-1.2 / FR-1.4. Not code. |

## Installation

```bash
# Core (Phase 3 — Resend HTTP API client)
npm install resend@^6.12.4

# Validation (Phase 2 — resend-verification endpoint)
npm install valibot@^1.4.1

# Rate limiting (Phase 2): NO install needed — reuse the already-present @upstash/redis.
# ONLY if you choose the sliding-window upgrade instead of the hand-rolled helper:
# npm install @upstash/ratelimit@^2.0.8
```

> `@upstash/redis`, `@nuxtjs/supabase`, and `dotenv` are already in `package.json` — do not reinstall. Net-new packages for Milestone A are just **`resend`** and **`valibot`** (+ optionally `@upstash/ratelimit`).

---

## Key wiring details (verified)

### 1. `resend` API surface (Phase 3) — verified via Context7 `/resend/resend-examples`

```ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const { data, error } = await resend.emails.send({
  from: 'TimeReward <support@myfocusrewards.com>',
  to: ['user@example.com'],
  subject: 'Hello',
  html: '<p>Hello World</p>',
  text: 'Hello World',     // recommended for deliverability
  replyTo: 'support@myfocusrewards.com', // optional (camelCase in v6 SDK)
  tags: [{ name: 'category', value: 'auth' }], // optional
})
// v6 does NOT throw on API errors — branch on `error`, then `data?.id`.
```

The `EmailDeliveryService` (FR-3.2) should expose `isConfigured` (true only when `resendApiKey` is non-empty) and **no-op + warn** when unconfigured (FR-3.3 backward-compat / "no crash" constraint).

### 2. Nuxt `runtimeConfig` (server-only secret) — PRD §6.4

Extend the existing `runtimeConfig` block in `nuxt.config.ts` (the `resendApiKey: ''` slot already exists but is empty/unread):

```ts
runtimeConfig: {
  // server-only (NEVER under `public`)
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  email: {
    fromAddress: process.env.EMAIL_FROM_ADDRESS ?? 'support@myfocusrewards.com',
    fromName: process.env.EMAIL_FROM_NAME ?? 'TimeReward',
    automationEnabled: ['1', 'true', 'yes'].includes(
      String(process.env.EMAIL_AUTOMATION_ENABLED ?? '').trim()
    ),
    dispatchIntervalMs: Number(process.env.EMAIL_DISPATCH_INTERVAL_MS || '60000'),
  },
  // ...existing keys (supabaseSecretKey, stripe*, kv*, public:{...})
}
```

- **Security:** keep `resendApiKey` and `email.*` at the top (server) level — *never* in `runtimeConfig.public` (PRD §8, PROJECT.md constraint). Read in server routes via `useRuntimeConfig(event)`, exactly as `register.post.ts` reads `config.skipEmailConfirmation`.
- **Nuxt env override note (version-specific):** assigning `process.env.RESEND_API_KEY` is read at build/start; Nuxt *also* auto-binds the runtime env var `NUXT_RESEND_API_KEY` to `runtimeConfig.resendApiKey` at runtime. The explicit `process.env` form (PopulistsUnite pattern) works on Vercel because the var is present at build and runtime — keep it for parity. `automationEnabled` stays `false` through Milestone A (do not wire a dispatcher).

### 3. Supabase Auth Custom SMTP (Phase 1, dashboard) — per FR-1.1

| Field | Value |
|-------|-------|
| Host | `smtp.resend.com` |
| Port | `587` (STARTTLS) — `465` (implicit TLS) is an alternative; PRD standardizes on 587 |
| Username | `resend` (literal string) |
| Password | the `RESEND_API_KEY` (scope: *Sending access* / Full Access) |
| Sender name / email | `EMAIL_FROM_NAME <EMAIL_FROM_ADDRESS>` → `TimeReward <support@myfocusrewards.com>` |

Then raise `rate_limit_email_sent` (FR-1.4) and set Site URL + `/confirm` redirect URLs per environment (FR-1.2). Sender domain must be **Verified** in Resend first.

### 4. Valibot validation (Phase 2) — verified via Context7 `/open-circle/valibot`

```ts
import * as v from 'valibot'

const ResendVerificationSchema = v.object({
  email: v.pipe(v.string(), v.nonEmpty(), v.email(), v.maxLength(254)),
})

const result = v.safeParse(ResendVerificationSchema, await readBody(event))
if (!result.success) {
  throw createError({ statusCode: 400, message: 'Invalid email' })
}
const { email } = result.output
// ...always return a GENERIC success (no email enumeration), then call supabase.auth.resend(...)
```

### 5. IP rate limiting for the auth endpoint (Phase 2)

**Recommended (zero new dependency):** reuse `getUpstashRedis()` with a fixed-window `INCR` + `EXPIRE`:

```ts
// key: `rl:auth-resend-verification:${ip}` — 5 / 3600s / IP → 429 on overflow
const count = await redis.incr(key)
if (count === 1) await redis.expire(key, 3600)
if (count > 5) throw createError({ statusCode: 429, message: 'Too many requests, try again later.' })
```

- **IP extraction (Vercel/Nitro):** use h3's `getRequestIP(event, { xForwardedFor: true })` (reads `x-forwarded-for`); fall back to the `x-real-ip` header. Behind Vercel the left-most `x-forwarded-for` entry is the client.
- **Graceful degradation:** if Upstash KV is unconfigured (typical local dev), **fail-open** (allow the request) — mirror the optional-KV behavior already used by `/api/keepalive`. Never let a missing limiter crash the endpoint.
- **Alternative:** `@upstash/ratelimit` `Ratelimit.slidingWindow(5, '1 h')` if you want sliding-window accuracy/analytics — same Redis backend, cleaner API, one extra dep.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `resend` SDK (HTTP API) for Channel B | Raw `fetch` to `api.resend.com` | Only if avoiding *all* new deps is mandatory. Not worth it — the SDK is tiny, typed, and matches PopulistsUnite. |
| `valibot` | `zod` | If the team already standardizes on Zod elsewhere. Repo has neither today; Valibot is smaller and is the PRD-named choice. |
| Hand-rolled `@upstash/redis` `INCR`/`EXPIRE` | `@upstash/ratelimit` | When you want sliding-window precision, multi-region replication, or built-in analytics. Adds a dependency for a single simple rule. |
| `@upstash/redis` (Redis-backed limit) | In-memory `Map`/LRU counter | Never on Vercel serverless — per-instance memory is ephemeral and not shared, so limits leak/reset unpredictably. Only acceptable for a single long-lived Node process (not this deployment). |
| Supabase `auth.resend({ type: 'signup' })` | Custom token + `resend.emails.send` | That's the Phase 5 recovery pattern — out of scope. For resend-verification, the native Supabase method is correct and reuses Channel A SMTP. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `email_queue` table / `server/plugins/email-dispatcher.ts` / `scripts/dispatch-email.mjs` | **Phase 4**, out of scope — no enqueue triggers defined yet (PROJECT.md D1). Premature infrastructure. | A thin `EmailDeliveryService.send()` callable directly from server routes (Phase 3 only). |
| `AccountRecoveryService` / custom reset tokens / Turnstile-gated forgot-password | **Phase 5**, out of scope — no `/forgot-password` flow exists. | Keep password reset Supabase-native; do nothing this milestone. |
| Putting `resendApiKey` (or any secret) in `runtimeConfig.public` | Leaks the API key to the client bundle — security violation (PRD §8). | Server-level `runtimeConfig`, read via `useRuntimeConfig(event)` in server routes only. |
| In-memory rate-limit counter | Doesn't work across Vercel lambda instances; resets per cold start. | `@upstash/redis`-backed counter (already available). |
| `nodemailer` / a second email provider | Channel A is handled by Supabase's built-in SMTP client; Channel B by the Resend SDK. Adding nodemailer duplicates capability. | `smtp.resend.com` in Supabase dashboard + `resend` SDK in code. |
| Enabling `EMAIL_AUTOMATION_ENABLED` | Would activate a dispatcher that doesn't exist yet → live-but-broken config. | Leave unset/`false` through Milestone A. |

## Stack Patterns by Variant

**Phase 1 only (auth SMTP, mostly human):**
- No npm installs. Configure Supabase dashboard SMTP + redirect URLs + `rate_limit_email_sent`; verify Resend domain.
- Because the value (escaping the hourly cap) is delivered purely by routing Supabase Auth mail through Resend SMTP.

**Phase 2 (resend-verification endpoint + UI):**
- Add `valibot`; reuse `@upstash/redis` for the `auth-resend-verification` 5/hr/IP limit; call `supabase.auth.resend(...)`.
- Because the endpoint needs validated input, anti-enumeration generic responses, and serverless-safe rate limiting.

**Phase 3 (Resend API foundation):**
- Add `resend`; build `server/services/EmailDeliveryService.ts` with `isConfigured` + graceful no-op.
- Because this establishes Channel B for future transactional mail without committing to a queue.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `resend@^6.12.4` | Node 18+ / Nitro server runtime | Server-side only; never import into client code (would expose key). Works in Vercel `iad1` Node runtime. |
| `valibot@^1.4.1` | TypeScript 5.x (repo has `^5.9.3`) | v1 is the stable GA API; pre-1.0 snippets (`v.parse` shapes) are largely compatible but pin `^1`. |
| `@upstash/ratelimit@^2.0.8` (optional) | `@upstash/redis@^1.38.0` (installed) | v2 ratelimit expects the v1 redis client — already satisfied. Skip if using the hand-rolled helper. |
| `@nuxtjs/supabase@^2.0.3` (installed; latest `2.0.9`) | `@supabase/supabase-js@2.108.x` | `auth.resend` available; `#supabase/server` helpers (`serverSupabaseClient`) already used in repo. |

## Sources

- npm registry (`npm view`) — `resend@6.12.4`, `valibot@1.4.1`, `@upstash/ratelimit@2.0.8`, `@nuxtjs/supabase@2.0.9`, `@supabase/supabase-js@2.108.2` — verified 2026-06-17 — **HIGH**
- Context7 `/resend/resend-examples` — `new Resend(apiKey)` + `resend.emails.send({ from, to, subject, html, text, headers })`, `{ data, error }` return shape — **HIGH**
- Context7 `/open-circle/valibot` — `v.object`, `v.pipe`, `v.string`, `v.nonEmpty`, `v.email`, `v.maxLength`, `v.safeParse`, `InferInput`/`InferOutput` — **HIGH**
- Repo inspection — `package.json` (deps already present), `nuxt.config.ts` (`runtimeConfig.resendApiKey` slot), `server/utils/upstashRedis.ts`, `server/api/auth/register.post.ts` (existing patterns) — **HIGH**
- `docs/PRD for Resend use.md` §6.4 / §7 / §8, `docs/ENV-SETUP.md`, `.planning/PROJECT.md` — scope & constraints — **HIGH**
- Resend SMTP settings (`smtp.resend.com:587`, user `resend`, password = API key) — from PRD FR-1.1 (matches Resend's published SMTP config) — **HIGH**

---
*Stack research for: Resend email integration on Nuxt 3 + Supabase (Phases 1–3)*
*Researched: 2026-06-17*
