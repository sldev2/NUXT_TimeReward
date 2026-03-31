-- ============================================
-- Migration 025: Make timer RPCs idempotent (PRD 6.9)
--
-- stop_activity: return success if already paused/idle (instead of throwing)
-- start_activity: no-op if already running with recent last_started_at (<5s)
-- auto_pause_activity: return success if already auto_paused (instead of throwing)
--
-- This prevents errors from offline queue retries and rapid double-clicks.
-- ============================================

-- Idempotent stop_activity: returns current state if timer is already stopped
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


-- Idempotent start_activity: no-op if already running with recent start (<5s)
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


-- Idempotent auto_pause_activity: returns current state if already auto_paused
CREATE OR REPLACE FUNCTION public.auto_pause_activity(p_timer_id UUID)
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
    auto_pause_at = NOW(),
    updated_at = NOW()
  WHERE id = p_timer_id;

  UPDATE public.activity_time_logs
  SET auto_pause_at = NOW()
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
