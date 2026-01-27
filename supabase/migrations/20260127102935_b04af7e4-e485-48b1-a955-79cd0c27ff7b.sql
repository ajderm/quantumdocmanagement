-- Add association_path column to hubspot_field_mappings
-- This enables mapping contacts that are associated to the Company (not the Deal)
-- Values: null/empty = direct property access, 'company_contact' = contact via company
ALTER TABLE hubspot_field_mappings 
ADD COLUMN IF NOT EXISTS association_path text;