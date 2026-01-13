-- Create LOI configurations table
CREATE TABLE public.loi_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(portal_id, deal_id)
);

-- Enable RLS
ALTER TABLE public.loi_configurations ENABLE ROW LEVEL SECURITY;

-- RLS policy for service role access
CREATE POLICY "Service role can manage loi_configurations" 
ON public.loi_configurations FOR ALL 
TO service_role 
USING (true);