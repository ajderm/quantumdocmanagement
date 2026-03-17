/**
 * Shared HubSpot OAuth token management with optimistic locking.
 * 
 * Prevents race conditions when multiple edge function calls for the same
 * portal try to refresh the token simultaneously. Uses the updated_at 
 * timestamp as an optimistic lock — only writes the refreshed token if
 * no other call has updated it since we read it.
 */

import { decryptToken, encryptToken } from './crypto.ts';

export async function getValidAccessToken(supabase: any, portalId: string): Promise<string> {
  const { data, error } = await supabase
    .from('hubspot_tokens')
    .select('*')
    .eq('portal_id', portalId)
    .single();

  if (error || !data) throw new Error('No token found for portal');

  const accessToken = await decryptToken(data.access_token);
  const refreshToken = await decryptToken(data.refresh_token);

  const expiresAt = new Date(data.expires_at);
  const now = new Date();

  // Token still valid (with 5-minute buffer) — return it
  if (expiresAt.getTime() - 5 * 60 * 1000 >= now.getTime()) {
    return accessToken;
  }

  // Token needs refresh — capture the current updated_at for optimistic locking
  const lockTimestamp = data.updated_at;

  const clientId = Deno.env.get('HUBSPOT_CLIENT_ID')!;
  const clientSecret = Deno.env.get('HUBSPOT_CLIENT_SECRET')!;

  const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    // Refresh failed — another call may have already refreshed and invalidated our refresh token.
    // Re-read the token in case another call succeeded.
    const { data: retryData } = await supabase
      .from('hubspot_tokens')
      .select('*')
      .eq('portal_id', portalId)
      .single();

    if (retryData && new Date(retryData.expires_at).getTime() > now.getTime()) {
      // Another call already refreshed successfully — use that token
      return await decryptToken(retryData.access_token);
    }

    throw new Error('Failed to refresh token and no valid token available');
  }

  const tokenData = await response.json();
  const encAccessToken = await encryptToken(tokenData.access_token);
  const encRefreshToken = await encryptToken(tokenData.refresh_token);
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  // Optimistic lock: only update if no other call has written since we read
  const { error: updateError } = await supabase
    .from('hubspot_tokens')
    .update({
      access_token: encAccessToken,
      refresh_token: encRefreshToken,
      expires_at: newExpiresAt,
    })
    .eq('portal_id', portalId)
    .eq('updated_at', lockTimestamp);

  if (updateError) {
    console.warn('Token update failed (likely concurrent refresh), using freshly obtained token');
  }

  return tokenData.access_token;
}
