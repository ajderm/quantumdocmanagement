-- Create uploaded_rate_sheets table for storing Excel upload metadata
CREATE TABLE public.uploaded_rate_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  row_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create lease_rate_factors table for storing parsed rate data
CREATE TABLE public.lease_rate_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_sheet_id UUID NOT NULL REFERENCES public.uploaded_rate_sheets(id) ON DELETE CASCADE,
  leasing_company TEXT NOT NULL,
  lease_program TEXT NOT NULL,
  min_amount NUMERIC,
  max_amount NUMERIC,
  term_months INTEGER NOT NULL,
  rate_factor NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_lease_rate_factors_sheet ON public.lease_rate_factors(rate_sheet_id);
CREATE INDEX idx_lease_rate_factors_lookup ON public.lease_rate_factors(leasing_company, lease_program, term_months);
CREATE INDEX idx_uploaded_rate_sheets_dealer ON public.uploaded_rate_sheets(dealer_account_id, is_active);

-- Enable RLS
ALTER TABLE public.uploaded_rate_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_rate_factors ENABLE ROW LEVEL SECURITY;

-- RLS policies for uploaded_rate_sheets - service role access for edge functions
CREATE POLICY "Service role can manage rate sheets"
ON public.uploaded_rate_sheets
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS policies for lease_rate_factors - service role access for edge functions
CREATE POLICY "Service role can manage rate factors"
ON public.lease_rate_factors
FOR ALL
USING (true)
WITH CHECK (true);