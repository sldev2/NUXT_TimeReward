# Release Operations Runbook

This document outlines the steps for deploying the Nuxt TimeReward application to production.

## Pre-Deployment Checklist

### 1. Code Verification
- [ ] All tests pass locally
- [ ] No TypeScript errors (`npm run build` succeeds)
- [ ] No linter warnings/errors
- [ ] CHANGELOG.md updated with release notes

### 2. Database Migrations
- [ ] All migrations applied to production Supabase
- [ ] RLS policies verified
- [ ] RPC functions tested

### 3. Environment Variables
Ensure the following environment variables are configured in Vercel:

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_KEY` | Supabase anon/public key | Yes |
| `SUPABASE_SECRET_KEY` | Supabase service-role / secret key (server-side) | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Yes |
| `STRIPE_PRICE_ID_MONTHLY` | 1-month subscription price ID | Yes |
| `STRIPE_PRICE_ID_SEMIANNUAL` | 6-month subscription price ID | Yes |
| `STRIPE_PRICE_ID_YEARLY` | 12-month subscription price ID | Yes |
| `STRIPE_PRICE_ID_DEFAULT` | Default/fallback price ID | Recommended |
| `NUXT_PUBLIC_APP_URL` | Production app URL | Yes |
| `NUXT_PUBLIC_APP_ENV` | Environment (production) | Recommended |
| `ALLOW_DEMO_DATA` | Allow demo data API endpoint (server-side) | No (false for prod) |
| `NUXT_PUBLIC_ALLOW_DEMO_DATA` | Show Reset Demo Data button in UI | No (false for prod) |
| `RESEND_API_KEY` | Resend API key for emails | Optional |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key | Optional |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key | Optional |

## Deployment Steps

### Option A: Vercel Git Integration (Recommended)

1. **Connect Repository**
   ```
   1. Log in to Vercel Dashboard
   2. Import Git Repository
   3. Select the repository and branch
   4. Configure root directory: NUXT_TimeReward
   5. Framework Preset: Nuxt.js
   ```

2. **Configure Environment Variables**
   - Go to Project Settings > Environment Variables
   - Add the required variables for Production environment

3. **Deploy**
   - Push to the connected branch to trigger automatic deployment
   - Or click "Deploy" in Vercel dashboard

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to project
cd NUXT_TimeReward

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Post-Deployment Verification

### 1. Basic Functionality
- [ ] Landing page loads
- [ ] Login works with test user
- [ ] Activities display correctly
- [ ] Timer start/stop works
- [ ] Auto-pause triggers at configured time

### 2. Cross-Browser Sync
- [ ] Open app in two browsers
- [ ] Start timer in one browser
- [ ] Verify timer appears in other browser
- [ ] Verify auto-pause syncs

### 3. Settings
- [ ] Settings page loads
- [ ] Auto-pause minutes saves correctly
- [ ] Theme changes apply
- [ ] Audio notification setting works

### 4. Rewards (if enabled)
- [ ] Rewards page loads
- [ ] Create reward works
- [ ] Progress tracking displays
- [ ] Bank/Cash in functionality works

### 5. Subscription/Stripe (if enabled)
- [ ] Subscription expired page shows for expired trials
- [ ] "Upgrade to Pro" button creates Stripe checkout session
- [ ] Stripe checkout completes successfully
- [ ] Webhook updates subscription status
- [ ] Active subscribers can access all features

## Rollback Procedure

### Vercel Rollback
1. Go to Vercel Dashboard > Deployments
2. Find the previous working deployment
3. Click "..." menu > "Promote to Production"

### Database Rollback
- Revert migrations if needed (requires manual SQL)
- Restore from Supabase backup if available

## Monitoring

### Vercel Analytics
- Monitor in Vercel Dashboard > Analytics
- Check for error rate spikes
- Review performance metrics

### Supabase Logs
- Check Supabase Dashboard > Logs
- Monitor API logs for errors
- Check Auth logs for login issues

## Emergency Contacts

- **Supabase Support**: dashboard.supabase.com
- **Vercel Support**: vercel.com/help

## Dependency Management

### Golden Rule: Never Delete package-lock.json

The `package-lock.json` file pins every transitive dependency to an exact version. **Deleting it and running `npm install` can pull in newer versions of transitive dependencies that break the app** — even when `package.json` hasn't changed.

- **`npm ci`** — installs exactly what is in the lockfile. Use this for clean installs and CI/CD.
- **`npm install`** — resolves new versions within semver ranges. Only use when intentionally updating dependencies.
- **`npm install <package>`** — adds or updates one package. Acceptable for adding new dependencies.

If `package-lock.json` is accidentally deleted, **restore it from git** (`git restore package-lock.json`) before running any install command.

### Frozen Dependencies (Do Not Upgrade)

The following packages have known bugs in newer versions. **Do not upgrade** until the upstream issues are resolved.

| Package | Frozen Version | Issue | Tracking |
|---------|---------------|-------|----------|
| `@supabase/supabase-js` | 2.91.1 | `navigator.locks` deadlock in auth client; newer versions deadlock during `signInWithPassword()` and other auth operations | [supabase-js#2013](https://github.com/supabase/supabase-js/issues/2013) |

Before upgrading any `@supabase/*` package, check the tracking issue above. Test auth login/logout in a branch before merging.

### Safe Upgrade Process

When intentionally upgrading dependencies:

1. Create a git branch
2. Run `npm update <package>` or edit `package.json`
3. Run `npm install` to regenerate the lockfile
4. Test login, timer start/stop, and cross-browser sync
5. If everything works, commit the updated `package.json` AND `package-lock.json` together
6. If it breaks, `git restore package.json package-lock.json` and `npm ci`

## Common Issues

### Issue: "Failed to fetch" errors
**Cause**: Usually CORS or Supabase URL misconfiguration
**Fix**: Verify `NUXT_PUBLIC_SUPABASE_URL` is correct

### Issue: Login fails with `net::ERR_NAME_NOT_RESOLVED` (Supabase hostname)
**Cause**: The Supabase project URL in `.env` is wrong, points to a deleted project, or DNS cannot resolve the host (e.g. `xxxxx.supabase.co`).
**Fix**:
1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings** → **API**.
2. Copy the **Project URL** (e.g. `https://abcdefgh.supabase.co`).
3. In `NUXT_TimeReward/.env`, set `SUPABASE_URL=` to that exact URL (no trailing slash). If using `NUXT_PUBLIC_SUPABASE_URL` for client, set that too.
4. Restart the Nuxt dev server (`npm run dev`).
5. If the URL is correct, check network/DNS (e.g. `nslookup your-project-ref.supabase.co` in a terminal or try another network).

### Issue: Login fails with `AbortError: signal is aborted without reason`
**Cause**: `@supabase/supabase-js` upgraded beyond the frozen version. Newer versions have a `navigator.locks` deadlock in the auth client that prevents initialization.
**Fix**:
1. `git restore package.json package-lock.json`
2. `npm ci` (not `npm install`)
3. Restart the dev server
See the "Frozen Dependencies" table above for details.

### Issue: Login not working
**Cause**: RLS policies or auth configuration
**Fix**: Check Supabase Auth settings and RLS policies

### Issue: Realtime not syncing
**Cause**: Realtime not enabled for tables
**Fix**: Run `004_realtime.sql` migration

### Issue: Timers showing wrong time
**Cause**: Clock sync issues
**Fix**: Verify `get_server_time()` RPC function exists

### Issue: Stripe checkout not working
**Cause**: Missing or incorrect Stripe configuration
**Fix**: Verify `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and webhook secret

### Issue: Username login fails
**Cause**: Missing `get_email_by_username` RPC function
**Fix**: Run `011_get_email_by_username.sql` migration

### Issue: Subscription status not updating
**Cause**: Webhook not receiving events
**Fix**: Verify Stripe webhook endpoint and secret, check Supabase service role key

---

## Demo Data Seeding

To seed demo data for testing (dev/test/demo environments only):

### Option 1: UI Button (Recommended for testing)
1. Set environment variables:
   - `ALLOW_DEMO_DATA=true` (server-side API protection)
   - `NUXT_PUBLIC_ALLOW_DEMO_DATA=true` (shows UI button)
2. Log in to the application
3. Click the **"Reset Demo Data"** button at the top of `/home`

### Option 2: API Endpoint (Authenticated User)
```bash
# Requires authenticated user session
curl -X POST http://localhost:4000/api/admin/load-demo-data \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### Option 3: CLI Script (Multiple Users)
```bash
cd NUXT_TimeReward
SUPABASE_URL=... SUPABASE_SECRET_KEY=... npx tsx scripts/seed-demo-data.ts
```

This creates:
- 7 test users with password `@Password1`
- 4 activities per user (Work, Test, Chores, Facebook)
- 36 rewards per user across all time periods
- 4 earned breaks per user

### Demo Data Environment Configuration

| Environment | `ALLOW_DEMO_DATA` | `NUXT_PUBLIC_ALLOW_DEMO_DATA` |
|-------------|-------------------|------------------------------|
| Development | `true` | `true` |
| Test (Vercel) | `true` | `true` |
| Demo (Vercel) | `true` | `true` |
| Production | `false` or unset | `false` or unset |

**Security Notes:**
- Both variables must be `true` for the Reset Demo Data button to work
- API endpoint rejects requests if `ALLOW_DEMO_DATA` is not `true`
- UI button is not rendered if `NUXT_PUBLIC_ALLOW_DEMO_DATA` is not `true`
