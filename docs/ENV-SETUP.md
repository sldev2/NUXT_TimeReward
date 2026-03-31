# Environment Variables Setup

Create a `.env.development` file in the `NUXT_TimeReward` root folder for local development.

## Required Environment Variables (Phase 1)

```env
# ============================================
# SUPABASE - Required for @nuxtjs/supabase module
# ============================================

# Your Supabase project URL
SUPABASE_URL=https://your-project-id.supabase.co

# The "anon/public" key (safe for client-side, used with RLS)
# NOTE: Module expects SUPABASE_KEY, not SUPABASE_ANON_KEY
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# The "service_role" key (server-side ONLY, bypasses RLS)
# NEVER expose this in client-side code!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Optional Environment Variables (Later Phases)

```env
# ============================================
# STRIPE - Phase 5 (Payments)
# ============================================
NUXT_STRIPE_SECRET_KEY=sk_test_...
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NUXT_STRIPE_WEBHOOK_SECRET=whsec_...

# ============================================
# RESEND - Phase 5 (Email)
# ============================================
NUXT_RESEND_API_KEY=re_...

# ============================================
# CLOUDFLARE TURNSTILE - Optional (Bot Protection)
# ============================================
NUXT_PUBLIC_TURNSTILE_SITE_KEY=0x...
NUXT_TURNSTILE_SECRET_KEY=0x...

# ============================================
# APP CONFIG
# ============================================
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

## Getting Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select existing
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## Local Development

For local development, create a `.env` file:

```bash
cp docs/ENV-SETUP.md .env
# Then edit .env with your actual values
```

**Never commit `.env` to version control!**
