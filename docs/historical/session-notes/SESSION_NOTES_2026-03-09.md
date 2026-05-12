# Session Notes - 2026-03-09

## Summary

Fixed multiple Earned Breaks bugs: progress overcounting past goal, Take button double-press, activity locking during breaks, recurring break reset (baseline_seconds), non-recurring break card hiding, break countdown timer not ticking, and post-break activity restart. Added "Include Non-Rewardable time in Breaks" toggle to settings UI. Updated PRD Sections 10.5.3, 10.7.1, and 10.7.4 with clarified break behavior.

---

## Issues Fixed

### 1. "Include Non-Rewardable time in Breaks" setting had no UI

**Symptom:** The setting `includeNonRewardableInBreaks` was wired in the composable and database but had no toggle in the Settings page, so users couldn't control whether non-rewardable activities (e.g., Chores) contributed to earned break progress.

**Fix:** Added a toggle in `settings.vue` under "Rewardable Time & Goals" section. Wired `localSettings`, `syncLocalSettings`, and the `watch(settings)` handler.

### 2. New break retroactively shows full day's accumulated time

**Symptom:** Creating a break mid-session (after 17 minutes of activity) showed 16 minutes of progress instead of starting from 0.

**Fix:** Introduced `baseline_seconds` column on `user_breaks` (migration 021). When creating a break, the current `effectiveRealtimeBreakable` value is stored as `baselineSeconds`. Progress is calculated as `effectiveRealtimeBreakable - baselineSeconds`. Daily rollover resets `baseline_seconds` to 0 (migration 022).

### 3. Take button did nothing for auto-paused activities

**Symptom:** Pressing "Take" on an earned break had no visible effect when the current activity was auto-paused.

**Fix:** Updated `handleTakeBreak` to find and `stopTimer` both `running` and `auto_paused` activities before calling `takeBreak`.

### 4. Progress text incrementing past goal (e.g., "3m / 2m")

**Symptom:** Break progress display continued incrementing beyond 100% — showed "3m / 2m", "4m / 2m", etc.

**Fix:** Capped `progressSeconds` at `goalSeconds` using `Math.min(rawProgress, goalSeconds)` in `realtimeBreakProgress` computed.

### 5. Take button could be pressed multiple times

**Symptom:** While a break was active, the Take button for other breaks remained clickable.

**Fix:** Added `&& !activeBreak` to the Take button's `v-if` condition.

### 6. Activity buttons not locked during break

**Symptom:** Users could start activities while on a break, contradicting PRD 10.7.1.

**Fix:** Added `activeBreak` guard at the top of `handleToggleTimer` with a toast notification ("End your current break before starting an activity."). Activity buttons show disabled state (reduced opacity, cursor-not-allowed) when a break is active.

### 7. Break countdown timer not ticking

**Symptom:** After taking a break, the countdown timer froze and the break never auto-ended.

**Root cause:** `hasRunningTimer` only checked for running activities. When the activity was stopped for a break, the `now` ref interval stopped, freezing `breakCountdown`.

**Fix:** Updated `hasRunningTimer` to include `|| !!activeBreak.value`, keeping the interval alive during breaks.

### 8. "Taken" label showing during active break

**Symptom:** Both the "Active" badge and "Taken" label showed simultaneously on the break card.

**Fix:** Added `&& activeBreak?.id !== bp.break.id` to the "Taken" label's `v-else-if` condition.

### 9. Non-recurring break card not hidden after break ends

**Symptom:** Per PRD 10.7.4, non-recurring break cards should be hidden after being taken. They remained visible.

**Fix:** Added a filter in `realtimeBreakProgress` to exclude non-recurring breaks where `activatedToday === true` and the break is not currently active.

### 10. Recurring break not resetting to 0% after ending

**Symptom:** After ending a recurring break (even prematurely), progress showed ~22% instead of resetting to 0%.

**Root cause:** `resetBreak` was not setting `baseline_seconds`, so the break immediately showed the full day's accumulated breakable time as progress.

**Fix:** `endBreak` now passes `effectiveRealtimeBreakable.value` to `resetBreak`, which stores it as `baseline_seconds`. Also removed the `isCreatedToday` guard from progress calculation — `baselineSeconds` is always subtracted, which works correctly for all cases (creation day, reset day, post-rollover).

### 11. Stale activeBreak reference after fetchBreaks

**Symptom:** After `takeBreak` called `activateBreak` (which calls `fetchBreaks`), `activeBreak` held a stale object reference disconnected from the refreshed `breaks` array.

**Fix:** Added a refresh step at the end of `takeBreak` that re-assigns `activeBreak` to the matching object from the updated `breaks.value`.

---

## PRD Updates

- **Section 10.5.3**: Added display capping rule — progress text clamped to goal value
- **Section 10.7.1**: Added items 5-7: "$" chip removal, Take button hidden during active break, activity buttons disabled with toast
- **Section 10.7.4**: Strengthened language — activities NOT auto-resumed, recurring breaks fully reset (progress, chip, label, activated_today), explicit manual restart required

---

## Manual Testing Progress

- Section 8.1 (Break Settings): **COMPLETE**
- Section 8.2 (Break CRUD): **COMPLETE**
- Section 8.3 (Break Progress): **COMPLETE**
- Section 8.4 (Break Cash-In): Tested Take, End Break, countdown, recurring reset, non-recurring hiding

---

## Files Changed

| File | Change |
|------|--------|
| `app/composables/useBreaks.ts` | `endBreak`/`resetBreak` accept baseline param, `takeBreak` refreshes activeBreak reference |
| `app/pages/home.vue` | Progress capping, Take button guard, activity locking + toast, break countdown fix, non-recurring filter, recurring reset baseline, "Taken" label fix |
| `app/pages/settings.vue` | Added "Include Non-Rewardable time in Breaks" toggle |
| `app/types/rewards.ts` | Added `baselineSeconds` to `UserBreak` interface |
| `server/api/admin/load-demo-data.post.ts` | Set `baseline_seconds: 0` for demo breaks |
| `supabase/migrations/021_break_baseline_seconds.sql` | New: add `baseline_seconds` column to `user_breaks` |
| `supabase/migrations/022_reset_break_baseline.sql` | New: reset `baseline_seconds` in `reset_daily_timers` RPC |
| `docs/PRD - Nuxt Supabase Migration.md` | Sections 10.5.3, 10.7.1, 10.7.4 updates |
| `docs/Manual Testing Plan.md` | Sections 8.1-8.3 marked complete |

---

## Next Actions

- Continue manual testing Section 8.4+ (more break edge cases)
- Section 6.4 partially complete (1-hour format not yet tested)
