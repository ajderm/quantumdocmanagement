/**
 * Shared validation utilities for edge functions
 * Ensures consistent input validation across all functions
 */

/**
 * Validates portal ID format (numeric, max 20 digits)
 * HubSpot portal IDs are integers, typically 6-8 digits
 */
export function validatePortalId(portalId: unknown): portalId is string {
  return typeof portalId === 'string' && /^\d{1,20}$/.test(portalId);
}

/**
 * Validates deal ID format (numeric, max 20 digits)
 * HubSpot deal IDs are integers
 */
export function validateDealId(dealId: unknown): dealId is string {
  return typeof dealId === 'string' && /^\d{1,20}$/.test(dealId);
}

/**
 * Validates line item ID format (numeric, max 20 digits)
 * HubSpot line item IDs are integers
 */
export function validateLineItemId(lineItemId: unknown): lineItemId is string {
  return typeof lineItemId === 'string' && /^\d{1,20}$/.test(lineItemId);
}

/**
 * Verifies that a portal has a valid HubSpot token (proves it's a real, authenticated portal).
 * This is the core multi-tenancy gate: if a portalId doesn't have a token, 
 * it means the org never completed OAuth and can't access data.
 */
export async function verifyPortalAccess(
  supabase: any,
  portalId: string,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const { data: token, error: tokenError } = await supabase
    .from('hubspot_tokens')
    .select('portal_id')
    .eq('portal_id', portalId)
    .maybeSingle();

  if (tokenError) {
    console.error('Portal access verification error:', tokenError);
    return createErrorResponse('Failed to verify portal access', 500, corsHeaders);
  }

  if (!token) {
    return createErrorResponse('Portal not authenticated. Please complete HubSpot OAuth.', 403, corsHeaders);
  }

  // Portal has a valid token — access granted
  return null;
}

/**
 * Get CORS headers with configurable allowed origin.
 * Set ALLOWED_ORIGIN env var to restrict (e.g., 'https://yourapp.lovable.app').
 * Defaults to '*' for backward compatibility.
 */
export function getCorsHeaders(): Record<string, string> {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

/**
 * Creates a standardized error response with CORS headers
 */
export function createErrorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Creates a standardized success response with CORS headers
 */
export function createJsonResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
