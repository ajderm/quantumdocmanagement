-- Feedback/bug submission system
-- Reps submit feedback from the app, visible to all users in the portal
CREATE TABLE IF NOT EXISTS public.app_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  submitted_by TEXT,
  submitted_by_name TEXT,
  type TEXT NOT NULL DEFAULT 'bug',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup
CREATE INDEX IF NOT EXISTS idx_app_feedback_portal
  ON public.app_feedback (portal_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role only access app_feedback"
  ON public.app_feedback FOR ALL TO service_role
  USING (true) WITH CHECK (true);
