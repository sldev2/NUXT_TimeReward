# Common Practice: Vercel Branches and Domains

Most teams use **something other than** `staging.mydomain.com` or `main.mydomain.com` as the final production hostname.

The more common pattern is:

- `staging.mydomain.com` stays **staging**
- production is usually:
  - `mydomain.com`, or
  - `www.mydomain.com`, or
  - `app.mydomain.com`

So the usual workflow is not "make `staging.mydomain.com` become production." Instead, teams validate on staging and then point the production domain at the approved deployment.

## Common patterns

### 1. Most common

- `main` or `production` branch -> `mydomain.com`
- `develop`, `staging`, or `test` branch -> `staging.mydomain.com`

This is the most normal setup.

### 2. Promotion-based workflow

Some teams test a deployment on:

- `staging.mydomain.com`

Then promote **that same deployment** to production:

- `mydomain.com`

In that model, you are promoting the deployment artifact, not renaming `staging.mydomain.com` into the production hostname.

### 3. Less common

- `main.mydomain.com` as a permanent branch environment
- production still on `mydomain.com`

This does happen, but `main.mydomain.com` is usually more of an internal branch-tracking environment than the true public production URL.

## What is uncommon

These are less typical:

- using `main.mydomain.com` as the real public production site
- treating `staging.mydomain.com` itself as the long-term production hostname

Usually people want production on the clean, user-facing domain.

## Practical takeaway

If you are setting this up from scratch, the most standard arrangement is:

- `test.yourdomain.com` or `staging.yourdomain.com` -> your non-production branch
- `yourdomain.com` (and maybe `www.yourdomain.com`) -> production branch or promoted production deployment

So if the question is "what do most people actually do?" the answer is:

They usually promote a tested deployment to the production domain, not the staging subdomain itself.

---

## Recommended layout for this repo

For the current branches in `NUXT_TimeReward`, a sensible setup would be:

- `main` -> **production**
  - `mydomain.com`
  - maybe `www.mydomain.com` too

- `test` -> **staging / pre-production**
  - `test.mydomain.com` or `staging.mydomain.com`

- `develop` -> **preview / integration**
  - either no custom domain at all, just Vercel preview URLs
  - or a lower-stakes custom subdomain like `develop.mydomain.com` if you really want one

## Why this layout

`test` is the best candidate for the human-QA branch because it already exists as a controlled validation branch.

`develop` is better treated as a more fluid integration branch:

- more churn
- more partial work
- less suitable as a stable named environment unless you really need one

`main` should stay the clean promotion target:

- what you actually intend to release
- what gets the primary public domain

## Recommended workflow

1. Work lands on `develop`
2. When a coherent testable state is ready, merge `develop` -> `test`
3. Vercel deploys `test` to `test.mydomain.com` or `staging.mydomain.com`
4. Verify:
   - auth
   - Supabase target
   - env vars
   - `/confirm` callback
   - Stripe behavior
   - build/runtime behavior
5. When satisfied, merge `test` -> `main`
6. Vercel deploys `main` to `mydomain.com`

## Domain suggestions

If this app is end-user facing, a good default is:

- `mydomain.com` -> production
- `test.mydomain.com` -> current `test` branch

If you want slightly more conventional naming, then:

- `mydomain.com` -> production
- `staging.mydomain.com` -> `test` branch

That is often clearer for other people, because "staging" communicates purpose better than "test," even if the git branch remains named `test`.

## Bottom line

For this repo, the cleanest setup without renaming branches is:

- keep git branches as:
  - `develop`
  - `test`
  - `main`

- map Vercel/domains as:
  - `main` -> `mydomain.com`
  - `test` -> `staging.mydomain.com`
  - `develop` -> default Vercel preview URLs only

That gives:

- one real production environment
- one stable named pre-production environment
- one flexible dev/integration branch without extra domain-management noise
