# Best Practice: Vercel Branch Deployment Order

It is **OK to deploy branch `X` first** on Vercel. You do **not** need to set up `main`/production first.

Current Vercel docs make the model pretty clear:

- **Preview deployments** are the normal result of pushing to a branch that is **not** your production branch.
- **Production deployments** are tied to whatever branch Vercel marks as the **production branch**.
- On Pro/Enterprise, you can also create a **custom environment** like `staging` and attach a domain to it.

From Vercel’s environments docs:

- pushing to a **non-production branch** creates a **Preview** deployment
- pushing to the **production branch** creates a **Production** deployment
- custom environments can have **branch tracking** and an **attached domain**

So in practical terms:

## Short answer

- **Not a strong best practice** to force production/main first.
- **Perfectly fine** to deploy branch `X` first, especially if `X.mydomain.com` is intended to be a staging/test environment.

## Recommended approach

If the app is still being stabilized, a sensible sequence is:

1. Deploy branch `X` first to `X.mydomain.com`
2. Validate env vars, auth, redirects, database target, and deployment behavior there
3. Only after that, designate the branch you want as **production branch** and attach the main production domain

That is especially sensible for TimeReward while the test preview environment is still being validated.

## When production-first makes sense

Set up production first only if:

- you already know which branch is the long-term production branch
- you are ready for a real user-facing deployment now
- you want the project/domain structure fixed early and are confident in the app state

## Best-practice nuance

The stronger best practice is not "production first." It is:

- be explicit about which branch is **production**
- keep `X` as **preview/staging**
- use separate env values for preview vs production where needed
- do not accidentally point preview branch deployments at production data/services unless that is intentional

## Practical recommendation for this repo

For this repo, a reasonable setup is:

- deploy branch `X` first for `X.mydomain.com`
- treat it as staging/test
- verify:
  - Supabase target
  - auth callback URLs
  - Stripe behavior
  - Vercel env mappings
  - branch-specific domain behavior
- then promote whichever branch you want to be production later

## Bottom line

It is absolutely normal to deploy branch `X` first on Vercel. That is a standard preview/staging workflow, not a bad practice.
