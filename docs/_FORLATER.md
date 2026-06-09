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

**Discussion:** See `discussions/lost offline time.md` for full analysis.

---

## Auth / Email Delivery

### 3. Use a custom SMTP sender/domain for auth emails

Supabase's default/shared SMTP can deliver auth emails in a way that does not place them prominently in the recipient inbox. Use a custom SMTP sender/domain later, which often improves inbox placement and makes confirmation, magic-link, and password-reset emails more reliable.

### 4. Custom SMTP using Resend

If this project keeps email-based auth flows, configure Supabase Auth to use Resend SMTP instead of the default/shared Supabase sender. Prefer a dedicated SMTP credential for `time-reward-test` rather than reusing the exact same credential from another project, even if both projects share the same Resend account.

**Why later:** The `/confirm` callback mismatch is already fixed. This is now an email-delivery and rate-limit improvement, not a blocker for extraction.

**Expected benefits:**
- Better inbox placement than `noreply@mail.app.supabase.io`
- More reliable confirmation, magic-link, and password-reset delivery
- Avoidance of the built-in Supabase auth email quota
- Cleaner separation between projects for key rotation and auditing

---

## Auth / Access Control

### 5. Optional demo/test username gating

A future feature may reintroduce environment-specific login restrictions for demo/test deployments. If added, this should be treated as a freshly specified feature rather than reconstructed from legacy monorepo behavior.

Questions to settle before implementation:

- should the restriction apply to login only, registration only, or both
- should it use an exact allowlist, substring match, regex, or email-domain rule
- which environments should enforce it (`demo`, `test`, preview-only, local-only, etc.)
- whether it should be controlled by environment variables or typed app config
- what user-facing error message should be shown when access is blocked
