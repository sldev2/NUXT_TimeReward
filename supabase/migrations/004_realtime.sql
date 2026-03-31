-- ============================================
-- Migration 004: Realtime Configuration
-- Enables Supabase Realtime for live sync
-- ============================================

-- Enable realtime for activity_timers (main sync table)
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_timers;

-- Enable realtime for activities (for CRUD sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;

-- Enable realtime for user_settings (for settings sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;

-- Note: user_profiles and activity_time_logs don't need realtime
-- as they are not frequently updated in real-time scenarios
