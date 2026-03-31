-- ============================================
-- Migration 019: Fix start_activity to persist elapsed time when restarting
--
-- Bug: When restarting the SAME activity after AutoPause, the elapsed
-- time was lost because start_activity skipped stopping the timer
-- (AND id != p_timer_id) and then overwrote last_started_at with NOW().
--
-- Fix: Before resetting last_started_at, check if the timer being
-- started already has accumulated running time (status = running or
-- auto_paused with a last_started_at). If so, persist that time to
-- today_seconds and all_time_seconds first.
-- ============================================

CREATE OR REPLACE FUNCTION public.start_activity(p_timer_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_activity_id UUID;
  v_running_timer_id UUID;
  v_current_status TEXT;
  v_last_started_at TIMESTAMPTZ;
  v_elapsed_seconds INTEGER;
  v_result JSON;
BEGIN
  -- Get the user_id, activity_id, and current state for the timer
  SELECT user_id, activity_id, status, last_started_at
  INTO v_user_id, v_activity_id, v_current_status, v_last_started_at
  FROM public.activity_timers
  WHERE id = p_timer_id;

  -- Verify ownership
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Stop any OTHER running/auto_paused timer for this user
  SELECT id INTO v_running_timer_id
  FROM public.activity_timers
  WHERE user_id = v_user_id 
    AND status IN ('running', 'auto_paused')
    AND id != p_timer_id;

  IF v_running_timer_id IS NOT NULL THEN
    PERFORM public.stop_activity(v_running_timer_id);
  END IF;

  -- If THIS timer was running or auto_paused, persist its elapsed time
  -- before resetting last_started_at (prevents losing accumulated time)
  IF v_current_status IN ('running', 'auto_paused') AND v_last_started_at IS NOT NULL THEN
    v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_last_started_at))::INTEGER;

    UPDATE public.activity_timers
    SET
      today_seconds = today_seconds + v_elapsed_seconds,
      all_time_seconds = all_time_seconds + v_elapsed_seconds
    WHERE id = p_timer_id;

    -- Close the existing time log entry
    UPDATE public.activity_time_logs
    SET ended_at = NOW()
    WHERE timer_id = p_timer_id AND ended_at IS NULL;
  END IF;

  -- Start the timer fresh
  UPDATE public.activity_timers
  SET 
    status = 'running',
    last_started_at = NOW(),
    auto_pause_at = NULL,
    updated_at = NOW()
  WHERE id = p_timer_id;

  -- Create a new time log entry
  INSERT INTO public.activity_time_logs (user_id, activity_id, timer_id, started_at)
  VALUES (v_user_id, v_activity_id, p_timer_id, NOW());

  -- Return the updated timer
  SELECT json_build_object(
    'timer_id', id,
    'status', status,
    'last_started_at', last_started_at
  ) INTO v_result
  FROM public.activity_timers
  WHERE id = p_timer_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
