# How Prorated Rewards Work in the Parent Blazor Project

## Core Concept

The parent project has three fields on `UserReward` that the NUXT migration doesn't have yet (deferred as "Group B"):

- **`IsProrated`** (bool) — whether partial progress earns a proportional reward
- **`IsTimed`** (bool) — whether the reward has a time-based value (e.g., "30 min of gaming")
- **`ExpiresAfter`** (int, days) — how long after a period ends before unclaimed rewards vanish

Proration only matters for **timed** rewards. If a reward is "30 minutes of gaming" and you achieve 60% of the work goal, your prorated reward is 18 minutes of gaming.

## The Splitting/Combining Logic (`RewardController.cs`)

The key method is `GetActiveRewards`:

```csharp
private List<ActiveReward> GetActiveRewards(UserBankedReward userBankedReward, int progress)
{
    var rewards = new List<ActiveReward>();
    while (progress > 0)
    {
        var activeReward = new ActiveReward(userBankedReward, Math.Min(progress, userBankedReward.EstimatedTime));
        rewards.Add(activeReward);
        progress -= userBankedReward.EstimatedTime;
        if (userBankedReward.UserReward.IsRecurring == false)
        {
            userBankedReward.WorkerComplete = progress >= 0;
            break;
        }
    }
    return rewards;
}
```

For **recurring** rewards, if you accumulate 2.5x the goal, you get 2 complete + 1 partial `ActiveReward` objects. Each is capped at the goal (`EstimatedTime`). For **non-recurring**, you get at most 1 reward.

These are split into two lists on each `UserBankedReward`:
- `CompleteRewards` — progress >= 100%
- `PartialRewards` — progress < 100% but >= 10%

## The 10% Lock Threshold

Partial rewards below 10% are **locked** (not cashable):

```csharp
public bool Locked => ProgressPercentage < 10;
```

This prevents trivially small reward fragments from cluttering the UI.

## Proration Math

The prorated reward amount is linear:

```
Prorated amount = TimedReward * (ProgressPercentage / 100)
```

For monthly/quarterly/yearly, `TimedReward` is in days (converted via x24x3600). For daily/weekly/semi-weekly, it's in hours (x3600).

## Expiration and Cross-Period Combining (`BuildExpires`)

This is where it gets interesting.

**Each reward type has a default expiration window:**

| Type | ExpiresAfter (days) |
|------|---------------------|
| Daily | 1 |
| SemiWeekly | 3 |
| Weekly | 7 |
| Monthly | 20 |
| Quarterly | 45 |
| Yearly | 120 |

`ExpiredOn = period_end + ExpiresAfter days`

The `BuildExpires` method does the combining:

1. Finds all non-expired `UserBankedReward` records for the same reward definition
2. **Same-period deduplication**: If an old banked reward has the same `StartDateTime` as the current one, its `CashedInReward` records are transferred to the current reward, and the old duplicate is deleted
3. **Cross-period accumulation**: Old non-expired banked rewards from **prior** periods get their progress recalculated, locked (`ProgressLocked = true`), and their completed/partial rewards are added to the current reward's display lists

## The Key Design Decision: "If a user does not use a combined reward before part of it expires"

The parent project handles this **by not actually combining banked rewards into a single merged record**. Instead:

- Each period's banked reward remains a separate `UserBankedReward` row in the database with its own `ExpiredOn` date
- `BuildExpires` merely **presents** them together in the UI by adding old rewards' `CompleteRewards` and `PartialRewards` to the current period's display lists
- When an old period's `ExpiredOn` passes, that `UserBankedReward` simply stops appearing (filtered out by `ExpiredOn > curTime`)
- The unexpired parts (from other periods) continue to appear because they have their own independent `ExpiredOn` dates

**In other words: the parent project avoids the combining-expiration problem entirely by never actually merging records.** Each period's reward lives and dies independently. The "combining" is purely a UI/presentation concern — multiple rewards from different periods are shown together in the same list, but each retains its own expiration lifecycle.

## The UI Presentation

The `RewardComponent.razor` shows:
- **Complete rewards** (filled dollar icon menu) — always shown when available
- **Partial rewards** (outline dollar icon menu) — only shown when `IsTimed && IsProrated && PartialRewards.Count > 0`

Each partial reward shows: `Prorated Length: X` (e.g., "Prorated Length: 18m")

## What NUXT Is Missing (Group B)

The NUXT migration currently has none of this:

| Feature | Blazor | NUXT |
|---------|--------|------|
| `is_prorated` | Per-reward boolean | Missing |
| `is_timed` / `timed_reward` | Duration-based rewards | Missing |
| `expires_after` / `expired_on` | Per-type expiration | Missing |
| `BuildExpires` (cross-period display) | Server-side | Missing |
| `GetActiveRewards` (splitting into chunks) | Server-side | Missing |
| 10% lock threshold | `Locked` property | Missing |
| `Progress` on `CashedInReward` | Tracks how much was cashed | Missing |

These are all documented as deferred "Group B" features in `NUXT_TimeReward/docs/historical/migration/Group B Rewards Implementation Plan.md`.

## Bottom Line

The parent project's design neatly sidesteps the expiration-of-combined-rewards problem. It never actually merges reward records — it keeps each period's reward as a separate database row with its own independent expiration date. The "combining" is purely a read-time presentation layer that collects all non-expired rewards for display. When part of a combined view expires, only that specific period's row disappears; everything else is unaffected.
