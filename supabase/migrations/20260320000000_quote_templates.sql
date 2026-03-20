-- Quote templates: reusable configurations that reps can save and load
CREATE TABLE IF NOT EXISTS public.quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  configuration JSONB NOT NULL DEFAULT '{}',
  shared BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup by portal, sorted by name
CREATE INDEX IF NOT EXISTS idx_quote_templates_portal
  ON public.quote_templates (portal_id, shared, name);

-- Enable RLS
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

-- Service role only (accessed via edge functions)
CREATE POLICY "Service role only access quote_templates"
  ON public.quote_templates FOR ALL TO service_role
  USING (true) WITH CHECK (true);
