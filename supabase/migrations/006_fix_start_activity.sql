-- ============================================
-- Migration 006: Fix start_activity to handle auto_paused timers
-- 
-- Problem: When switching activities, if the previous activity was 
-- already auto_paused, it remains in that state instead of being 
-- properly stopped. This causes multiple activities to show as 
-- "auto_paused" simultaneously.
--
-- Fix: Also stop timers with status 'auto_paused', not just 'running'
-- ============================================

-- Function to start an activity (stops any running OR auto_paused activity first)
CREATE OR REPLACE FUNCTION public.start_activity(p_timer_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_activity_id UUID;
  v_running_timer_id UUID;
  v_result JSON;
BEGIN
  -- Get the user_id and activity_id for the timer
  SELECT user_id, activity_id INTO v_user_id, v_activity_id
  FROM public.activity_timers
  WHERE id = p_timer_id;

  -- Verify ownership
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Stop any currently running OR auto_paused timer for this user
  -- (A user should never have more than one active/auto-paused timer)
  SELECT id INTO v_running_timer_id
  FROM public.activity_timers
  WHERE user_id = v_user_id 
    AND status IN ('running', 'auto_paused')  -- Changed: now also handles auto_paused
    AND id != p_timer_id;  -- Don't stop the timer we're about to start

  IF v_running_timer_id IS NOT NULL THEN
    -- Stop the previous timer (this handles time calculation and status update)
    PERFORM public.stop_activity(v_running_timer_id);
  END IF;

  -- Start the new timer
  UPDATE public.activity_timers
  SET 
    status = 'running',
    last_started_at = NOW(),
    auto_pause_at = NULL,
    updated_at = NOW()
  WHERE id = p_timer_id;

  -- Create a time log entry
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

-- Also update stop_activity to handle being called on an already-stopped timer gracefully
-- (This prevents errors when stop is called on a timer that was auto-paused by another client)
CREATE OR REPLACE FUNCTION public.stop_activity(p_timer_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_last_started_at TIMESTAMPTZ;
  v_elapsed_seconds INTEGER;
  v_result JSON;
  v_current_status TEXT;
BEGIN
  -- Get the timer details
  SELECT user_id, last_started_at, status INTO v_user_id, v_last_started_at, v_current_status
  FROM public.activity_timers
  WHERE id = p_timer_id;

  -- Verify ownership
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Only process if timer is actually running or auto_paused
  IF v_current_status NOT IN ('running', 'auto_paused') THEN
    -- Timer is already stopped, just return current state
    SELECT json_build_object(
      'timer_id', id,
      'status', status,
      'today_seconds', today_seconds,
      'elapsed_seconds', 0,
      'already_stopped', true
    ) INTO v_result
    FROM public.activity_timers
    WHERE id = p_timer_id;
    
    RETURN v_result;
  END IF;

  -- Calculate elapsed seconds (only if we have a start time)
  IF v_last_started_at IS NOT NULL THEN
    v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_last_started_at))::INTEGER;
  ELSE
    v_elapsed_seconds := 0;
  END IF;

  -- Update the timer (use 'paused' status for manual stops, distinct from 'idle')
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

  -- Close the time log entry
  UPDATE public.activity_time_logs
  SET ended_at = NOW()
  WHERE timer_id = p_timer_id AND ended_at IS NULL;

  -- Return the updated timer
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
