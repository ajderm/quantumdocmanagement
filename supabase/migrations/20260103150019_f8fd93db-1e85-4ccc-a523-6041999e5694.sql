-- =============================================
-- COPIER DOCUMENT GENERATOR - DATABASE SCHEMA
-- =============================================

-- 1. DEALER ACCOUNTS (the copier dealers using the app)
CREATE TABLE public.dealer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_portal_id TEXT UNIQUE, -- Links to HubSpot account
  company_name TEXT NOT NULL,
  logo_url TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  terms_and_conditions TEXT, -- Default T&Cs for documents
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. USER PROFILES (users within dealer accounts)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_account_id UUID REFERENCES public.dealer_accounts(id) ON DELETE SET NULL,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. USER ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'sales_rep');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. LEASING PARTNERS (financing companies)
CREATE TABLE public.leasing_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id UUID REFERENCES public.dealer_accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. LEASE RATE SHEETS (uploaded rate tables)
CREATE TABLE public.lease_rate_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leasing_partner_id UUID REFERENCES public.leasing_partners(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., "Q1 2025 Rates"
  effective_date DATE NOT NULL,
  expiration_date DATE,
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. LEASE RATES (individual rate entries)
CREATE TABLE public.lease_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_sheet_id UUID REFERENCES public.lease_rate_sheets(id) ON DELETE CASCADE NOT NULL,
  term_months INTEGER NOT NULL, -- 12, 24, 36, 48, 60
  min_amount DECIMAL(12,2) DEFAULT 0,
  max_amount DECIMAL(12,2),
  rate_factor DECIMAL(10,6) NOT NULL, -- e.g., 0.0285 for 2.85%
  lease_type TEXT DEFAULT 'FMV', -- FMV, $1 Buyout, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. DOCUMENT TYPES (template definitions)
CREATE TABLE public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 'quote', 'installation', 'service_agreement', etc.
  name TEXT NOT NULL,
  description TEXT,
  default_template JSONB, -- Default field layout
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 8. DOCUMENT TEMPLATES (dealer-customized templates)
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id UUID REFERENCES public.dealer_accounts(id) ON DELETE CASCADE NOT NULL,
  document_type_id UUID REFERENCES public.document_types(id) ON DELETE CASCADE NOT NULL,
  custom_terms TEXT, -- Dealer-specific terms for this doc type
  custom_fields JSONB, -- Any custom field definitions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dealer_account_id, document_type_id)
);

-- 9. GENERATED DOCUMENTS (history of created docs)
CREATE TABLE public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id UUID REFERENCES public.dealer_accounts(id) ON DELETE CASCADE NOT NULL,
  document_type_id UUID REFERENCES public.document_types(id) NOT NULL,
  hubspot_deal_id TEXT NOT NULL,
  hubspot_company_id TEXT,
  document_data JSONB NOT NULL, -- Snapshot of all field values
  file_url TEXT, -- URL to generated PDF/DOCX
  file_type TEXT DEFAULT 'pdf', -- 'pdf', 'docx'
  status TEXT DEFAULT 'draft', -- 'draft', 'final', 'sent'
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.dealer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leasing_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_rate_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY FUNCTIONS
-- =============================================

-- Get user's dealer account ID
CREATE OR REPLACE FUNCTION public.get_user_dealer_account_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dealer_account_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES: Users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Admins can view all profiles in their dealer account
CREATE POLICY "Admins can view dealer profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (dealer_account_id = public.get_user_dealer_account_id() AND public.is_admin());

-- USER_ROLES: Only readable, managed by system
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- DEALER_ACCOUNTS: Users can view their own dealer account
CREATE POLICY "Users can view own dealer account"
  ON public.dealer_accounts FOR SELECT
  TO authenticated
  USING (id = public.get_user_dealer_account_id());

CREATE POLICY "Admins can update dealer account"
  ON public.dealer_accounts FOR UPDATE
  TO authenticated
  USING (id = public.get_user_dealer_account_id() AND public.is_admin());

-- LEASING_PARTNERS: Dealer account scoped
CREATE POLICY "Users can view leasing partners"
  ON public.leasing_partners FOR SELECT
  TO authenticated
  USING (dealer_account_id = public.get_user_dealer_account_id());

CREATE POLICY "Admins can manage leasing partners"
  ON public.leasing_partners FOR ALL
  TO authenticated
  USING (dealer_account_id = public.get_user_dealer_account_id() AND public.is_admin());

-- LEASE_RATE_SHEETS: Dealer account scoped via partner
CREATE POLICY "Users can view rate sheets"
  ON public.lease_rate_sheets FOR SELECT
  TO authenticated
  USING (
    leasing_partner_id IN (
      SELECT id FROM public.leasing_partners 
      WHERE dealer_account_id = public.get_user_dealer_account_id()
    )
  );

CREATE POLICY "Admins can manage rate sheets"
  ON public.lease_rate_sheets FOR ALL
  TO authenticated
  USING (
    leasing_partner_id IN (
      SELECT id FROM public.leasing_partners 
      WHERE dealer_account_id = public.get_user_dealer_account_id()
    ) AND public.is_admin()
  );

-- LEASE_RATES: Access via rate sheet
CREATE POLICY "Users can view lease rates"
  ON public.lease_rates FOR SELECT
  TO authenticated
  USING (
    rate_sheet_id IN (
      SELECT lrs.id FROM public.lease_rate_sheets lrs
      JOIN public.leasing_partners lp ON lrs.leasing_partner_id = lp.id
      WHERE lp.dealer_account_id = public.get_user_dealer_account_id()
    )
  );

CREATE POLICY "Admins can manage lease rates"
  ON public.lease_rates FOR ALL
  TO authenticated
  USING (
    rate_sheet_id IN (
      SELECT lrs.id FROM public.lease_rate_sheets lrs
      JOIN public.leasing_partners lp ON lrs.leasing_partner_id = lp.id
      WHERE lp.dealer_account_id = public.get_user_dealer_account_id()
    ) AND public.is_admin()
  );

-- DOCUMENT_TYPES: Readable by all authenticated users
CREATE POLICY "Anyone can view document types"
  ON public.document_types FOR SELECT
  TO authenticated
  USING (true);

-- DOCUMENT_TEMPLATES: Dealer account scoped
CREATE POLICY "Users can view document templates"
  ON public.document_templates FOR SELECT
  TO authenticated
  USING (dealer_account_id = public.get_user_dealer_account_id());

CREATE POLICY "Admins can manage document templates"
  ON public.document_templates FOR ALL
  TO authenticated
  USING (dealer_account_id = public.get_user_dealer_account_id() AND public.is_admin());

-- GENERATED_DOCUMENTS: Dealer account scoped
CREATE POLICY "Users can view generated documents"
  ON public.generated_documents FOR SELECT
  TO authenticated
  USING (dealer_account_id = public.get_user_dealer_account_id());

CREATE POLICY "Users can create documents"
  ON public.generated_documents FOR INSERT
  TO authenticated
  WITH CHECK (dealer_account_id = public.get_user_dealer_account_id());

CREATE POLICY "Users can update own documents"
  ON public.generated_documents FOR UPDATE
  TO authenticated
  USING (dealer_account_id = public.get_user_dealer_account_id() AND created_by = auth.uid());

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_dealer_accounts_updated_at
  BEFORE UPDATE ON public.dealer_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leasing_partners_updated_at
  BEFORE UPDATE ON public.leasing_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_generated_documents_updated_at
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TRIGGER: Auto-create profile on user signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- SEED: Document Types
-- =============================================
INSERT INTO public.document_types (code, name, description, sort_order) VALUES
  ('quote', 'Quote', 'Equipment sales quote with pricing and lease options', 1),
  ('installation', 'Installation Report', 'Equipment installation documentation with delivery acceptance', 2),
  ('service_agreement', 'Service Agreement', 'Maintenance and service contract', 3),
  ('fmv_lease', 'FMV Lease Agreement', 'Fair Market Value lease agreement', 4),
  ('lease_funding', 'Lease Funding Document', 'Invoice/funding document for lease financing', 5),
  ('lease_return', 'Lease Return Letter', 'Equipment return authorization letter', 6),
  ('interterritorial', 'Interterritorial Request', 'Cross-territory equipment placement request', 7),
  ('new_customer', 'New Customer Application', 'Customer credit application form', 8),
  ('relocation', 'Relocation Request', 'Equipment relocation request form', 9),
  ('equipment_removal', 'Equipment Removal', 'Equipment removal/pickup form', 10);