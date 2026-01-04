-- Create FMV Lease configurations table
CREATE TABLE public.fmv_lease_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portal_id, deal_id)
);

-- Enable RLS
ALTER TABLE public.fmv_lease_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (internal tool use only)
CREATE POLICY "Service role can manage fmv_lease_configurations" 
  ON public.fmv_lease_configurations 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_fmv_lease_configurations_updated_at
  BEFORE UPDATE ON public.fmv_lease_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();