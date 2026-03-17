-- Quote versioning: stores snapshots of quote configurations
-- Each version gets a unique, auto-incrementing quote number per deal
CREATE TABLE IF NOT EXISTS public.quote_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  quote_number TEXT NOT NULL,
  label TEXT,
  configuration JSONB NOT NULL DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one version number per portal+deal
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_versions_portal_deal_version
  ON public.quote_versions (portal_id, deal_id, version_number);

-- Unique quote numbers globally
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_versions_quote_number
  ON public.quote_versions (quote_number);

-- Fast lookup by portal+deal sorted by version
CREATE INDEX IF NOT EXISTS idx_quote_versions_portal_deal_created
  ON public.quote_versions (portal_id, deal_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;

-- Service role only (accessed via edge functions)
CREATE POLICY "Service role only access quote_versions"
  ON public.quote_versions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Also add current_quote_number and current_version_id to quote_configurations
-- so we know which version is active
ALTER TABLE public.quote_configurations
  ADD COLUMN IF NOT EXISTS current_quote_number TEXT,
  ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES public.quote_versions(id);
