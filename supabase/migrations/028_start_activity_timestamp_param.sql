-- Allow start_activity to accept the actual start timestamp (for offline replay).
-- When a user starts an activity while offline, the client records the real start time
-- and passes it on reconnection so elapsed-time calculations stay accurate.
-- This complements migrations 026 (auto_pause_activity) and 027 (stop_activity)
-- which already accept client timestamps.

CREATE OR REPLACE FUNCTION public.start_activity(
  p_timer_id UUID,
  p_started_at TIMESTAMPTZ DEFAULT NOW()
)
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

  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized or timer not found';
  END IF;

  -- Idempotent: if already running and started very recently, return current state
  IF v_current_status = 'running'
     AND v_last_started_at IS NOT NULL
     AND NOW() - v_last_started_at < interval '5 seconds'
  THEN
    SELECT json_build_object(
      'timer_id', id,
      'status', status,
      'last_started_at', last_started_at,
      'idempotent', true
    ) INTO v_result
    FROM public.activity_timers
    WHERE id = p_timer_id;
    RETURN v_result;
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

  -- Start the timer using the provided timestamp (real start time for offline replay)
  UPDATE public.activity_timers
  SET 
    status = 'running',
    last_started_at = p_started_at,
    auto_pause_at = NULL,
    updated_at = NOW()
  WHERE id = p_timer_id;

  INSERT INTO public.activity_time_logs (user_id, activity_id, timer_id, started_at)
  VALUES (v_user_id, v_activity_id, p_timer_id, p_started_at);

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
