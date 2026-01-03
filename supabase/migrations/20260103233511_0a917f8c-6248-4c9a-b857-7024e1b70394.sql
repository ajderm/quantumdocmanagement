-- Create document_terms table for storing document-specific terms and conditions
CREATE TABLE public.document_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_account_id UUID NOT NULL REFERENCES public.dealer_accounts(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  terms_and_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dealer_account_id, document_type)
);

-- Enable RLS
ALTER TABLE public.document_terms ENABLE ROW LEVEL SECURITY;

-- Create policies - using service role in edge functions, so permissive for now
CREATE POLICY "Service role can manage document terms"
ON public.document_terms
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_document_terms_updated_at
BEFORE UPDATE ON public.document_terms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();