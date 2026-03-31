# Lost Offline Time — Analysis & Recommendation

**Date**: March 16, 2026  
**Context**: During manual testing of offline/reconnection behavior, it was observed that activity time accumulated while offline is lost upon reconnection.

---

## Current Behavior (PRD 6.6 — Accepted MVP)

When offline commands are replayed on reconnect, the server uses `NOW()` for timestamps, so activity time accumulated during the offline period is lost. For example: if a user starts an activity, goes offline for 3 minutes, then reconnects, the replayed START command uses the reconnection timestamp — the 3 minutes of offline running are not credited.

## Should We Address This Now?

**No.** Here's why:

1. **The structural bugs are fixed and verified** — the queue processing, onMounted warnings, and network-error fallback are all working correctly. These were real, impactful bugs.

2. **Lost offline time is a feature enhancement, not a bug** — PRD 6.6 explicitly documents it as "accepted MVP behavior." It requires a design change (server RPC modifications, drift validation, security considerations) that goes beyond a bug fix.

3. **We're in the middle of manual testing** — the Manual Testing Plan is open and the session notes indicate we're working through Section 14+. Adding a feature mid-testing cycle introduces risk and delays completing the test pass.

4. **Multi-device sync adds real complexity** — the `client_timestamp` approach needs careful design around drift tolerance, conflict resolution, and security. Rushing it alongside other work increases the chance of introducing new bugs.

5. **There's still debug instrumentation to clean up** — we should remove the debug logs, update documentation, and commit the verified fixes before moving on.

## Multi-Device Synchronization Complexity

The PRD already documents why this is tricky. The `client_timestamp` approach has real challenges with multi-device sync:

- **Security surface**: If the server accepts client-provided timestamps, a malicious client could fabricate time entries
- **Clock drift**: Different devices have different clocks, so client timestamps may not agree
- **Conflict resolution**: If Device A starts an activity and Device B also starts one, the server needs to decide which timestamp wins
- **The proposed solution** (PRD 6.6 Future consideration): Accept an optional `client_timestamp` but reject anything more than ~5 minutes in the past. This would:
  - Preserve time for short disconnections (the common case)
  - Prevent abuse (can't claim hours of fabricated time)
  - Work with multi-device because the server still validates and applies server-side conflict resolution

## Implementation Difficulty: Moderate

It requires:
1. Adding `client_timestamp` parameter to `start_activity` and `stop_activity` RPCs
2. Server-side validation (reject if > 5 min drift from `NOW()`)
3. Passing the original `queuedAt` timestamp from the offline queue command to the RPC
4. No schema changes needed — just RPC parameter additions

## Recommendation

Add this to `_FORLATER.md`, remove the debug instrumentation, commit the verified fixes, and continue with the manual testing plan. The offline time enhancement can be tackled as a focused piece of work after the current test pass is complete.
