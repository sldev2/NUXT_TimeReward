-- ============================================
-- Migration 009: Add audio_on_auto_pause to user_settings
-- Enables audio notification when auto-pause triggers
-- ============================================

-- Add audio_on_auto_pause column to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS audio_on_auto_pause BOOLEAN DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN public.user_settings.audio_on_auto_pause IS 
  'When true, plays an audio notification when auto-pause triggers.';

-- Update existing settings to have audio_on_auto_pause = false by default
UPDATE public.user_settings SET audio_on_auto_pause = false WHERE audio_on_auto_pause IS NULL;
