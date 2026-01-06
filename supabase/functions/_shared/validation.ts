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
