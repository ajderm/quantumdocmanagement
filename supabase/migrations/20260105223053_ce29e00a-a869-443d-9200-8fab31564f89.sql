-- Create interterritorial_configurations table for storing ITT form data per deal
CREATE TABLE public.interterritorial_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  portal_id TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique constraint on portal_id + deal_id
CREATE UNIQUE INDEX interterritorial_configurations_portal_deal_idx 
  ON public.interterritorial_configurations (portal_id, deal_id);

-- Enable RLS
ALTER TABLE public.interterritorial_configurations ENABLE ROW LEVEL SECURITY;

-- RLS policy - service role only (accessed via edge functions)
CREATE POLICY "Service role can manage interterritorial_configurations"
  ON public.interterritorial_configurations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_interterritorial_configurations_updated_at
  BEFORE UPDATE ON public.interterritorial_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();