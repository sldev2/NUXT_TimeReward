-- ============================================
-- Migration 018: Add auto_pause_cumulative_base to user_settings
--
-- Tracks the cumulative seconds already "consumed" by previous
-- AutoPause cycles today. Enables the "fresh window" behavior
-- described in PRD 4.1.1: after AutoPause fires, starting any
-- activity gives a new N-minute window.
--
-- Reset to 0 at daily rollover (3 AM).
-- ============================================

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS auto_pause_cumulative_base INTEGER DEFAULT 0;
