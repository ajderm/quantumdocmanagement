import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decryptToken } from '../_shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hubspot-signature, x-hubspot-signature-v3, x-hubspot-request-timestamp, x-dev-key',
};

function validatePortalId(portalId: string): boolean {
  return /^\d{1,20}$/.test(portalId);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portalId } = await req.json();

    if (!portalId || !validatePortalId(portalId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing portalId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get access token
    const { data: tokenData, error: tokenError } = await supabase
      .from('hubspot_tokens')
      .select('*')
      .eq('portal_id', portalId)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'No token found for portal' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = await decryptToken(tokenData.access_token);

    // Check if expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt.getTime() - 5 * 60 * 1000 < Date.now()) {
      // Refresh token
      const clientId = Deno.env.get('HUBSPOT_CLIENT_ID')!;
      const clientSecret = Deno.env.get('HUBSPOT_CLIENT_SECRET')!;
      const refreshToken = await decryptToken(tokenData.refresh_token);

      const refreshResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }),
      });

      if (!refreshResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;
    }

    // Fetch owners
    const ownersResponse = await fetch('https://api.hubapi.com/crm/v3/owners?limit=100', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!ownersResponse.ok) {
      const errorText = await ownersResponse.text();
      console.error('HubSpot owners API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch owners from HubSpot' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ownersData = await ownersResponse.json();
    const owners = (ownersData.results || [])
      .filter((o: any) => !o.archived)
      .map((o: any) => ({
        id: o.id,
        firstName: o.firstName || '',
        lastName: o.lastName || '',
        email: o.email || '',
      }));

    return new Response(
      JSON.stringify({ owners }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
