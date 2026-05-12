# Session Notes - January 25, 2026

## What Was Accomplished

### 1. ✅ Activity CRUD with Real-Time Sync

Implemented full create, update, and delete functionality for activities:

| Feature | Implementation |
|---------|----------------|
| **Create Activity** | Modal form with name and type selection |
| **Edit Activity** | Modal form, edit/delete buttons on hover |
| **Delete Activity** | Soft delete (archive) for Realtime sync |
| **Real-time sync** | All CRUD operations sync across browsers |

### 2. ✅ Logout Button

Added logout button (icon) to the header next to the user's display name.

### 3. ✅ Soft Delete Decision & Documentation

Created `docs/decisions/soft-delete-vs-hard-delete.md` explaining:
- Why Supabase Realtime DELETE events don't work with row filters
- Solution: Use soft delete (set `is_archived = true`) which triggers UPDATE events
- Alternative: `REPLICA IDENTITY FULL` (already enabled on activities table)

### 4. ✅ Auto-Pause Functionality (In Progress - Needs Testing)

Implemented client-side auto-pause that:
- Schedules auto-pause timeout when a timer starts
- Uses user's `auto_pause_minutes` setting from database
- In development mode: defaults to 1 minute for faster testing
- Calls `auto_pause_activity` RPC when timeout expires
- Visual indicators: orange pulsing border, "Auto-paused" label

**Test user kyrie's settings updated to 1-minute auto-pause for testing.**

---

## Files Modified/Created

| File | Changes |
|------|---------|
| `app/composables/useActivities.ts` | Added CRUD functions, auto-pause logic, separate Realtime listeners |
| `app/pages/home.vue` | Added modals, edit/delete buttons, logout, auto-pause visual indicators |
| `docs/decisions/soft-delete-vs-hard-delete.md` | **NEW** - Documents soft delete approach |

---

## Database Changes

```sql
-- Enabled REPLICA IDENTITY FULL for future hard delete support
ALTER TABLE public.activities REPLICA IDENTITY FULL;

-- Updated kyrie's auto-pause setting to 1 minute for testing
UPDATE public.user_settings 
SET auto_pause_minutes = 1 
WHERE user_id = '2c3d6720-4a26-40bc-80ec-2dc342c9c36b';
```

---

## Commits Made

1. `feat: Add useActivities composable with real-time timer display and Supabase sync`
2. `docs: Add session notes for January 23, 2026`
3. `feat: Add activity CRUD with UI, logout button, and soft delete for Realtime sync`

---

## Pending Changes (Not Yet Committed)

- Auto-pause functionality (needs testing first)
- Additional Realtime listener improvements

---

## To Test Auto-Pause

1. Start the server: `cd NUXT_TimeReward && npm run dev`
2. Navigate to http://localhost:3000/login
3. Log in as `kyrie` / `@Password1`
4. Start a timer
5. Check console for `[AutoPause] Scheduled in X seconds`
6. Wait ~1 minute
7. Timer should turn orange with "Auto-paused" label

---

## Known Issues

1. **Vite Pre-transform errors** - Warnings about `path.relative()` appear during build but don't affect functionality
2. **Database types warning** - `~/types/database.types.ts` not found; using `Database = unknown`

---

## Next Steps

1. Test auto-pause functionality
2. Commit auto-pause changes if working
3. Consider adding:
   - Settings page for users to configure auto-pause minutes
   - Flash/notification on auto-pause (using `flash_on_auto_pause` setting)
   - Unarchive feature to restore deleted activities

---

## Test Credentials

- **Username:** `kyrie`
- **Password:** `@Password1`
- **URL:** http://localhost:3000/login

---

## Commands Reference

```cmd
# Start Nuxt dev server
cd NUXT_TimeReward
npm run dev

# Git operations
cd NUXT_TimeReward
git add -A
git status
git commit -m "message"
```
