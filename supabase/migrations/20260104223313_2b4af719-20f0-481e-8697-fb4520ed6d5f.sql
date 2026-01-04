-- Create lease_funding_configurations table (per hardware line item, like installation_configurations)
CREATE TABLE public.lease_funding_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  line_item_id TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique constraint for upsert on portal_id, deal_id, line_item_id
CREATE UNIQUE INDEX idx_lease_funding_portal_deal_line 
  ON public.lease_funding_configurations(portal_id, deal_id, line_item_id);

-- Enable RLS
ALTER TABLE public.lease_funding_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policy (same pattern as installation_configurations - service role access)
CREATE POLICY "Service role can manage lease_funding_configurations"
  ON public.lease_funding_configurations FOR ALL
  USING (true) WITH CHECK (true);

-- Auto-update trigger for updated_at
CREATE TRIGGER update_lease_funding_updated_at
  BEFORE UPDATE ON public.lease_funding_configurations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();