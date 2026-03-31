# PRD Section 6 vs. Best Practices Comparison

## Where the PRD aligns well

The PRD actually makes several sound architectural decisions:

1. **"Reconnect = Full Refresh"** (PRD 6.3) aligns with the best practices' "Supabase as source of truth" principle. For a small state footprint (a handful of timers per user), this is a valid, pragmatic simplification that dodges the entire conflict resolution problem described in best practices Section 3.3.

2. **Probe-based detection** (PRD 6.5.3 hysteresis) goes beyond the basic recommendation in best practices 2.1 (which just says "browser online/offline events plus periodic health checks"). The PRD specifies 2-consecutive-failure thresholds and sticky offline, which is more robust.

3. **Queueable vs Online-Only split** (PRD 6.1) is a sensible triage. The best practices say "never block core actions" — the PRD queues start/stop (core actions) and blocks CRUD (infrequent).

4. **Command deduplication** (PRD 6.2.2) addresses the "non-idempotent sync writes" root cause from the hidden pitfalls doc.

## Where the PRD is weaker or silent

Here's where the best practices documents expose genuine gaps:

### Gap 1: No local persistence model (IndexedDB)

The best practices (Section 2.2) recommend storing timers, tasks, reward/break balances in IndexedDB with an append-only operation log. The PRD stores only the command queue in localStorage. This means:
- If the user refreshes while offline, they lose all UI state (the queue survives, but the timer display doesn't)
- There's no offline-first experience — if Supabase is unreachable at page load, the user sees nothing

**Verdict**: This is a *deliberate tradeoff* the PRD makes (server is authoritative, state footprint is small). For MVP it's fine. If you want the app to be usable while offline (not just survive short blips), this would need to change.

### Gap 2: No PWA / Service Worker

Best practices Section 2.3 recommends `@vite-pwa/nuxt` for asset caching, offline shell, and Background Sync. The PRD doesn't mention service workers at all. This means:
- No cached shell for offline page loads
- No Background Sync API (the app relies entirely on its own in-memory retry loops)
- If the user closes the browser with queued commands, they're replayed on next visit *only* if localStorage wasn't cleared

**Verdict**: Real gap, but not the cause of the bugs hit. This would be a Phase 5+ enhancement.

### Gap 3: No multi-tab handling

The hidden pitfalls doc specifically flags: *"Multi-tab on same device behaves like two separate devices for both IndexedDB and Realtime."* The PRD doesn't address multi-tab at all. In practice:
- Two tabs of the same user create two Realtime subscriptions
- Two tabs each have their own offline queue (localStorage is shared, but the in-memory state isn't)
- The "singleton watcher" bug from the session notes (multiple `useOfflineQueue` instances processing the queue) is a symptom of this

**Verdict**: Genuine gap in the PRD that directly contributed to bugs.

### Gap 4: No idempotency guarantee on the server

The hidden pitfalls doc's root cause #3: "Non-idempotent sync writes... Background Sync retries and Supabase Realtime duplicate events are both benign *if* the server deduplicates on a client-supplied UUID." The PRD's `QueuedCommand` has an `id` field, but there's no mention of the server using it for dedup. If the same start/stop command is replayed twice (network glitch, retry), the server RPC may apply it twice.

**Verdict**: The PRD needs a sentence saying the server RPCs should be idempotent (or accept and dedup on client command IDs).

### Gap 5: Supabase Realtime subscription cleanup

The hidden pitfalls doc warns about "3 events per insert when subscriptions aren't cleaned up on Nuxt component unmount." The PRD doesn't specify subscription lifecycle management. This is a Nuxt-specific footgun — if a composable subscribes to Realtime in `onMounted` but the component unmounts and remounts (e.g., page navigation), you get duplicate subscriptions.

**Verdict**: Should be addressed in the PRD or at least in implementation guidelines. The session notes show related issues were already hit (multiple watcher registrations).

### Gap 6: Lost offline time (already documented)

Best practices Section 3.2 recommends immutable event logs with client timestamps. The PRD explicitly accepts lost offline time (Section 6.6) and documents the rationale. The hidden pitfalls doc lists "client timestamps used in business logic" as root cause #2, but the PRD is correctly *avoiding* client timestamps for security. This is a conscious tradeoff, not a gap.

### Gap 7: Safari ITP

The hidden pitfalls doc warns Safari deletes IndexedDB after 7 days of inactivity. Since the PRD uses localStorage (not IndexedDB), this specific pitfall doesn't apply. However, localStorage has its own size limits (~5MB) which the PRD doesn't mention. With a 20-command queue limit, this isn't a real risk.

---

## Summary Assessment

| Category | PRD Status | Severity |
|----------|-----------|----------|
| Server-authoritative model | Good | — |
| Probe-based detection + hysteresis | Good | — |
| Command dedup | Good | — |
| Offline queue timing | Accepted tradeoff, documented | — |
| Multi-tab behavior | **Not addressed** | Medium — caused bugs |
| Realtime subscription lifecycle | **Not addressed** | Medium — caused bugs |
| Server-side idempotency | **Not addressed** | Medium — latent risk |
| PWA / Service Worker | **Not addressed** | Low — future enhancement |
| IndexedDB local persistence | **Not addressed** | Low — future enhancement |
| Safari ITP | N/A (using localStorage) | — |

## Bottom line

The PRD is not sub-optimal in its *architecture* — the "Reconnect = Full Refresh" approach is a legitimate, well-documented simplification. The bugs hit were mostly Vue lifecycle / composable instantiation issues, not architectural failures.

However, the PRD is silent on **three things that directly caused or contributed to bugs**: multi-tab behavior, Realtime subscription cleanup, and server-side idempotency. Adding short subsections for these three would prevent a repeat.
