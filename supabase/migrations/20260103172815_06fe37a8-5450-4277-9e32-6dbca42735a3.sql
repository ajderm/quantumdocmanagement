-- Create storage bucket for company assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to company assets
CREATE POLICY "Company assets are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-assets');

-- Allow authenticated users to upload company assets
CREATE POLICY "Anyone can upload company assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'company-assets');

-- Allow authenticated users to update company assets
CREATE POLICY "Anyone can update company assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'company-assets');

-- Allow authenticated users to delete company assets
CREATE POLICY "Anyone can delete company assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'company-assets');