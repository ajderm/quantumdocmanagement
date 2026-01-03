-- Create table for storing HubSpot OAuth tokens
CREATE TABLE public.hubspot_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hubspot_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access only (edge functions use service role)
CREATE POLICY "Service role can manage tokens"
  ON public.hubspot_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_hubspot_tokens_updated_at
  BEFORE UPDATE ON public.hubspot_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();