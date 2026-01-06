-- Fix: restrict hubspot_tokens access to service role only
-- This prevents any authenticated end-user from reading OAuth tokens.

-- Ensure RLS is enabled
ALTER TABLE public.hubspot_tokens ENABLE ROW LEVEL SECURITY;

-- Remove any existing broad policy
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.hubspot_tokens;

-- Create a strict service-role-only policy
CREATE POLICY "Service role can manage tokens"
ON public.hubspot_tokens
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Ensure no accidental privileges are granted via table grants
REVOKE ALL ON TABLE public.hubspot_tokens FROM anon;
REVOKE ALL ON TABLE public.hubspot_tokens FROM authenticated;