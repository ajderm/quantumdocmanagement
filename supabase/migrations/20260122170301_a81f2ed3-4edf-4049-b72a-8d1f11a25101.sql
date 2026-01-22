-- Table for HubSpot field mappings (global and per-document)
CREATE TABLE public.hubspot_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id UUID NOT NULL REFERENCES public.dealer_accounts(id) ON DELETE CASCADE,
  document_type TEXT, -- NULL = global default, specific code = per-document override
  field_key TEXT NOT NULL, -- e.g., "shipToCompany", "customerPhone"
  hubspot_object TEXT NOT NULL, -- "deal", "company", "contact", "line_item", "owner"
  hubspot_property TEXT NOT NULL, -- e.g., "name", "street_address"
  association_label TEXT, -- For contacts: "shipping_contact", "ap_contact", etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dealer_account_id, document_type, field_key)
);

-- Table for custom document definitions
CREATE TABLE public.custom_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id UUID NOT NULL REFERENCES public.dealer_accounts(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- unique identifier like "custom_doc_1"
  name TEXT NOT NULL, -- display name
  icon TEXT NOT NULL DEFAULT 'FileText', -- lucide-react icon name
  description TEXT,
  schema JSONB NOT NULL DEFAULT '{"sections":[]}', -- full form/document structure
  terms_and_conditions TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dealer_account_id, code)
);

-- Table for custom document configurations (saved form data per deal)
CREATE TABLE public.custom_document_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  custom_document_id UUID NOT NULL REFERENCES public.custom_documents(id) ON DELETE CASCADE,
  configuration JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portal_id, deal_id, custom_document_id)
);

-- Enable RLS
ALTER TABLE public.hubspot_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_document_configurations ENABLE ROW LEVEL SECURITY;

-- RLS policies for hubspot_field_mappings (service role only - accessed via edge functions)
CREATE POLICY "Service role only access hubspot_field_mappings"
  ON public.hubspot_field_mappings
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for custom_documents (service role only - accessed via edge functions)
CREATE POLICY "Service role only access custom_documents"
  ON public.custom_documents
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for custom_document_configurations (service role only)
CREATE POLICY "Service role only access custom_document_configurations"
  ON public.custom_document_configurations
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Triggers for updated_at
CREATE TRIGGER update_hubspot_field_mappings_updated_at
  BEFORE UPDATE ON public.hubspot_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_documents_updated_at
  BEFORE UPDATE ON public.custom_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_document_configurations_updated_at
  BEFORE UPDATE ON public.custom_document_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();