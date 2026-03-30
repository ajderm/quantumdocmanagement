
CREATE TABLE public.portal_equipment_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id text NOT NULL UNIQUE,
  equipment_object_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_equipment_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only access portal_equipment_cache"
  ON public.portal_equipment_cache
  FOR ALL
  TO service_role
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
