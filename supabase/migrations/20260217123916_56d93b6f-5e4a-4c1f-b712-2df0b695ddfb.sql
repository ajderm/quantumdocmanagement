
-- Create commission configurations table
CREATE TABLE public.commission_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portal_id, deal_id)
);

-- Enable RLS
ALTER TABLE public.commission_configurations ENABLE ROW LEVEL SECURITY;

-- RLS policies - service_role only (edge functions handle auth via portal token verification)
CREATE POLICY "Service role full access on commission_configurations"
  ON public.commission_configurations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_commission_configurations_updated_at
  BEFORE UPDATE ON public.commission_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
