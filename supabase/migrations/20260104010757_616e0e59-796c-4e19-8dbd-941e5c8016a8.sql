-- Create quote_configurations table for saving quote state
CREATE TABLE public.quote_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id TEXT NOT NULL,
  portal_id TEXT NOT NULL,
  configuration JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(deal_id, portal_id)
);

-- Enable RLS
ALTER TABLE public.quote_configurations ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage quote configurations (edge functions)
CREATE POLICY "Service role can manage quote configurations"
ON public.quote_configurations
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_quote_configurations_updated_at
BEFORE UPDATE ON public.quote_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();