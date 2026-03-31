-- Allow stop_activity to accept the actual stop timestamp (for offline replay).
-- When a user stops an activity while offline, the client records the real stop time
-- and passes it on reconnection so elapsed-time calculations stay accurate.

CREATE OR REPLACE FUNCTION public.stop_activity(
  p_timer_id UUID,
  p_stopped_at TIMESTAMPTZ DEFAULT NOW()
)
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
  WHERE id = p_timer_id;

  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized or timer not found';
  END IF;

  -- Idempotent: if already stopped, return current state without mutation
  IF v_current_status NOT IN ('running', 'auto_paused') THEN
    SELECT json_build_object(
      'timer_id', id,
      'status', status,
      'today_seconds', today_seconds,
      'elapsed_seconds', 0,
      'idempotent', true
    ) INTO v_result
    FROM public.activity_timers
    WHERE id = p_timer_id;
    RETURN v_result;
  END IF;

  IF v_last_started_at IS NOT NULL THEN
    IF v_current_status = 'auto_paused' AND v_auto_pause_at IS NOT NULL THEN
      v_elapsed_seconds := EXTRACT(EPOCH FROM (v_auto_pause_at - v_last_started_at))::INTEGER;
    ELSE
      v_elapsed_seconds := EXTRACT(EPOCH FROM (p_stopped_at - v_last_started_at))::INTEGER;
    END IF;
  ELSE
    v_elapsed_seconds := 0;
  END IF;

  UPDATE public.activity_timers
  SET
    status = 'paused',
    today_seconds = today_seconds + v_elapsed_seconds,
    all_time_seconds = all_time_seconds + v_elapsed_seconds,
    last_stopped_at = p_stopped_at,
    last_started_at = NULL,
    auto_pause_at = NULL,
    updated_at = NOW()
  WHERE id = p_timer_id;

  UPDATE public.activity_time_logs
  SET ended_at = p_stopped_at
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
