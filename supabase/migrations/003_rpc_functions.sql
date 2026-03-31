-- ============================================
-- Migration 003: RPC Functions
-- Atomic database functions for timer operations
-- ============================================

-- Function to start an activity (stops any running activity first)
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

  -- Stop any currently running timer for this user
  SELECT id INTO v_running_timer_id
  FROM public.activity_timers
  WHERE user_id = v_user_id AND status = 'running';

  IF v_running_timer_id IS NOT NULL THEN
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

-- Function to stop an activity
CREATE OR REPLACE FUNCTION public.stop_activity(p_timer_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_last_started_at TIMESTAMPTZ;
  v_elapsed_seconds INTEGER;
  v_result JSON;
BEGIN
  -- Get the timer details
  SELECT user_id, last_started_at INTO v_user_id, v_last_started_at
  FROM public.activity_timers
  WHERE id = p_timer_id AND status IN ('running', 'auto_paused');

  -- Verify ownership
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized or timer not running';
  END IF;

  -- Calculate elapsed seconds
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_last_started_at))::INTEGER;

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

-- Function to trigger auto-pause
CREATE OR REPLACE FUNCTION public.auto_pause_activity(p_timer_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Get the user_id
  SELECT user_id INTO v_user_id
  FROM public.activity_timers
  WHERE id = p_timer_id AND status = 'running';

  -- Verify ownership
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized or timer not running';
  END IF;

  -- Update timer to auto_paused
  UPDATE public.activity_timers
  SET 
    status = 'auto_paused',
    auto_pause_at = NOW(),
    updated_at = NOW()
  WHERE id = p_timer_id;

  -- Update the time log
  UPDATE public.activity_time_logs
  SET auto_pause_at = NOW()
  WHERE timer_id = p_timer_id AND ended_at IS NULL;

  -- Return result
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

-- Function to reset daily timers (called at midnight or on first access of new day)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's activity summary
CREATE OR REPLACE FUNCTION public.get_activity_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify ownership
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_rewardable_today', COALESCE(SUM(CASE WHEN a.activity_type = 'rewardable' THEN t.today_seconds ELSE 0 END), 0),
    'total_non_rewardable_today', COALESCE(SUM(CASE WHEN a.activity_type = 'non_rewardable' THEN t.today_seconds ELSE 0 END), 0),
    'total_wasted_today', COALESCE(SUM(CASE WHEN a.activity_type = 'wasted' THEN t.today_seconds ELSE 0 END), 0),
    'running_activity_id', (SELECT activity_id FROM public.activity_timers WHERE user_id = p_user_id AND status = 'running' LIMIT 1)
  ) INTO v_result
  FROM public.activities a
  JOIN public.activity_timers t ON a.id = t.activity_id
  WHERE a.user_id = p_user_id AND a.is_archived = false;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.start_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stop_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_pause_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_timers(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_summary(UUID) TO authenticated;
