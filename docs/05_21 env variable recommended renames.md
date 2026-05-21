# 05_21 Env Variable Recommended Renames

Below is the table version of the recommended env-name mapping, with two important notes up front:

- The Vercel `nuxt-time-reward` project has now been populated using the canonical names adopted here for the currently active production and `preview:test` setup.
- The current codebase only has canonical support for the following Stripe price env vars:

- `NUXT_STRIPE_PRICE_ID_MONTHLY`
- `NUXT_STRIPE_PRICE_ID_YEARLY`
- `NUXT_STRIPE_PRICE_ID_DEFAULT`

So:

- `QUARTERLY` does **not** currently have a direct supported counterpart
- `LOCAL/PRO/SUPER` tier-based price IDs do **not** currently have direct supported counterparts either

Those would require either:

- a deliberate remapping of the product model, or
- code changes to support those tiers explicitly

## Production only

| Your proposed name | Recommended env name |
|---|---|
| `SUPABASE_URL` | `SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | `SUPABASE_KEY` |
| `SUPABASE_SERVICE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` |
| `SHOW_PHONE_NUMBER` | `NUXT_PUBLIC_SHOW_PHONE_NUMBER` |
| `LAUNCH_SOON` | `NUXT_PUBLIC_LAUNCH_SOON` |
| `STRIPE_SECRET_KEY` | `NUXT_STRIPE_SECRET_KEY` |
| `STRIPE_PUBLIC_KEY` | `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `STRIPE_WEBHOOK_SECRET` | `NUXT_STRIPE_WEBHOOK_SECRET` |
| `STRIPE_PRICE_LOCAL_MONTHLY` | No current canonical equivalent in this codebase |
| `STRIPE_PRICE_LOCAL_YEARLY` | No current canonical equivalent in this codebase |
| `STRIPE_PRICE_PRO_MONTHLY` | No current canonical equivalent in this codebase |
| `STRIPE_PRICE_PRO_YEARLY` | No current canonical equivalent in this codebase |
| `STRIPE_PRICE_SUPER_MONTHLY` | No current canonical equivalent in this codebase |
| `STRIPE_PRICE_SUPER_YEARLY` | No current canonical equivalent in this codebase |

## Preview branch `test`

| Your proposed name | Recommended env name |
|---|---|
| `SUPABASE_URL` | `SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | `SUPABASE_KEY` |
| `SUPABASE_SERVICE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` |
| `STRIPE_SECRET_KEY` | `NUXT_STRIPE_SECRET_KEY` |
| `STRIPE_PUBLIC_KEY` | `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `STRIPE_WEBHOOK_SECRET` | `NUXT_STRIPE_WEBHOOK_SECRET` |
| `STRIPE_PRICE_MONTHLY` | `NUXT_STRIPE_PRICE_ID_MONTHLY` |
| `STRIPE_PRICE_QUARTERLY` | No direct current match; quarterly would require explicit code/config support |
| `STRIPE_PRICE_YEARLY` | `NUXT_STRIPE_PRICE_ID_YEARLY` |
| `NUXT_PUBLIC_SITE_URL` | `NUXT_PUBLIC_APP_URL` |
| `HIDE_LANDING_PAGE_COUNTERS` | `NUXT_PUBLIC_HIDE_LANDING_PAGE_COUNTERS` |
| `NUXT_PUBLIC_SHOW_TEST_USERS` | `NUXT_PUBLIC_SHOW_TEST_USERS` |
| `SHOW_PHONE_NUMBER` | `NUXT_PUBLIC_SHOW_PHONE_NUMBER` |
| `HIDE_LANDING_PAGE_COUNTERS` | `NUXT_PUBLIC_HIDE_LANDING_PAGE_COUNTERS` |

## Preview branch `demo`

| Your proposed name | Recommended env name |
|---|---|
| `SUPABASE_URL` | `SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | `SUPABASE_KEY` |
| `SUPABASE_SERVICE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` |
| `STRIPE_SECRET_KEY` | `NUXT_STRIPE_SECRET_KEY` |
| `STRIPE_PUBLIC_KEY` | `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `STRIPE_WEBHOOK_SECRET` | `NUXT_STRIPE_WEBHOOK_SECRET` |
| `STRIPE_PRICE_LOCAL_MONTHLY` | No current canonical equivalent in this codebase |
| `STRIPE_PRICE_LOCAL_YEARLY` | No current canonical equivalent in this codebase |
| `STRIPE_PRICE_PRO_MONTHLY` | No current canonical equivalent in this codebase |
| `STRIPE_PRICE_PRO_YEARLY` | No current canonical equivalent in this codebase |
| `STRIPE_PRICE_SUPER_MONTHLY` | No current canonical equivalent in this codebase |
| `STRIPE_PRICE_SUPER_YEARLY` | No current canonical equivalent in this codebase |
| `NUXT_PUBLIC_SITE_URL` | `NUXT_PUBLIC_APP_URL` |
| `HIDE_LANDING_PAGE_COUNTERS` | `NUXT_PUBLIC_HIDE_LANDING_PAGE_COUNTERS` |
| `NUXT_PUBLIC_SHOW_TEST_USERS` | `NUXT_PUBLIC_SHOW_TEST_USERS` |

## Notes

### Strong renames I would definitely recommend

These are the clearest conversions:

- `SUPABASE_ANON_KEY` -> `SUPABASE_KEY`
- `SUPABASE_SERVICE_KEY` -> `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` -> `NUXT_STRIPE_SECRET_KEY`
- `STRIPE_PUBLIC_KEY` -> `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET` -> `NUXT_STRIPE_WEBHOOK_SECRET`
- `NUXT_PUBLIC_SITE_URL` -> `NUXT_PUBLIC_APP_URL`

### UI flag names

For flags like:

- `SHOW_PHONE_NUMBER`
- `LAUNCH_SOON`
- `HIDE_LANDING_PAGE_COUNTERS`
- `SHOW_TEST_USERS`

I recommend `NUXT_PUBLIC_*` naming **if they are meant to affect client-visible UI**.

That means preferred names like:

- `NUXT_PUBLIC_SHOW_PHONE_NUMBER`
- `NUXT_PUBLIC_LAUNCH_SOON`
- `NUXT_PUBLIC_HIDE_LANDING_PAGE_COUNTERS`
- `NUXT_PUBLIC_SHOW_TEST_USERS`

### Stripe plan/tier mismatch

This is the biggest issue in the list.

The proposed production/demo variables imply a **tiered** pricing model:

- local
- pro
- super

But the current app code is built around a **duration-based** pricing model:

- monthly
- yearly
- default

So those `LOCAL/PRO/SUPER` names are not just naming mismatches. They represent a **different product model** than the one the code currently supports.

Likewise:

- `QUARTERLY` is not a direct naming mismatch
- it is a real product/config mismatch, because the current code does not yet expose a quarterly price slot

## Practical recommendation

If the immediate goal is to get the current app working with minimal code changes, standardize on the current codebase model:

- `NUXT_STRIPE_PRICE_ID_MONTHLY`
- `NUXT_STRIPE_PRICE_ID_YEARLY`
- `NUXT_STRIPE_PRICE_ID_DEFAULT`

If the real business intent is to move to:

- `quarterly`, or
- `local / pro / super`

then that should be treated as a product/code change, not just an env-var renaming exercise.
