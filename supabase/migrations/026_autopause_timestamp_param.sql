-- Allow auto_pause_activity to accept the actual pause timestamp (for offline replay).
-- When autopause triggers while offline, the client records the real pause time and
-- passes it on reconnection so elapsed-time calculations stay accurate.

CREATE OR REPLACE FUNCTION public.auto_pause_activity(
  p_timer_id UUID,
  p_paused_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
  v_result JSON;
BEGIN
  SELECT user_id, status INTO v_user_id, v_current_status
  FROM public.activity_timers
  WHERE id = p_timer_id;

  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized or timer not found';
  END IF;

  -- Idempotent: if already auto_paused, return current state without mutation
  IF v_current_status = 'auto_paused' THEN
    SELECT json_build_object(
      'timer_id', id,
      'status', status,
      'auto_pause_at', auto_pause_at,
      'idempotent', true
    ) INTO v_result
    FROM public.activity_timers
    WHERE id = p_timer_id;
    RETURN v_result;
  END IF;

  IF v_current_status != 'running' THEN
    RAISE EXCEPTION 'Timer is not running';
  END IF;

  UPDATE public.activity_timers
  SET 
    status = 'auto_paused',
    auto_pause_at = p_paused_at,
    updated_at = NOW()
  WHERE id = p_timer_id;

  UPDATE public.activity_time_logs
  SET auto_pause_at = p_paused_at
  WHERE timer_id = p_timer_id AND ended_at IS NULL;

  SELECT json_build_object(
    'timer_id', id,
    'status', status,
    'auto_pause_at', auto_pause_at
  ) INTO v_result
  FROM public.activity_timers
  WHERE id = p_timer_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
