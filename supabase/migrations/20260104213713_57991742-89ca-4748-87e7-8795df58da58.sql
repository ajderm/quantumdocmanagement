-- Fix RLS policy on installation_configurations to allow public access
DROP POLICY IF EXISTS "Service role can manage installation configurations" ON installation_configurations;

-- Create new policy for public access (same as other config tables)
CREATE POLICY "Allow all access to installation_configurations" 
  ON installation_configurations 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);