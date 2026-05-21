# Env Naming Preference

This note records the preferred environment-variable naming convention for `NUXT_TimeReward`.

## Terminology

### What "canonical" means here

In this repo, a **canonical** env name is the primary/official name that should be used when more than one plausible name exists for the same value.

If different docs, scripts, or deployment settings use competing names for the same concept, the canonical name is the one that should win during cleanup and standardization.

Examples:

- prefer `SUPABASE_SERVICE_ROLE_KEY` over `SUPABASE_SERVICE_KEY`
- prefer `NUXT_PUBLIC_APP_URL` over `NUXT_PUBLIC_SITE_URL`

Canonical does **not** necessarily mean "the only name that has ever existed." It means "the name this repo intends to standardize on."

### "Canonical" vs "source of truth"

These ideas overlap, but they are not identical:

- **canonical name** = the preferred official name for a value
- **source of truth** = the place you should check to determine what the current official name/value contract actually is

For this repo:

- `.env.example` is the main **source of truth** for the env naming contract
- this document explains which names should be treated as **canonical**

So:

- a canonical name answers: "What should we call this?"
- a source of truth answers: "Where do we look to confirm the current contract?"

## Core rule

When multiple env names could plausibly refer to the same value, prefer the name that is:

1. expected by the actual consumer
2. aligned with Nuxt `runtimeConfig` naming rules
3. aligned with the upstream vendor's real terminology
4. least ambiguous for future maintenance

In practice, this means:

- use module-expected names where a module requires a specific env name
- use `NUXT_` / `NUXT_PUBLIC_` names for values that map directly to `runtimeConfig`
- prefer precise vendor terminology over vague aliases

## Preferred canonical names for this repo

### Supabase

Use:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Why:

- the app/docs contract is already written around `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` is the precise Supabase term
- `SUPABASE_SERVICE_KEY` is ambiguous and should not be the canonical name

Avoid as primary names:

- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

## Nuxt runtime config convention

Nuxt runtime config values should follow Nuxt's environment override pattern:

- private runtime config keys -> `NUXT_*`
- public runtime config keys -> `NUXT_PUBLIC_*`

For example, if the app reads:

- `runtimeConfig.public.appUrl`

then the canonical environment variable should be:

- `NUXT_PUBLIC_APP_URL`

not a generic alias like:

- `NUXT_PUBLIC_SITE_URL`

### App-owned public values

Use:

- `NUXT_PUBLIC_APP_URL`
- `NUXT_PUBLIC_APP_ENV`

Avoid as primary names:

- `NUXT_PUBLIC_SITE_URL`

## Stripe

Use:

- `NUXT_STRIPE_SECRET_KEY`
- `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NUXT_STRIPE_WEBHOOK_SECRET`
- `NUXT_STRIPE_PRICE_ID_MONTHLY`
- `NUXT_STRIPE_PRICE_ID_SEMIANNUAL`
- `NUXT_STRIPE_PRICE_ID_YEARLY`
- `NUXT_STRIPE_PRICE_ID_DEFAULT`

Why:

- they match the app's `runtimeConfig` structure
- `publishable` is Stripe's real term and is more precise than `public`
- keeping all Stripe values in the same naming family reduces confusion across local env, docs, and deployment config

Avoid as primary names:

- `STRIPE_PUBLIC_KEY`

## Short version

For this repo, the preferred canonical names are:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NUXT_PUBLIC_APP_URL`
- `NUXT_STRIPE_SECRET_KEY`
- `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NUXT_STRIPE_WEBHOOK_SECRET`
- `NUXT_STRIPE_PRICE_ID_MONTHLY`
- `NUXT_STRIPE_PRICE_ID_SEMIANNUAL`
- `NUXT_STRIPE_PRICE_ID_YEARLY`
- `NUXT_STRIPE_PRICE_ID_DEFAULT`

The general principle is:

- consumer-expected name beats alternate alias
- precise vendor terminology beats vague shorthand
- Nuxt `runtimeConfig`-mapped names should stay in `NUXT_` / `NUXT_PUBLIC_` form
