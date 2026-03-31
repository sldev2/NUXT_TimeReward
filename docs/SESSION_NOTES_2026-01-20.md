# Session Notes - January 20, 2026

## What Was Accomplished

### 1. ✅ PRD Created
- Full PRD at `docs/PRD - Nuxt Supabase Migration.md`
- Finalized decisions on AutoPause, timer sync, presence indicators, trial management
- Added migration roadmap (subfolder → standalone)

### 2. ✅ NUXT_TimeReward Project Initialized
- Nuxt 4 with Vue 3.5, TypeScript, Tailwind CSS
- Supabase integration (`@nuxtjs/supabase`)
- Pinia state management, VueUse composables
- All files committed to git

### 3. ✅ UI Pages Created
- Landing page (`/`) - with feature highlights
- Login page (`/login`) - username-based auth
- Register page (`/register`)
- Home/Dashboard page (`/home`) - placeholder activities

### 4. ✅ Core Composables
- `useAuth.ts` - username-based authentication
- `useOfflineQueue.ts` - Command Pattern for offline actions
- `useConnectionStatus.ts` - connection state monitoring

### 5. ✅ MCP Servers Configured
- **Playwright MCP** - working, tested with screenshots
- **mcp-time-reward-test** - Supabase PostgreSQL connection working

### 6. ✅ Database Schema Created (SQL files)
- `supabase/migrations/001_user_profiles.sql`
- `supabase/migrations/002_activities.sql`
- `supabase/migrations/003_rpc_functions.sql`
- `supabase/migrations/004_realtime.sql`
- `supabase/migrations/005_seed_test_user.sql`

### 7. ⏳ Partial Migration Run
- `user_profiles` table created ✅
- `user_settings` table created ✅
- RLS and remaining DDL not yet applied (needs write mode)

---

## To Continue Tomorrow

### Step 1: Enable Write Operations on MCP Server

Update the `mcp-time-reward-test` config to add `DANGEROUSLY_ALLOW_WRITE_OPS`:

```json
{
  "mcp-time-reward-test": {
    "command": "npx",
    "args": ["pg-mcp-server"],
    "env": {
      "DATABASE_URL": "postgresql://postgres.fwszbpuqaowoniogtowm:YOUR_PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
      "DANGEROUSLY_ALLOW_WRITE_OPS": "true"
    }
  }
}
```

Restart the MCP server after updating.

### Step 2: Run Remaining Migrations

Ask Cursor to run the remaining SQL:

1. **Complete Migration 001** - RLS policies, indexes, triggers
2. **Run Migration 002** - Activities, timers, time_logs tables
3. **Run Migration 003** - RPC functions (start_activity, stop_activity, etc.)
4. **Run Migration 004** - Enable Supabase Realtime
5. **Run Migration 005** - Create test user "kyrie" (manual steps in Supabase Dashboard)

### Step 3: Create Test User "kyrie"

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create New User"
3. Email: `kyrie@timereward.local`
4. Password: `@Password1`
5. Check "Auto Confirm User"
6. Copy the UUID
7. Run the SQL from `005_seed_test_user.sql` with the UUID

### Step 4: Test Login Flow

1. Start the Nuxt dev server: `cd NUXT_TimeReward && npm run dev`
2. Navigate to `http://localhost:3000/login`
3. Login with username `kyrie`, password `@Password1`
4. Verify redirect to `/home`

### Step 5: Next Development Phase

- Implement real activity CRUD
- Connect Pinia store to Supabase
- Set up Supabase Realtime subscriptions
- Test multi-browser sync

---

## Key Files

| File | Purpose |
|------|---------|
| `NUXT_TimeReward/nuxt.config.ts` | Nuxt configuration |
| `NUXT_TimeReward/.env` | Supabase credentials (gitignored) |
| `NUXT_TimeReward/app/composables/useAuth.ts` | Auth logic |
| `NUXT_TimeReward/supabase/migrations/*.sql` | Database schema |
| `docs/PRD - Nuxt Supabase Migration.md` | Full requirements |

---

## Commands Reference

```bash
# Start Nuxt dev server
cd NUXT_TimeReward && npm run dev

# Check what's running on port 3000
netstat -an | Select-String ":3000"

# Git status
git status

# Commit changes
git add NUXT_TimeReward && git commit -m "message"
```

---

## Notes

- Nuxt server binds to `0.0.0.0:3000` (fixed IPv6 issue)
- Supabase connection uses Transaction Pooler (port 6543)
- Test user uses **username** login, not email
