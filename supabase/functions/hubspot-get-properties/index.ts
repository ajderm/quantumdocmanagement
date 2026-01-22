import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, createErrorResponse } from '../_shared/validation.ts';
import { decryptToken, encryptToken } from '../_shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HubSpotProperty {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  groupName: string;
  description?: string;
}

interface HubSpotToken {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

async function refreshAccessToken(
  supabase: any,
  token: HubSpotToken,
  portalId: string
): Promise<string> {
  const clientId = Deno.env.get('HUBSPOT_CLIENT_ID');
  const clientSecret = Deno.env.get('HUBSPOT_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('HubSpot OAuth credentials not configured');
  }

  const decryptedRefreshToken = await decryptToken(token.refresh_token);

  const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptedRefreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh failed:', error);
    throw new Error('Failed to refresh HubSpot token');
  }

  const data = await response.json();

  // Encrypt new tokens using shared utility
  const encryptedAccess = await encryptToken(data.access_token);
  const encryptedRefresh = await encryptToken(data.refresh_token);

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await supabase
    .from('hubspot_tokens')
    .update({
      access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('portal_id', portalId);

  return data.access_token;
}

async function getValidAccessToken(
  supabase: any,
  portalId: string
): Promise<string> {
  const { data: token, error } = await supabase
    .from('hubspot_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('portal_id', portalId)
    .single();

  if (error || !token) {
    throw new Error('HubSpot not connected for this portal');
  }

  const expiresAt = new Date(token.expires_at);
  const now = new Date();

  // Refresh if token expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Token expiring soon, refreshing...');
    return refreshAccessToken(supabase, token as HubSpotToken, portalId);
  }

  return decryptToken(token.access_token);
}

async function fetchHubSpotProperties(accessToken: string, objectType: string): Promise<HubSpotProperty[]> {
  const response = await fetch(
    `https://api.hubapi.com/crm/v3/properties/${objectType}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    console.error(`Failed to fetch ${objectType} properties:`, await response.text());
    return [];
  }

  const data = await response.json();
  return data.results.map((prop: any) => ({
    name: prop.name,
    label: prop.label,
    type: prop.type,
    fieldType: prop.fieldType,
    groupName: prop.groupName,
    description: prop.description,
  }));
}

async function fetchAssociationLabels(accessToken: string): Promise<{ id: string; label: string }[]> {
  // Fetch company-to-contact association labels
  const response = await fetch(
    'https://api.hubapi.com/crm/v4/associations/company/contact/labels',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    console.error('Failed to fetch association labels:', await response.text());
    return [];
  }

  const data = await response.json();
  return data.results
    .filter((label: any) => label.label) // Only user-defined labels
    .map((label: any) => ({
      id: label.typeId?.toString() || label.category,
      label: label.label,
    }));
}

async function fetchCustomObjects(accessToken: string): Promise<{ name: string; label: string }[]> {
  const response = await fetch(
    'https://api.hubapi.com/crm/v3/schemas',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    console.error('Failed to fetch custom objects:', await response.text());
    return [];
  }

  const data = await response.json();
  return data.results.map((schema: any) => ({
    name: schema.name,
    label: schema.labels?.singular || schema.name,
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let portalId: string | null = url.searchParams.get('portalId');
    
    if (!portalId) {
      const body = await req.json().catch(() => ({}));
      portalId = body.portalId || body.portal_id;
    }

    console.log('Fetching HubSpot properties for portal:', portalId);

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portal ID format', 400, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify portal is connected
    const { data: token } = await supabase
      .from('hubspot_tokens')
      .select('portal_id')
      .eq('portal_id', portalId)
      .maybeSingle();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Portal not connected' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getValidAccessToken(supabase, portalId);

    // Fetch properties for all standard object types in parallel
    const [
      dealProperties,
      companyProperties,
      contactProperties,
      lineItemProperties,
      associationLabels,
      customObjects,
    ] = await Promise.all([
      fetchHubSpotProperties(accessToken, 'deals'),
      fetchHubSpotProperties(accessToken, 'companies'),
      fetchHubSpotProperties(accessToken, 'contacts'),
      fetchHubSpotProperties(accessToken, 'line_items'),
      fetchAssociationLabels(accessToken),
      fetchCustomObjects(accessToken),
    ]);

    // Fetch properties for custom objects
    const customObjectProperties: Record<string, HubSpotProperty[]> = {};
    for (const obj of customObjects) {
      customObjectProperties[obj.name] = await fetchHubSpotProperties(accessToken, obj.name);
    }

    const result = {
      objects: {
        deal: {
          label: 'Deal',
          properties: dealProperties,
        },
        company: {
          label: 'Company',
          properties: companyProperties,
        },
        contact: {
          label: 'Contact',
          properties: contactProperties,
        },
        line_item: {
          label: 'Line Item',
          properties: lineItemProperties,
        },
        owner: {
          label: 'Deal Owner',
          properties: [
            { name: 'firstName', label: 'First Name', type: 'string', fieldType: 'text', groupName: 'owner' },
            { name: 'lastName', label: 'Last Name', type: 'string', fieldType: 'text', groupName: 'owner' },
            { name: 'email', label: 'Email', type: 'string', fieldType: 'text', groupName: 'owner' },
            { name: 'phone', label: 'Phone', type: 'string', fieldType: 'text', groupName: 'owner' },
          ],
        },
        ...Object.fromEntries(
          customObjects.map((obj) => [
            obj.name,
            {
              label: obj.label,
              properties: customObjectProperties[obj.name] || [],
              isCustomObject: true,
            },
          ])
        ),
      },
      associationLabels,
    };

    console.log(`Fetched properties: ${dealProperties.length} deal, ${companyProperties.length} company, ${contactProperties.length} contact, ${lineItemProperties.length} line item, ${customObjects.length} custom objects`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error fetching HubSpot properties:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch properties';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
