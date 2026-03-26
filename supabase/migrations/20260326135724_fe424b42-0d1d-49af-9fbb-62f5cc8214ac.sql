
CREATE TABLE IF NOT EXISTS public.app_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id text NOT NULL,
  submitted_by text,
  submitted_by_name text,
  type text NOT NULL DEFAULT 'bug',
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  admin_response text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only access app_feedback"
  ON public.app_feedback
  FOR ALL
  TO service_role
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE TRIGGER update_app_feedback_updated_at
  BEFORE UPDATE ON public.app_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
