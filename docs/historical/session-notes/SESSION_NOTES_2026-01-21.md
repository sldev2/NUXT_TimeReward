# Session Notes - January 21, 2026

## What Was Accomplished

### 1. ✅ All Database Migrations Complete

With `DANGEROUSLY_ALLOW_WRITE_OPS` enabled on the MCP server, all migrations were successfully applied:

| Migration | Content | Status |
|-----------|---------|--------|
| **001** | `user_profiles`, `user_settings` tables + RLS + triggers | ✅ Complete |
| **002** | `activities`, `activity_timers`, `activity_time_logs` tables + RLS + indexes | ✅ Complete |
| **003** | RPC functions (`start_activity`, `stop_activity`, `auto_pause_activity`, etc.) | ✅ Complete |
| **004** | Supabase Realtime enabled for `activity_timers`, `activities`, `user_settings` | ✅ Complete |
| **005** | Test user "kyrie" seeded with 4 demo activities | ✅ Complete |

### 2. ✅ Test User "kyrie" Created

- Created auth user via Supabase Dashboard
- UUID: `2c3d6720-4a26-40bc-80ec-2dc342c9c36b`
- Seeded profile, settings, and demo activities via MCP

**Login Credentials:**
- Username: `kyrie`
- Password: `@Password1`

**Demo Activities:**
| Name | Type | Timer ID |
|------|------|----------|
| Work | rewardable | `8121ff2d-ca92-4921-b97c-e2808226c5a8` |
| Test | rewardable | `fa156277-7f87-4340-b11a-1878c6e4efe3` |
| Chores | non_rewardable | `0f25681c-ba9e-4e62-963f-d601a7f9d6e8` |
| Facebook | wasted | `66c642fb-b4ce-4db0-a1f5-8e6381d34934` |

### 3. ✅ Username Login Flow Fixed

**Issue:** Anonymous users couldn't query `user_profiles` to look up email by username (RLS blocked it).

**Solution:** Created `get_email_by_username(p_username TEXT)` RPC function with `SECURITY DEFINER` to bypass RLS securely.

```sql
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM public.user_profiles
  WHERE username = LOWER(p_username);
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO authenticated;
```

### 4. ✅ useAuth.ts Bug Fix

**Issue:** `fetchProfile` was called with `user.value.id = undefined` during auth state transition, causing 400 errors.

**Fix:** Added optional chaining:
```typescript
// Before
if (!user.value) return
// After  
if (!user.value?.id) return
```

### 5. ✅ Login Flow Tested Successfully

1. Started Nuxt dev server (`npm run dev`)
2. Navigated to `http://localhost:3000/login`
3. Logged in with `kyrie` / `@Password1`
4. Successfully redirected to `/home`
5. Dashboard showed all 4 activities with timers
6. No console errors

---

## Database Schema Summary

### Tables Created

| Table | Purpose |
|-------|---------|
| `user_profiles` | Extends auth.users with username, display_name, subscription info |
| `user_settings` | Per-user settings (auto_pause_minutes, theme, etc.) |
| `activities` | User activities with type (rewardable/non_rewardable/wasted) |
| `activity_timers` | Current timer state per activity |
| `activity_time_logs` | Historical log of timer sessions |

### RPC Functions

| Function | Purpose |
|----------|---------|
| `start_activity(timer_id)` | Start timer, stop any running timer first |
| `stop_activity(timer_id)` | Stop timer, calculate elapsed time |
| `auto_pause_activity(timer_id)` | Trigger auto-pause state |
| `reset_daily_timers(user_id)` | Reset daily counters at 3 AM |
| `get_activity_summary(user_id)` | Get totals for rewardable/wasted time |
| `get_email_by_username(username)` | Look up email for login (bypasses RLS) |

### RLS Policies

All tables have Row Level Security enabled with policies ensuring users can only access their own data.

---

## Next Steps

### Phase 2: Core Timer (Week 2)
- [ ] Implement real activity CRUD (connect to Supabase)
- [ ] Connect Pinia store to Supabase data
- [ ] Set up Supabase Realtime subscriptions
- [ ] Test multi-browser sync
- [ ] Wire up start/stop buttons to RPC functions

### Immediate Tasks
1. Create `useActivities.ts` composable to fetch real activities from Supabase
2. Replace placeholder data in `/home` with real data
3. Implement start/stop timer functionality
4. Add Realtime subscription for `activity_timers` changes

---

## Key Files Updated

| File | Changes |
|------|---------|
| `NUXT_TimeReward/app/composables/useAuth.ts` | Fixed optional chaining, use RPC for username lookup |

---

## Commands Reference

```powershell
# Start Nuxt dev server (PowerShell - use semicolon, not &&)
cd NUXT_TimeReward; npm run dev

# Git commit
git add NUXT_TimeReward; git commit -m "message"

# Check database tables via MCP
# Use mcp_mcp-time-reward-test_query tool
```

---

## Notes

- PowerShell 5.x doesn't support `&&` - use `;` instead
- MCP server needs `DANGEROUSLY_ALLOW_WRITE_OPS: "true"` for DDL operations
- Supabase Realtime is now enabled for syncing timer state across browsers
