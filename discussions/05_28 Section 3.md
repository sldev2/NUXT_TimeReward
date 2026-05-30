# 05_28 — How to check Stripe routes & “not configured” behavior

**Date:** 2026-05-28  
**Related:** `discussions/05_28 extraction and dev directions.md` — checklist item `(both)` §3: Stripe routes exist and “not configured” behavior is acceptable

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

| Route | If secret key missing |
|-------|------------------------|
| **`GET /api/stripe/plans`** | **Graceful** — HTTP 200, static placeholder plans, `stripeConfigured: false` |
| **`POST /api/stripe/checkout`** | **Hard fail** — HTTP 500, message: `Stripe is not configured...` |
| **`POST /api/stripe/update-subscription`** | **Hard fail** — HTTP 500, `Stripe is not configured` |
| **`POST /api/stripe/webhook`** | **Hard fail** — HTTP 500, `Stripe webhook is not configured` |

So “acceptable” for extraction means you’re OK with:

- **Plans page can load** without Stripe (placeholders).
- **Checkout / webhook / sync** fail loudly with a clear message (not a stack trace to the user on a normal page load).

Optional note from `discussions/05_19 stripe interface status.md`: cancel URL may point at `/subscription` without a matching page — separate from “not configured,” but worth knowing if you test checkout cancel.

---

## 3. Quick live checks

### A. **Test** (`test` branch / `test.myfocusrewards.com`) — Stripe *should* be configured

Your Vercel inventory lists `NUXT_STRIPE_*` only on **Preview → branch `test`**, not Production.

1. Log in on test (or open subscription flow if you can reach `/subscription/expired`).
2. In browser DevTools → **Network**:
   - `GET /api/stripe/plans` → **200**, `stripeConfigured: true`, real-ish prices (not only placeholders).
3. Optional: click upgrade → should redirect to Stripe Checkout (not “Stripe is not configured”).

If that works on test, **configured path is good.**

#### How to see `GET /api/stripe/plans` in Network (you do **not** type “GET” anywhere)

DevTools **Network** is a **log of HTTP requests the browser already made**. You don’t enter `GET /api/stripe/plans` into the tab — something on the site has to **trigger** that request first.

**Why you might see nothing**

| Cause | Fix |
|-------|-----|
| You’re on `/`, `/login`, `/home`, etc. | That page never calls the plans API. |
| DevTools opened **after** the page loaded | Reload the page with Network open, or enable **Preserve log**. |
| Filter too narrow | Clear the filter box, or type `plans` or `stripe`. |
| Wrong host | Use **`test.myfocusrewards.com`** (Preview / `test` branch), not prod if prod has no Stripe keys. |
| `UNDER_CONSTRUCTION=1` on prod | Production may show the coming-soon page and block API; use **test** for this check. |

**Option A — Trigger via the app (best match for the doc)**

1. Open **`https://test.myfocusrewards.com`** (or local `http://localhost:4000`).
2. **Log in** (plans check doesn’t require subscription, but `/subscription/expired` requires auth).
3. Open DevTools → **Network** → enable **Preserve log** (optional).
4. In the address bar go to: **`/subscription/expired`**  
   Full URL: `https://test.myfocusrewards.com/subscription/expired`
5. In Network, find a row named **`plans`** (URL ends with `/api/stripe/plans`).
6. Click it → **Headers**: status **200** → **Response** (or Preview): JSON with `stripeConfigured: true` and a `plans` array.

That request comes from `subscription/expired.vue`, which runs `useFetch('/api/stripe/plans')` on page load.

**Option B — Open the API URL directly (simplest)**

Paste in the browser address bar:

```text
https://test.myfocusrewards.com/api/stripe/plans
```

You should get **raw JSON** in the tab (no HTML). Check:

- `stripeConfigured: true` (on test with Stripe env vars set)
- `plans`: array with real prices, not only static placeholders

This still shows up in Network as one `plans` request when you use Option B with DevTools already open.

**Option C — Local**

```text
http://localhost:4000/api/stripe/plans
```

With `NUXT_STRIPE_SECRET_KEY` in `.env` → expect `stripeConfigured: true`. Without it → `stripeConfigured: false` (still **200**).

**What “GET” means in the doc**

`GET /api/stripe/plans` is shorthand for: an HTTP **GET** request to that path. In Network you look for the **Name** `plans` or the **URL** containing `/api/stripe/plans`, not a field where you type the method.


### B. **Main / Production** — Stripe may be *intentionally* unset

Inventory shows **no** `NUXT_STRIPE_*` on Production-only vars. So production may always hit “not configured” for checkout until you add keys.

Check that’s OK for you:

1. `GET https://<prod-host>/api/stripe/plans` (browser while logged in, or curl with session cookie).
   - Expect **200** + `stripeConfigured: false` + static plans.
2. You’re **not** relying on live checkout on prod yet (e.g. `UNDER_CONSTRUCTION`, or no paid subs on prod).

If prod has no Stripe keys **by design**, document in integration policy: *“Stripe: keep; configured on test preview; production keys TBD.”*

### C. **Local** — optional “not configured” drill

1. Temporarily remove or comment `NUXT_STRIPE_SECRET_KEY` in `.env`.
2. `npm run dev`
3. `GET http://localhost:4000/api/stripe/plans` → 200, `stripeConfigured: false`.
4. `POST /api/stripe/checkout` (needs auth) → 500 with clear message.

Restore keys after.

---

## 4. Vercel dashboard spot-check

**Settings → Environment Variables**

- **Preview**, branch **`test`**: `NUXT_STRIPE_SECRET_KEY`, publishable key, webhook secret, price IDs (if you use checkout).
- **Production**: confirm whether Stripe vars are absent on purpose or an oversight.

That’s the real split between test vs main — not `vercel.json`.

---

## 5. When you can tick the `05_28` box

Tick **`(both)` §3: Stripe routes...`** when you can say yes to:

- [ ] All four routes exist (§1 above).
- [ ] On **test**, `plans` returns `stripeConfigured: true` (or you’ve confirmed keys are set and redeployed).
- [ ] On **prod**, either Stripe is configured and checkout works, **or** you accept “plans graceful / checkout blocked” until prod keys exist, and you’ll note that in **integration policy** (item **3a**).
- [ ] Missing-key behavior is **clear 500 messages**, not opaque failures.

---

## Suggested one-liner for integration policy (item 3a)

> **Stripe:** Keep. Implemented under `server/api/stripe/*`. Test preview (`test` branch) uses `NUXT_STRIPE_*`. Production: [configured / not yet — plans degrade gracefully, checkout returns explicit not-configured error].

---

## Short answer

You don’t need a special tool — confirm the four files, hit `/api/stripe/plans` on test (configured) and prod (likely `stripeConfigured: false`), and decide in writing whether prod without Stripe keys is intentional. Your inventory suggests **test = full Stripe, main = no Stripe keys yet**; if that matches your product plan, the behavior is acceptable for extraction.
