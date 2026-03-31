-- ============================================
-- Migration 008: Add auto_repeat field to activities
-- Controls visibility of "All" timer display
-- ============================================

-- Add auto_repeat column to activities table
-- When true, the "All" (total historical) time is shown on the activity card
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS auto_repeat BOOLEAN DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN public.activities.auto_repeat IS 
  'When true, shows the "All" (total historical) time on the activity card. Used for recurring activities.';

-- Update existing activities to have auto_repeat = false by default
UPDATE public.activities SET auto_repeat = false WHERE auto_repeat IS NULL;
