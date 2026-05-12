# Session Notes - 2026-03-10

## Summary

Addressed offline authentication UX (misleading "Invalid username or password" error when offline), discovered and documented comprehensive Rewards properties gaps between the Parent (Blazor) project and the NUXT migration, and established a plan for implementing them in two groups.

---

## Issues Fixed

### 1. Offline Login Shows Wrong Error Message

**Symptom:** When the user has no internet connection and attempts to log in, the error message displayed is "Invalid username or password" — which is misleading since the real problem is connectivity.

**Root cause:** `useAuth.ts` treated all errors from the `get_email_by_username` RPC call identically — network failures and "username not found" both threw the same "Invalid username or password" message.

**Fix:**
- Added `isNetworkError()` helper function that detects offline state (`navigator.onLine === false`) and fetch-related `TypeError` exceptions
- `signIn()` and `signUp()` now wrap Supabase calls with network-aware try/catch
- Network errors show: "Unable to connect. Please check your internet connection and try again."
- Credential errors still show: "Invalid username or password"
- Generic fallback changed from "An error occurred" to "Something went wrong. Please try again in a moment."
- Login and Registration pages now show an amber offline banner when `!isOnline`
- Sign In / Create Account buttons are disabled when offline

**PRD update:** Added Section 7.3 (Offline-Aware Authentication) with subsections 7.3.1–7.3.4. PRD version bumped to v2.0.

---

## Rewards Properties Analysis

### Discovery

While reviewing the Manual Testing Plan for Rewards (Sections 10.1–10.8), we identified that the NUXT PRD had a significantly simplified reward model compared to the Parent project. A thorough analysis of `TimeReward/Shared/Models/DBModels/UserReward.cs` revealed multiple missing properties.

### Deltas Document

Created `docs/historical/migration/PRD - Nuxt Supabase Migration.Rewards Deltas March11.md` (since moved from `docs/` root) documenting all differences between the Parent project's reward system and the NUXT PRD.

### Group A vs Group B Decision

Split the missing properties into two implementation groups:

**Group A (implement now, before testing Rewards sections 10.x):**
- Work Goal units vary by type (Hours for Daily/SemiWeekly/Weekly, Days for Monthly, Weeks for Quarterly/Yearly)
- Per-type ranges, step sizes, and defaults
- Dynamic range/default update when reward type is switched in dialog
- Conversion formula from work_goal to goal_minutes

**Group B (deferred to remaining migration work phase):**
- Expires After — time window for claiming rewards after period ends
- Timed Rewards / IsTimed — reward duration (e.g., "1 hour of gaming")
- IsProrated — partial progress yields proportional reward

**Rationale:** Group A fixes a fundamentally broken input model (flat minutes for all types makes Monthly/Quarterly/Yearly unusable). Group B adds depth but doesn't block core reward testing.

### PRD Update

Updated the main PRD to v2.1:
- Added Section 11.7 (Reward Type Properties Reference) with full per-type tables
- Updated Section 11.5.1 (Create Reward Dialog) with dynamic Work Goal field spec
- Added Section 11.8 (Deferred Reward Properties) documenting Group B for future implementation
- Updated rewards schema with `work_goal` and `work_goal_unit` columns
- Updated tab labels: Qtr→Quarterly, Yr→Yearly, SemiWeekly→Semi-Weekly

### Group B Implementation Plan

Created `docs/historical/migration/Group B Rewards Implementation Plan.md` (since moved from `docs/` root) with detailed implementation guidance for each Group B feature:
- Schema migrations needed
- UI changes per feature
- Business logic references to Parent project code
- Files to modify
- Recommended implementation order (Expires After → Timed Rewards → Proration)

---

## Manual Testing Plan Updates

- Sections 8.4–8.10: Marked as done (Earned Breaks cash-in flow)
- Section 8.11: Marked as done (Recurring Break Reset)
- Sections 9.1–9.3: Marked as done (Rewardable Time display, incrementing, non-rewardable contribution)
- Added Sections 14.3 (Offline Login) and 14.4 (Offline Registration) test items

---

## Other Changes

- Reward tab labels changed in `home.vue`: "Semi-Wk" → "Semi-Weekly", "Qtr" → "Quarterly"

---

## Agreed Sequencing (Updated)

1. **Group A reward fixes** (next session) — dynamic Work Goal units/ranges/defaults
2. **Continue Manual Testing** Sections 9.4 → 10.x → onward
3. **Fix bugs** found during testing
4. **Visual pass** (MudBlazor approximation)
5. **Remaining migration work** (Phases 5–7) including Group B reward features

---

## Files Changed

| File | Change |
|------|--------|
| `docs/PRD - Nuxt Supabase Migration.md` | v2.0→v2.1: Section 7.3, 11.5.1, 11.7, 11.8; schema update; tab labels |
| `app/composables/useAuth.ts` | Network-aware error handling in signIn/signUp |
| `app/pages/login.vue` | Offline banner, disabled button when offline |
| `app/pages/register.vue` | Offline banner, disabled button when offline |
| `app/pages/home.vue` | Tab labels: Semi-Wk→Semi-Weekly, Qtr→Quarterly |
| `NUXT_TimeReward/docs/Manual Testing Plan.md` | Sections 8.4–8.11, 9.1–9.3 marked done; added 14.3, 14.4 |
| `docs/historical/migration/PRD - Nuxt Supabase Migration.Rewards Deltas March11.md` | New: analysis document (archived under historical/migration) |
| `docs/historical/migration/Group B Rewards Implementation Plan.md` | New: deferred implementation plan (archived under historical/migration) |

---

## Next Actions

- Start new chat session
- Create Group A implementation plan (checklist with ai/human/both prefixes)
- Implement Group A: dynamic Work Goal field with per-type units, ranges, defaults, and conversion
- Continue Manual Testing from Section 9.4
