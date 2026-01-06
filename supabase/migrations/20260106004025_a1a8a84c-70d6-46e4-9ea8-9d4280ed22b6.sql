-- Create new_customer_configurations table
CREATE TABLE IF NOT EXISTS public.new_customer_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portal_id, deal_id)
);

-- Enable RLS
ALTER TABLE public.new_customer_configurations ENABLE ROW LEVEL SECURITY;

-- Service role only policy (matching other configuration tables)
CREATE POLICY "Service role can manage new_customer_configurations"
  ON public.new_customer_configurations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_new_customer_configurations_updated_at
  BEFORE UPDATE ON public.new_customer_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();