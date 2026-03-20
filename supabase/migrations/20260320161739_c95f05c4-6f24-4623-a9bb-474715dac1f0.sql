CREATE TABLE IF NOT EXISTS public.quote_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id text NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  shared boolean NOT NULL DEFAULT false,
  created_by text,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only access quote_templates"
  ON public.quote_templates
  FOR ALL
  TO service_role
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE TRIGGER update_quote_templates_updated_at
  BEFORE UPDATE ON public.quote_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();