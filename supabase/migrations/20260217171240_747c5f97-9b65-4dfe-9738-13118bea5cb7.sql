
CREATE TABLE public.commission_user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id uuid NOT NULL REFERENCES public.dealer_accounts(id),
  hubspot_user_name text NOT NULL,
  hubspot_user_id text,
  commission_percentage numeric NOT NULL DEFAULT 40,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only access commission_user_settings"
  ON public.commission_user_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_commission_user_settings_updated_at
  BEFORE UPDATE ON public.commission_user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
