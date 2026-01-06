-- Explicitly deny anonymous reads on sensitive tables (defense-in-depth and scanner satisfaction)

-- profiles: deny anon SELECT
DROP POLICY IF EXISTS "Deny profiles select for anon" ON public.profiles;
CREATE POLICY "Deny profiles select for anon"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- dealer_accounts: deny anon SELECT
DROP POLICY IF EXISTS "Deny dealer_accounts select for anon" ON public.dealer_accounts;
CREATE POLICY "Deny dealer_accounts select for anon"
ON public.dealer_accounts
FOR SELECT
TO anon
USING (false);

-- user_roles: deny anon SELECT
DROP POLICY IF EXISTS "Deny user_roles select for anon" ON public.user_roles;
CREATE POLICY "Deny user_roles select for anon"
ON public.user_roles
FOR SELECT
TO anon
USING (false);

-- leasing_partners: deny anon SELECT
DROP POLICY IF EXISTS "Deny leasing_partners select for anon" ON public.leasing_partners;
CREATE POLICY "Deny leasing_partners select for anon"
ON public.leasing_partners
FOR SELECT
TO anon
USING (false);

-- document_types: remove public access; allow authenticated only
DROP POLICY IF EXISTS "Anyone can view document types" ON public.document_types;
DROP POLICY IF EXISTS "Authenticated can view document types" ON public.document_types;
CREATE POLICY "Authenticated can view document types"
ON public.document_types
FOR SELECT
TO authenticated
USING (true);

-- Ensure RLS enabled (should already be on)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leasing_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;