
-- Create quote_versions table
CREATE TABLE public.quote_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id text NOT NULL,
  deal_id text NOT NULL,
  version_number integer NOT NULL,
  quote_number text NOT NULL,
  label text,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add unique constraint
ALTER TABLE public.quote_versions ADD CONSTRAINT quote_versions_portal_deal_version_unique UNIQUE (portal_id, deal_id, version_number);

-- Add index for lookups
CREATE INDEX idx_quote_versions_portal_deal ON public.quote_versions (portal_id, deal_id);

-- Enable RLS
ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role only access quote_versions"
  ON public.quote_versions FOR ALL
  TO service_role
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Add columns to quote_configurations
ALTER TABLE public.quote_configurations
  ADD COLUMN IF NOT EXISTS current_quote_number text,
  ADD COLUMN IF NOT EXISTS current_version_id uuid REFERENCES public.quote_versions(id);
