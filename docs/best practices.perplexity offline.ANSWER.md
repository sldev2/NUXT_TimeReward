# Comparison: PRD Section 6 vs. Best Practices Document

The best practices document (from Perplexity) describes the **industry-standard approach** for offline-first apps with Supabase. Your PRD takes a deliberately **lighter-weight** approach. Here's how they differ and where the PRD may be causing implementation pain:

## 1. Local Storage Layer: The Biggest Gap

**Best Practices recommend**: A proper local-first data layer (IndexedDB via Dexie.js, RxDB, or PowerSync) that stores a full copy of the user's data locally, with a sync engine that marks records as `synced: false` and reconciles with the server.

**Your PRD specifies**: No local data store at all. Just a `localStorage` command queue (start/stop only) and transient `ref()`/`useState()` state in memory. All data comes from the server on every page load.

**Impact**: This is the root cause of many of the bugs you've been fixing. Without a local data layer:
- Optimistic UI is fragile and ad-hoc (manually flipping local `ref` values in `startTimer`/`stopTimer`)
- There's no single source of truth on the client when the server is unreachable
- The "full state refresh on reconnect" pattern (PRD 6.3) works, but it means **any** disconnect -- even a brief one -- throws away all client state and re-fetches everything, which creates UI flicker
- The `onMounted` / `watch` / `useState` gymnastics throughout the composables are essentially building a poor man's sync engine by hand

## 2. Connectivity Detection: Overengineered in the PRD

**Best Practices recommend**: `navigator.onLine` + custom pings (simple).

**Your PRD specifies**: A multi-layered hysteresis system -- Supabase Realtime channel status, probe-based `fetch` to the REST endpoint, 2-consecutive-failure confirmation, sticky `confirmedOffline` flag, `visibilitychange` handler with re-probing, and a `watch(isOnline)` from VueUse.

**Impact**: This is where the most debugging has happened. The session notes document **five separate bugs** related to connectivity detection alone:
- `navigator.onLine` unreliable on Windows
- `confirmedOffline` never resetting
- Supabase Realtime retry flipping state
- Probe not re-running on reconnect
- Login page offline banner not clearing

The PRD's hysteresis spec (6.5.3) is reasonable in theory, but the implementation has 4 different signals fighting each other (`isOnline` from VueUse, Realtime channel status, probe results, `confirmedOffline` flag). The best practices doc's simpler "custom pings" approach would be easier to get right.

## 3. Auth Token Handling Offline: Missing from PRD

**Best Practices recommend**: Cache tokens/user data in `localStorage`; skip Supabase init offline; restore sessions online without network calls initially.

**Your PRD specifies**: Nothing explicit about auth token management offline. You ended up discovering this the hard way:
- `useSsrCookies: false` broke normal login (session notes)
- SSR on `/login` and `/register` caused hangs when offline  
- Fix was `routeRules` to disable SSR on auth pages -- correct, but not anticipated by the PRD

This is a gap. The PRD should have a subsection under 6 (or under 7.3) explicitly addressing how the Supabase auth client behaves when the network is down during token refresh, and what the expected behavior is.

## 4. Conflict Resolution: Correct Trade-Off

**Best Practices recommend**: Last-write-wins or manual merging.

**Your PRD specifies**: "Reconnect = Full Refresh" -- server always wins, no conflict resolution.

**This is fine for your use case.** The state footprint is tiny (a handful of timers per user), single-user (no collaborative editing), and the server is authoritative. This is the right trade-off and the best practices doc would agree for a small-state app.

## 5. Realtime Re-subscription: Underspecified in PRD

**Best Practices recommend**: Realtime subscriptions don't natively resume offline; you need explicit reconnection logic.

**Your PRD specifies**: Section 6.3 step 3 says "Verify the Supabase Realtime channel is connected. If not, call `supabase.realtime.connect()` and re-subscribe." But the implementation doesn't actually do this -- `useConnectionStatus.ts` creates a `connection-status` channel but never explicitly reconnects the *data* channels used for timer updates in `useActivities`.

**Impact**: This is likely a latent bug. If Realtime drops during a background tab and the heartbeat-based reconnection fires, the `connection-status` channel might reconnect, but the activity data subscription channel might not.

## 6. The Heartbeat Callback: Doesn't Exist

**Your PRD Section 6.4.2** specifies a `heartbeatCallback` option on the Supabase client config. **This API doesn't exist in `@supabase/supabase-js`.** The Supabase Realtime client has internal heartbeats, but it doesn't expose a callback for them. This section of the PRD is speculative/hallucinated and was never implemented.

---

## Summary Assessment

| Aspect | Best Practices | Your PRD | Verdict |
|--------|---------------|----------|---------|
| Local data layer | IndexedDB / Dexie / PowerSync | None (memory + localStorage queue) | **PRD is weaker** but acceptable for MVP |
| Connectivity detection | `navigator.onLine` + ping | 4-signal hysteresis system | **PRD is over-specified**, causing bugs |
| Auth offline | Cache tokens, skip init | Not addressed (discovered bugs ad-hoc) | **PRD gap** |
| Conflict resolution | LWW / manual merge | Server wins (full refresh) | **PRD is correct** for this use case |
| Realtime reconnection | Explicit re-subscribe | Mentioned but not fully implemented | **PRD underspecified** |
| Heartbeat monitoring | N/A | Specifies non-existent API | **PRD is wrong** |
| Queue/sync engine | Full sync engine with synced flags | Simple command queue (2 command types) | **PRD is simpler**, which is fine |

## Recommendation

The PRD's offline strategy is **not fundamentally flawed** -- the "full refresh on reconnect" + "simple command queue" approach is a reasonable MVP. But the connectivity detection section (6.4/6.5) is where things went sideways. It specifies a complex multi-signal system that was hard to implement correctly and produced most of the bugs.

If you wanted to simplify, the highest-value change would be to **replace the current 4-signal connectivity detection with a single, simple approach**: a periodic probe (e.g., every 10 seconds when the tab is visible) that sets a single `isConnected` boolean. No hysteresis state machine, no watching Realtime channel status, no `navigator.onLine`. Just: "can I reach Supabase right now? Yes or no." That's essentially what the best practices doc recommends with "custom pings."
