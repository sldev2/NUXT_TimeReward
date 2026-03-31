-- ============================================
-- Migration 023: Reward Work Goal (Group A)
-- Adds work_goal and work_goal_unit columns to rewards table.
-- 
-- Background: The original schema stored only goal_minutes (flat integer).
-- PRD v2.1 Section 11.7 specifies that each reward type uses different
-- Work Goal units: hours (daily/semi_weekly/weekly), days (monthly),
-- weeks (quarterly/yearly). These new columns store the human-friendly
-- value and unit alongside the computed goal_minutes.
-- ============================================

-- Add columns
ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS work_goal DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS work_goal_unit TEXT;

-- Backfill existing rows from goal_minutes + reward_type
-- Conversion: hours=goal_minutes/60, days=goal_minutes/480 (8h/day), weeks=goal_minutes/2400 (5d*8h)
UPDATE public.rewards SET
  work_goal = CASE
    WHEN reward_type IN ('daily', 'semi_weekly', 'weekly') THEN goal_minutes / 60.0
    WHEN reward_type = 'monthly' THEN goal_minutes / 480.0
    WHEN reward_type IN ('quarterly', 'yearly') THEN goal_minutes / 2400.0
    ELSE goal_minutes
  END,
  work_goal_unit = CASE
    WHEN reward_type IN ('daily', 'semi_weekly', 'weekly') THEN 'hours'
    WHEN reward_type = 'monthly' THEN 'days'
    WHEN reward_type IN ('quarterly', 'yearly') THEN 'weeks'
    ELSE 'minutes'
  END
WHERE work_goal IS NULL;
