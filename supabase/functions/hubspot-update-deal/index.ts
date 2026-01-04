import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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
  token: HubSpotToken
): Promise<string> {
  const clientId = Deno.env.get('HUBSPOT_CLIENT_ID');
  const clientSecret = Deno.env.get('HUBSPOT_CLIENT_SECRET');

  console.log('Refreshing access token for portal:', token.portal_id);

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

  await supabase
    .from('hubspot_tokens')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
    })
    .eq('portal_id', token.portal_id);

  console.log('Token refreshed successfully');
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

  const token: HubSpotToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    portal_id: data.portal_id,
  };

  const expiresAt = new Date(token.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - bufferMs < now.getTime()) {
    console.log('Token expired or expiring soon, refreshing...');
    return await refreshAccessToken(supabase, token);
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
