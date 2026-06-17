# Architecture Research

**Domain:** Resend email integration into an existing Nuxt 3 (Nitro) + Supabase app (TimeReward, PRD Phases 1–3)
**Researched:** 2026-06-17
**Confidence:** HIGH

> Scope guard: This document describes the **two-channel, no-queue** architecture for Milestone A (PRD Phases 1–3). It deliberately excludes any queue table, Nitro dispatcher plugin, or CLI dispatcher — those are PRD Phase 4 and **out of scope** here. Where the reference repo (`sldev2/PopulistsUnite`) has queue/dispatcher artifacts, they are mapped only for traceability and explicitly marked deferred.

## Standard Architecture

TimeReward already runs the host architecture this integration plugs into: Nuxt 4-compat app code under `app/`, Nitro server routes under `server/api/`, server middleware under `server/middleware/NN.*.ts`, shared server helpers under `server/utils/`, `@nuxtjs/supabase` for auth, and `runtimeConfig` in `nuxt.config.ts`. The Resend work adds **two delivery channels** on top of this without changing the host shape.

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (app/, Vue/Nuxt)                        │
│  ┌────────────────┐   ┌────────────────┐   ┌───────────────────────┐  │
│  │ register.vue   │   │ login.vue      │   │ confirm.vue (callback)│  │
│  │  + resend btn  │   │  + resend btn  │   │  (existing)           │  │
│  └───────┬────────┘   └───────┬────────┘   └───────────┬───────────┘  │
│          │ useAuth()          │ $fetch                  │             │
├──────────┼────────────────────┼─────────────────────────┼─────────────┤
│          ▼                    ▼                         ▼             │
│                     NITRO SERVER (server/)                            │
│  ┌──────────────────────┐  ┌───────────────────────────────────────┐ │
│  │ /api/auth/register   │  │ /api/auth/resend-verification (P2 new) │ │
│  │  .post.ts (existing) │  │  .post.ts                             │ │
│  └─────────┬────────────┘  └───────┬───────────────────────────────┘ │
│            │                       │  ① rate-limit util (5/hr/IP)     │
│            │                       │  ② Valibot validate {email}      │
│            │                       ▼                                  │
│            │            ┌─────────────────────────┐                   │
│            │            │ serverSupabaseClient    │                   │
│            │            │  .auth.resend({signup}) │                   │
│            │            └───────────┬─────────────┘                   │
│            │                        │                                 │
│  ┌─────────▼────────────────────────▼──────────────────────────────┐ │
│  │     server/services/EmailDeliveryService.ts (P3 new)            │ │
│  │     thin wrapper · isConfigured · send() · no-op if no key      │ │
│  │     (Channel B — NOT used by auth/resend flows; foundation only)│ │
│  └─────────────────────────────┬───────────────────────────────────┘ │
│  runtimeConfig: resendApiKey, email.{fromAddress,fromName,...}        │
└──────────────┬──────────────────────────────┬────────────────────────┘
   Channel A    │ (auth templates)              │ Channel B (app-owned, P3)
   SMTP         ▼                               ▼ HTTPS
        ┌───────────────────────┐      ┌────────────────────────┐
        │ Supabase Auth project │      │  Resend HTTP API       │
        │  Custom SMTP setting  │      │  api.resend.com/emails │
        │  → smtp.resend.com:587│─────▶│  (resend npm SDK)      │
        └───────────────────────┘      └────────────────────────┘
              ▲ human dashboard config           ▲ app code (resend npm)
```

**The two channels never share a code path.** Channel A is Supabase emitting auth templates through SMTP it was configured (by a human) to point at Resend. Channel B is TimeReward server code calling the Resend HTTP API directly. Phase 2's `resend-verification` route belongs to Channel A (it asks Supabase to re-send), **not** Channel B.

### Component Responsibilities

| Component | Responsibility | Typical Implementation | Owner |
|-----------|----------------|------------------------|-------|
| Supabase Auth project (Custom SMTP) | Render + deliver signup/confirm/magic-link templates via Resend SMTP relay | Dashboard: Authentication → Email → SMTP (`smtp.resend.com:587`, user `resend`, pass = `RESEND_API_KEY`) | **Human (dashboard)** |
| Resend domain/sender | Verified sending identity (`support@myfocusrewards.com`, `send.myfocusrewards.com` DKIM) | Resend dashboard + GoDaddy DNS (already present) | **Human (dashboard/DNS)** |
| `.env.example` / `docs/Resend Use by Environment.md` | Document `RESEND_SMTP_*`, redirect URLs, raised `rate_limit_email_sent` | Markdown + commented env keys | **Code/docs (AI)** |
| `server/api/auth/resend-verification.post.ts` (new, P2) | Validate `{email}`, enforce rate limit, call `supabase.auth.resend`, return generic success | Nitro `defineEventHandler` mirroring `register.post.ts` | **Code (AI)** |
| Rate-limit helper, key `auth-resend-verification` (new, P2) | 5 req/hr/IP, return 429 with friendly message | `server/utils/rateLimit.ts` (Upstash-backed, in-memory fallback) called from the route | **Code (AI)** |
| `app/pages/register.vue` + `login.vue` (edit, P2) | "Resend verification email" action with client cooldown timer | Vue + `useAuth()`/`$fetch` | **Code (AI)** |
| `server/services/EmailDeliveryService.ts` (new, P3) | Channel B foundation: `isConfigured`, `send({to,subject,html,text,tags?,replyTo?})`, graceful no-op when key absent | Class wrapping `resend` npm SDK; reads `runtimeConfig` | **Code (AI)** |
| `nuxt.config.ts` `runtimeConfig` (edit, P1/P3) | Surface `resendApiKey` + `email.*` block to server only | Existing `runtimeConfig` extended per PRD §6.4 | **Code (AI)** |

## Recommended Project Structure

```
NUXT_TimeReward/
├── nuxt.config.ts                    # EDIT P1/P3: extend runtimeConfig (resendApiKey + email.* block)
├── .env.example                      # EDIT P1: add RESEND_SMTP_* + EMAIL_FROM_* (commented contract)
├── package.json                      # EDIT P3: add "resend": "^6.x" dependency
├── app/
│   ├── pages/
│   │   ├── register.vue              # EDIT P2: post-signup "resend verification" action + cooldown
│   │   ├── login.vue                 # EDIT P2: link/action to resend verification
│   │   └── confirm.vue               # EXISTING: Supabase redirect callback (/confirm) — unchanged
│   └── composables/
│       └── useAuth.ts                # EDIT P2 (optional): add resendVerification() helper alongside signUp()
├── server/
│   ├── api/
│   │   └── auth/
│   │       ├── register.post.ts      # EXISTING: signUp / admin.createUser branch (reference pattern)
│   │       └── resend-verification.post.ts   # NEW P2: Channel A re-send endpoint
│   ├── services/
│   │   └── EmailDeliveryService.ts   # NEW P3: Channel B thin Resend-API wrapper (foundation, no callers yet)
│   ├── middleware/
│   │   ├── 00.auth-guard.ts          # EXISTING
│   │   └── 01.under-construction.ts  # EXISTING
│   └── utils/
│       ├── upstashRedis.ts           # EXISTING: reuse for rate-limit backing store
│       ├── resolveAppBaseUrl.ts      # EXISTING: reuse to build emailRedirectTo (`${base}/confirm`)
│       └── rateLimit.ts              # NEW P2: named rate-limit helper (key `auth-resend-verification`)
├── docs/
│   ├── Resend Use by Environment.md  # EDIT P1: SMTP setup runbook (traceability §14)
│   └── ENV-SETUP.md                  # EDIT P1: flip Resend rows from "reserved" to "wired"
└── supabase/                         # NO queue migration in Milestone A (Phase 4 only)
```

### Structure Rationale

- **`server/api/auth/resend-verification.post.ts`:** Sits beside the existing `register.post.ts` so it inherits the same conventions (`serverSupabaseClient`, `resolveAppBaseUrl`, `createError`). It is a sibling, not a refactor of register.
- **`server/utils/rateLimit.ts` (not a global middleware):** TimeReward's existing rate-relevant infra is a `server/utils/upstashRedis.ts` helper, and the only need is one endpoint. A **named util called from the route** is simpler and more scoped than a global `02.rate-limit.ts` middleware that would have to path-match a single route. The PRD's "middleware entry `auth-resend-verification`" is satisfied by a **named key** in this helper. (A global middleware remains a valid alternative if more endpoints later need limiting — see Patterns.)
- **`server/services/EmailDeliveryService.ts`:** Service layer is new for this repo. Isolating Channel B in a service (vs inline in a route) keeps the Resend SDK import and `isConfigured` no-op logic in one testable place and matches the PopulistsUnite reference, easing a future Phase 4 dispatcher that would call the same `send()`.
- **`runtimeConfig` server-only:** `resendApiKey` and `email.*` stay outside `public` so the key is never shipped to the browser (PRD §8 secrets rule).
- **No `supabase/migrations` change:** Milestone A has no queue table; adding one now would be dead infrastructure (PRD D1, explicit out-of-scope).

## Architectural Patterns

### Pattern 1: Two-Channel Separation (Auth SMTP vs App-owned API)

**What:** Auth emails (signup confirm, magic link) are delivered by **Supabase → Resend SMTP** (Channel A); any app-authored transactional email goes through **Nitro → Resend HTTP API** via `EmailDeliveryService` (Channel B). The resend-verification endpoint is Channel A because it delegates to `supabase.auth.resend`.
**When to use:** Whenever an existing Supabase Auth app wants branded/high-volume auth mail without rebuilding auth templates in app code.
**Trade-offs:** (+) Auth templates stay managed by Supabase; smallest change to fix sender + rate cap. (+) Clear ownership boundary. (−) Two places to configure (dashboard SMTP **and** runtime config) — easy to assume one fixes the other. They do not.

**Example:**
```typescript
// Channel A — resend-verification.post.ts asks Supabase to re-send (SMTP relay does delivery)
const supabase = await serverSupabaseClient(event)
await supabase.auth.resend({
  type: 'signup',
  email,
  options: { emailRedirectTo: `${resolveAppBaseUrl(event, config.public.appUrl, body.redirectOrigin)}/confirm` },
})

// Channel B — EmailDeliveryService talks to the Resend HTTP API directly (P3 foundation)
const { data, error } = await resend.emails.send({
  from: `${cfg.email.fromName} <${cfg.email.fromAddress}>`,
  to, subject, html, text,
})
```

### Pattern 2: Graceful No-Op Service (configured-or-inert)

**What:** `EmailDeliveryService` reads `resendApiKey` from `runtimeConfig`; if absent it exposes `isConfigured === false` and `send()` logs a warning and returns a non-throwing result instead of constructing the SDK client.
**When to use:** Backward-compat requirement (PROJECT.md): app must not crash when keys are missing; `NUXT_SKIP_EMAIL_CONFIRMATION=true` local flow must keep working with no Resend key set.
**Trade-offs:** (+) Safe to deploy Phase 3 before keys are provisioned; mirrors the existing Stripe "not configured" behavior in this repo. (−) Silent no-op can mask a missing key in environments where mail is expected — mitigate with a clear `console.warn` and an `isConfigured` health signal.

**Example:**
```typescript
export class EmailDeliveryService {
  private resend: Resend | null
  constructor(private cfg: { apiKey: string; fromAddress: string; fromName: string; siteUrl: string }) {
    this.resend = cfg.apiKey ? new Resend(cfg.apiKey) : null
  }
  get isConfigured() { return this.resend !== null }
  async send(msg: { to: string|string[]; subject: string; html: string; text?: string; tags?: {name:string;value:string}[]; replyTo?: string }) {
    if (!this.resend) { console.warn('[email] RESEND_API_KEY missing — send skipped'); return { skipped: true } }
    return this.resend.emails.send({ from: `${this.cfg.fromName} <${this.cfg.fromAddress}>`, ...msg })
  }
}
```

### Pattern 3: Named Rate-Limit Key + Generic Response (anti-enumeration)

**What:** The resend endpoint enforces a named limit (`auth-resend-verification`, 5/hr/IP → 429) and always returns the **same generic success** regardless of whether the email exists, so attackers cannot enumerate accounts.
**When to use:** Any unauthenticated email-triggering endpoint (PRD §8).
**Trade-offs:** (+) Prevents enumeration and mail-flooding. (−) Generic success can confuse legitimate users who mistype an address — acceptable; copy should say "if an account exists, we've sent a link."

**Example:**
```typescript
const ok = await rateLimit(event, { key: 'auth-resend-verification', limit: 5, windowSec: 3600 })
if (!ok) throw createError({ statusCode: 429, message: 'Too many requests. Please wait before trying again.' })
const parsed = v.safeParse(ResendSchema, await readBody(event))   // Valibot
if (!parsed.success) throw createError({ statusCode: 400, message: 'A valid email is required' })
await supabase.auth.resend({ type: 'signup', email: parsed.output.email, options: { emailRedirectTo } })
return { success: true, message: 'If an account exists for that email, a verification link has been sent.' }
```

## Data Flow

### Flow A — Auth SMTP confirmation (Channel A, Phase 1)

```
register.vue → useAuth.signUp() → $fetch POST /api/auth/register
   └─ skipEmailConfirmation === 'true'  → admin.createUser(email_confirm:true)  → NO email (dev fast path)
   └─ skipEmailConfirmation !== 'true'  → supabase.auth.signUp({ emailRedirectTo: `${base}/confirm` })
            ↓
      Supabase Auth project renders the "Confirm signup" template
            ↓  (uses Custom SMTP setting — human-configured)
      smtp.resend.com:587  (user "resend", pass = RESEND_API_KEY)
            ↓
      Resend delivers from  TimeReward <support@myfocusrewards.com>
            ↓
      User clicks link → /confirm (confirm.vue) → session established → /home
```
Key point: **no app code touches Resend in this flow.** The only thing that changed from today is the Supabase project's SMTP setting (dashboard) and the raised `rate_limit_email_sent`. App behavior is identical; deliverability and sender change.

### Flow B — Resend verification request (Channel A re-send, Phase 2)

```
User (unconfirmed) clicks "Resend verification email" on register.vue / login.vue
   ↓  $fetch POST /api/auth/resend-verification  { email, redirectOrigin }
server/api/auth/resend-verification.post.ts
   ① rateLimit(event, 'auth-resend-verification', 5/hr/IP)  → 429 if exceeded
   ② Valibot validate { email }                              → 400 if invalid
   ③ emailRedirectTo = `${resolveAppBaseUrl(...)}/confirm`
   ④ supabase.auth.resend({ type:'signup', email, options:{ emailRedirectTo } })
   ⑤ return generic { success:true } (no enumeration; ignore Supabase "user not found")
        ↓ (Supabase re-emits the confirm template)
   → same SMTP → Resend → inbox path as Flow A
Client: start a cooldown timer (e.g. 60s button disable) regardless of result.
```

### Flow C — App-owned send (Channel B, Phase 3 foundation only)

```
[future server route or health check]
   ↓
const svc = new EmailDeliveryService({ apiKey: cfg.resendApiKey, fromAddress: cfg.email.fromAddress, fromName: cfg.email.fromName, siteUrl: cfg.public.appUrl })
   ↓
svc.isConfigured ? svc.send({ to, subject, html, text }) : warn + no-op
   ↓  resend.emails.send(...)  →  api.resend.com  →  inbox
```
In Milestone A this path has **no production caller** — it is exercised only by a test send / health check (PRD FR-3 acceptance). No queue, no dispatcher, no scheduled invocation.

### Key Data Flows (summary)

1. **Auth confirm (A):** browser → register → Supabase signUp → Supabase SMTP → Resend → inbox → `/confirm`.
2. **Resend verify (B):** browser → resend-verification route (rate-limit + validate) → `supabase.auth.resend` → Supabase SMTP → Resend → inbox.
3. **App-owned (C):** server caller → `EmailDeliveryService.send` → Resend HTTP API → inbox (foundation; no caller yet).

## Build Order

Dependencies run **1 → 2 → 3**, but each phase has a human/dashboard track and a code track that can overlap.

| Phase | Deliverable | Track | Depends on | Can parallelize? |
|-------|-------------|-------|------------|------------------|
| **1** | Resend domain/sender Verified; Supabase Custom SMTP set (test project); redirect URLs; raised `rate_limit_email_sent` | **Human (dashboard/DNS)** | Resend account + DNS (already present) | The human SMTP config and the **docs/.env.example edits run in parallel** |
| **1** | `.env.example` `RESEND_SMTP_*`/`EMAIL_FROM_*`; `docs/Resend Use by Environment.md` + `ENV-SETUP.md` updates | **Code/docs** | none | Yes — independent of human track |
| **2** | `resend-verification.post.ts` + `rateLimit.ts` (Valibot) | **Code** | Channel A working (Phase 1) to actually deliver, **but** the route can be **built/unit-tested before** SMTP is live | Route code and UI can be built in parallel; end-to-end test needs Phase 1 done |
| **2** | register/login UI resend action + cooldown | **Code** | the route's contract | Yes — against a mocked endpoint |
| **3** | `resend` npm dep + `runtimeConfig email.*` + `EmailDeliveryService.ts` | **Code** | independent of Phases 1–2 | **Phase 3 can be built in parallel with Phase 2** (different files, no shared code); only `runtimeConfig` edit is touched by both — coordinate that one file |

**Critical-path notes:**
- Phase 1's **human SMTP config is the true gate** for *delivering* real auth mail; all code can be written and merged behind it (PRD rollback: revert SMTP to default, no code change needed).
- Phase 2 and Phase 3 are **independent code tracks** — the resend endpoint (Channel A) does not call `EmailDeliveryService` (Channel B). They can be developed concurrently after Phase 1's `.env`/docs land. The only shared edit is `nuxt.config.ts` `runtimeConfig`, so sequence that single change or merge carefully.
- **Human-vs-code split:** Phase 1 ≈ mostly human (dashboard/DNS) + thin docs; Phases 2–3 ≈ entirely code. No human dashboard action is required for Phases 2 or 3 beyond Phase 1 being done.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Dev + test (Milestone A target) | Single Supabase project SMTP relay + on-demand API sends. No queue. Rate-limit can be in-memory if Upstash unset. |
| Low prod volume | Same; raise Supabase `rate_limit_email_sent`; rely on Resend's per-domain limits. Move rate-limit store to Upstash (already available) for multi-instance correctness. |
| Higher / bursty transactional volume | Introduce **Phase 4** queue + dispatcher (out of scope here): `email_queue` table + `server/plugins/email-dispatcher.ts` calling the **same** `EmailDeliveryService.send()`. The Phase 3 service is intentionally shaped so this is additive, not a rewrite. |

### Scaling Priorities

1. **First bottleneck:** auth-email rate cap → fixed in Phase 1 by Custom SMTP + raised `rate_limit_email_sent` (the core reason for this milestone).
2. **Second bottleneck:** per-instance in-memory rate-limit counters on serverless → switch the `rateLimit` helper to the existing Upstash Redis backing for shared state.

## Anti-Patterns

### Anti-Pattern 1: Sending auth confirmation through `EmailDeliveryService`

**What people do:** Try to make Phase 3's Resend API service send the signup confirmation email to "unify" email.
**Why it's wrong:** Supabase owns the confirmation token/link; re-implementing it in app code means minting/verifying tokens yourself and diverging from `/confirm`. It also duplicates Channel A.
**Do this instead:** Keep auth templates on Channel A (Supabase SMTP). Use `supabase.auth.resend` for re-sends. Reserve Channel B for app-authored mail with no Supabase-managed token.

### Anti-Pattern 2: Adding a queue table / dispatcher "while we're here"

**What people do:** Create `email_queue` + a Nitro polling plugin in Phase 3 because PopulistsUnite has them.
**Why it's wrong:** No enqueue triggers exist yet (PRD D1); it's dead infrastructure that can silently run/fail. Explicitly out of scope for Milestone A.
**Do this instead:** Ship `EmailDeliveryService` callable from routes only. Defer queue/dispatcher to Phase 4 when a product trigger is defined. Keep `EMAIL_AUTOMATION_ENABLED` unset/false.

### Anti-Pattern 3: Leaking `RESEND_API_KEY` into public runtime config

**What people do:** Put the key (or `email.*`) under `runtimeConfig.public` for convenience.
**Why it's wrong:** Anything under `public` is shipped to the browser; the key is also the Supabase SMTP password.
**Do this instead:** Keep `resendApiKey` and `email.*` at the server-only top level of `runtimeConfig` (PRD §6.4 shape). Only `public.appUrl` is needed client-side, and it already exists.

### Anti-Pattern 4: Enumerating accounts in the resend endpoint

**What people do:** Return "user not found" / different status when the email isn't registered.
**Why it's wrong:** Reveals which emails have accounts.
**Do this instead:** Always return the same generic success; rate-limit by IP; log user/job IDs not bodies (PRD §8).

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth (Channel A) | Dashboard Custom SMTP → `smtp.resend.com:587` STARTTLS, user `resend`, pass `RESEND_API_KEY` | Human-configured per project (test now, prod deferred). App calls only `signUp` / `auth.resend`. Redirect URLs must include `/confirm` for each env. |
| Resend HTTP API (Channel B) | `resend` npm (`^6.x`) → `new Resend(apiKey).emails.send({ from, to, subject, html, text, replyTo?, tags? })` | SDK confirmed via Context7: `from` supports `"Name <addr>"`; `replyTo`/`tags` optional; returns `{ id }` or `{ error }`. Works from localhost — no Vercel needed. |
| Resend domain/DNS | DKIM `resend._domainkey` (GoDaddy), `send.myfocusrewards.com` | Must show **Verified** before Phase 1 go-live. DMARC currently `p=none`. |
| Upstash Redis (optional) | `server/utils/upstashRedis.ts` (`@upstash/redis`) | Reuse as backing store for the `auth-resend-verification` rate limit on serverless; fall back to in-memory when unset. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `register.vue`/`login.vue` ↔ resend route | `$fetch` POST JSON `{ email, redirectOrigin }` | Client adds a cooldown timer; server is source of truth (429). |
| resend route ↔ Supabase | `serverSupabaseClient(event).auth.resend(...)` | Channel A only; no `EmailDeliveryService` involvement. |
| route ↔ `rateLimit` util | direct function call, key `auth-resend-verification` | Named key satisfies PRD "middleware entry"; util chosen over global middleware for single-endpoint scope. |
| route ↔ `resolveAppBaseUrl` | direct call | Builds allow-listed `${base}/confirm` redirect (reuses existing host allowlist). |
| server caller ↔ `EmailDeliveryService` | constructor + `send()` | Channel B; `isConfigured` gates no-op. No queue between caller and service in Milestone A. |
| both channels ↔ `runtimeConfig` | server-only keys | `resendApiKey`, `email.{fromAddress,fromName,automationEnabled,dispatchIntervalMs}`. |

## Sources

- `docs/PRD for Resend use.md` — §4 two-channel reference, §6.4 runtimeConfig shape, §7 FRs, §14 traceability (HIGH — project canonical spec)
- `docs/compare with Resend use in PopulistsUnite.md` — reference repo channel mapping + artifact paths (HIGH)
- `docs/ENV-SETUP.md` — existing env/redirect conventions, "not configured" precedent (HIGH)
- `.planning/PROJECT.md` — scope, human-vs-code split, constraints (HIGH)
- Existing code: `server/api/auth/register.post.ts`, `server/middleware/00.auth-guard.ts`/`01.under-construction.ts`, `server/utils/{upstashRedis,resolveAppBaseUrl}.ts`, `nuxt.config.ts`, `app/composables/useAuth.ts` (HIGH — direct read)
- Resend Node SDK via Context7 `/websites/resend` — `emails.send` params (`from`,`to`,`subject`,`html`,`text`,`replyTo`,`tags`), client init (HIGH); current npm major pinned `^6.x` per PRD/reference (MEDIUM — exact latest major not re-pinned)
- `supabase.auth.resend({ type:'signup', email, options:{ emailRedirectTo } })` — Supabase Auth JS API (HIGH — established API)

---
*Architecture research for: Resend integration into Nuxt 3 + Supabase (TimeReward Phases 1–3)*
*Researched: 2026-06-17*
