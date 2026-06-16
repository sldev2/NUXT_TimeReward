# Vercel Environment Inventory

This note records the environment variables currently configured for the `nuxt-time-reward` Vercel project.

## Shared across all environments

These variables are set for `production`, `preview`, and `development`:

- `GEOCODING_API_KEY`
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_SITE_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME`
- `EMAIL_AUTOMATION_ENABLED`
- `EMAIL_DISPATCH_INTERVAL_MS`

## Production only

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SECRET_KEY`
- `NUXT_PUBLIC_SHOW_PHONE_NUMBER`
- `NUXT_PUBLIC_LAUNCH_SOON`
- `NUXT_PUBLIC_APP_URL`
- `NUXT_PUBLIC_HIDE_LANDING_PAGE_COUNTERS`

## Preview branch `test` only

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SECRET_KEY`
- `NUXT_STRIPE_SECRET_KEY`
- `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NUXT_STRIPE_WEBHOOK_SECRET`
- `NUXT_PUBLIC_APP_URL`
- `NUXT_PUBLIC_SHOW_TEST_USERS`
- `NUXT_PUBLIC_SHOW_PHONE_NUMBER`
- `NUXT_PUBLIC_HIDE_LANDING_PAGE_COUNTERS`

## Notes

- The `preview` branch-specific values above are scoped to the Git branch `test`.
- **`NUXT_PUBLIC_SITE_URL`:** Removed — the app reads **`NUXT_PUBLIC_APP_URL`** only (legacy rename; confirmed off Vercel `test` 2026-06-16).
- Shared secret-like values that also target `development` were stored as `encrypted` rather than `sensitive`, because Vercel does not allow `sensitive` env vars to target `development`.
- Production-only and branch-specific preview secrets were stored with Vercel's stricter secret handling where supported.
