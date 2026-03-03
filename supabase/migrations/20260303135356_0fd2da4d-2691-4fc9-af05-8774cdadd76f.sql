
CREATE TABLE public.product_type_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id text NOT NULL,
  hs_product_id text NOT NULL,
  product_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (portal_id, hs_product_id)
);

ALTER TABLE public.product_type_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only access product_type_overrides"
  ON public.product_type_overrides
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
