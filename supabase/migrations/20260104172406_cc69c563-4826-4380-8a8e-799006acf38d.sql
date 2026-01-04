-- Fix: Restrict installation_configurations to service_role only
-- The current policy uses USING (true) which allows any role to access

DROP POLICY IF EXISTS "Service role can manage installation configurations" ON public.installation_configurations;

CREATE POLICY "Service role can manage installation configurations"
  ON public.installation_configurations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);