-- =============================================
-- Update RLS policies for profiles table
-- =============================================

-- Drop existing policies on profiles
DROP POLICY IF EXISTS "Admins can view dealer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create new policies explicitly for authenticated role only
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can view profiles in the same dealer account (same tenant)
CREATE POLICY "Users can view same dealer account profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    dealer_account_id IS NOT NULL 
    AND dealer_account_id = get_user_dealer_account_id()
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =============================================
-- Update RLS policies for dealer_accounts table
-- =============================================

-- Drop existing policies on dealer_accounts
DROP POLICY IF EXISTS "Admins can update dealer account" ON public.dealer_accounts;
DROP POLICY IF EXISTS "Users can view own dealer account" ON public.dealer_accounts;

-- Create new policies explicitly for authenticated role only
-- Users can view their own dealer account
CREATE POLICY "Users can view own dealer account"
  ON public.dealer_accounts
  FOR SELECT
  TO authenticated
  USING (id = get_user_dealer_account_id());

-- Admins can update their dealer account
CREATE POLICY "Admins can update dealer account"
  ON public.dealer_accounts
  FOR UPDATE
  TO authenticated
  USING (id = get_user_dealer_account_id() AND is_admin())
  WITH CHECK (id = get_user_dealer_account_id() AND is_admin());