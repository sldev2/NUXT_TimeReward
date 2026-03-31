-- ============================================
-- Migration 021: Add baseline_seconds to user_breaks
--
-- When a break is created mid-day, it should not retroactively inherit
-- activity time accumulated before the break existed. baseline_seconds
-- captures the total qualifying activity seconds at the moment of creation.
--
-- On creation day: progress = max(0, totalToday - baseline_seconds)
-- On subsequent days: baseline_seconds is reset to 0 by daily rollover
-- ============================================

ALTER TABLE public.user_breaks
ADD COLUMN IF NOT EXISTS baseline_seconds INTEGER DEFAULT 0;
