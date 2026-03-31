-- ============================================
-- Migration 011: Get Email by Username RPC Function
-- Allows username-based login by looking up email from username
-- This function must be accessible by anonymous users (pre-login)
-- ============================================

-- Function to get email by username (for login)
-- SECURITY DEFINER runs with creator's privileges, bypassing RLS
-- This allows anonymous users to look up email for authentication
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Look up the email by username (case-insensitive)
  SELECT email INTO v_email
  FROM public.user_profiles
  WHERE LOWER(username) = LOWER(p_username);
  
  -- Return the email (or NULL if not found)
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anonymous users (for login) and authenticated users
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO authenticated;

-- Add a comment explaining the function's purpose
COMMENT ON FUNCTION public.get_email_by_username(TEXT) IS 
'Looks up user email by username for authentication. 
Returns NULL if username not found. 
Accessible by anonymous users to enable username-based login.';
