# 06_05 — Keepalive / UptimeRobot problems

**Date:** 2026-06-05  
**Context:** After merge `bce0c3b` (`develop` → `test`), which shipped `GET /api/keepalive` (KV `redis.ping` via `KV_REST_API_URL` / `KV_REST_API_TOKEN`).

**Monitor URL (correct):** `https://test.myfocusrewards.com/api/keepalive`

---

## What we built (recap)

| Item | Detail |
|------|--------|
| Route | `GET /api/keepalive` — public, no app auth |
| Purpose | Ping Upstash/Vercel KV so free-tier DB stays active (UptimeRobot) |
| Env vars | `KV_REST_API_URL`, `KV_REST_API_TOKEN` |
| Success | `200` + `{"ok":true,"redis":"PONG"}` |
| Missing KV | `503` + clear JSON message |
| `UNDER_CONSTRUCTION=1` | Route is on allowlist (same as `/api/site-status`, Stripe webhook) |

**Not** `/keepalive` — that path does not exist in the app.

---

## What UptimeRobot actually hit

Failure response looked like:

- **HTTP 401**
- **`Content-Type: text/html`** (~15 KB)
- **`Set-Cookie: _vercel_sso_nonce=...`**

That is **Vercel Deployment Protection** (preview SSO / login wall), **not** our keepalive handler and **not** a missing Redis config.

The request is blocked **at Vercel’s edge** before Nuxt/Nitro runs. No amount of app-side auth changes fixes that.

Verified externally: both `/keepalive` and `/api/keepalive` returned the same Vercel “Authentication Required” HTML on `test.myfocusrewards.com`.

---

## Diagnosis checklist

| Check | Good | What you saw / likely cause |
|-------|------|-----------------------------|
| URL path | `/api/keepalive` | Screenshot already had correct URL ✓ |
| Response type | JSON | HTML → Vercel protection |
| Cookie | none (or app cookies only) | `_vercel_sso_nonce` → Vercel SSO |
| Status after protection fixed | `200` + `PONG` | Still `503` if KV vars missing on Preview **`test`** |

---

## Fix options

### Option A — Disable Deployment Protection on **Preview**

**Effect:** `test.myfocusrewards.com` is publicly reachable without Vercel login. UptimeRobot works with plain URL — no bypass secret or custom headers.

**Implications:**

- **Preview becomes public** — anyone with the URL can load the test site (landing, login, register, public APIs).
- **App auth unchanged** — protected pages still need Supabase login.
- **Public API routes** — e.g. `/api/keepalive`, `/api/stripe/plans`, `/api/site-status` callable without Vercel SSO; checkout still requires user session.
- **Test stack only** — should use **time-reward-test** Supabase and **test** Stripe keys (not prod).
- **Production unchanged** — this setting is Preview-specific unless you also change prod.
- **Secrets stay server-side** — env vars not exposed in responses.

**Reasonable when:** `test` is treated as **public staging** for QA + monitors, not a secret preview.

**Less ideal when:** preview must stay team-only → use Option B instead.

### Option B — Keep protection; **Protection Bypass for Automation**

Generate bypass secret in Vercel → **Deployment Protection**.

- **Header** (UptimeRobot Pro): `x-vercel-protection-bypass: YOUR_SECRET`
- **Query param** (free tier; secret visible in URL):  
  `https://test.myfocusrewards.com/api/keepalive?x-vercel-protection-bypass=YOUR_SECRET`

Keeps preview locked down; more setup; secret rotation matters.

### Option C — **Trusted Sources**

Allow specific caller IPs/OIDC — hard with UptimeRobot free tier (egress IPs not stable).

---

## After Vercel lets traffic through

1. Confirm in **incognito** (no Vercel login):  
   `https://test.myfocusrewards.com/api/keepalive` → raw JSON, not HTML login page.
2. Ensure **`KV_REST_API_URL`** and **`KV_REST_API_TOKEN`** on Vercel **Preview → branch `test`** (match local `.env` / spreadsheet).
3. UptimeRobot: expect **HTTP 200**, optional keyword **`PONG`**.

| Response | Meaning |
|----------|---------|
| `200` + `"redis":"PONG"` | Working |
| `503` + Redis not configured | KV env vars missing on that deployment |
| `503` + ping failed | Wrong token/URL or Upstash issue |
| `401` + HTML | Still blocked by Deployment Protection |

---

## Recommended path (for this project)

Given **dev + test** focus and a dedicated `test.` host:

1. **Option A** on Preview (or branch-scoped if plan allows) — simplest for UptimeRobot + QA links.
2. Verify KV vars on **`test`** preview.
3. Re-test monitor; incident should clear on next successful check.

Prod launch can use a separate policy (protection on, different monitor strategy, or keepalive only where KV is wired).

---

## Related commits on `test` (from `bce0c3b` merge)

- `65e70bc` — feat(api): `/api/keepalive` KV ping
- `f2ad819` — static Stripe fallback prices
- `1005d95` — extraction docs (dev+test scope, Stripe verification)

---

## Open items

- [ ] Resolve Vercel Deployment Protection on Preview (Option A or B)
- [ ] Confirm KV vars on Preview **`test`**
- [ ] UptimeRobot green on `/api/keepalive`
- [ ] Optional: document chosen protection policy in integration / env notes (spreadsheet + `ENV-SETUP.md` when reconciled)
