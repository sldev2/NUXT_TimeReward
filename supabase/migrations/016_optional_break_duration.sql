-- ============================================
-- Migration 016: Make break_duration_minutes optional
-- Allows open-ended breaks without countdown timer
-- ============================================

-- Remove NOT NULL constraint from break_duration_minutes
-- NULL = open-ended break (no countdown timer)
ALTER TABLE public.user_breaks 
  ALTER COLUMN break_duration_minutes DROP NOT NULL;

-- Remove the default value (breaks should explicitly specify duration or leave null)
ALTER TABLE public.user_breaks 
  ALTER COLUMN break_duration_minutes DROP DEFAULT;

-- Add a comment for clarity
COMMENT ON COLUMN public.user_breaks.break_duration_minutes IS 
  'Duration of the earned break in minutes. NULL indicates an open-ended break with no countdown timer.';
