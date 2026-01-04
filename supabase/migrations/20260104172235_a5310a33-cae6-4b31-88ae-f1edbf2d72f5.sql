-- Fix: Restrict company-assets storage to service_role for write operations
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete company assets" ON storage.objects;

-- Create service role only policy for write operations
CREATE POLICY "Service role can manage company assets"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'company-assets')
  WITH CHECK (bucket_id = 'company-assets');

-- Keep public read access (bucket is public)
CREATE POLICY "Company assets are publicly readable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'company-assets');