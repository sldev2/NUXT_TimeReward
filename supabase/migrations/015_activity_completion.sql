-- ============================================
-- Migration 015: Activity Completion & Recurring Support
-- Adds check-off functionality to activities with
-- recurring vs non-recurring behavior (PRD 9.5)
-- ============================================

-- 1. Add completion-tracking fields to activity_timers
ALTER TABLE public.activity_timers
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.activity_timers
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.activity_timers
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.activity_timers.is_completed IS 
  'Whether the activity has been checked off (completed) for the current period.';
COMMENT ON COLUMN public.activity_timers.completed_at IS 
  'When the activity was last checked off. NULL if not completed.';
COMMENT ON COLUMN public.activity_timers.expires_at IS 
  'For non-recurring activities: when to hide after completion (next 3 AM rollover). NULL for recurring.';

-- 2. Change auto_repeat default from FALSE to TRUE
-- Recurring is the more common case (general activities like "Algebra Homework")
ALTER TABLE public.activities ALTER COLUMN auto_repeat SET DEFAULT true;

-- 3. Create toggle_activity_complete RPC function
CREATE OR REPLACE FUNCTION public.toggle_activity_complete(p_timer_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_activity_id UUID;
  v_is_completed BOOLEAN;
  v_auto_repeat BOOLEAN;
  v_next_3am TIMESTAMPTZ;
  v_result JSON;
BEGIN
  -- Get the timer details
  SELECT t.user_id, t.activity_id, t.is_completed, a.auto_repeat
  INTO v_user_id, v_activity_id, v_is_completed, v_auto_repeat
  FROM public.activity_timers t
  JOIN public.activities a ON a.id = t.activity_id
  WHERE t.id = p_timer_id;

  -- Verify ownership
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_is_completed THEN
    -- Un-check: clear completion state
    UPDATE public.activity_timers
    SET
      is_completed = FALSE,
      completed_at = NULL,
      expires_at = NULL,
      updated_at = NOW()
    WHERE id = p_timer_id;
  ELSE
    -- Check off: mark as completed
    -- Calculate next 3 AM for non-recurring expiration
    v_next_3am := date_trunc('day', NOW()) + INTERVAL '3 hours';
    IF NOW() >= v_next_3am THEN
      v_next_3am := v_next_3am + INTERVAL '1 day';
    END IF;

    -- Stop the timer if it's running or auto-paused
    IF EXISTS (
      SELECT 1 FROM public.activity_timers
      WHERE id = p_timer_id AND status IN ('running', 'auto_paused')
    ) THEN
      PERFORM public.stop_activity(p_timer_id);
    END IF;

    UPDATE public.activity_timers
    SET
      is_completed = TRUE,
      completed_at = NOW(),
      expires_at = CASE WHEN v_auto_repeat THEN NULL ELSE v_next_3am END,
      updated_at = NOW()
    WHERE id = p_timer_id;
  END IF;

  -- Return the updated timer state
  SELECT json_build_object(
    'timer_id', id,
    'is_completed', is_completed,
    'completed_at', completed_at,
    'expires_at', expires_at,
    'status', status
  ) INTO v_result
  FROM public.activity_timers
  WHERE id = p_timer_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.toggle_activity_complete(UUID) TO authenticated;

-- 4. Update reset_daily_timers to handle recurring activity un-checking
CREATE OR REPLACE FUNCTION public.reset_daily_timers(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verify ownership
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Reset today_seconds for all timers
  UPDATE public.activity_timers
  SET today_seconds = 0, updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Un-check recurring activities (they reappear each day)
  UPDATE public.activity_timers t
  SET
    is_completed = FALSE,
    completed_at = NULL,
    updated_at = NOW()
  FROM public.activities a
  WHERE t.activity_id = a.id
    AND t.user_id = p_user_id
    AND a.auto_repeat = TRUE
    AND t.is_completed = TRUE;

  -- Non-recurring activities with expires_at < NOW() remain completed
  -- They are filtered out in application queries
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
