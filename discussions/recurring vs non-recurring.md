# Recurring vs Non-Recurring Rewards (PRD Summary)

## Section 11.2.2 — Non-Recurring vs Recurring Rewards

| Type | Behavior When Goal Reached |
|------|---------------------------|
| **Non-Recurring** (`is_recurring = false`) | Timer **stops accumulating** for the remainder of the reward period. Displays "Goal reached" or equivalent. |
| **Recurring** (`is_recurring = true`) | Timer **resets to 0** and immediately starts re-accumulating. Can be earned multiple times per period. |

## Section 11.4.5 — Real-time behavior

- Non-recurring reward: progress **freezes** when goal is reached
- Recurring reward: progress **resets to 0** and immediately begins re-accumulating

## Section 11.4.4 — Visual states

| State | Visual Appearance |
|-------|-------------------|
| **In Progress** | Normal card, progress bar partially filled. Cash In button disabled. |
| **Non-recurring goal reached** | "$" chip visible, "EARNED!" label, progress bar full. Timer stops. Cash In enabled. |
| **Recurring goal reached** | "$" chip visible (with unclaimed count if >1), progress bar shows current cycle. Cash In enabled. |

## Section 11.6 — Cash-In

Cash In is the sole mechanism for claiming earned rewards. There is no separate "Bank" step.

When a reward goal is reached, the user clicks **Cash In**. A simple confirmation dialog appears:
> "Cash in **{reward name}**?"
> [Cancel] [Cash In]

No description field is required. The system records the `cashed_at` timestamp automatically for potential future display.

- **Non-recurring**: After cashing in, reward remains in "completed" state for the rest of the period.
- **Recurring**: After cashing in, the earned cycle is consumed and progress continues toward the next cycle. If multiple cycles have been earned, the user can cash in again immediately.

## Helper text (Section 11.5.1)

> "Recurring rewards reset to 0 after being earned and can be earned multiple times per period. Non-recurring rewards stop accumulating once the goal is reached."

## Summary

- **Recurring** = earn it, cash it in, progress resets, earn it again
- **Non-recurring** = earn it once per period, progress freezes at 100%
- **Cash In** = "I earned it, I'm using it now." Records the redemption with a timestamp. For recurring rewards, consumes one earned cycle so progress can continue toward the next.

## Design Note — Why no "Bank" button?

The original design had two separate claiming mechanisms: **Bank** (save for later) and **Cash In** (use now). In practice, this created unnecessary friction and confusion. The simplified model uses only Cash In. The `cashed_in_rewards` table records all redemptions with timestamps, which is sufficient for history and analytics. The `banked_rewards` table is retained in the schema for backward compatibility but is no longer used in the UI.
