import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { encryptToken, decryptToken } from '../_shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HubSpotToken {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  portal_id: string;
}

// Validate portalId format (should be numeric)
function validatePortalId(portalId: string): boolean {
  return /^\d{1,20}$/.test(portalId);
}

// Validate dealId format (should be numeric)
function validateDealId(dealId: string): boolean {
  return /^\d{1,20}$/.test(dealId);
}

async function refreshAccessToken(
  supabase: any,
  token: HubSpotToken,
  portalId: string
): Promise<string> {
  const clientId = Deno.env.get('HUBSPOT_CLIENT_ID');
  const clientSecret = Deno.env.get('HUBSPOT_CLIENT_SECRET');

  console.log('Refreshing access token for portal:', portalId);

  const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: token.refresh_token,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token refresh failed:', errorText);
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  // Encrypt new tokens before storing
  console.log('Encrypting refreshed tokens...');
  const encryptedAccessToken = await encryptToken(data.access_token);
  const encryptedRefreshToken = await encryptToken(data.refresh_token);

  await supabase
    .from('hubspot_tokens')
    .update({
      access_token: '', // Clear plaintext
      refresh_token: '', // Clear plaintext
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      tokens_encrypted: true,
      expires_at: expiresAt,
    })
    .eq('portal_id', portalId);

  console.log('Token refreshed and encrypted successfully');
  return data.access_token;
}

async function getValidAccessToken(
  supabase: any,
  portalId: string
): Promise<string> {
  console.log('Getting access token for portal:', portalId);
  
  const { data, error } = await supabase
    .from('hubspot_tokens')
    .select('*')
    .eq('portal_id', portalId)
    .single();

  if (error || !data) {
    console.error('Token fetch error:', error);
    throw new Error('No token found for portal');
  }

  console.log('Token found, encrypted:', data.tokens_encrypted);

  // Decrypt tokens if they are encrypted
  let accessToken: string;
  let refreshToken: string;

  if (data.tokens_encrypted) {
    console.log('Decrypting tokens...');
    accessToken = await decryptToken(data.access_token_encrypted);
    refreshToken = await decryptToken(data.refresh_token_encrypted);
    console.log('Tokens decrypted successfully');
  } else {
    // Legacy plaintext tokens (during migration period)
    console.log('Using legacy plaintext tokens');
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
  }

  const token: HubSpotToken = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: data.expires_at,
    portal_id: data.portal_id,
  };

  const expiresAt = new Date(token.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - bufferMs < now.getTime()) {
    console.log('Token expired or expiring soon, refreshing...');
    return await refreshAccessToken(supabase, token, portalId);
  }

  return token.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { portalId, dealId, properties } = body;

    console.log('Update deal request - portalId:', portalId, 'dealId:', dealId, 'properties:', properties);

    if (!portalId || !dealId || !properties) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: portalId, dealId, properties' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validatePortalId(portalId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid portal ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateDealId(dealId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid deal ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accessToken = await getValidAccessToken(supabase, portalId);
    console.log('Access token obtained');

    // Update deal properties via HubSpot API
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HubSpot API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `HubSpot API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updatedDeal = await response.json();
    console.log('Deal updated successfully:', updatedDeal.id);

    return new Response(
      JSON.stringify({ success: true, deal: updatedDeal }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Edge function error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
