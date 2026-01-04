-- Create dealer_settings table for configurable values like meter_methods and cca_value
CREATE TABLE public.dealer_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_account_id UUID NOT NULL REFERENCES public.dealer_accounts(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dealer_account_id, setting_key)
);

-- Create installation_configurations table for per-line-item installation doc configs
CREATE TABLE public.installation_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  line_item_id TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(portal_id, deal_id, line_item_id)
);

-- Enable RLS on both tables
ALTER TABLE public.dealer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_configurations ENABLE ROW LEVEL SECURITY;

-- RLS policies for dealer_settings - service role can manage (used by edge functions)
CREATE POLICY "Service role can manage dealer settings"
ON public.dealer_settings
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS policies for installation_configurations - service role can manage
CREATE POLICY "Service role can manage installation configurations"
ON public.installation_configurations
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at on dealer_settings
CREATE TRIGGER update_dealer_settings_updated_at
BEFORE UPDATE ON public.dealer_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on installation_configurations
CREATE TRIGGER update_installation_configurations_updated_at
BEFORE UPDATE ON public.installation_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();