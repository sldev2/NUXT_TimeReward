-- ============================================
-- Migration 012: Add include_non_rewardable_in_rewards to user_settings
-- Allows users to optionally include Non-Rewardable activity time in Rewardable Time / Rewards
-- ============================================

-- Add include_non_rewardable_in_rewards column to user_settings table
-- Default is TRUE (include Non-Rewardable in Rewardable Time calculations)
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS include_non_rewardable_in_rewards BOOLEAN DEFAULT true;

-- Add comment explaining the field
COMMENT ON COLUMN public.user_settings.include_non_rewardable_in_rewards IS 
  'When true, includes Non-Rewardable activity time in Rewardable Time and Reward progress calculations. Default: true.';

-- Update existing settings to have include_non_rewardable_in_rewards = true by default
UPDATE public.user_settings SET include_non_rewardable_in_rewards = true WHERE include_non_rewardable_in_rewards IS NULL;
