# Session Notes - 2026-03-04

## Summary

Committed previous session's work (admin API registration, guest middleware, stale data cleanup). Updated Manual Testing Plan progress through Section 5.1.

---

## Manual Testing Plan Progress

Sections completed:
- **Sections 1-3.3** — All done (see 2026-02-27 notes for details)
- **Section 3.4: Email Verification** — Deferred to end of Manual Testing Plan (requires Resend API key)
- **Section 4: Demo Data Reset** — All passed
- **Section 5.1: Activity Cards Display** — Passed except: no visual indicator for non-recurring activities on card (PRD doesn't specify one for activity cards; only breaks/rewards have 🔄 indicator)

Sections not yet started:
- Section 5.2 (Create Activity) through Section 20

---

## Known Issues (Carried Forward)

### 1. No visual indicator for non-recurring activities on activity cards
The PRD does not specify a visual indicator on activity cards for recurring vs non-recurring. The `auto_repeat` property is only visible in the edit dialog. Decision pending: add a spec or accept current behavior.

### ~~2. Activity start buttons don't work after demo data reset (without page reload)~~
**RESOLVED (confirmed 2026-03-05):** Activities now start correctly after demo data reset without requiring a page reload. Root cause was likely fixed in one of the Feb 27 commits (admin API registration / auth hardening).

---

## Git State

5 commits on `develop` (4 ahead of origin, not pushed):
- `8680d35` — first_name/last_name, email confirmation bypass, auth bugs
- `11cc7f6` — server-side admin registration, guest middleware, auth hardening
- `9741217` — delete superseded confirm-email endpoint, clean up stale test users
- `640d3f6` — fix: guard against stale Supabase auth cookies crashing SSR
- `04f23db` — docs: Manual Testing Plan sections 3.3-5.1, session notes

---

## Database State

### Users
| Username | First Name | Last Name | Email | Status | Email Confirmed |
|----------|-----------|-----------|-------|--------|-----------------|
| kyrie | Kyrie | Irving | kyrie@timereward.local | active | Yes |
| bluto | Bluto | Barnes | (disposable email) | trial | Yes |

---

## Important Context for Next Session

- Both MCP servers (mcp-time-reward-test, playwright) should be working
- Dev server runs on `http://localhost:3000` via `cd NUXT_TimeReward && npm run dev`
- Test user: kyrie / @Password1
- Supabase project was resumed from paused state — working now
- **Never delete package-lock.json** — use `npm ci`
- **NEXT ACTION**: Continue Manual Testing Plan from Section 5.2 (Create Activity), then Section 6 (Activity Timers — Start/Stop)
