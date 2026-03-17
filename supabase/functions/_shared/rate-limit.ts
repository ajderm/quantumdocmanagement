/**
 * Simple rate limiting helper for edge functions.
 * 
 * Uses a lightweight check: tracks request count per portal per minute
 * via a Supabase table. This prevents abuse from any single portal
 * without adding external dependencies.
 * 
 * Usage in edge functions:
 *   const rateLimitError = await checkRateLimit(supabase, portalId, 'hubspot-get-products', 60, corsHeaders);
 *   if (rateLimitError) return rateLimitError;
 */

import { createErrorResponse } from './validation.ts';

/**
 * Check if a portal has exceeded the rate limit for a given function.
 * Returns a 429 Response if rate limited, or null if OK.
 * 
 * @param supabase - Supabase client (service role)
 * @param portalId - Portal making the request
 * @param functionName - Name of the edge function (for tracking)
 * @param maxRequestsPerMinute - Maximum requests allowed per minute (default 60)
 * @param corsHeaders - CORS headers for the response
 */
export async function checkRateLimit(
  supabase: any,
  portalId: string,
  functionName: string,
  maxRequestsPerMinute: number = 60,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

    // Count recent requests for this portal + function
    const { count, error } = await supabase
      .from('api_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('portal_id', portalId)
      .eq('function_name', functionName)
      .gte('created_at', oneMinuteAgo);

    if (error) {
      // If the rate limit table doesn't exist yet, skip rate limiting
      // This allows graceful degradation if the migration hasn't been run
      console.warn('Rate limit check failed (table may not exist):', error.message);
      return null;
    }

    if (count !== null && count >= maxRequestsPerMinute) {
      return createErrorResponse(
        `Rate limit exceeded. Maximum ${maxRequestsPerMinute} requests per minute.`,
        429,
        corsHeaders
      );
    }

    // Log this request (fire and forget — don't block on insert)
    supabase
      .from('api_rate_limits')
      .insert({ portal_id: portalId, function_name: functionName })
      .then(() => {})
      .catch(() => {});

    return null;
  } catch {
    // Rate limiting is best-effort — don't block requests if it fails
    return null;
  }
}
