# Session Notes - January 23, 2026

## What Was Accomplished

### 1. ✅ useActivities.ts Composable Created

Created a full-featured composable for managing activities and timers:

| Feature | Description |
|---------|-------------|
| **Fetch Activities** | Loads activities with their timers from Supabase |
| **Start/Stop Timers** | Uses RPC functions (`start_activity`, `stop_activity`) |
| **Toggle Timer** | Convenience function to start or stop based on current state |
| **Shared State** | Uses `useState` for state sharing across components |
| **Auth Integration** | Listens to `onAuthStateChange` for reliable user detection |

**Key Implementation Details:**
- Passes user ID from session directly (not from `useSupabaseUser()` ref) to avoid SSR timing issues
- Stores `currentUserId` for use in timer operations after initial fetch
- Uses `isRefreshing` flag to prevent UI flash on timer toggle

### 2. ✅ Real-Time Timer Display

Implemented live timer that updates every second while running:

```typescript
// Updates every second only when a timer is running
const now = ref(Date.now())
let timerInterval: ReturnType<typeof setInterval> | null = null

// Calculate display seconds including elapsed time since lastStartedAt
function getDisplaySeconds(activity: ActivityWithTimer): number {
  if (activity.timer.status === 'running' && activity.timer.lastStartedAt) {
    const startTime = new Date(activity.timer.lastStartedAt).getTime()
    const elapsedSinceStart = Math.floor((now.value - startTime) / 1000)
    return activity.timer.todaySeconds + elapsedSinceStart
  }
  return activity.timer.todaySeconds
}
```

**Features:**
- Individual activity timers count up in real-time
- Summary totals (Rewardable, Wasted, Non-Rewardable) also update live
- Interval automatically starts/stops based on whether any timer is running (saves CPU)

### 3. ✅ Supabase Realtime Subscriptions

Added multi-browser sync via Supabase Realtime:

```typescript
const channel = supabase
  .channel('activity-timers-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'activity_timers',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    if (payload.eventType === 'UPDATE') {
      updateTimerInPlace(payload.new as DbActivityTimer)
    } else {
      fetchActivities(userId)
    }
  })
  .subscribe()
```

**Features:**
- Timer changes sync instantly across browsers
- Activity changes (create/delete) trigger full refresh
- Subscription cleaned up on sign out

### 4. ✅ ActivityTimer Type Updated

Added missing timestamp fields to match database schema:

```typescript
export interface ActivityTimer {
  // ... existing fields ...
  lastStartedAt: string | null   // Added
  lastStoppedAt: string | null   // Added
  autoPauseAt: string | null     // Added
}
```

---

## Files Created/Modified

| File | Changes |
|------|---------|
| `app/composables/useActivities.ts` | **NEW** - Full activities/timers composable |
| `app/pages/home.vue` | Real-time display, uses `useActivities()` |
| `types/activity.ts` | Added timestamp fields to `ActivityTimer` |

---

## Phase 2 Progress

### Core Timer (Week 2)
- [x] Create `useActivities.ts` composable to fetch real activities from Supabase
- [x] Replace placeholder data in `/home` with real data
- [x] Wire up start/stop buttons to RPC functions
- [x] Set up Supabase Realtime subscriptions
- [x] Test multi-browser sync
- [x] Real-time timer display (seconds counting up)
- [ ] Implement real activity CRUD (create/update/delete activities)
- [ ] Connect Pinia store to Supabase data (deferred - using composables instead)

---

## Testing Checklist

### Timer Functionality ✅
- [x] Activities load on login
- [x] Start timer works
- [x] Stop timer works
- [x] Timer display counts up in real-time
- [x] Totals update in real-time
- [x] No page flash when toggling timer

### Multi-Browser Sync ✅
- [x] Start timer in Browser A → appears in Browser B
- [x] Stop timer in Browser B → updates in Browser A
- [x] Console shows `[Realtime] Timer change received: UPDATE`

---

## Known Issues / Future Work

1. **Activity CRUD not implemented** - Users cannot create/edit/delete activities yet
2. **Auto-pause not connected** - The `auto_pause_activity` RPC exists but isn't wired up
3. **No logout button** - Need to add UI for signing out

---

## Commands Reference

```cmd
# Start Nuxt dev server (Command Prompt)
cd NUXT_TimeReward
npm run dev

# Start Nuxt dev server (PowerShell - use semicolon)
cd NUXT_TimeReward; npm run dev

# Git commit
cd NUXT_TimeReward; git add -A; git commit -m "message"
```

---

## Test Credentials

- **Username:** `kyrie`
- **Password:** `@Password1`
- **URL:** `http://localhost:3000/login`
