-- Migration 014: Add average work day/week settings for Rewardable Time goals
-- These settings are used to calculate progress percentage for the dashboard progress circles

-- Add average work day setting (in hours)
-- Range: 1.0 - 15.0 hours, default 8.0
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS average_work_day DOUBLE PRECISION DEFAULT 8.0;

-- Add average work week setting (in hours)
-- Range: 5.0 - 100.0 hours, default 40.0
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS average_work_week DOUBLE PRECISION DEFAULT 40.0;

-- Add comments for documentation
COMMENT ON COLUMN public.user_settings.average_work_day IS 'Expected daily rewardable time goal in hours (1.0-15.0)';
COMMENT ON COLUMN public.user_settings.average_work_week IS 'Expected weekly rewardable time goal in hours (5.0-100.0)';
