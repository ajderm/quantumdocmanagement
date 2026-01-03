import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hubspot-signature, x-hubspot-signature-v3, x-hubspot-request-timestamp, x-dev-key',
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Update token in database
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  console.log('Token found, expires at:', data.expires_at);

  const token: HubSpotToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    portal_id: data.portal_id,
  };

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(token.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - bufferMs < now.getTime()) {
    console.log('Token expired or expiring soon, refreshing...');
    return await refreshAccessToken(supabase, token);
  }

  return token.access_token;
}

async function hubspotRequest(accessToken: string, endpoint: string) {
  console.log('HubSpot API request:', endpoint);
  
  const response = await fetch(`https://api.hubapi.com${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('HubSpot API error:', response.status, errorText);
    throw new Error(`HubSpot API error: ${response.status}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const portalId = url.searchParams.get('portalId');
    const dealId = url.searchParams.get('dealId');

    console.log('Request received - portalId:', portalId, 'dealId:', dealId);

    if (!portalId || !dealId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input formats
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

    // Fetch deal with properties including hs_object_id
    const dealResponse = await hubspotRequest(
      accessToken,
      `/crm/v3/objects/deals/${dealId}?properties=dealname,amount,dealstage,closedate,hubspot_owner_id,hs_object_id`
    );

    console.log('Deal fetched:', dealResponse.id);

    const deal = {
      dealId: dealResponse.id,
      hsObjectId: dealResponse.properties.hs_object_id || dealResponse.id,
      dealName: dealResponse.properties.dealname,
      amount: dealResponse.properties.amount ? parseFloat(dealResponse.properties.amount) : null,
      stage: dealResponse.properties.dealstage,
      closeDate: dealResponse.properties.closedate,
      ownerId: dealResponse.properties.hubspot_owner_id,
    };

    // Fetch deal owner with phone and email
    let dealOwner = null;
    if (deal.ownerId) {
      try {
        const ownerResponse = await hubspotRequest(accessToken, `/crm/v3/owners/${deal.ownerId}`);
        dealOwner = {
          id: ownerResponse.id,
          firstName: ownerResponse.firstName,
          lastName: ownerResponse.lastName,
          email: ownerResponse.email,
          phone: ownerResponse.userId ? null : null, // Owner phone is not directly available, would need user object
        };
        console.log('Deal owner fetched:', dealOwner.firstName, dealOwner.lastName);
      } catch (e) {
        console.error('Failed to fetch deal owner:', e);
      }
    }

    // Fetch associated company with all address fields
    let company = null;
    try {
      const companyAssociations = await hubspotRequest(
        accessToken,
        `/crm/v3/objects/deals/${dealId}/associations/companies`
      );
      
      if (companyAssociations.results?.length > 0) {
        const companyId = companyAssociations.results[0].id;
        const companyResponse = await hubspotRequest(
          accessToken,
          `/crm/v3/objects/companies/${companyId}?properties=name,address,address2,city,state,zip,phone,domain`
        );
        company = {
          companyId: companyResponse.id,
          name: companyResponse.properties.name,
          address: companyResponse.properties.address,
          address2: companyResponse.properties.address2,
          city: companyResponse.properties.city,
          state: companyResponse.properties.state,
          zip: companyResponse.properties.zip,
          phone: companyResponse.properties.phone,
          domain: companyResponse.properties.domain,
        };
        console.log('Company fetched:', company.name);
      }
    } catch (e) {
      console.error('Failed to fetch company:', e);
    }

    // Fetch associated contacts
    let contacts: any[] = [];
    try {
      const contactAssociations = await hubspotRequest(
        accessToken,
        `/crm/v3/objects/deals/${dealId}/associations/contacts`
      );
      
      if (contactAssociations.results?.length > 0) {
        const contactPromises = contactAssociations.results.slice(0, 5).map(async (assoc: any) => {
          const contactResponse = await hubspotRequest(
            accessToken,
            `/crm/v3/objects/contacts/${assoc.id}?properties=firstname,lastname,email,phone,jobtitle`
          );
          return {
            contactId: contactResponse.id,
            firstName: contactResponse.properties.firstname,
            lastName: contactResponse.properties.lastname,
            email: contactResponse.properties.email,
            phone: contactResponse.properties.phone,
            title: contactResponse.properties.jobtitle,
          };
        });
        contacts = await Promise.all(contactPromises);
        console.log('Contacts fetched:', contacts.length);
      }
    } catch (e) {
      console.error('Failed to fetch contacts:', e);
    }

    // Fetch line items with model field
    let lineItems: any[] = [];
    try {
      const lineItemAssociations = await hubspotRequest(
        accessToken,
        `/crm/v3/objects/deals/${dealId}/associations/line_items`
      );
      
      if (lineItemAssociations.results?.length > 0) {
        const lineItemPromises = lineItemAssociations.results.map(async (assoc: any) => {
          const lineItemResponse = await hubspotRequest(
            accessToken,
            `/crm/v3/objects/line_items/${assoc.id}?properties=name,description,quantity,price,hs_sku,hs_product_type,hs_recurring_billing_period`
          );
          return {
            id: lineItemResponse.id,
            name: lineItemResponse.properties.name,
            model: lineItemResponse.properties.hs_sku || lineItemResponse.properties.name, // Use SKU as model
            description: lineItemResponse.properties.description,
            quantity: parseFloat(lineItemResponse.properties.quantity) || 1,
            price: parseFloat(lineItemResponse.properties.price) || 0,
            sku: lineItemResponse.properties.hs_sku,
            category: lineItemResponse.properties.hs_product_type,
          };
        });
        lineItems = await Promise.all(lineItemPromises);
        console.log('Line items fetched:', lineItems.length);
      }
    } catch (e) {
      console.error('Failed to fetch line items:', e);
    }

    const responseData = {
      deal,
      dealOwner,
      company,
      contacts,
      lineItems,
    };

    console.log('Returning data successfully');

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Edge function error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});