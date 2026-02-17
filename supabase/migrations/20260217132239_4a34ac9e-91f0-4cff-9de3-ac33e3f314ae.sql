-- Drop existing INSERT policy for logos-only
DROP POLICY IF EXISTS "Allow logo uploads to company-assets" ON storage.objects;

-- Allow uploads to logos OR proposals folders
CREATE POLICY "Allow uploads to company-assets"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'company-assets' 
  AND (
    (storage.foldername(name))[1] = 'logos' 
    OR (storage.foldername(name))[1] = 'proposals'
  )
);

-- Also allow UPDATE for proposals folder (for replacing files)
DROP POLICY IF EXISTS "Allow logo updates in company-assets" ON storage.objects;

CREATE POLICY "Allow asset updates in company-assets"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'company-assets' 
  AND (
    (storage.foldername(name))[1] = 'logos' 
    OR (storage.foldername(name))[1] = 'proposals'
  )
);

-- Allow DELETE for proposals folder (for removing uploaded proposals)
CREATE POLICY "Allow proposal deletes in company-assets"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'company-assets' 
  AND (storage.foldername(name))[1] = 'proposals'
);