-- User roles per portal
CREATE TABLE IF NOT EXISTS public.app_user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_account_id UUID NOT NULL REFERENCES public.dealer_accounts(id) ON DELETE CASCADE,
  hubspot_user_id TEXT NOT NULL,
  hubspot_user_name TEXT DEFAULT '',
  hubspot_user_email TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dealer_account_id, hubspot_user_id)
);

CREATE TABLE IF NOT EXISTS public.access_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_account_id UUID NOT NULL REFERENCES public.dealer_accounts(id) ON DELETE CASCADE,
  pipeline_id TEXT NOT NULL,
  pipeline_label TEXT DEFAULT '',
  cutoff_stage TEXT NOT NULL,
  cutoff_stage_label TEXT DEFAULT '',
  pre_cutoff_min_role TEXT NOT NULL DEFAULT 'manager' CHECK (pre_cutoff_min_role IN ('admin', 'manager', 'user', 'viewer')),
  post_cutoff_min_role TEXT NOT NULL DEFAULT 'viewer' CHECK (post_cutoff_min_role IN ('admin', 'manager', 'user', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dealer_account_id, pipeline_id)
);

CREATE INDEX IF NOT EXISTS idx_app_user_roles_dealer_user ON public.app_user_roles(dealer_account_id, hubspot_user_id);
CREATE INDEX IF NOT EXISTS idx_access_rules_dealer ON public.access_rules(dealer_account_id);

ALTER TABLE public.app_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only access app_user_roles"
ON public.app_user_roles FOR ALL TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role only access access_rules"
ON public.access_rules FOR ALL TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_app_user_roles_updated_at
BEFORE UPDATE ON public.app_user_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_access_rules_updated_at
BEFORE UPDATE ON public.access_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();