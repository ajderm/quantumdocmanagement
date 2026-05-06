-- Fix 1: commission_configurations - restrict permissive policy to service_role only
DROP POLICY IF EXISTS "Service role full access on commission_configurations" ON public.commission_configurations;
CREATE POLICY "Service role full access on commission_configurations"
ON public.commission_configurations
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix 2: storage.objects company-assets - lock writes to service_role only
DROP POLICY IF EXISTS "Allow uploads to company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow asset updates in company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow proposal deletes in company-assets" ON storage.objects;

CREATE POLICY "Service role can upload company-assets"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Service role can update company-assets"
ON storage.objects FOR UPDATE TO service_role
USING (bucket_id = 'company-assets')
WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Service role can delete company-assets"
ON storage.objects FOR DELETE TO service_role
USING (bucket_id = 'company-assets');