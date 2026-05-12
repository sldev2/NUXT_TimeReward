# PRD — Rewards Properties Deltas: Parent Project vs. NUXT Migration

**Date**: March 11, 2026  
**Purpose**: Document reward type properties present in the Parent (Blazor) project but missing from the NUXT PRD (`docs/PRD - Nuxt Supabase Migration.md` v2.0).

---

## 1. Parent Project Reward Properties (from `UserReward.cs`)

The Parent project defines the following properties per reward type, each with typed ranges (`DataRange<T>`) containing Min, Max, Step, and a label:

### 1.1 Work Goal

| Reward Type | Units | Min | Max | Step | Default |
|-------------|-------|-----|-----|------|---------|
| **Daily** | Hours | 0.5 | 20 | 0.25 | 8 |
| **SemiWeekly** | Hours | 0.5 | 60 | 0.25 | 20 |
| **Weekly** | Hours | 0.5 | 280 | 0.25 | 40 |
| **Monthly** | Days | 1 | 24 | 1 | 20 |
| **Quarterly** | Weeks | 1 | 15 | 1 | 12 |
| **Yearly** | Weeks | 1 | 52 | 1 | 48 |

### 1.2 Expires After

All "Expires After" values are in **days**.

| Reward Type | Min | Max | Step | Default |
|-------------|-----|-----|------|---------|
| **Daily** | 1 | 3 | 1 | 1 |
| **SemiWeekly** | 2 | 4 | 1 | 3 |
| **Weekly** | 5 | 12 | 1 | 7 |
| **Monthly** | 10 | 40 | 1 | 20 |
| **Quarterly** | 10 | 60 | 1 | 45 |
| **Yearly** | 30 | 365 | 1 | 120 |

### 1.3 Reward Time (Timed Rewards)

| Reward Type | Units | Min | Max | Step | Default |
|-------------|-------|-----|-----|------|---------|
| **Daily** | Hours | 0.25 | 20 | 0.25 | 1 |
| **SemiWeekly** | Hours | 0.25 | 60 | 0.25 | 2.5 |
| **Weekly** | Hours | 0.25 | 280 | 0.25 | 4 |
| **Monthly** | Days | 1 | 3 | 1 | 1 |
| **Quarterly** | Days | 1 | 10 | 1 | 2 |
| **Yearly** | Days | 1 | 40 | 1 | 21 |

### 1.4 Additional Properties per Reward Type

| Property | Description | Parent Defaults by Type |
|----------|-------------|-------------------------|
| **IsTimed** | Whether the reward has a timed duration | User-configurable (boolean) |
| **IsProrated** | Whether partial progress earns partial reward | Daily: false; all others: true |

---

## 2. NUXT PRD Current State

The NUXT PRD (Section 11.5.1) defines the reward creation form as:

| Field | Type | Default | Validation |
|-------|------|---------|------------|
| **Name** | Text input | *(empty)* | Required, max 100 characters |
| **Reward Type** | Select dropdown | "daily" | Required, one of: daily, semi_weekly, weekly, monthly, quarterly, yearly |
| **Goal Time** | Number input (minutes) | 60 | Required, range: 1-10000 minutes |
| **Recurring** | Checkbox | Checked (true) | — |

The NUXT schema (`rewards` table) stores `goal_minutes INTEGER NOT NULL`.

---

## 3. Deltas — What the NUXT PRD Is Missing

### 3.1 Work Goal Units Vary by Reward Type

**Parent**: Work Goal units change based on reward type — Hours for Daily/SemiWeekly/Weekly, Days for Monthly, Weeks for Quarterly/Yearly. The label on the input field changes accordingly.

**NUXT**: Uses a flat "Goal Time (minutes)" for all reward types with a single range (1–10000 minutes). No unit switching, no per-type labels.

**Impact**: A user creating a Yearly reward must mentally convert "48 weeks of work" to minutes (483,840 minutes). The current max of 10000 minutes (≈7 days) is far too low for Monthly/Quarterly/Yearly rewards.

### 3.2 Per-Type Work Goal Ranges and Defaults

**Parent**: Each reward type has its own min/max/step/default (see Section 1.1). When the user switches reward type in the dialog, the range and default automatically update.

**NUXT**: Single static range (1–10000) and single default (60 minutes) regardless of type.

**Missing**: Dynamic range/default updating when reward type is changed.

### 3.3 "Expires After" Property — Entirely Missing

**Parent**: Each reward has an `ExpiresAfter` field (integer, in days) specifying how long after the period ends the reward remains available for banking/cash-in. Per-type ranges and defaults (see Section 1.2). The expiration date is calculated as `period_end + ExpiresAfter days`.

**NUXT PRD**: No mention of "Expires After" concept. No database column. No UI field. No expiration logic.

**Impact**: In the Parent project, a banked Weekly reward with `ExpiresAfter = 7` remains cash-in-able for 7 days after the week ends. Without this, the NUXT app has no mechanism to expire unclaimed rewards.

### 3.4 "Reward Time" (Timed Reward) Property — Entirely Missing

**Parent**: Each reward has a `TimedReward` field specifying the reward duration the user earns (e.g., "1 hour of gaming" for a Daily reward). Units vary by type — Hours for Daily/SemiWeekly/Weekly, Days for Monthly/Quarterly/Yearly. The `IsTimed` boolean controls whether this field is active.

**NUXT PRD**: No mention of timed rewards. The NUXT app tracks whether the goal is met but does not specify what the user *earns* in time terms.

### 3.5 "IsProrated" Property — Entirely Missing

**Parent**: The `IsProrated` boolean (default: false for Daily, true for all others) controls whether partial progress yields a proportionally reduced reward. For example, a Weekly reward at 75% progress earns 75% of the Reward Time.

**NUXT PRD**: No mention of proration. No database field. No UI.

### 3.6 "IsTimed" Property — Entirely Missing

**Parent**: Boolean flag indicating whether the reward has a time-based duration. When true, the "Reward Time" field is active and the `RewardAccumulated` display shows the proportional time earned.

**NUXT PRD**: Not present. All NUXT rewards are implicitly untimed — they track progress toward a goal but don't specify a reward duration.

### 3.7 Per-Type Step Sizes

**Parent**: Daily and SemiWeekly use 0.25 step sizes for Work Goal inputs (allowing quarter-hour increments). Other types use integer steps appropriate to their unit (1 day, 1 week).

**NUXT**: Single integer input with step=1 (minutes).

---

## 4. Summary Table

| Property | Parent Project | NUXT PRD | Status |
|----------|---------------|----------|--------|
| Work Goal field | Yes — per-type units (hr/day/wk) | Yes — flat minutes only | **Needs alignment** |
| Work Goal ranges (min/max/step) | Yes — per-type | Single range (1-10000) | **Needs alignment** |
| Work Goal defaults | Yes — per-type | Single default (60 min) | **Needs alignment** |
| Expires After field | Yes — per-type ranges in days | **Missing entirely** | **Missing** |
| Reward Time (TimedReward) field | Yes — per-type units | **Missing entirely** | **Missing** |
| IsTimed boolean | Yes | **Missing entirely** | **Missing** |
| IsProrated boolean | Yes | **Missing entirely** | **Missing** |
| Dynamic range update on type switch | Yes | No | **Missing** |

---

## 5. Recommendation

Before implementing these deltas, a decision is needed on which Parent properties should carry over to the NUXT migration:

1. **Work Goal units/ranges/defaults** — Strongly recommended. The current flat-minutes approach breaks down for Monthly/Quarterly/Yearly rewards.
2. **Expires After** — Recommended. Without it, banked rewards never expire, which may not be the desired behavior.
3. **Reward Time / IsTimed / IsProrated** — These are more complex features. Could be deferred to post-MVP if the NUXT app's simpler "earned/not-earned" model is acceptable for initial release.
