import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    
    console.log('OAuth callback received with code:', code ? 'present' : 'missing');

    if (!code) {
      console.error('No authorization code provided');
      return new Response('Missing authorization code', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const clientId = Deno.env.get('HUBSPOT_CLIENT_ID');
    const clientSecret = Deno.env.get('HUBSPOT_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret) {
      console.error('Missing HubSpot credentials');
      return new Response('Server configuration error', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    // The redirect URI must match exactly what's configured in HubSpot
    const redirectUri = `${supabaseUrl}/functions/v1/hubspot-oauth-callback`;

    console.log('Exchanging code for tokens...');

    // Exchange the authorization code for tokens
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(`Token exchange failed: ${errorText}`, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful, got access token and refresh token');

    // Get the portal ID from HubSpot
    const accessInfoResponse = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + tokenData.access_token);
    
    if (!accessInfoResponse.ok) {
      console.error('Failed to get access token info');
      return new Response('Failed to verify token', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const accessInfo = await accessInfoResponse.json();
    const portalId = accessInfo.hub_id.toString();
    
    console.log('Portal ID:', portalId);

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Encrypt tokens before storing
    console.log('Encrypting tokens before storage...');
    const encryptedAccessToken = await encryptToken(tokenData.access_token);
    const encryptedRefreshToken = await encryptToken(tokenData.refresh_token);
    console.log('Tokens encrypted successfully');

    // Store tokens in Supabase
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { error: upsertError } = await supabase
      .from('hubspot_tokens')
      .upsert({
        portal_id: portalId,
        // Store ciphertext (AES-256-GCM base64 payload)
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'portal_id'
      });

    if (upsertError) {
      console.error('Failed to store tokens:', upsertError);
      return new Response('Failed to store tokens', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    console.log('Encrypted tokens stored successfully for portal:', portalId);

    // Redirect back to HubSpot's Connected Apps page after successful install
    // This is the proper flow for HubSpot marketplace apps
    const hubspotRedirectUrl = `https://app.hubspot.com/settings/${portalId}/integrations/connected-apps`;

    console.log('Redirecting to HubSpot Connected Apps:', hubspotRedirectUrl);

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': hubspotRedirectUrl,
      },
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`OAuth error: ${message}`, { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
