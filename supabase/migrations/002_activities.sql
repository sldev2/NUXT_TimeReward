-- ============================================
-- Migration 002: Activities and Timers
-- Creates the core activity tracking tables
-- ============================================

-- Activity types enum (using CHECK constraint for flexibility)
-- Types: 'rewardable', 'non_rewardable', 'wasted'

-- Activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('rewardable', 'non_rewardable', 'wasted')),
  sort_order INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity timers table (one per activity, tracks current state)
CREATE TABLE IF NOT EXISTS public.activity_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE UNIQUE,
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused', 'auto_paused')),
  today_seconds INTEGER DEFAULT 0,
  all_time_seconds INTEGER DEFAULT 0,
  last_started_at TIMESTAMPTZ,
  last_stopped_at TIMESTAMPTZ,
  auto_pause_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity time logs (historical record of each timer session)
CREATE TABLE IF NOT EXISTS public.activity_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  timer_id UUID NOT NULL REFERENCES public.activity_timers(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  auto_pause_at TIMESTAMPTZ,
  was_auto_stopped BOOLEAN DEFAULT false,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER
      ELSE NULL
    END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_time_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activities
CREATE POLICY "Users can view own activities" 
  ON public.activities FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" 
  ON public.activities FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities" 
  ON public.activities FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities" 
  ON public.activities FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for activity_timers
CREATE POLICY "Users can view own timers" 
  ON public.activity_timers FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own timers" 
  ON public.activity_timers FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timers" 
  ON public.activity_timers FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS Policies for activity_time_logs
CREATE POLICY "Users can view own time logs" 
  ON public.activity_time_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time logs" 
  ON public.activity_time_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time logs" 
  ON public.activity_time_logs FOR UPDATE 
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_user_type ON public.activities(user_id, activity_type);
CREATE INDEX idx_activity_timers_user_id ON public.activity_timers(user_id);
CREATE INDEX idx_activity_timers_status ON public.activity_timers(user_id, status);
CREATE INDEX idx_activity_time_logs_user_id ON public.activity_time_logs(user_id);
CREATE INDEX idx_activity_time_logs_activity_id ON public.activity_time_logs(activity_id);
CREATE INDEX idx_activity_time_logs_started_at ON public.activity_time_logs(started_at);

-- Apply updated_at triggers
CREATE TRIGGER set_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_activity_timers_updated_at
  BEFORE UPDATE ON public.activity_timers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
