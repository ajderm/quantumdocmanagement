-- Add encrypted token columns to hubspot_tokens table
-- We keep the original columns temporarily for migration, then remove them after all tokens are migrated

-- Add new encrypted token columns
ALTER TABLE public.hubspot_tokens 
ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT;

-- Add flag to track which tokens have been encrypted
ALTER TABLE public.hubspot_tokens 
ADD COLUMN IF NOT EXISTS tokens_encrypted BOOLEAN DEFAULT FALSE;