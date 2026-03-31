-- ============================================
-- Migration 005: Seed Test User (Development Only)
-- Creates the "kyrie" test user with demo activities
-- 
-- NOTE: This should only be run in development/test environments
-- The auth.users insert requires service_role access
-- ============================================

-- First, check if test user already exists
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if kyrie already exists
  SELECT id INTO v_user_id FROM public.user_profiles WHERE username = 'kyrie';
  
  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'Test user "kyrie" already exists, skipping seed';
    RETURN;
  END IF;

  -- Note: Creating auth.users requires using Supabase Admin API or Dashboard
  -- This script assumes the auth user was created via the Admin API with:
  --   email: kyrie@timereward.local
  --   password: @Password1
  -- 
  -- After creating the auth user, get its UUID and insert the profile below:
  
  RAISE NOTICE 'Test user seed script - see comments for instructions';
  RAISE NOTICE 'Create auth user via Supabase Dashboard or Admin API first';
  
END $$;

-- ============================================
-- Manual Steps to Create Test User:
-- ============================================
-- 
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" > "Create New User"
-- 3. Enter:
--    - Email: kyrie@timereward.local
--    - Password: @Password1
--    - Check "Auto Confirm User"
-- 4. Copy the generated UUID
-- 5. Run the following SQL (replace YOUR_USER_UUID):
--
-- INSERT INTO public.user_profiles (id, username, display_name, email, subscription_status)
-- VALUES ('YOUR_USER_UUID', 'kyrie', 'KYRIE IRVING', 'kyrie@timereward.local', 'active');
--
-- INSERT INTO public.user_settings (user_id)
-- VALUES ('YOUR_USER_UUID');
--
-- -- Create demo activities
-- INSERT INTO public.activities (user_id, name, activity_type, sort_order) VALUES
--   ('YOUR_USER_UUID', 'Work', 'rewardable', 1),
--   ('YOUR_USER_UUID', 'Test', 'rewardable', 2),
--   ('YOUR_USER_UUID', 'Chores', 'non_rewardable', 3),
--   ('YOUR_USER_UUID', 'Facebook', 'wasted', 4);
--
-- -- Create timers for each activity
-- INSERT INTO public.activity_timers (user_id, activity_id)
-- SELECT user_id, id FROM public.activities WHERE user_id = 'YOUR_USER_UUID';
-- ============================================
