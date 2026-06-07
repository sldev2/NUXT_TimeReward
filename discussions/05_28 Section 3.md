# 05_28 — How to check Stripe routes & “not configured” behavior

**Date:** 2026-05-28  
**Related:** `discussions/05_28 extraction and dev directions.md` — checklist item `(both)` §3: Stripe routes exist and “not configured” behavior is acceptable

**Environment scope:** Verify Stripe on **development** (local) and **test** (`test.myfocusrewards.com` / Vercel Preview branch `test`) only. **Production is not an extraction gate** — see [Out of scope](#out-of-scope--production-at-launch) below.

---

## What you’re verifying (two parts)

| Part | Question |
|------|----------|
| **Routes exist** | Four API routes are present and wired. |
| **Not configured** | When `NUXT_STRIPE_SECRET_KEY` is missing, the app doesn’t crash mysteriously — it degrades or returns a clear error. |

---

## 1. Routes exist (2 minutes, repo)

Confirm these files exist:

| Route | File |
|-------|------|
| `GET /api/stripe/plans` | `server/api/stripe/plans.get.ts` |
| `POST /api/stripe/checkout` | `server/api/stripe/checkout.post.ts` |
| `POST /api/stripe/webhook` | `server/api/stripe/webhook.post.ts` |
| `POST /api/stripe/update-subscription` | `server/api/stripe/update-subscription.post.ts` |

UI that calls them: `app/pages/subscription/expired.vue`, `success.vue` (after checkout).

That satisfies **“routes exist.”**

---

## 2. “Not configured” behavior (what the code does)

Nuxt maps env → `runtimeConfig.stripeSecretKey` from **`NUXT_STRIPE_SECRET_KEY`** (see `.env.example`).

| Route | If secret key missing | If secret key **present** (normal dev/test) |
|-------|------------------------|---------------------------------------------|
| **`GET /api/stripe/plans`** | **Graceful** — HTTP 200, static placeholder plans, `stripeConfigured: false` | HTTP 200, live or cached plans, `stripeConfigured: true` — **no login required** |
| **`POST /api/stripe/checkout`** | **Hard fail** — HTTP 500, `Stripe is not configured...` — **no login required** | **Auth required** — HTTP **401** without session cookie; checkout session only when logged in |
| **`POST /api/stripe/update-subscription`** | **Hard fail** — HTTP 500, `Stripe is not configured` | Auth required (same pattern as checkout) |
| **`POST /api/stripe/webhook`** | **Hard fail** — HTTP 500, `Stripe webhook is not configured` | N/A (Stripe signature, not user session) |

So “acceptable” for extraction means you’re OK with:

- **Plans page can load** without Stripe (placeholders).
- **Checkout / webhook / sync** fail loudly with a clear message (not a stack trace to the user on a normal page load).

Optional note from `discussions/05_19 stripe interface status.md`: cancel URL may point at `/subscription` without a matching page — separate from “not configured,” but worth knowing if you test checkout cancel.

---

## 3. Quick live checks

### A. **Test** (`test` branch / `test.myfocusrewards.com`) — Stripe *should* be configured

Your Vercel **`test`** preview should have `NUXT_STRIPE_*` set (track values in your spreadsheet).

1. Log in on test (or open subscription flow if you can reach `/subscription/expired`).
2. **Verify the API** with **Option B** below (recommended) — open `/api/stripe/plans` directly and confirm **200**, `stripeConfigured: true`, and live prices.
3. Optional: on `/subscription/expired`, three plan cards loading confirms the page wiring (but **not** by itself that Stripe is configured — placeholders also show three cards).
4. Optional: click **Subscribe Now** → should redirect to Stripe Checkout (not “Stripe is not configured”).

If Option B works on test, **configured path is good.**

#### How to see `GET /api/stripe/plans` in Network (you do **not** type “GET” anywhere)

DevTools **Network** logs **browser-initiated** HTTP requests only. You don’t enter `GET /api/stripe/plans` into the tab — something has to trigger that request from the browser.

**Recommended verification: Option B** — open `/api/stripe/plans` in the address bar. That always produces one visible Network row (if DevTools is open) and shows the raw JSON you need (`stripeConfigured`, live vs static prices).

**SSR note (why `/subscription/expired` often shows no `plans` row)**

`subscription/expired.vue` uses `await useFetch('/api/stripe/plans')`. On a **full page load** (address bar, refresh, external link), Nuxt runs that fetch **on the server during SSR**. The plans JSON is embedded in the HTML payload and hydrated in the browser — the API is called, but **not from the browser**, so Network may show only the **document** request for `/subscription/expired`, with **no** separate row named `plans`.

| Load type | Network shows `/api/stripe/plans`? |
|-----------|--------------------------------------|
| Address bar / refresh on `/subscription/expired` | Usually **no** (SSR) |
| In-app navigation (e.g. `/home` → link to `/subscription/expired`) | Often **yes** (client fetch) |
| Open `/api/stripe/plans` directly (Option B) | **Yes** |

**Why you might see nothing (when you expected a row)**

| Cause | Fix |
|-------|-----|
| Full page load of `/subscription/expired` (SSR) | Use **Option B**, or navigate from another in-app page with Network open (Option A). |
| You’re on `/`, `/login`, `/home`, etc. | That page never calls the plans API. |
| DevTools opened **after** the request | Reload with Network open, enable **Preserve log**, or use Option B. |
| Filter too narrow | Clear the filter, or type `plans` or `stripe`; try **Fetch/XHR** or **All**. |
| Wrong host | Use **`test.myfocusrewards.com`** or local **`localhost:4000`** for extraction checks |

**Option A — See `plans` in Network via in-app navigation (optional)**

Use this only if you want to confirm a **browser-initiated** fetch from the subscription page — not for verifying Stripe config (use Option B for that).

1. Open **`https://test.myfocusrewards.com`** (or local `http://localhost:4000`).
2. **Log in** (`/subscription/expired` requires auth).
3. Open DevTools → **Network** → **Fetch/XHR** (or All) → enable **Preserve log** (optional).
4. From an **in-app link or router navigation**, go to **`/subscription/expired`** — do **not** paste the URL in the address bar or refresh (those use SSR and usually hide the API row).
5. Look for a row named **`plans`** (URL ends with `/api/stripe/plans`).
6. Click it → **Headers**: status **200** → **Response**: JSON with `plans` (and usually `stripeConfigured: true` on test).

**Option B — Open the API URL directly (recommended)**

Paste in the browser address bar:

```text
https://test.myfocusrewards.com/api/stripe/plans
```

You should get **raw JSON** in the tab (no HTML). Check:

- `stripeConfigured: true` (on test with Stripe env vars set) or `false` (static placeholders)
- `plans`: array — compare prices to Stripe dashboard when configured; static fallback uses fixed amounts in `getStaticPlans()` when not

Shows as one **`plans`** Network row if DevTools was open when you loaded the URL.

**Option C — Local**

```text
http://localhost:4000/api/stripe/plans
```

With `NUXT_STRIPE_SECRET_KEY` in `.env` → expect `stripeConfigured: true`. Without it → `stripeConfigured: false` (still **200**).

**What “GET” means in the doc**

`GET /api/stripe/plans` is shorthand for: an HTTP **GET** request to that path. In Network you look for the **Name** `plans` or the **URL** containing `/api/stripe/plans`, not a field where you type the method.


### Out of scope — production (at launch)

Production / `main` Stripe env is **not required** to tick extraction §3. When you launch, reconcile prod Vercel vars and Stripe keys separately (spreadsheet + launch checklist). Until then, prod may show `UNDER_CONSTRUCTION`, static plans, or blocked checkout — that does not block dev + test extraction closure.

### B. **Local** — optional “not configured” drill

**Important:** `stripeConfigured` appears only on **`GET /api/stripe/plans`**, not on checkout responses. A checkout **401** means Stripe **is** configured and you failed auth — it does **not** prove the not-configured path.

**Test A — checkout blocked when Stripe key is missing (expect 500)**

Do steps **1 → 3 → 4 in order**. Do not run the step 4 curl until step 3 shows `"stripeConfigured": false`.

1. Temporarily remove or comment **`NUXT_STRIPE_SECRET_KEY`** in `.env` (and restart — step 2 matters).
2. **`npm run dev`** (must restart after editing `.env`; a running server keeps old env).
3. **Gate check (required)** — plans only (not checkout). Browser or curl:

   ```cmd
   curl -s -i http://localhost:4000/api/stripe/plans
   ```

   **Pass when:**
   - First line: **`HTTP/1.1 200`**
   - JSON includes **`"stripeConfigured": false`**
   - `"plans"`: three static placeholders (e.g. prices **10 / 34 / 90**)

   `curl -s` without `-i` hides the status line — if you only see JSON, check `"stripeConfigured": false` in the body; that still means step 3 passed.

   If you see **`"stripeConfigured": true`**, stop — fix `.env` and restart before step 4.

4. `POST /api/stripe/checkout` → **500** with clear message (only after step 3 passes). No login cookie needed when the key is unset.

   **bash / Git Bash:**

   ```bash
   curl -s -i -X POST http://localhost:4000/api/stripe/checkout \
     -H "Content-Type: application/json" \
     -d '{"plan":"monthly"}'
   ```

   **Windows CMD** (single quotes don’t work — use escaped double quotes):

   ```cmd
   curl -s -i -X POST http://localhost:4000/api/stripe/checkout -H "Content-Type: application/json" -d "{\"plan\":\"monthly\"}"
   ```

   Expect **HTTP 500** and `"message": "Stripe is not configured..."` (env var in `.env` is **`NUXT_STRIPE_SECRET_KEY`**; the error text may say `STRIPE_SECRET_KEY`).

   **If you get 401 instead:** Stripe is still configured — re-check `.env`, restart `npm run dev`, and re-run step 3.

**Test B — auth gate when Stripe *is* configured (expect 401)**

With **`NUXT_STRIPE_SECRET_KEY` present** (normal local `.env`), the same curl **without** a session cookie → **401** (`Unauthorized - must be logged in`). That is correct behavior, not a failure of the not-configured drill.

Restore keys after Test A.

---

## 4. Vercel dashboard spot-check (**test** branch only)

**Settings → Environment Variables → Preview → branch `test`:**

- `NUXT_STRIPE_SECRET_KEY`, publishable key, webhook secret, price IDs (for checkout on **test**)

Compare against your spreadsheet. **`docs/vercel environment inventory.md`** is optional reference (may include prod rows — not an extraction sign-off list).

---

## 5. When you can tick the `05_28` box

Tick **`(both)` §3: Stripe routes...`** when you can say yes to (**dev + test**):

- [x] All four routes exist (§1 above).
- [x] On **test** preview, `GET /api/stripe/plans` returns `stripeConfigured: true` (Option B) or you’ve confirmed **`test`** Vercel vars + redeploy.
- [x] On **local**, §B Test A (optional): missing key → plans `stripeConfigured: false`, checkout → **500** with clear message; or §B Test B confirms **401** when configured without cookie.
- [x] Missing-key behavior is **clear 500 messages**, not opaque failures.

---

## Suggested one-liner for integration policy (item 3a)

> **Stripe:** Keep. Implemented under `server/api/stripe/*`. **Dev:** local `.env`. **Test:** Vercel Preview branch `test` uses `NUXT_STRIPE_*`. **Production:** TBD at launch (not an extraction gate).

---

## Short answer

Confirm the four route files exist. Hit **`/api/stripe/plans` on test** (Option B) for `stripeConfigured: true`. Optionally run **§B** local drills for not-configured / auth behavior. Production Stripe is **out of scope** for extraction — handle at launch.
