-- Create lease_return_configurations table
CREATE TABLE public.lease_return_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique constraint for upsert (one per deal)
CREATE UNIQUE INDEX idx_lease_return_portal_deal 
  ON public.lease_return_configurations(portal_id, deal_id);

-- Enable RLS
ALTER TABLE public.lease_return_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policy (internal use only)
CREATE POLICY "Service role can manage lease_return_configurations"
  ON public.lease_return_configurations FOR ALL
  USING (true) WITH CHECK (true);

-- Auto-update trigger
CREATE TRIGGER update_lease_return_updated_at
  BEFORE UPDATE ON public.lease_return_configurations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();