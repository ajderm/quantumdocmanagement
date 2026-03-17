
-- Create api_rate_limits table for edge function rate limiting
CREATE TABLE public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id text NOT NULL,
  function_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_api_rate_limits_lookup ON public.api_rate_limits (portal_id, function_name, created_at);

-- Enable RLS
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role only access api_rate_limits"
  ON public.api_rate_limits FOR ALL
  TO service_role
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Auto-cleanup old entries (older than 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.api_rate_limits WHERE created_at < now() - interval '5 minutes';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_cleanup_rate_limits
  AFTER INSERT ON public.api_rate_limits
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_rate_limits();

-- Create audit_log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id text NOT NULL,
  user_id text,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX idx_audit_log_portal ON public.audit_log (portal_id, created_at);
CREATE INDEX idx_audit_log_action ON public.audit_log (action, created_at);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role only access audit_log"
  ON public.audit_log FOR ALL
  TO service_role
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
