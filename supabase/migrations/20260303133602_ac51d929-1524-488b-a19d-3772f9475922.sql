
-- Create pricing_tiers table
CREATE TABLE public.pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id text NOT NULL,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(portal_id, name)
);

ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only access pricing_tiers"
  ON public.pricing_tiers FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Create pricing_tier_prices table
CREATE TABLE public.pricing_tier_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_tier_id uuid NOT NULL REFERENCES public.pricing_tiers(id) ON DELETE CASCADE,
  product_model text NOT NULL,
  rep_cost numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pricing_tier_id, product_model)
);

ALTER TABLE public.pricing_tier_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only access pricing_tier_prices"
  ON public.pricing_tier_prices FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Add updated_at trigger for pricing_tiers
CREATE TRIGGER update_pricing_tiers_updated_at
  BEFORE UPDATE ON public.pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
