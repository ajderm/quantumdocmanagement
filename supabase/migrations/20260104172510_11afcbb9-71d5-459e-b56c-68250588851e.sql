-- Fix: Restrict dealer_settings to service_role only
-- The current policy uses USING (true) which allows any role to access

DROP POLICY IF EXISTS "Service role can manage dealer settings" ON public.dealer_settings;

CREATE POLICY "Service role can manage dealer settings"
  ON public.dealer_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);