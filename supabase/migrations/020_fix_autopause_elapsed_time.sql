-- ============================================
-- Migration 020: Fix elapsed time calculation for auto-paused timers
--
-- Bug: Both stop_activity and start_activity used NOW() - last_started_at
-- to calculate elapsed seconds. When a timer was in 'auto_paused' state,
-- this included the idle time AFTER auto-pause fired. The correct
-- calculation for auto-paused timers is auto_pause_at - last_started_at
-- (the active running window only).
--
-- PRD 9.4.3: "Time spent in the auto-paused state does not count toward
-- today_seconds, all_time_seconds, or any display timer."
-- ============================================

-- Fix stop_activity: use auto_pause_at when timer is auto_paused
CREATE OR REPLACE FUNCTION public.stop_activity(p_timer_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
  v_last_started_at TIMESTAMPTZ;
  v_auto_pause_at TIMESTAMPTZ;
  v_elapsed_seconds INTEGER;
  v_result JSON;
BEGIN
  SELECT user_id, status, last_started_at, auto_pause_at
  INTO v_user_id, v_current_status, v_last_started_at, v_auto_pause_at
  FROM public.activity_timers
  WHERE id = p_timer_id AND status IN ('running', 'auto_paused');

  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized or timer not running';
  END IF;

  IF v_last_started_at IS NOT NULL THEN
    IF v_current_status = 'auto_paused' AND v_auto_pause_at IS NOT NULL THEN
      v_elapsed_seconds := EXTRACT(EPOCH FROM (v_auto_pause_at - v_last_started_at))::INTEGER;
    ELSE
      v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_last_started_at))::INTEGER;
    END IF;
  ELSE
    v_elapsed_seconds := 0;
  END IF;

  UPDATE public.activity_timers
  SET
    status = 'paused',
    today_seconds = today_seconds + v_elapsed_seconds,
    all_time_seconds = all_time_seconds + v_elapsed_seconds,
    last_stopped_at = NOW(),
    last_started_at = NULL,
    auto_pause_at = NULL,
    updated_at = NOW()
  WHERE id = p_timer_id;

  UPDATE public.activity_time_logs
  SET ended_at = NOW()
  WHERE timer_id = p_timer_id AND ended_at IS NULL;

  SELECT json_build_object(
    'timer_id', id,
    'status', status,
    'today_seconds', today_seconds,
    'elapsed_seconds', v_elapsed_seconds
  ) INTO v_result
  FROM public.activity_timers
  WHERE id = p_timer_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fix start_activity: use auto_pause_at when persisting time for auto-paused timer
CREATE OR REPLACE FUNCTION public.start_activity(p_timer_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_activity_id UUID;
  v_running_timer_id UUID;
  v_current_status TEXT;
  v_last_started_at TIMESTAMPTZ;
  v_auto_pause_at TIMESTAMPTZ;
  v_elapsed_seconds INTEGER;
  v_result JSON;
BEGIN
  SELECT user_id, activity_id, status, last_started_at, auto_pause_at
  INTO v_user_id, v_activity_id, v_current_status, v_last_started_at, v_auto_pause_at
  FROM public.activity_timers
  WHERE id = p_timer_id;

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
  IF v_current_status IN ('running', 'auto_paused') AND v_last_started_at IS NOT NULL THEN
    IF v_current_status = 'auto_paused' AND v_auto_pause_at IS NOT NULL THEN
      v_elapsed_seconds := EXTRACT(EPOCH FROM (v_auto_pause_at - v_last_started_at))::INTEGER;
    ELSE
      v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_last_started_at))::INTEGER;
    END IF;

    UPDATE public.activity_timers
    SET
      today_seconds = today_seconds + v_elapsed_seconds,
      all_time_seconds = all_time_seconds + v_elapsed_seconds
    WHERE id = p_timer_id;

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

  INSERT INTO public.activity_time_logs (user_id, activity_id, timer_id, started_at)
  VALUES (v_user_id, v_activity_id, p_timer_id, NOW());

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
