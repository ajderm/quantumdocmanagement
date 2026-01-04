-- Create service agreement configurations table
CREATE TABLE public.service_agreement_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portal_id, deal_id)
);

-- Enable RLS
ALTER TABLE public.service_agreement_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (consistent with other configuration tables)
CREATE POLICY "Service role can manage service agreement configurations"
ON public.service_agreement_configurations
FOR ALL
USING (true)
WITH CHECK (true);