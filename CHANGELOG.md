# Changelog

All notable changes to the Nuxt TimeReward project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **`AUTO_PAUSE_ACTIVITY` offline queue command** — autopause now queues for replay when triggered offline, with optimistic UI and deduplication
- **`p_paused_at` parameter on `auto_pause_activity` RPC** (migration 026) — preserves real pause timestamp during offline replay
- **`p_stopped_at` parameter on `stop_activity` RPC** (migration 027) — preserves real stop timestamp during offline replay
- **`supabase-no-lock.client.ts` plugin** — patches `navigator.locks` to no-op for multi-tab compatibility
- **Activity card left-border color spec** — PRD v2.11 Section 9.4.5: Green (Rewardable), Blue (Non-Rewardable), Orange (Wasted)

### Fixed
- **AutoPause offline bugs** — countdown reaching 0 offline now triggers pause; timer no longer keeps running after reconnection; yellow coloring appears immediately; "Auto Paused after N minutes" capped to threshold; timer no longer jumps on reconnection
- **Offline stop time inflation** — stopping an activity offline no longer adds idle-period time on replay
- **Activity card left-border colors** — Non-Rewardable changed from yellow to blue; Wasted changed from red to orange
- **Multi-tab AbortError crash** — second tab no longer crashes with 500 error from navigator.locks contention
- **Singleton guard leaks** — `initClockSync` and `initDailyRollover` no longer re-initialize on every composable call
- **Offline start/stop during `connecting` state** — `startTimer`/`stopTimer` now treat any non-`online` state as offline (fixes "RPC timed out" error when clicking Start right after WiFi disconnect)
- **Auth error recovery** — simplified to one-shot reload guard; no longer aggressively signs out on transient AbortErrors

### Changed
- **`refreshAllState`** — now processes offline queue before fetching activities; called on Realtime SUBSCRIBED reconnection
- **`fetchActivities`** — wrapped in 10s `Promise.race` timeout; transient errors (AbortError, TimeoutError) suppressed with capped retry
- **Manual Test Plan 15.2** — rewritten for correct multi-tab offline queue behavior; documented Chrome DevTools vs real WiFi limitation

- **Three-dot context menus for all card types** — PRD v2.7 Section 9.3.1
  - Activity cards: replaced hover-reveal edit/delete with always-visible three-dot popover menu (mobile-friendly)
  - Break cards: added three-dot menu with Edit and Delete (Edit disabled while break is active)
  - Reward cards: added three-dot menu with Edit and Delete
  - Edit Break modal: pre-populated form for updating break name, goal, duration, and recurring status
  - Edit Reward modal: pre-populated form for updating reward name, period, work goal, and recurring status
  - `updateBreak()` function added to `useBreaks.ts` composable
  - Click-outside handler to close menus
- **Activity card layout rearranged** (start/stop left, checkbox right, overflow menu right) — PRD v2.8 Section 9.3.1
  - Start/Stop button moved to far left
  - Timer values displayed inline below activity name (`Time Xm Xs  All: Xh Xm`)
  - Checkbox moved to right side
  - Three-dot menu on far right

### Changed
- **Server-side RPC idempotency** — PRD v2.6 Section 6.9 (migration `025_idempotent_rpcs.sql`)
  - `stop_activity`: returns current state as success if timer is already paused/idle (instead of throwing)
  - `start_activity`: no-op if timer is already running with `last_started_at` within 5 seconds (prevents duplicate time logs from rapid retries)
  - `auto_pause_activity`: returns current state as success if timer is already auto-paused (instead of throwing)
- **Singleton guard on `useConnectionStatus.ts`** — PRD v2.6 Section 6.8
  - Prevents duplicate Supabase Realtime channels and `visibilitychange` listeners when composable is instantiated by multiple components
  - Removed debug instrumentation (`[DEBUG-16524c]` logging)
- **Comprehensive offline/reconnection overhaul** — PRD v2.5 Section 6
  - `useConnectionStatus.ts`: Added `visibilitychange` handler for tab backgrounding (full state refresh on tab foreground), probe-based hysteresis (2 consecutive failures before confirming offline), toast notification system for connection state transitions
  - `useOfflineQueue.ts`: Command deduplication (duplicate START ignored, STOP+START collapse), stale command expiry (>1 hour discarded), 20-command queue limit, exponential backoff retries (2s/4s/8s), toast notifications for sync results
  - Offline queue types simplified to only `START_ACTIVITY` and `STOP_ACTIVITY` (removed unused `AUTO_PAUSE`, `UPDATE_SETTINGS`, `CREATE_ACTIVITY`, `UPDATE_ACTIVITY`, `DELETE_ACTIVITY`)
  - Online-only guards on all CRUD operations: activity create/edit/delete/complete, break create/delete/take/end, reward create/edit/delete/cash-in — shows warning toast when offline
  - Reconnecting banner (amber, with spinner) added alongside existing offline banner (red)
  - Connection toast system: "Back online", "X queued action(s) synced", failure toasts, offline action toasts

### Fixed
- **Recurring reward timer never resets after goal reached** — Timer kept accumulating past goal indefinitely (e.g., "0h 23m / 0h 2m 1050%"). Now shows cycle-relative progress that resets after each Bank or Cash In.
  - Progress calculation subtracts claimed cycles (banked + direct cash-ins within current period)
  - `$` chip and EARNED status only appear when there are unclaimed earned cycles
  - Unclaimed count shown when multiple cycles earned (e.g., "$ x3", "EARNED! (3 available)")
  - `bankReward()` now records `goalMinutes` instead of raw accumulated minutes
  - Banked rewards list filters out already-used (cashed-in) entries
  - Same fix applied to both real-time progress (home page) and DB-backed progress (rewards page)
- **Start/Stop buttons going stale / RPC timeouts** — Buttons could stop responding due to a `navigator.locks` interaction during Supabase auth session refresh.
  - Guard `onAuthStateChange` to register only once; skip Realtime rebuild if channel already exists (prevents dual `INITIAL_SESSION` + `SIGNED_IN` teardown)
  - 15-second timeout on all RPC calls (`startTimer`, `stopTimer`, `triggerAutoPause`) with automatic session-recovery retry before failing
  - `rpcWithTimeout` attempts `supabase.auth.refreshSession()` on first timeout, then retries the RPC once (often self-heals without a page refresh)

### Removed
- **Bank button and Banked Rewards section** — The two-step Bank-then-Use flow added unnecessary friction. Cash In is now the sole mechanism for claiming earned rewards. The `banked_rewards` table remains in the schema for backward compatibility but is no longer exposed in the UI.
- **Cash In description field** — Replaced the modal (optional description) with a simple "Cash in {name}?" confirmation. The `cashed_at` timestamp is still recorded.

### Added
- **Activity button color by type** — PRD v2.4 Section 9.4.4
  - Rewardable activities: green play button
  - Non-Rewardable activities: blue play button
  - Wasted activities: orange play button
  - Running (stop) state uses slightly darker shade of same type color
  - Auto-paused state remains universal yellow
- **Dynamic Work Goal by Reward Type (Group A)** — PRD v2.1 Section 11.7
  - Reward creation dialog now uses per-type Work Goal units: hours (daily/semi-weekly/weekly), days (monthly), weeks (quarterly/yearly)
  - Per-type min/max/step/defaults update dynamically when switching reward type
  - `work_goal` and `work_goal_unit` stored alongside computed `goal_minutes`
  - New utility `app/utils/rewardTypeConfig.ts` with per-type config and conversion functions
  - Reward progress display via `formatRewardSeconds()` using work-time constants: `0h Xm` (< 1h), `Xh Ym` (1h–32h), `Xw Yd` (> 4 work-days). 1 day = 8h, 1 week = 5d = 40h.
  - New migration `023_reward_work_goal.sql` with backfill for existing rewards
  - Migration `024_reward_8h_workday.sql` recalculates `goal_minutes` for monthly/quarterly/yearly to use 8h days and 40h weeks
  - Demo data seed updated with `work_goal` / `work_goal_unit` values
  - Helper text added to Reward Type and Recurring fields per PRD 11.5.1

### Fixed
- **Auth deadlock after dependency update** — Deleting `package-lock.json` and reinstalling pulled newer `@supabase/supabase-js` versions with a `navigator.locks` deadlock ([supabase-js#2013](https://github.com/supabase/supabase-js/issues/2013)). Resolved by restoring the committed lockfile and using `npm ci`. Added dependency management guidance to the release operations runbook.

### Added
- **Earned Breaks activation flow**
  - Active break state management in `useBreaks.ts` (`activeBreak`, `breakStartedAt`, `breakJustEnded`)
  - `takeBreak()` and `endBreak()` functions for break activation lifecycle
  - Break status display replaces AutoPause status line when break is active
  - Break countdown timer for timed breaks with auto-end
  - "End Break" button during active break
  - "Break over" status after break ends (cleared when starting an activity)
  - Visual indication on break card when active (ring, pulse animation, "Active" badge)
  - Daily rollover now resets break fields for recurring breaks (migration `017_break_daily_reset.sql`)
- **Optional break duration for open-ended breaks**
  - `break_duration_minutes` is now nullable in the database
  - New migration `016_optional_break_duration.sql`
  - Break form updated with "(optional)" label and placeholder text
  - Breaks without duration display "Earns: Open-ended break"
- **Settings toggle for "Include Non-Rewardable time in Rewards"** (`settings.vue`)
  - New user setting to optionally include Non-Rewardable activity time in Rewardable Time and Reward progress calculations
  - Default: enabled (includes Non-Rewardable time)
  - New database migration `012_include_non_rewardable_in_rewards.sql`
  - Updated `useUserSettings` composable with new setting
  - Updated `useActivities` composable with `effectiveRewardableSeconds` computed property
  - Updated `useRewards` composable to use effective rewardable seconds

### Fixed
- **Newly created Earned Breaks not appearing in UI**
  - `createBreak` function used `user.value?.id` which was undefined due to Vue reactivity timing
  - Fixed by storing `currentUserId` in `useState` during fetch and using it for write operations
  - Same fix applied to `useRewards.ts` for consistency
- **Earned Breaks and Rewards sections not displaying on /home page**
  - `useBreaks` and `useRewards` composables used `watch(user, { immediate: true })` for initialization
  - This pattern failed due to timing issues: `user` ref not synchronized when `onAuthStateChange` fires
  - Fixed by using `supabase.auth.onAuthStateChange()` directly and passing `session.user.id` to fetch functions
  - Both sections now display correctly on page load
- **Rewardable Time display now respects "Include Non-Rewardable in Rewards" setting**
  - Previously the Daily/Weekly Rewardable Time timers only incremented for Rewardable activities
  - Now correctly includes Non-Rewardable time when `includeNonRewardableInRewards` setting is enabled
  - Both the timer display and progress circles now use `effectiveRealtimeRewardable`
  - Updated PRD Section 11.3 to document this behavior
- **AutoPause trigger now based on cumulative time across all activities** (BUG 3)
  - Previously `scheduleAutoPause()` only used current running activity's elapsed time
  - Now correctly calculates remaining time based on cumulative time across ALL activity types
  - Fixes test timing issues where AutoPause wouldn't fire at expected threshold

### Changed
- **AutoPause countdown now applies to ALL activity types** (Rewardable, Non-Rewardable, Wasted)
  - Previously only showed countdown for Rewardable activities
  - Now counts cumulative time across all activity types for AutoPause threshold
  - This is distinct from Rewardable Time which still only tracks Rewardable activities (unless setting is enabled)
- Updated PRD documentation to clarify AutoPause behavior

- **Phase 1: Foundation (Completed)**
  - Environment-specific trial duration configuration (`app/config/trial.ts`)
  - Development trial bypass via `TRIAL_BYPASS` environment variable
  - RPC function `get_email_by_username` for username-based login (migration 011)
  - Expanded demo data seeding script (`scripts/seed-demo-data.ts`)
  - API endpoint for loading demo data (`/api/admin/load-demo-data`)
  - **Reset Demo Data button** on `/home` page (controlled via `NUXT_PUBLIC_ALLOW_DEMO_DATA` env var)
    - Only visible in dev/test/demo environments
    - Resets activities, rewards, and breaks to demo defaults
    - Defense-in-depth: API protected by separate `ALLOW_DEMO_DATA` env var

- **Phase 5: Stripe Integration**
  - Stripe checkout endpoint (`/api/stripe/checkout`) with multi-plan support
  - Stripe plans endpoint (`/api/stripe/plans`) for fetching available subscriptions
  - Stripe webhook handler (`/api/stripe/webhook`)
  - Subscription status sync endpoint (`/api/stripe/update-subscription`)
  - Subscription middleware for protected routes (`/home`, `/settings`, `/rewards`)
  - Subscription expired page (`/subscription/expired`) with plan selection UI
  - Subscription success page (`/subscription/success`)
  - Support for 3 subscription tiers: Monthly, 6-Month, and Yearly plans

### Fixed
- **Subscription middleware** now uses `supabase.auth.getSession()` directly for reliable user ID access during navigation (fixes issue where middleware couldn't fetch user profile during hydration)

- **Demo Data (PRD Section 17.3.1)**
  - Multiple test users: kyrie, smurfboz23, yogiboz23, speroboz23, banjoboz23, bapujboz23, mongoboz23
  - 36 pre-configured rewards across all time periods
  - Sample earned breaks

---

## [0.9.0] - 2026-01-26

### Added
- **Phase 1: Foundation**
  - Nuxt 4 project setup with Vue 3 and TypeScript
  - Supabase integration (database, auth, realtime)
  - Tailwind CSS styling
  - Authentication system with username-based login
  - Auth middleware for protected routes
  - Database schema with 7 migrations
  - Test user seeding (kyrie)

- **Phase 2: Core Timer**
  - Activities CRUD with create, edit, delete
  - Real-time timer display (updates every second)
  - Supabase Realtime subscriptions for multi-browser sync
  - Start/stop timer functionality
  - Auto-pause functionality (client-side)
  - Settings page (auto-pause config, theme selector)
  - Clock synchronization composable
  - Daily rollover at 3 AM
  - Unarchive feature for deleted activities
  - Theme system (light/dark/system) with class-based Tailwind
  - "All" timer visibility for recurring activities

- **Phase 3: AutoPause & Time Tracking**
  - Audio notification on auto-pause (optional user setting)
  - AutoPause countdown only shows for rewardable activities
  - Non-rewardable activities show "Auto Pause tracking paused" message

- **Phase 4: Offline & Polish**
  - Offline queue with localStorage persistence
  - Connection status UI with prominent offline banner
  - Queued action count display
  - Mobile responsive polish

- **Phase 5: Secondary Features**
  - Rewards system with daily, semi-weekly, weekly, monthly, quarterly, yearly periods
  - Reward progress tracking
  - Bank rewards for later use
  - Cash in rewards functionality
  - Earned breaks system
  - Break progress tracking
  - Database migrations for rewards tables (010_rewards.sql)

- **Phase 6: Testing & Launch**
  - Playwright test suite with multi-tab and cross-browser tests
  - Vercel deployment configuration
  - Database types file generation

### Changed
- Removed debug instrumentation from composables
- Fixed negative timer display bug (race condition guard)
- Fixed frozen countdown for non-rewardable activities
- Improved test timing with auto-pause indicator detection

### Fixed
- Negative timer display showing "-1:-1:-1" briefly on start
- AutoPause countdown not decrementing for non-rewardable activities
- Multi-activity-sequence test timing issues

## Historical context

This app superseded an earlier desktop stack (.NET / Blazor). **Product behavior** for the current Nuxt app is defined in `docs/REARCHITECT/PRD for NUXT.md`. **Schema changes** ship as SQL under `supabase/migrations/` (apply in filename order; that folder is the source of truth, not a frozen list in this file).

Dated implementation logs: `docs/historical/session-notes/`. Migration-era rewards deltas: `docs/historical/migration/`.