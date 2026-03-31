# For Later

Deferred items, low-priority bugs, and future decisions for the NUXT_TimeReward application.

---

## UI / Design Decisions

### 1. No visual indicator for non-recurring activities on activity cards
Activity cards do not visually distinguish recurring vs non-recurring activities. The `auto_repeat` property is only visible in the edit dialog. Breaks and Rewards cards have a recurring indicator (🔄 icon) per PRD Sections 10.5.2 and 11.4.3, but no equivalent exists for activity cards.

**Decision needed:** If we add an indicator for non-recurring activities, should we also show an indicator for recurring activities? Showing only one side (e.g., a "one-time" badge) without the other could be confusing. Options:
- Add indicators for both (e.g., 🔄 for recurring, a "one-time" or "1x" badge for non-recurring)
- Add an indicator only for the minority case (non-recurring, since most activities are recurring by default)
- Accept current behavior (no indicator on activity cards; visible only in edit dialog)

---

## Offline / Reconnection

### 2. Offline running time lost on reconnection

When commands are replayed from the offline queue on reconnect, the server RPCs (`start_activity`, `stop_activity`) use `NOW()` for timestamps, discarding any time the activity ran while offline. For example: 3 minutes offline with a running timer results in ~0 seconds credited after replay.

**PRD reference:** Section 6.6 — documented as "accepted MVP behavior."

**Proposed solution:** Accept an optional `client_timestamp` parameter in `start_activity` / `stop_activity` RPCs. Server validates it is within ~5 minutes of `NOW()` (reject otherwise). The offline queue already stores `queuedAt` timestamps that can be passed through.

**Complexity:** Moderate — RPC parameter additions + server-side drift validation. No schema changes. Multi-device conflict resolution needs careful design.

**Discussion:** See `NUXT_TimeReward/discussions/lost offline time.md` for full analysis.
