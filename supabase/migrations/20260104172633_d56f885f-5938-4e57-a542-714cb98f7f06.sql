-- Fix: Restrict hubspot_tokens to service_role only
-- This is critical - contains OAuth access and refresh tokens

DROP POLICY IF EXISTS "Service role can manage tokens" ON public.hubspot_tokens;

CREATE POLICY "Service role can manage tokens"
  ON public.hubspot_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);