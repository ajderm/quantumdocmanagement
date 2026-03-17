-- Rate limiting table: tracks API requests per portal per function
-- Used by edge functions to prevent abuse
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  function_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_portal_function_time 
  ON public.api_rate_limits (portal_id, function_name, created_at DESC);

-- Enable RLS
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role only access api_rate_limits"
  ON public.api_rate_limits FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Auto-cleanup: delete entries older than 5 minutes (only need recent data)
-- This runs via a pg_cron job or can be called periodically
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.api_rate_limits 
  WHERE created_at < now() - interval '5 minutes';
$$;

-- Audit log table: tracks significant actions for compliance
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_portal_time 
  ON public.audit_log (portal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action 
  ON public.audit_log (action, created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role only access audit_log"
  ON public.audit_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);
