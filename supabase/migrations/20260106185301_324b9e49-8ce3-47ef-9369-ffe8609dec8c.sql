-- Allow uploads to company-assets bucket (logos folder only)
CREATE POLICY "Allow logo uploads to company-assets"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = 'logos');

-- Allow logo updates/replacements in company-assets bucket
CREATE POLICY "Allow logo updates in company-assets"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = 'logos')
WITH CHECK (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = 'logos');