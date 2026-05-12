# Session Notes - January 26, 2026

## Summary

Ran the 3 Playwright tests migrated in the previous session for the Nuxt TimeReward app. Through extensive debugging, fixed critical login navigation and auto-pause issues. The multi-activity-sequence test now runs correctly with all activity switches working, though some UI bugs remain.

## Debug Session Results

### Issues FIXED ✅

#### 1. Login Navigation Race Condition
**Problem**: `navigateTo('/home')` returned before the browser URL actually changed, causing Playwright to timeout waiting for navigation.

**Root Cause**: Nuxt's client-side navigation is asynchronous; the promise resolves before the route change completes.

**Fix**: Changed `navigateTo('/home', { replace: true })` to `navigateTo('/home', { external: true })` in `useAuth.ts`. This forces a full page reload which reliably changes the URL.

**Files Modified**: `app/composables/useAuth.ts`

#### 2. Hardcoded 1-Minute Auto-Pause in Dev Mode
**Problem**: Auto-pause was firing after 1 minute regardless of user settings, causing all activities to show "Auto-paused" when switching between them.

**Root Cause**: `getAutoPauseTimeoutMs()` in `useActivities.ts` had a hardcoded 1-minute timeout in dev mode, ignoring the user's setting.

**Fix**: Removed the dev mode override so user settings are always respected.

**Files Modified**: `app/composables/useActivities.ts`

#### 3. Multiple Activities Showing "Auto-paused" Status
**Problem**: When switching from Activity A to Activity B, if Activity A was already auto-paused, it remained in that state. Eventually all activities showed "Auto-paused".

**Root Cause**: The `start_activity` SQL function only stopped timers with `status = 'running'`, not `'auto_paused'`.

**Fix**: Updated SQL to also stop `auto_paused` timers when starting a new activity: `WHERE status IN ('running', 'auto_paused')`. Also updated `stop_activity` to handle already-stopped timers gracefully.

**Files Modified**: `supabase/migrations/006_fix_start_activity.sql`

#### 4. Timer Reset Utility Created
Created `Playwright/test-utils/reset-timers.ts` to reset test user timers before each test run. This ensures clean state with all timers at 0 seconds.

### Issues REMAINING ❌ (New Bugs Discovered)

#### BUG 1: Negative Timer Display (-1:-1:-1)
**Symptom**: When an activity is first started, the timer briefly shows negative numbers like "-1:-1:-1" or "-1:-1:-4" before correcting to "00:00:00".

**Likely Cause**: Race condition between timer start and UI update - `todaySeconds` is being calculated before `lastStartedAt` is set in the database.

**Affected**: Work, Chores, and likely all activities on first start.

#### BUG 2: AutoPause Countdown Not Decrementing
**Symptom**: The auto-pause countdown timer appears frozen (not counting down) when certain activity types are active, specifically Non-Rewardable (Chores) and Wasted (Facebook) types.

**Expected Behavior**: AutoPause should count down for ALL activity types (Rewardable, Non-Rewardable, Wasted).

**Note**: This is different from Rewardable Time which correctly excludes Wasted activities.

#### BUG 3: Test Assertion Fails on Final Status
**Symptom**: Test expects "Auto Paused" status at the end but captures "Auto Pause in 0m 30s" because the test ends before auto-pause actually fires.

**Cause**: Test timing issue - the test doesn't wait long enough for the full auto-pause duration.

## Files Modified This Session

### Application Code
- `app/composables/useAuth.ts` - Login navigation fix (`external: true`)
- `app/composables/useActivities.ts` - Removed dev mode auto-pause override, added debug instrumentation

### Database
- `supabase/migrations/006_fix_start_activity.sql` - NEW: Fixes `start_activity` and `stop_activity` functions

### Playwright Tests
- `Playwright/test-utils/selectors.ts` - Added debug instrumentation for login
- `Playwright/test-utils/reset-timers.ts` - NEW: Timer reset utility for test setup
- `Playwright/multi-activity-sequence.spec.ts` - Added timer reset, reduced viewport to 980x720
- `Playwright/package.json` - Added dependencies for reset utility

## Debug Instrumentation (To Be Removed)

The following files contain temporary debug logging that should be removed in a future session:
- `app/composables/useAuth.ts` - fetch() calls to debug server
- `app/composables/useActivities.ts` - fetch() calls to debug server
- `Playwright/test-utils/selectors.ts` - fetch() calls to debug server

Search for `#region agent log` to find all instrumentation.

## Test Results

### multi-activity-sequence.spec.ts
- ✅ Timer reset works correctly
- ✅ Both Chrome and Edge login on first attempt (no retry needed)
- ✅ All 4 activity switches work correctly with proper status line sync
- ❌ Final assertion fails (test ends before auto-pause fires)

### Test Output Highlights
```
AutoPause: 3 minutes (180 seconds)
Activity sequence: 4 activities until AutoPause

✅ Login successful, navigated to /home (URL changed)  [Chrome]
✅ Login successful, navigated to /home (URL changed)  [Edge]

Work Start:     Chrome: "Auto Pause in 2m 56s" ✅  Edge: "Auto Pause in 2m 56s" ✅
Test Start:     Chrome: "Auto Pause in 1m 26s" ✅  Edge: "Auto Pause in 1m 26s" ✅
Chores Start:   Chrome: "Auto Pause in 0m 30s" ✅  Edge: "Auto Pause in 0m 30s" ✅
Facebook Start: Chrome: "Auto Pause in 0m 30s" ✅  Edge: "Auto Pause in 0m 30s" ✅
```

## Next Steps

1. **Fix test timing** - Adjust multi-activity-sequence test to wait for actual auto-pause
2. **Fix negative timer bug** - Investigate race condition in timer start/display
3. **Fix frozen countdown bug** - Ensure auto-pause countdown updates for all activity types
4. **Remove debug instrumentation** - Clean up temporary logging code
5. **Consider renaming "NonRewardable"** - Future: rename to "Important" for clarity

## Test Commands

```cmd
REM Run with 3-minute auto-pause
cd NUXT_TimeReward\Playwright
set AUTOPAUSE_MINUTES=3
npx playwright test multi-activity-sequence.spec.ts --headed --timeout=600000

REM Reset timers manually
npx ts-node test-utils/reset-timers.ts kyrie
```

## Environment Notes
- Nuxt dev server must be running on localhost:3000
- Test user: `kyrie` / `@Password1` (exists in Supabase)
- SQL migration 006 must be applied to Supabase
- Browser viewport: 980x720 (reduced for side-by-side viewing)
