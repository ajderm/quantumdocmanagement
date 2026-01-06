-- Add explicit deny policies to satisfy scanners and harden defaults

-- Deny all reads for normal API roles
DROP POLICY IF EXISTS "Deny hubspot_tokens select for authenticated" ON public.hubspot_tokens;
DROP POLICY IF EXISTS "Deny hubspot_tokens select for anon" ON public.hubspot_tokens;

CREATE POLICY "Deny hubspot_tokens select for authenticated"
ON public.hubspot_tokens
FOR SELECT
TO authenticated
USING (false);

CREATE POLICY "Deny hubspot_tokens select for anon"
ON public.hubspot_tokens
FOR SELECT
TO anon
USING (false);