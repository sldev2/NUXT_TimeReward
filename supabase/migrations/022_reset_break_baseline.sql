-- ============================================
-- Migration 022: Reset baseline_seconds in daily rollover
--
-- After the 3 AM rollover, all breaks should start counting from 0.
-- baseline_seconds must be reset for both recurring and non-recurring
-- breaks so that day-2+ progress is not offset by a stale baseline.
-- ============================================

CREATE OR REPLACE FUNCTION public.reset_daily_timers(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.activity_timers
  SET today_seconds = 0, updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Reset breaks for new day (recurring breaks get full reset)
  UPDATE public.user_breaks
  SET 
    activated_today = false,
    progress_seconds = 0,
    completed_at = NULL,
    baseline_seconds = 0,
    updated_at = NOW()
  WHERE user_id = p_user_id AND is_recurring = true;

  -- Reset baseline for non-recurring breaks too (they keep other state)
  UPDATE public.user_breaks
  SET
    baseline_seconds = 0,
    updated_at = NOW()
  WHERE user_id = p_user_id AND is_recurring = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
