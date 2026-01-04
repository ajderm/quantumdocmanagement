-- Fix hubspot_tokens RLS policy to only allow service_role access
-- This prevents any authenticated users from accessing OAuth tokens

DROP POLICY IF EXISTS "Service role can manage tokens" ON public.hubspot_tokens;

CREATE POLICY "Service role can manage tokens"
  ON public.hubspot_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);