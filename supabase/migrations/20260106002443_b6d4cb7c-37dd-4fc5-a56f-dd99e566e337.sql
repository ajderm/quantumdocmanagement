-- Finalize HubSpot token encryption at-rest by removing plaintext columns
-- and storing only ciphertext in access_token / refresh_token.

-- 1) Add new ciphertext columns
ALTER TABLE public.hubspot_tokens
  ADD COLUMN IF NOT EXISTS access_token_ciphertext text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS refresh_token_ciphertext text NOT NULL DEFAULT '';

-- 2) Copy encrypted values into the new ciphertext columns
UPDATE public.hubspot_tokens
SET
  access_token_ciphertext = COALESCE(access_token_encrypted, access_token_ciphertext),
  refresh_token_ciphertext = COALESCE(refresh_token_encrypted, refresh_token_ciphertext);

-- 3) Drop legacy columns (plaintext + migration helpers)
ALTER TABLE public.hubspot_tokens
  DROP COLUMN IF EXISTS access_token_encrypted,
  DROP COLUMN IF EXISTS refresh_token_encrypted,
  DROP COLUMN IF EXISTS tokens_encrypted,
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;

-- 4) Rename ciphertext columns back to canonical names
ALTER TABLE public.hubspot_tokens
  RENAME COLUMN access_token_ciphertext TO access_token;

ALTER TABLE public.hubspot_tokens
  RENAME COLUMN refresh_token_ciphertext TO refresh_token;