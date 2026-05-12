# Session Notes - 2026-03-16

## Summary

**Earlier session**: Fixed three major bugs in recurring reward behavior (timer never resetting, Bank/Cash In having no effect on progress, `$` chip persisting). Removed Bank concept entirely — Cash In is now the sole claiming mechanism with simple confirmation dialog. Updated PRD accordingly.

**Middle session**: Fixed AutoPause settings not persisting (hardcoded defaults + silent DB write failures). Changed auto-paused button icon from stop square to play arrow with "Resume" tooltip. Fixed offline behavior: connection status detection (probe-based instead of unreliable `navigator.onLine`), timer actions now queue when offline with optimistic UI, error banner no longer replaces entire page, offline queue now processes on reconnect and clears on demo data load. Identified known issue: offline queue replays lose original timing. Deferred theme switching (no light-mode styles). Advanced Manual Testing Plan through sections 10–13.

**Latest session**: Comprehensive offline/reconnection overhaul. Rewrote PRD Section 6 (now 6.1–6.6) with full spec for queueable vs online-only actions, command deduplication, stale expiry, reconnection behavior (full state refresh), tab backgrounding, connection status UI with hysteresis, and accepted offline queue timing behavior. Expanded Manual Testing Plan Section 14 from 4 to 8 subsections. Implemented: useConnectionStatus with visibilitychange + probe hysteresis + toast system, useOfflineQueue with dedup/stale/limit/backoff, online-only guards on all CRUD operations across activities/breaks/rewards, reconnecting banner and connection toast in home.vue.

---

## Bug Fix: Recurring Reward Timer Never Resets

### Symptoms
- A recurring "2 min reward" showed "0h 23m / 0h 2m 1050%" — timer kept incrementing past goal
- Clicking Cash In ~13 times had no effect on the timer or `$` chip
- Banking also had no effect on displayed progress

### Root Cause
Reward progress was a pure function of `totalRewardableMinutes / goalMinutes` with no concept of claimed cycles. Neither Bank nor Cash In subtracted anything from the progress calculation — they were append-only log operations.

### Fix Applied
- **Cycle-aware progress**: Calculate `totalEarned = floor(rawMinutes / goalMinutes)`, subtract `claimedCycles` (banked + direct cash-ins in current period). Display shows only the current cycle's progress using modulo arithmetic.
- **Fetch cashed-in rewards**: `useRewards.ts` now fetches `cashed_in_rewards` table (was not fetched before) to count direct cash-ins for offset calculation.
- **`bankReward()` fixed**: Records `goalMinutes` as `minutes_banked` instead of raw accumulated minutes.
- **`$` chip and EARNED**: Driven by `unclaimedCycles > 0` with count display (e.g., "$ x3", "EARNED! (3 available)").
- **Progress bar resets**: Uses `effectiveSeconds % goalSeconds` so bar resets to 0% when a cycle is earned and immediately shows accumulation toward the next cycle.
- **Banked rewards list**: Filters out entries that have been cashed in (used).

### Files Changed

| File | Change |
|------|--------|
| `app/composables/useRewards.ts` | Added `cashedInRewards` state, `getClaimedCycles()`, `availableBankedRewards`, fixed `bankReward()`, updated `rewardProgress` computed |
| `app/pages/home.vue` | Cycle-aware `realtimeRewardProgress` with modulo, updated template |
| `app/pages/rewards.vue` | Updated banked rewards display |
| `CHANGELOG.md` | Documented fix |

---

## Simplification: Removed Bank, Simplified Cash In

### User Feedback
- "Bank" button and banked rewards section added unnecessary friction
- Cash In dialog with optional description field was too much friction for low-value information
- Only Cash In needed — the `$` chip count already communicates earned rewards

### Changes Made
- **Removed Bank button** from both home page and rewards page
- **Removed Banked Rewards display section** from both pages
- **Replaced Cash In modal** (with description textarea) with a simple confirmation popup: "Cash in **{name}**?" with Cancel / Cash In buttons
- **No description stored** — empty string passed; `cashed_at` timestamp still recorded for history
- **Updated PRD** (`discussions/recurring vs non-recurring.md`) — removed all Bank references, documented Cash In as sole claiming mechanism, added design note explaining why Bank was removed
- **`banked_rewards` table retained** in schema for backward compatibility but no longer used in UI

### Files Changed

| File | Change |
|------|--------|
| `app/pages/home.vue` | Removed Bank button, banked rewards section, replaced Cash In modal with confirm dialog |
| `app/pages/rewards.vue` | Same removals and simplification |
| `discussions/recurring vs non-recurring.md` | Rewrote to reflect Cash In-only model |
| `CHANGELOG.md` | Documented removals |

---

## Minor Fix: Banked Reward Display Text

Changed banked reward label from `"{minutes} min banked"` to `"{reward name} banked"` (e.g., "2 min reward banked" instead of "2 min banked"). Updated PRD to specify this format. (Became moot when Bank was removed, but the change is in the codebase.)

---

## Database Operations (via MCP)

- Created "2 min reward" (daily, recurring, 2-min goal) for user kyrie
- Cleaned up stale data: deleted 39 cashed-in records and 2 banked records for the test reward
- Closed a stale auto_paused time log from March 13 that was inflating rewardable time

---

## Agreed Sequencing (Updated)

1. ~~**Group A reward fixes**~~ — **DONE** (March 11)
2. ~~**Offline/Reconnection overhaul**~~ — **DONE** (March 16, PRD v2.5)
3. **Continue Manual Testing** Section 14 → onward ← **HERE**
4. **Fix bugs** found during testing
5. **Visual pass** (MudBlazor approximation)
6. **Remaining migration work** (Phases 5–7) including Group B reward features

---

## Manual Testing Plan Updates

- Updated rewards test sections (10.3–10.8) to reflect Bank removal and Cash In simplification
- Marked sections 10.3–10.8 (Rewards), 11.1–11.4 (Activity Completion), 12.1–12.3 (Activity Time Estimates), 13.1 (AutoPause Settings), 13.2 (Rewardable Time Goals), 13.3 (Include Non-Rewardable) as done
- Added deferred note for 13.4 (Theme) — light-mode styles not yet implemented

---

## Bug Fix: AutoPause Settings Not Persisting

### Symptom
Changing AutoPause interval from 2 to 8 minutes, leaving Settings, and returning showed 2 minutes again.

### Root Cause
1. `settings.vue` initialized `localSettings` with hardcoded defaults (e.g., `autoPauseMinutes: 2`) instead of reading from global state
2. `useUserSettings.ts` `updateSetting` didn't verify the DB write succeeded — Supabase `.update()` without `.select().single()` silently returns no data on RLS or userId mismatch

### Fix
1. `settings.vue`: Initialize `localSettings` from `settings.value` (global state) instead of hardcoded values
2. `useUserSettings.ts`: Added `.select().single()` to update queries; now throws if no row returned

### Files Changed
| File | Change |
|------|--------|
| `app/pages/settings.vue` | Init from global state |
| `app/composables/useUserSettings.ts` | Verify DB writes with `.select().single()` |

---

## UX Change: Auto-Paused Activity Button

- Changed auto-paused button icon from square (stop) to play arrow (triangle)
- Changed tooltip from "Resume or Stop" to "Resume"
- Updated PRD Section 9.4.4 accordingly

### Files Changed
| File | Change |
|------|--------|
| `app/pages/home.vue` | Icon and tooltip for auto-paused state |
| `docs/PRD - Nuxt Supabase Migration.md` | Section 9.4.4 auto-paused state description |

---

## Deferred: Theme Switching (Dark/Light/System)

Theme toggle in Settings correctly applies `dark`/`light` class to `<html>`, but all components use hardcoded dark-mode Tailwind classes (e.g., `bg-slate-900`, `text-white`) without `dark:` variants. Deferred to Visual Pass phase.

---

## Bug Fix: Offline Behavior — Connection Status & Timer Actions

### Symptom 1: "Connecting..." instead of "Offline"
When WiFi was disconnected, the connection banner showed "Connecting..." instead of "Offline" because `navigator.onLine` is unreliable.

### Symptom 2: "Failed to start timer" instead of queuing
`startTimer`/`stopTimer` checked `useNetwork().isOnline` (unreliable), so the offline queue never kicked in.

### Symptom 3: Status alternated between "Offline" and "Connecting..."
Supabase realtime channel retry attempts briefly flipped the state.

### Fixes Applied

**`useConnectionStatus.ts`:**
- Added `probeNetwork()` — direct `fetch` to Supabase REST endpoint to verify actual connectivity
- Added `confirmedOffline` flag — once a probe confirms offline, stays "Offline" until real connectivity returns (prevents flicker from channel retries)
- Changed `connectionState` to `useState` for persistence across navigations

**`useActivities.ts` (`startTimer`/`stopTimer`):**
- Replaced `useNetwork().isOnline` check with `useState('connection-state')` — now aligned with the probe-based banner
- When offline: enqueue command + optimistic UI update (local timer state)

### Files Changed
| File | Change |
|------|--------|
| `app/composables/useConnectionStatus.ts` | Probe-based detection, sticky offline flag |
| `app/composables/useActivities.ts` | Use `connectionState` for offline check |

---

## Bug Fix: Error Banner Replaced Entire Home Page

### Symptom
Any error (e.g., "Failed to start timer") replaced the entire home page content with a red error message — all activity cards, rewards, breaks, etc. disappeared.

### Root Cause
Error was displayed as `v-else-if="error"`, making all subsequent sections (using `v-else` or `v-if="!error"`) hidden.

### Fix
- Changed error to a non-blocking, dismissible banner (`v-if`, not `v-else-if`)
- Added `clearError()` function to `useActivities` composable
- Removed `&& !error` guards from all content sections

### Files Changed
| File | Change |
|------|--------|
| `app/pages/home.vue` | Non-blocking error banner, dismiss button |
| `app/composables/useActivities.ts` | Added `clearError()` |

---

## Bug Fix: Offline Queue Not Processing on Reconnect

### Symptom
"2 queued" badge persisted after reconnecting, after hard refresh, and even after loading demo data.

### Root Causes
1. Queue auto-processing used `useNetwork().isOnline` — didn't match probe-based detection
2. No processing on page load — `watch` only fires on transitions, not initial state
3. `executeCommand` didn't check Supabase error responses (`.rpc()` doesn't throw on DB errors)
4. Load demo data didn't clear the queue (old timer IDs become invalid)

### Fix
- Changed queue processing to use `useState('connection-state')` instead of `useNetwork().isOnline`
- Added `onMounted` hook to process queue if already online at page load
- `executeCommand` now checks `{ error }` from Supabase responses and throws
- `resetDemoData()` calls `clearQueue()` after successful demo data load

### Files Changed
| File | Change |
|------|--------|
| `app/composables/useOfflineQueue.ts` | Probe-based state, onMounted processing, error checking |
| `app/pages/home.vue` | clearQueue on demo data reset |

---

## Known Issue: Offline Queue Loses Timing

When commands are replayed on reconnect, they fire in rapid succession. The server uses `NOW()` for timestamps, so offline time spent on activities is lost. Example: starting Work for 30s then Test for 30s offline results in Work getting ~0s and Test starting fresh on replay.

**Not defined in PRD** — Section 6 describes the command pattern but doesn't address timestamp preservation. This would require server-side changes to accept client timestamps (security implications). Documented for future consideration.

---

## Known Issue: `onMounted` Warning in useOfflineQueue

Console shows `[Vue warn]: onMounted is called when there is no active component instance` when `useOfflineQueue()` is called from inside `startTimer`/`stopTimer` (event handlers, not setup context). The `onMounted` hook only works during component setup. Needs refactoring — either call `useOfflineQueue()` at the composable's top level, or remove the `onMounted` in favor of a different initialization strategy.

---

## Comprehensive Offline/Reconnection Overhaul (PRD v2.5)

### PRD Section 6 Rewrite

Rewrote PRD Section 6 (formerly "Offline Queue Strategy", now "Offline & Reconnection Strategy") with six subsections:

| Section | Content |
|---------|---------|
| 6.1 | Queueable vs Online-Only Actions — clear table of what's queueable and what requires connectivity |
| 6.2 | Offline Queue Behavior — deduplication, stale expiry, queue limit (20), backoff retries |
| 6.3 | Reconnection Behavior — "Reconnect = Full Refresh" pattern (fetch all state from server) |
| 6.4 | Tab Backgrounding — visibilitychange handler, heartbeat monitoring |
| 6.5 | Connection Status UI — hysteresis for flicker prevention, toast notifications |
| 6.6 | Offline Queue Timing — accepted MVP behavior (lost offline time is OK for now) |

### Manual Testing Plan Update

Expanded Section 14 from 4 subsections to 8 (14.1–14.8), covering: online status, going offline, reconnecting, tab backgrounding, offline login/registration, online-only actions while offline, stale queue, and AutoPause during offline.

### Implementation Changes

| File | Change |
|------|--------|
| `app/composables/useConnectionStatus.ts` | Tab foreground handler (`visibilitychange`), probe hysteresis (2 consecutive failures), toast notification system, full state refresh on reconnect/foreground |
| `app/composables/useOfflineQueue.ts` | Command deduplication, stale command expiry (1h), queue limit (20), exponential backoff retries, toast notifications, removed `onMounted` (fixes Vue warning) |
| `app/types/offline-queue.ts` | Simplified to only `START_ACTIVITY` and `STOP_ACTIVITY` |
| `app/composables/useActivities.ts` | `requireOnline()` guard on createActivity, updateActivity, archiveActivity, unarchiveActivity, toggleActivityComplete |
| `app/composables/useBreaks.ts` | `requireOnline()` guard on createBreak, archiveBreak, takeBreak, endBreak |
| `app/composables/useRewards.ts` | `requireOnline()` guard on createReward, updateReward, archiveReward, cashInReward |
| `app/pages/home.vue` | Reconnecting banner (amber, spinner), connection toast UI (bottom-left, dismiss button) |

### Design Decision: Reconnect = Full Refresh

When connectivity returns, the app fetches all state from the server before processing the offline queue. This eliminates conflict resolution complexity since the server is always authoritative and the state footprint is small.

### Resolved Known Issues

- `onMounted` warning in `useOfflineQueue` — removed the `onMounted` hook entirely; queue processing now triggers from `watch(connectionState)` with a small delay
- Offline queue timing — documented as accepted MVP behavior in PRD 6.6; future enhancement could accept client timestamps with drift tolerance

---

## Debug Session: Offline Queue & Reconnection Fixes

Three bugs found and fixed during manual testing of offline/reconnection behavior:

### Bug 1: Offline queue processing multiple times on reconnect
**Root cause:** `useOfflineQueue` composable was instantiated multiple times (each via `useOfflineQueue()` calls in `startTimer`/`stopTimer`), each registering its own `watch(connectionState)` watcher. The `isProcessing` guard was a local `ref` per instance, not shared.
**Fix:** Changed `isProcessing` to `useState<boolean>('offline-queue-processing', () => false)` (shared singleton) and added a module-level `_queueWatcherRegistered` guard so only one watcher is ever registered.

### Bug 2: `onMounted` Vue warnings from `requireOnline()`
**Root cause:** `requireOnline()` functions in `useActivities`, `useBreaks`, and `useRewards` called `useConnectionStatus()` which has an `onMounted` hook — but `requireOnline()` runs in event handlers, not during component setup.
**Fix:** Replaced `useConnectionStatus().showToast()` calls with direct `useState('connection-toast')` / `useState('connection-toast-type')` access, avoiding `useConnectionStatus()` instantiation outside setup context.

### Bug 3: Actions lost when network fails before `connectionState` updates to 'offline'
**Root cause:** User could click Start/Stop while `connectionState` was still `'online'` but network was actually down. The RPC call threw `TypeError: Failed to fetch`, the action was lost (not queued).
**Fix:** Added `catch` block in both `startTimer` and `stopTimer` that detects network errors (`Failed to fetch`) and falls back to enqueueing the command in the offline queue with optimistic UI update.

### Documentation
- Created `discussions/lost offline time.md` — analysis of offline time loss, multi-device sync complexity, and recommendation to defer
- Added item #2 to `_FORLATER.md` documenting the offline time loss as a future enhancement
- All debug instrumentation removed after verification

---

## Bug Fix: `useSsrCookies: false` Broke Normal Login

### Symptom
After the previous session's offline login/register SSR-hang fix (`useSsrCookies: false`), normal login stopped working entirely. After entering valid credentials and clicking Sign In, the user was immediately redirected back to `/login`.

### Root Cause
Setting `useSsrCookies: false` in `nuxt.config.ts` prevented the `@nuxtjs/supabase` server plugin from reading session cookies during SSR. When `navigateTo('/home', { external: true })` fired after successful login, the SSR for `/home` ran the `auth.ts` middleware which called `useSupabaseUser()` — always `null` during SSR without cookies — and redirected back to `/login`.

### Fix
- **Reverted** `useSsrCookies: false` (back to default `true`) so auth cookies work during SSR on protected routes
- **Added** `routeRules: { '/login': { ssr: false }, '/register': { ssr: false } }` in `nuxt.config.ts` — these pages render entirely on the client (no SSR), avoiding the Supabase server plugin's network calls that caused the offline hang, while protected routes like `/home` keep full SSR with auth cookies

### Files Changed
| File | Change |
|------|--------|
| `NUXT_TimeReward/nuxt.config.ts` | Removed `useSsrCookies: false`, added `routeRules` for login/register SSR opt-out |

---

## Bug Fix: Login Page Offline Banner Not Clearing on Reconnect

### Symptom
On `/login`, going offline correctly showed the amber banner and disabled Sign In. But re-enabling WiFi left the page stuck in the offline state — banner persisted and button stayed disabled.

### Root Cause
The `probeOffline` ref was set to `true` during `onMounted` when the network probe failed, but was **never reset to `false`** when connectivity returned. Additionally, `navigator.onLine` is unreliable on Windows (often stays `true` when WiFi is disabled), so the `watch(isOnline)` trigger didn't fire.

### Fix
- Extracted probe logic into reusable `probeNetwork()` function that sets `probeOffline` in both directions (true on failure, false on success)
- Added `watch(isOnline)` to re-probe when browser reports online
- Added periodic probe (every 8 seconds, only when tab is visible) to reliably detect offline/online transitions on Windows where `navigator.onLine` lies
- Applied same fix to `register.vue`

### Files Changed
| File | Change |
|------|--------|
| `NUXT_TimeReward/app/pages/login.vue` | Reusable `probeNetwork()`, periodic probe interval, watch + re-probe on reconnect |
| `NUXT_TimeReward/app/pages/register.vue` | Same changes |

---

## Next Actions

- Remove debug instrumentation from auth.ts, guest.ts, useAuth.ts, useConnectionStatus.ts
- Commit all fixes
- Continue Manual Testing Plan from Section 14 onward (offline/reconnection tests are now fully specified)
- Fix any bugs found during testing
- Visual pass (MudBlazor approximation)
- Remaining migration work (Phases 5–7)
