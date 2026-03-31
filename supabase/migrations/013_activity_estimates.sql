-- Migration 013: Add activity time estimate fields and description
-- These fields allow users to set time goals for individual activities

-- Add description field
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add estimate type field (none, general, weekday)
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS estimate_type TEXT DEFAULT 'none' 
CHECK (estimate_type IN ('none', 'general', 'weekday'));

-- Add general daily estimate (in hours)
-- Range: 0.25 - 14.0 hours, default 1.0 (NUXT differs from parent's 0.25)
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS general_estimate_hours DOUBLE PRECISION DEFAULT 1.0;

-- Add weekday-specific estimates (in hours)
-- Range: 0.0 - 14.0 hours
-- NUXT defaults: 1.0 for Mon-Fri, 0.0 for Sat-Sun
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS estimate_mon DOUBLE PRECISION DEFAULT 1.0;

ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS estimate_tue DOUBLE PRECISION DEFAULT 1.0;

ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS estimate_wed DOUBLE PRECISION DEFAULT 1.0;

ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS estimate_thu DOUBLE PRECISION DEFAULT 1.0;

ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS estimate_fri DOUBLE PRECISION DEFAULT 1.0;

ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS estimate_sat DOUBLE PRECISION DEFAULT 0.0;

ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS estimate_sun DOUBLE PRECISION DEFAULT 0.0;

-- Add comment for documentation
COMMENT ON COLUMN public.activities.estimate_type IS 'Time estimate type: none (no estimate), general (same daily), weekday (per day)';
COMMENT ON COLUMN public.activities.general_estimate_hours IS 'General daily estimate in hours (0.25-14.0), used when estimate_type=general';
COMMENT ON COLUMN public.activities.estimate_mon IS 'Monday estimate in hours (0.0-14.0), used when estimate_type=weekday';
COMMENT ON COLUMN public.activities.estimate_tue IS 'Tuesday estimate in hours (0.0-14.0), used when estimate_type=weekday';
COMMENT ON COLUMN public.activities.estimate_wed IS 'Wednesday estimate in hours (0.0-14.0), used when estimate_type=weekday';
COMMENT ON COLUMN public.activities.estimate_thu IS 'Thursday estimate in hours (0.0-14.0), used when estimate_type=weekday';
COMMENT ON COLUMN public.activities.estimate_fri IS 'Friday estimate in hours (0.0-14.0), used when estimate_type=weekday';
COMMENT ON COLUMN public.activities.estimate_sat IS 'Saturday estimate in hours (0.0-14.0), used when estimate_type=weekday';
COMMENT ON COLUMN public.activities.estimate_sun IS 'Sunday estimate in hours (0.0-14.0), used when estimate_type=weekday';
