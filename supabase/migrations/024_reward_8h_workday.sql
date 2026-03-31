-- ============================================
-- Migration 024: Reward 8-hour Work-Day Conversion
-- Recalculates goal_minutes for monthly/quarterly/yearly rewards
-- to use work-time constants instead of calendar-time constants.
--
-- Old conversion (calendar): days=goal*1440, weeks=goal*10080
-- New conversion (work-time): days=goal*480 (8h), weeks=goal*2400 (5d*8h)
--
-- Daily/semi_weekly/weekly rewards are unaffected (stored in hours*60).
-- ============================================

UPDATE public.rewards SET
  goal_minutes = CASE
    WHEN reward_type = 'monthly' THEN work_goal * 480
    WHEN reward_type IN ('quarterly', 'yearly') THEN work_goal * 2400
    ELSE goal_minutes
  END
WHERE reward_type IN ('monthly', 'quarterly', 'yearly')
  AND work_goal IS NOT NULL;
