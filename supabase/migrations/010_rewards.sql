-- ============================================
-- Migration 010: Rewards System
-- Creates tables for rewards, breaks, and banking
-- ============================================

-- Reward types: daily, semi_weekly, weekly, monthly, quarterly, yearly
-- Rewards table
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('daily', 'semi_weekly', 'weekly', 'monthly', 'quarterly', 'yearly')),
  goal_minutes INTEGER NOT NULL DEFAULT 60,
  is_recurring BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User breaks (earned breaks from accumulated time)
CREATE TABLE IF NOT EXISTS public.user_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal_minutes INTEGER NOT NULL DEFAULT 30,
  break_duration_minutes INTEGER NOT NULL DEFAULT 5,
  progress_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT true,
  activated_today BOOLEAN DEFAULT false,
  last_start TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Banked rewards (rewards saved for later use)
CREATE TABLE IF NOT EXISTS public.banked_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  banked_at TIMESTAMPTZ DEFAULT NOW(),
  minutes_banked INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cashed in rewards (redeemed rewards)
CREATE TABLE IF NOT EXISTS public.cashed_in_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  banked_reward_id UUID REFERENCES public.banked_rewards(id) ON DELETE SET NULL,
  cashed_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banked_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashed_in_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rewards
CREATE POLICY "Users can view own rewards" 
  ON public.rewards FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards" 
  ON public.rewards FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards" 
  ON public.rewards FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rewards" 
  ON public.rewards FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for user_breaks
CREATE POLICY "Users can view own breaks" 
  ON public.user_breaks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own breaks" 
  ON public.user_breaks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own breaks" 
  ON public.user_breaks FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own breaks" 
  ON public.user_breaks FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for banked_rewards
CREATE POLICY "Users can view own banked rewards" 
  ON public.banked_rewards FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own banked rewards" 
  ON public.banked_rewards FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for cashed_in_rewards
CREATE POLICY "Users can view own cashed rewards" 
  ON public.cashed_in_rewards FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cashed rewards" 
  ON public.cashed_in_rewards FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_rewards_user_id ON public.rewards(user_id);
CREATE INDEX idx_rewards_type ON public.rewards(user_id, reward_type);
CREATE INDEX idx_user_breaks_user_id ON public.user_breaks(user_id);
CREATE INDEX idx_banked_rewards_user_id ON public.banked_rewards(user_id);
CREATE INDEX idx_banked_rewards_reward_id ON public.banked_rewards(reward_id);
CREATE INDEX idx_cashed_in_rewards_user_id ON public.cashed_in_rewards(user_id);

-- Apply updated_at triggers
CREATE TRIGGER set_rewards_updated_at
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_user_breaks_updated_at
  BEFORE UPDATE ON public.user_breaks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Realtime for rewards tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.rewards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_breaks;
