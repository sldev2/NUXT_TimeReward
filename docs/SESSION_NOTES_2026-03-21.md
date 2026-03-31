# Session Notes - 2026-03-21

## Summary

**This session**: Implemented three-dot context menus for all card types (activities, breaks, rewards), replacing the hover-reveal pattern for mobile friendliness. Rearranged activity card layout to match parent project (start/stop button left, checkbox right, three-dot far right). Added Edit Break and Edit Reward modals. Fixed modal-stays-open-on-failure UX consistency. Fixed popover z-order issue. Added "2 min breaky-break" to demo data. PRD updated to v2.10.

---

## Three-Dot Context Menus (PRD v2.7)

Replaced hover-based edit/delete on activity cards with always-visible three-dot popover menus. Added the same pattern to break and reward cards.

### Changes

| File | Change |
|------|--------|
| `app/pages/home.vue` | Three-dot menus on all card types, Edit Break/Reward modals, click-outside handler, z-order fix |
| `app/composables/useBreaks.ts` | Added `updateBreak()` function, returns `Promise<boolean>` |
| `app/composables/useRewards.ts` | `updateReward()` now returns `Promise<boolean>` |
| `app/composables/useActivities.ts` | `updateActivity()` now returns `Promise<boolean>` |

---

## Activity Card Layout (PRD v2.8)

Rearranged activity card to match parent project layout:

```
[▶ Button]  Activity Name                    [☐] [⋮]
            Time 0m 0s  All: 3h 13m
```

- Start/Stop button moved to far left
- Timer values displayed inline below name
- Checkbox moved to right
- Three-dot menu on far right

---

## Modal Failure UX (PRD v2.9)

Fixed inconsistency: some modals closed on failure (losing user input), others stayed open. Now all Create/Edit modals stay open on failure, only closing on confirmed success. Composable update/create functions return success indicators checked by handlers.

---

## Popover Z-Order Fix

Three-dot popover menus were rendered behind subsequent sibling cards. Fixed by dynamically applying `z-30` to the card whose menu is open (activity, break, and reward cards).

---

## Offline UX Fixes

- `useAuth.ts`: `navigateTo('/home')` only uses `{ external: true }` when online
- `settings.vue`: Added explicit `width`/`height` on SVG icons as fallback
- Manual Testing Plan Section 14.6 clarified for offline registration testing

---

## Demo Data Update (PRD v2.10)

- PRD Section 22.3.1 rewritten from gap placeholder to full specification of implemented demo data loading
- Added "2 min breaky-break" (2-min goal, 2-min duration, recurring) to demo breaks
- `load-demo-data.post.ts` updated

---

## Documentation Updates

| Document | Changes |
|----------|---------|
| PRD | v2.7 (three-dot menus), v2.8 (activity layout), v2.9 (modal failure rule), v2.10 (demo data spec) |
| Manual Testing Plan | Sections 5.3–5.6 (activity menu/edit/delete renumbered), 8.10–8.13 (break menu/edit/delete), 10.7–10.9 (reward menu/edit/delete) |
| CHANGELOG | Three-dot menus, activity layout, demo data entries |

---

## Commits Made

1. `88b9694` — `fix: offline UX — conditional navigateTo, defensive SVG sizing`
2. `9a2cd88` — `feat: three-dot context menus, activity card layout, modal failure UX`
3. `9ca4dc7` — `docs: PRD v2.10, test plan updates, demo data breaky-break, changelog`

---

## AutoPause Offline Fixes (Session 2)

Fixed multiple bugs discovered during Manual Test 14.8 (AutoPause During Offline):

| Bug | Fix |
|-----|-----|
| AutoPause countdown reaches 0 offline but doesn't trigger pause | Added `AUTO_PAUSE_ACTIVITY` to offline queue; optimistic UI update sets card to auto-paused immediately |
| Timer keeps running after reconnection | Offline queue processed before fetchActivities in `refreshAllState`; SUBSCRIBED handler calls `refreshAllState` |
| No yellow coloring until manual page refresh | Optimistic `timer.status = 'auto_paused'` set in `triggerAutoPause` before RPC |
| "Auto Paused after 7 minutes" instead of 2 minutes | Capped `autoPausedAfterSeconds` to `Math.min(rawWindow, threshold)` |
| Timer jumps on reconnection (2m 0s → 2m 52s) | Added `p_paused_at` param to `auto_pause_activity` RPC (migration 026); client passes real pause timestamp |
| Offline stop inflates time (adds idle period) | Added `p_stopped_at` param to `stop_activity` RPC (migration 027); client passes real stop timestamp |

### Files Changed

| File | Change |
|------|--------|
| `app/types/offline-queue.ts` | Added `AUTO_PAUSE_ACTIVITY` command type |
| `app/composables/useOfflineQueue.ts` | Added executor + dedup for `AUTO_PAUSE_ACTIVITY`; `STOP_ACTIVITY` passes `stoppedAt` |
| `app/composables/useActivities.ts` | `triggerAutoPause`: optimistic UI, offline queue, capped display; `stopTimer`: captures stop timestamp; `startTimer`/`stopTimer`: use `!== 'online'` for offline check; catch timeout errors as network fallback; `fetchActivities`: Promise.race 10s timeout, transient error retry with cap |
| `app/composables/useConnectionStatus.ts` | `refreshAllState`: process offline queue before fetch; SUBSCRIBED handler calls `refreshAllState` when reconnecting; retry counter reset on SUBSCRIBED |
| `supabase/migrations/026_autopause_timestamp_param.sql` | `auto_pause_activity` accepts `p_paused_at TIMESTAMPTZ DEFAULT NOW()` |
| `supabase/migrations/027_stop_activity_timestamp_param.sql` | `stop_activity` accepts `p_stopped_at TIMESTAMPTZ DEFAULT NOW()` |

---

## Activity Card Left-Border Colors (PRD v2.11)

Fixed incorrect left-border colors: Non-Rewardable was yellow (should be blue), Wasted was red (should be orange).

| File | Change |
|------|--------|
| `app/pages/home.vue` | `getTypeColor`: `non_rewardable` → `border-l-blue-500`, `wasted` → `border-l-orange-500` |
| PRD | v2.11: Added Section 9.4.5 (left-border colors), updated Section 4.3.1 |

---

## Multi-Tab Stability Fixes

Fixed multiple issues with two-tab operation:

| Issue | Fix |
|-------|-----|
| Tab 2 crashes with 500 error (AbortError from navigator.locks) | Created `supabase-no-lock.client.ts` plugin: patches `navigator.locks.request` to no-op |
| `initClockSync`/`initDailyRollover` re-init on every tab switch | Added singleton guards (`_clockSyncInitialized`, `_dailyRolloverInitialized`) |
| `fetchActivities`/`fetchRewards`/`fetchBreaks` show "failed to fetch" on AbortError | Suppress AbortError silently (don't set error state, don't retry infinitely) |
| Auth recovery plugin too aggressive (signs out on transient AbortError) | Simplified to one-shot reload guard with `hasRecovered` flag |
| Supabase HTTP client hangs permanently after WiFi reconnect (Tab B) | **Known Supabase SDK limitation** — documented. Queries hang forever, only page reload recovers. See `docs/multi tab problems.perplexity.md` |

### Files Changed

| File | Change |
|------|--------|
| `app/plugins/supabase-no-lock.client.ts` | New: patches navigator.locks for multi-tab compat |
| `app/plugins/auth-error-recovery.client.ts` | Simplified: one-shot reload guard |
| `app/composables/useClockSync.ts` | Singleton guard on `initClockSync` |
| `app/composables/useDailyRollover.ts` | Singleton guard on `initDailyRollover` |
| `app/composables/useActivities.ts` | AbortError/TimeoutError suppression, Promise.race query timeout |
| `app/composables/useRewards.ts` | AbortError suppression |
| `app/composables/useBreaks.ts` | AbortError suppression |

---

## Manual Testing Progress

| Test | Status |
|------|--------|
| 14.8 AutoPause During Offline | PASS |
| 14.9 Rapid Start/Stop — Idempotency | PASS |
| 15.1 Same-Tab Offline Queue | PASS |
| 15.2 Multi-Tab Offline Queue | Rewritten; Tab A works, Tab B has known Supabase SDK limitation |
| 15.3+ | Not yet tested |

---

## Known Issue

- **Supabase JS client HTTP layer hangs permanently after WiFi reconnect in multi-tab** — This is a known Supabase SDK bug (`isSingleton: true` + `createBrowserClient` cross-tab shared state corruption). See `docs/multi tab problems.perplexity.md` for analysis. Perplexity recommends switching to `isSingleton: false` + health-check client recreation pattern.

---

## Agreed Sequencing (Updated)

1. ~~**Group A reward fixes**~~ — **DONE** (March 11)
2. ~~**Offline/Reconnection overhaul**~~ — **DONE** (March 16, PRD v2.5)
3. ~~**PRD gap analysis & idempotency fixes**~~ — **DONE** (March 18, PRD v2.6)
4. ~~**Three-dot menus + activity layout + modal UX**~~ — **DONE** (March 21, PRD v2.7–v2.10)
5. **Continue Manual Testing** Section 14 → onward ← **HERE**
6. ~~**Debug stop_activity RPC timeout**~~ — **FIXED** (was caused by offline `connecting` state not being treated as offline)
7. **Fix Supabase multi-tab singleton issue** (implement `isSingleton: false` + health-check pattern)
8. **Fix bugs** found during testing
9. **Visual pass** (MudBlazor approximation)
10. **Remaining migration work** (Phases 5–7) including Group B reward features

---

## Next Actions

- Implement Perplexity's recommended fix for multi-tab Supabase client (`isSingleton: false` + health-check/recreate)
- Continue Manual Testing Plan from Section 15.2 onward
- Fix any bugs found during testing
- Visual pass (MudBlazor approximation)
- Remaining migration work (Phases 5–7)
