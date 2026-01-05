-- Drop existing permissive RLS policies on configuration tables
DROP POLICY IF EXISTS "Service role can manage quote configurations" ON quote_configurations;
DROP POLICY IF EXISTS "Allow all access to installation_configurations" ON installation_configurations;
DROP POLICY IF EXISTS "Service role can manage service agreement configurations" ON service_agreement_configurations;
DROP POLICY IF EXISTS "Service role can manage fmv_lease_configurations" ON fmv_lease_configurations;
DROP POLICY IF EXISTS "Service role can manage lease_funding_configurations" ON lease_funding_configurations;
DROP POLICY IF EXISTS "Service role can manage lease_return_configurations" ON lease_return_configurations;
DROP POLICY IF EXISTS "Service role can manage interterritorial_configurations" ON interterritorial_configurations;
DROP POLICY IF EXISTS "Service role can manage document terms" ON document_terms;
DROP POLICY IF EXISTS "Service role can manage dealer settings" ON dealer_settings;
DROP POLICY IF EXISTS "Service role can manage rate sheets" ON uploaded_rate_sheets;
DROP POLICY IF EXISTS "Service role can manage rate factors" ON lease_rate_factors;

-- Create restrictive policies that only allow service_role access
-- Quote configurations
CREATE POLICY "Service role only access quote_configurations"
  ON quote_configurations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Installation configurations  
CREATE POLICY "Service role only access installation_configurations"
  ON installation_configurations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service agreement configurations
CREATE POLICY "Service role only access service_agreement_configurations"
  ON service_agreement_configurations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- FMV lease configurations
CREATE POLICY "Service role only access fmv_lease_configurations"
  ON fmv_lease_configurations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Lease funding configurations
CREATE POLICY "Service role only access lease_funding_configurations"
  ON lease_funding_configurations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Lease return configurations
CREATE POLICY "Service role only access lease_return_configurations"
  ON lease_return_configurations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Interterritorial configurations
CREATE POLICY "Service role only access interterritorial_configurations"
  ON interterritorial_configurations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Document terms
CREATE POLICY "Service role only access document_terms"
  ON document_terms
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Dealer settings
CREATE POLICY "Service role only access dealer_settings"
  ON dealer_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Uploaded rate sheets
CREATE POLICY "Service role only access uploaded_rate_sheets"
  ON uploaded_rate_sheets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Lease rate factors
CREATE POLICY "Service role only access lease_rate_factors"
  ON lease_rate_factors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);