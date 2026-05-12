# Group B Rewards Implementation Plan

**Created**: March 11, 2026  
**Status**: Deferred — to be implemented during "remaining migration work" phase (after Manual Testing Plan + visual pass)  
**PRD Reference**: `docs/PRD - Nuxt Supabase Migration.md` v2.1, Sections 11.8.1–11.8.3  
**Parent Project Reference**: `TimeReward/Shared/Models/DBModels/UserReward.cs`

---

## Overview

Group B covers three deferred reward properties from the Parent (Blazor) project that add depth to the Rewards system but are not required for core reward flow testing:

1. **Expires After** — time window for claiming earned rewards
2. **Timed Rewards** — specifying a reward duration (e.g., "1 hour of gaming")
3. **Proration** — partial progress yields proportionally reduced rewards

---

## 1. Expires After

### What It Does

Each reward has an `expires_after` value (in days) that defines how long after the reward period ends the earned reward remains claimable. After this window, unclaimed/unbanked rewards expire and are no longer available.

### Schema Change

```sql
-- Migration: add_reward_expiration.sql
ALTER TABLE public.rewards
  ADD COLUMN expires_after INTEGER NOT NULL DEFAULT 1;
```

Per-type defaults (set during reward creation):

| Reward Type | Default | Min | Max |
|-------------|---------|-----|-----|
| Daily | 1 | 1 | 3 |
| Semi-Weekly | 3 | 2 | 4 |
| Weekly | 7 | 5 | 12 |
| Monthly | 20 | 10 | 40 |
| Quarterly | 45 | 10 | 60 |
| Yearly | 120 | 30 | 365 |

### UI Changes

- Add "Expires After (days)" number input to the Create/Edit Reward dialog
- Input label, min, max, step, and default must update dynamically when reward type changes (same pattern as Work Goal)
- Helper text: "Number of days after the period ends that the reward remains claimable"

### Business Logic Changes

- `banked_rewards` table: add or use `expired_on` column (calculated as `period_end + expires_after days`)
- On reward list fetch: filter out expired unbanked rewards
- Display expired state on reward cards that have passed their window
- The Parent project calculates this in `UserBankedReward.UpdateTimeSpan()`: `ExpiredOn = EndDateTime.AddDays(UserReward.ExpiresAfter)`

### Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/0XX_reward_expiration.sql` | New: add `expires_after` column |
| `app/types/rewards.ts` | Add `expiresAfter` to `Reward` interface |
| `app/composables/useRewards.ts` | Include `expires_after` in CRUD operations, add expiration filtering |
| `app/pages/home.vue` | Add "Expires After" input to reward dialog, dynamic range update |
| `server/api/admin/load-demo-data.post.ts` | Set per-type `expires_after` defaults in demo rewards |

---

## 2. Timed Rewards (Reward Time / IsTimed)

### What It Does

A reward can optionally specify a **Reward Time** — the duration the user earns as their reward. For example, a Daily reward with Work Goal of 8 hours might earn 1 hour of gaming time. The `is_timed` boolean controls whether this field is active.

When `is_timed = true` and the reward is earned, the "Earned" display shows the reward duration (e.g., "Earned: 1h 0m") instead of just "EARNED!".

### Schema Change

```sql
-- Migration: add_timed_rewards.sql
ALTER TABLE public.rewards
  ADD COLUMN is_timed BOOLEAN DEFAULT FALSE,
  ADD COLUMN timed_reward DOUBLE PRECISION;
```

Per-type Reward Time properties:

| Reward Type | Units | Label | Min | Max | Step | Default |
|-------------|-------|-------|-----|-----|------|---------|
| Daily | Hours | "Reward Time (hours)" | 0.25 | 20 | 0.25 | 1 |
| Semi-Weekly | Hours | "Reward Time (hours)" | 0.25 | 60 | 0.25 | 2.5 |
| Weekly | Hours | "Reward Time (hours)" | 0.25 | 280 | 0.25 | 4 |
| Monthly | Days | "Reward Time (days)" | 1 | 3 | 1 | 1 |
| Quarterly | Days | "Reward Time (days)" | 1 | 10 | 1 | 2 |
| Yearly | Days | "Reward Time (days)" | 1 | 40 | 1 | 21 |

### UI Changes

- Add "Timed Reward" checkbox to Create/Edit dialog
- When checked, show "Reward Time" number input with dynamic label/range per type
- On reward cards: when `is_timed`, show earned reward duration (proportional to progress if prorated)
- Cash-In dialog: show the timed reward amount being claimed

### Business Logic

The Parent project calculates `RewardAccumulated` in `ActiveReward` constructor:
- For Monthly/Quarterly/Yearly: `timed_reward × 24 × 3600 × progressPercentage / 100` (days → seconds)
- For Daily/SemiWeekly/Weekly: `timed_reward × 3600 × progressPercentage / 100` (hours → seconds)
- Displayed via `UIHelper.GetTime()` formatting

### Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/0XX_timed_rewards.sql` | New: add `is_timed`, `timed_reward` columns |
| `app/types/rewards.ts` | Add `isTimed`, `timedReward` to `Reward` interface |
| `app/composables/useRewards.ts` | Include new fields in CRUD, add reward time calculation |
| `app/pages/home.vue` | Add timed reward toggle + input to dialog, show earned time on cards |
| `server/api/admin/load-demo-data.post.ts` | Set timed reward values in demo data |

---

## 3. Proration (IsProrated)

### What It Does

When `is_prorated = true`, partial progress toward a reward goal yields a proportionally reduced reward. For example, if a Weekly reward requires 40 hours of work and earns 4 hours of gaming, achieving 30 hours (75%) earns 3 hours of gaming.

When `is_prorated = false` (default for Daily), the reward is all-or-nothing — either the full goal is met or no reward is earned.

### Schema Change

```sql
-- Migration: add_reward_proration.sql
ALTER TABLE public.rewards
  ADD COLUMN is_prorated BOOLEAN DEFAULT FALSE;
```

Per-type defaults:

| Reward Type | Default IsProrated |
|-------------|-------------------|
| Daily | false |
| Semi-Weekly | true |
| Weekly | true |
| Monthly | true |
| Quarterly | true |
| Yearly | true |

### UI Changes

- Add "Pro-rated" checkbox to Create/Edit dialog (default set per type)
- Helper text: "When enabled, partial progress earns a proportional reward"
- On reward cards (when timed + prorated): show proportional earned amount even before goal is fully reached

### Business Logic

- Only meaningful when `is_timed = true` (proration of a non-timed reward has no visible effect)
- Reward amount = `timed_reward × (progress / goal)` when prorated
- The Parent checks `Locked => ProgressPercentage < 10` — rewards below 10% progress cannot be banked

### Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/0XX_reward_proration.sql` | New: add `is_prorated` column |
| `app/types/rewards.ts` | Add `isProrated` to `Reward` interface |
| `app/composables/useRewards.ts` | Include in CRUD, apply proration to earned amount calculation |
| `app/pages/home.vue` | Add proration checkbox to dialog, adjust earned display |
| `server/api/admin/load-demo-data.post.ts` | Set proration defaults in demo data |

---

## Implementation Order

Recommended sequence when this work begins:

1. **Expires After** (simplest, standalone — no dependency on other Group B features)
2. **Timed Rewards** (builds on existing reward structure, adds the reward duration concept)
3. **Proration** (depends on Timed Rewards — proration only applies to timed rewards)

Each can be implemented as a separate migration + code change + test cycle.

---

## Migrations Can Be Combined

While the implementation order above is recommended for incremental testing, all three schema changes could be combined into a single migration if preferred:

```sql
-- Migration: 0XX_reward_group_b_features.sql
ALTER TABLE public.rewards
  ADD COLUMN expires_after INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN is_timed BOOLEAN DEFAULT FALSE,
  ADD COLUMN timed_reward DOUBLE PRECISION,
  ADD COLUMN is_prorated BOOLEAN DEFAULT FALSE;
```
