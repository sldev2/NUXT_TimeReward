# Session Notes - January 30, 2026

## Summary

Continued Nuxt TimeReward migration work. Added Reset Demo Data button with environment-based visibility, fixed RLS bypass for demo data API, configured Stripe environment variables with proper Nuxt naming conventions, and **completed full Stripe integration testing** including checkout flow and webhook verification.

## Work Completed This Session

### Reset Demo Data Button

Added a "Reset Demo Data" button to `/home` page:
- Purple button at top of page, visible only when `NUXT_PUBLIC_ALLOW_DEMO_DATA=true`
- Calls `POST /api/admin/load-demo-data` to reset activities, rewards, breaks
- Shows loading spinner during reset, success/error message for 5 seconds
- Auto-refreshes activities list after reset

#### Security Model (Defense in Depth)
- **UI Layer**: Button only renders when `NUXT_PUBLIC_ALLOW_DEMO_DATA=true`
- **API Layer**: Endpoint rejects requests unless `ALLOW_DEMO_DATA=true` or `NODE_ENV=development`
- **Production**: Both variables should be `false` or unset

### Fixed Demo Data API (`/api/admin/load-demo-data`)

1. **RLS Bypass**: Changed from `serverSupabaseClient` to `serverSupabaseServiceRole` to bypass Row Level Security
2. **User ID Extraction**: Fixed to use `user.sub` (JWT claim) instead of `user.id` (which doesn't exist on the JWT payload)
3. **Service Key**: Added `SUPABASE_SERVICE_KEY` to `.env` (required by `@nuxtjs/supabase` module)

### Stripe Environment Variable Configuration

Fixed Nuxt runtime config mapping by using correct naming convention:

| Old Name | New Name (Nuxt Convention) |
|----------|---------------------------|
| `STRIPE_SECRET_KEY` | `NUXT_STRIPE_SECRET_KEY` |
| `STRIPE_PUBLISHABLE_KEY` | `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `STRIPE_WEBHOOK_SECRET` | `NUXT_STRIPE_WEBHOOK_SECRET` |
| `STRIPE_PRICE_ID_MONTHLY` | `NUXT_STRIPE_PRICE_ID_MONTHLY` |
| `STRIPE_PRICE_ID_SEMIANNUAL` | `NUXT_STRIPE_PRICE_ID_SEMIANNUAL` |
| `STRIPE_PRICE_ID_YEARLY` | `NUXT_STRIPE_PRICE_ID_YEARLY` |
| `STRIPE_PRICE_ID_DEFAULT` | `NUXT_STRIPE_PRICE_ID_DEFAULT` |

**Nuxt Naming Convention:**
- Server-side only: `NUXT_<CONFIG_KEY>` → `runtimeConfig.<configKey>`
- Client-side (public): `NUXT_PUBLIC_<CONFIG_KEY>` → `runtimeConfig.public.<configKey>`

### Installed Stripe Package

Added `stripe` npm package for checkout/webhook endpoints.

## Files Modified This Session

### Modified Files
- `.env` - Updated Stripe variables with NUXT_ prefix, added SUPABASE_SERVICE_KEY
- `.env.example` - Updated to match new naming convention
- `nuxt.config.ts` - Added `allowDemoData` to public runtime config
- `app/pages/home.vue` - Added Reset Demo Data button with conditional visibility
- `server/api/admin/load-demo-data.post.ts` - Fixed RLS bypass and user ID extraction
- `server/api/stripe/checkout.post.ts` - Fixed user ID extraction (`user.sub` instead of `user.id`)
- `server/api/stripe/update-subscription.post.ts` - Fixed user ID extraction
- `CHANGELOG.md` - Added entries for new features
- `docs/release-operations-runbook.md` - Updated env vars table and demo data section
- `package.json` / `package-lock.json` - Added stripe package

## Git Commits

1. `51e1389` - feat(nuxt): add Reset Demo Data button and Stripe package (8 files)
2. `7cc8030` - feat(nuxt): add Stripe integration and subscription management (14 files)
3. `d3e50e8` - fix(nuxt): fix user ID extraction in Stripe API endpoints (5 files)

## Stripe Testing Status

### All Tests Passed ✅

| Test | Status |
|------|--------|
| 1. Plans API (`GET /api/stripe/plans`) | ✅ Passed - Returns 3 plans with correct pricing |
| 2. Checkout no auth (`POST /api/stripe/checkout`) | ✅ Passed - Returns 401 Unauthorized |
| 3. Full Checkout Flow | ✅ Passed - Redirects to Stripe, payment completed |
| 4. Webhook updates database | ✅ Passed - `subscription_status` updated to `active` |

### Bug Fix During Testing

Fixed `user.id` → `userId` extraction in Stripe API endpoints. The `serverSupabaseUser()` returns JWT payload where user ID is in `sub` field, not `id`.

**Files fixed:**
- `server/api/stripe/checkout.post.ts`
- `server/api/stripe/update-subscription.post.ts`

### Test Commands
```cmd
REM Window 1 - Nuxt dev server
cd NUXT_TimeReward
npm run dev

REM Window 2 - Stripe webhook listener
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Known Issues

### Minor
- `[request error] [unhandled] [GET] http://localhost:3000/_nuxt/` - Appears during startup, likely harmless (browser extension or DevTools timing)
- `SUPABASE_SERVICE_KEY is deprecated` warning - Module recommends migrating to `SUPABASE_SECRET_KEY`

### From Previous Session (Not Addressed)
1. **BUG 1**: Negative timer display (-1:-1:-1) on activity start
2. **BUG 2**: AutoPause countdown not decrementing for Non-Rewardable/Wasted activities
3. **BUG 3**: Test timing issue - tests end before auto-pause fires

## Environment Configuration Summary

### For Dev/Test/Demo Environments
```env
ALLOW_DEMO_DATA="true"
NUXT_PUBLIC_ALLOW_DEMO_DATA="true"
SUPABASE_SERVICE_KEY="your-service-role-key"
NUXT_STRIPE_SECRET_KEY="sk_test_..."
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
NUXT_STRIPE_WEBHOOK_SECRET="whsec_..."
NUXT_STRIPE_PRICE_ID_MONTHLY="price_..."
NUXT_STRIPE_PRICE_ID_SEMIANNUAL="price_..."
NUXT_STRIPE_PRICE_ID_YEARLY="price_..."
NUXT_STRIPE_PRICE_ID_DEFAULT="price_..."
```

### For Production
```env
ALLOW_DEMO_DATA="false"  # or unset
NUXT_PUBLIC_ALLOW_DEMO_DATA="false"  # or unset
# Stripe vars same as above but with live keys
```

## Next Steps

1. ~~Complete Stripe checkout flow testing~~ ✅ Done
2. ~~Verify webhook updates database correctly~~ ✅ Done
3. Test subscription middleware (redirect expired users)
4. Address known timer bugs if time permits
