-- Create removal_configurations table for storing Equipment Removal form data
CREATE TABLE public.removal_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(portal_id, deal_id)
);

-- Enable Row Level Security
ALTER TABLE public.removal_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (edge functions use service role)
CREATE POLICY "Service role can manage removal configurations"
ON public.removal_configurations
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_removal_configurations_updated_at
BEFORE UPDATE ON public.removal_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();