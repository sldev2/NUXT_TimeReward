-- ============================================
-- Migration 017: Break Daily Reset
-- Update reset_daily_timers to also reset break-related fields
-- ============================================

-- Drop and recreate the function with break reset logic
CREATE OR REPLACE FUNCTION public.reset_daily_timers(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verify ownership
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Reset today_seconds for all activity timers
  UPDATE public.activity_timers
  SET today_seconds = 0, updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Reset breaks for new day (only recurring breaks)
  -- Non-recurring breaks that were activated stay activated
  UPDATE public.user_breaks
  SET 
    activated_today = false,
    progress_seconds = 0,
    completed_at = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id AND is_recurring = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.reset_daily_timers(UUID) IS 
  'Resets daily timers for activities and recurring breaks. Called at 3 AM rollover.';
