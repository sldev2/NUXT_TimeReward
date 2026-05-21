# 05_19 Stripe Interface Status

This note combines the current findings about Stripe subscription payment support in the extracted `NUXT_TimeReward` app.

## 1. Stripe subscription payment is present

Stripe subscription payment support does exist in the app.

What is currently implemented:

- `app/pages/subscription/expired.vue`
  - displays subscription plans
  - lets the user choose a plan
  - sends the user into checkout
- `server/api/stripe/plans.get.ts`
  - returns plan data from Stripe when configured
  - falls back to static placeholder plans when Stripe is not configured
- `server/api/stripe/checkout.post.ts`
  - creates a Stripe Checkout session for subscriptions
- `server/api/stripe/webhook.post.ts`
  - processes Stripe webhook events and updates subscription state
- `server/api/stripe/update-subscription.post.ts`
  - performs a manual subscription-status sync after successful checkout

So the billing flow is not just sketched out; there is real Stripe checkout/server integration in the codebase.

## 2. Why it is not visible in the normal interface

The Stripe subscription flow is not exposed as a normal always-visible billing/settings feature in the main app UI.

What appears to be true right now:

- `home.vue` and `settings.vue` are both protected by `subscription` middleware
- expired or canceled users are redirected to `/subscription/expired`
- `/subscription/expired` is where the plan-selection UI lives

What was not found:

- no obvious billing/subscription/upgrade link in `home.vue`
- no obvious billing/subscription/upgrade link in `settings.vue`
- no obvious reusable component that surfaces subscription management for active users

Practical consequence:

- active or trial users do not seem to get a visible "manage subscription" or "upgrade" entry point in the normal interface
- expired/canceled users are pushed into the Stripe plan-selection page by gating logic

So the current subscription experience is best described as:

- implemented
- reachable through subscription gating
- not surfaced as a discoverable general-purpose billing UI

## 3. Likely checkout cancel-route bug

There appears to be a real route mismatch in the Stripe checkout cancel flow.

In `server/api/stripe/checkout.post.ts`, the return URLs are:

```ts
const successUrl = `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`
const cancelUrl = `${baseUrl}/subscription?canceled=true`
```

What exists under `app/pages/subscription/`:

- `expired.vue`
- `success.vue`

What was not found:

- no `app/pages/subscription/index.vue`
- no other route handler that would make `/subscription` resolve

Implication:

- `successUrl` appears valid
- `cancelUrl` appears to point at a route that does not exist

Most likely intended behavior:

- cancel should return the user to `/subscription/expired?canceled=true`

## Bottom line

Stripe subscription support is present in the app, but it is currently:

- mostly exposed through expired-subscription gating
- not surfaced as a normal main-interface billing feature
- likely affected by a checkout cancel-route bug because `/subscription` does not appear to exist as a valid route

## 4. Stripe environment-variable behavior

The app does read Stripe-related runtime config values.

Configured Stripe-related runtime keys include:

- server-side:
  - `stripeSecretKey`
  - `stripeWebhookSecret`
  - `stripePriceIdMonthly`
  - `stripePriceIdSemiannual`
  - `stripePriceIdYearly`
  - `stripePriceIdDefault`
- public:
  - `stripePublishableKey`

### Missing Stripe config is not globally show-stopping

Missing Stripe configuration does **not** appear to break the whole app.

Instead, the failure mode is feature-scoped:

- the main app can still run
- auth/data flows are still primarily governed by Supabase
- Stripe-specific routes fail when they are actually invoked

### Route-by-route behavior

#### `GET /api/stripe/plans`

This route is graceful when Stripe is not configured.

If `stripeSecretKey` is missing, it returns static placeholder plans instead of throwing:

- the subscription page can still render
- the app can still show plan cards
- `stripeConfigured: false` is returned

#### `POST /api/stripe/checkout`

This route fails hard if Stripe is not configured:

- missing `stripeSecretKey` throws a 500 error
- missing plan-specific price IDs throws a 400 error
- missing fallback/default price configuration also throws a 400 error

Practical effect:

- the user can reach the subscription page
- clicking `Subscribe Now` can fail with an explicit error if Stripe config is incomplete

#### `POST /api/stripe/update-subscription`

This route fails hard if `stripeSecretKey` is missing.

So post-checkout subscription-status sync depends on Stripe server config being present.

#### `POST /api/stripe/webhook`

This route fails hard if either of these is missing:

- `stripeSecretKey`
- `stripeWebhookSecret`

### Publishable key status

`stripePublishableKey` is declared in runtime config, but no current usage was found in the active app/server code paths.

So the currently important Stripe env/config values appear to be the server-side secret, webhook secret, and price IDs, not the public publishable key.

### Practical conclusion

Missing Stripe env vars are:

- **not** show-stopping for the entire application
- **show-stopping** for the actual subscription-payment flow

In the current implementation, the subscription UI can appear to exist even when Stripe is not fully configured, because the plans endpoint can fall back to static placeholder data. The hard failure happens when checkout, webhook processing, or subscription-status sync is actually used.
