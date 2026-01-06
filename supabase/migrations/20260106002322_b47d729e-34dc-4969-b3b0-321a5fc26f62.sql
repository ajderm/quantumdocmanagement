-- Harden RLS policies by explicitly scoping them to the intended PostgREST roles.
-- If TO is omitted, policies may apply to PUBLIC, which can accidentally include anon/authenticated.

-- ========== dealer_accounts ==========
ALTER TABLE public.dealer_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own dealer account" ON public.dealer_accounts;
DROP POLICY IF EXISTS "Admins can update dealer account" ON public.dealer_accounts;

CREATE POLICY "Users can view own dealer account"
ON public.dealer_accounts
FOR SELECT
TO authenticated
USING (id = public.get_user_dealer_account_id());

CREATE POLICY "Admins can update dealer account"
ON public.dealer_accounts
FOR UPDATE
TO authenticated
USING ((id = public.get_user_dealer_account_id()) AND public.is_admin())
WITH CHECK ((id = public.get_user_dealer_account_id()) AND public.is_admin());

-- ========== profiles ==========
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view same dealer account profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view same dealer account profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING ((dealer_account_id IS NOT NULL) AND (dealer_account_id = public.get_user_dealer_account_id()));

-- ========== user_roles ==========
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ========== leasing_partners ==========
ALTER TABLE public.leasing_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view leasing partners" ON public.leasing_partners;
DROP POLICY IF EXISTS "Admins can manage leasing partners" ON public.leasing_partners;

CREATE POLICY "Users can view leasing partners"
ON public.leasing_partners
FOR SELECT
TO authenticated
USING (dealer_account_id = public.get_user_dealer_account_id());

CREATE POLICY "Admins can manage leasing partners"
ON public.leasing_partners
FOR ALL
TO authenticated
USING ((dealer_account_id = public.get_user_dealer_account_id()) AND public.is_admin())
WITH CHECK ((dealer_account_id = public.get_user_dealer_account_id()) AND public.is_admin());

-- ========== generated_documents ==========
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view generated documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Users can create documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.generated_documents;

CREATE POLICY "Users can view generated documents"
ON public.generated_documents
FOR SELECT
TO authenticated
USING (dealer_account_id = public.get_user_dealer_account_id());

CREATE POLICY "Users can create documents"
ON public.generated_documents
FOR INSERT
TO authenticated
WITH CHECK (dealer_account_id = public.get_user_dealer_account_id());

CREATE POLICY "Users can update own documents"
ON public.generated_documents
FOR UPDATE
TO authenticated
USING ((dealer_account_id = public.get_user_dealer_account_id()) AND (created_by = auth.uid()))
WITH CHECK ((dealer_account_id = public.get_user_dealer_account_id()) AND (created_by = auth.uid()));

-- ========== document_types ==========
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view document types" ON public.document_types;

CREATE POLICY "Authenticated can view document types"
ON public.document_types
FOR SELECT
TO authenticated
USING (true);

-- ========== Service-role-only tables (ensure policies truly only apply to service_role) ==========
-- dealer_settings
ALTER TABLE public.dealer_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only access dealer_settings" ON public.dealer_settings;
CREATE POLICY "Service role only access dealer_settings"
ON public.dealer_settings
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- configuration tables
ALTER TABLE public.quote_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only access quote_configurations" ON public.quote_configurations;
CREATE POLICY "Service role only access quote_configurations"
ON public.quote_configurations
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.service_agreement_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only access service_agreement_configurations" ON public.service_agreement_configurations;
CREATE POLICY "Service role only access service_agreement_configurations"
ON public.service_agreement_configurations
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.fmv_lease_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only access fmv_lease_configurations" ON public.fmv_lease_configurations;
CREATE POLICY "Service role only access fmv_lease_configurations"
ON public.fmv_lease_configurations
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.lease_return_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only access lease_return_configurations" ON public.lease_return_configurations;
CREATE POLICY "Service role only access lease_return_configurations"
ON public.lease_return_configurations
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.interterritorial_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only access interterritorial_configurations" ON public.interterritorial_configurations;
CREATE POLICY "Service role only access interterritorial_configurations"
ON public.interterritorial_configurations
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.installation_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only access installation_configurations" ON public.installation_configurations;
CREATE POLICY "Service role only access installation_configurations"
ON public.installation_configurations
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.lease_funding_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only access lease_funding_configurations" ON public.lease_funding_configurations;
CREATE POLICY "Service role only access lease_funding_configurations"
ON public.lease_funding_configurations
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- rate sheet upload tables
ALTER TABLE public.uploaded_rate_sheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only access uploaded_rate_sheets" ON public.uploaded_rate_sheets;
CREATE POLICY "Service role only access uploaded_rate_sheets"
ON public.uploaded_rate_sheets
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.lease_rate_factors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only access lease_rate_factors" ON public.lease_rate_factors;
CREATE POLICY "Service role only access lease_rate_factors"
ON public.lease_rate_factors
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- document_terms
ALTER TABLE public.document_terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only access document_terms" ON public.document_terms;
CREATE POLICY "Service role only access document_terms"
ON public.document_terms
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');