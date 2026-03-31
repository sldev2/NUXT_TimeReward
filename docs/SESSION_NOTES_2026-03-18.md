# Session Notes - 2026-03-18

## Summary

**This session**: Compared PRD Section 6 (Offline & Reconnection Strategy) against external best practices documents (Perplexity offline v2, hidden pitfalls). Identified three gaps: multi-tab behavior, Realtime subscription lifecycle, and server-side RPC idempotency. Added PRD Sections 6.7–6.9 (PRD v2.6). Implemented all three: singleton guard on `useConnectionStatus.ts`, new migration `025_idempotent_rpcs.sql` making all timer RPCs idempotent, and updated Manual Testing Plan with new sections 14.9 (Idempotency) and 15 (Multi-Tab Behavior). Removed debug instrumentation from `useConnectionStatus.ts`.

---

## PRD Best Practices Comparison

Compared PRD Section 6 against `best practices.perplexity offline.v2.md` and `best practices.perplexity hidden pitfalls.md`. Full analysis saved in `docs/best practices.perplexity offline.v2.ANSWER.md`.

### PRD Strengths
- "Reconnect = Full Refresh" is a valid simplification for small state footprint
- Probe-based detection with hysteresis is more robust than the basic recommendation
- Command deduplication addresses non-idempotent sync writes

### Gaps Identified and Addressed (PRD v2.6)

| Gap | PRD Section | Severity | Resolution |
|-----|-------------|----------|------------|
| Multi-tab behavior | 6.7 | Medium | Documented existing singleton guard patterns |
| Realtime subscription lifecycle | 6.8 | Medium | Added singleton guard to `useConnectionStatus.ts` |
| Server-side RPC idempotency | 6.9 | Medium | New migration `025_idempotent_rpcs.sql` |

### Gaps Documented but Deferred
- No PWA / Service Worker (future enhancement)
- No IndexedDB local persistence (deliberate tradeoff for MVP)
- No Safari ITP concern (using localStorage, not IndexedDB)

---

## Implementation: Singleton Guard on useConnectionStatus (PRD 6.8)

Added module-level `_connectionChannelRegistered` guard so the Supabase `connection-status` channel and `visibilitychange` listener are only created once, even if the composable is instantiated by multiple components. Guard resets on `onUnmounted` so navigation away and back still works.

Also removed all `[DEBUG-16524c]` logging from this file.

### Files Changed

| File | Change |
|------|--------|
| `app/composables/useConnectionStatus.ts` | Singleton guard, removed debug logs |

---

## Implementation: Idempotent RPCs (PRD 6.9)

Created migration `025_idempotent_rpcs.sql` with three `CREATE OR REPLACE FUNCTION` statements:

| RPC | Previous Behavior | New Behavior |
|-----|-------------------|--------------|
| `stop_activity` | Threw if already paused/idle | Returns current state as success JSON with `idempotent: true` |
| `start_activity` | Always created new time log, even if already running | No-op if already running with `last_started_at` within 5 seconds |
| `auto_pause_activity` | Threw if already auto-paused | Returns current state as success JSON with `idempotent: true` |

Migration applied to dev database via MCP and saved to `supabase/migrations/025_idempotent_rpcs.sql` for future deployment.

### Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/025_idempotent_rpcs.sql` | New migration |

---

## Manual Testing Plan Updates

- Added **Section 14.9** (Rapid Start/Stop — Idempotency): tests rapid double-click on start/stop, offline queue replay idempotency, duplicate time log detection
- Added **Section 15** (Multi-Tab Behavior, PRD 6.7): same-tab offline queue, multi-tab offline queue, multi-tab Realtime consistency, connection status singleton verification
- Renumbered old Sections 15–20 → 16–21
- Updated header: PRD reference to v2.6, date to March 17, 2026

---

## Agreed Sequencing (Updated)

1. ~~**Group A reward fixes**~~ — **DONE** (March 11)
2. ~~**Offline/Reconnection overhaul**~~ — **DONE** (March 16, PRD v2.5)
3. ~~**PRD gap analysis & idempotency fixes**~~ — **DONE** (March 18, PRD v2.6)
4. **Continue Manual Testing** Section 14 → onward ← **HERE**
5. **Fix bugs** found during testing
6. **Visual pass** (MudBlazor approximation)
7. **Remaining migration work** (Phases 5–7) including Group B reward features

---

## Next Actions

- Continue Manual Testing Plan from Section 14 onward
- Fix any bugs found during testing
- Visual pass (MudBlazor approximation)
- Remaining migration work (Phases 5–7)
