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

interface LabeledContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface LabeledContacts {
  shippingContact: LabeledContact | null;
  apContact: LabeledContact | null;
  itContact: LabeledContact | null;
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

// Fetch labeled contacts from company using V4 Associations API
async function fetchLabeledContacts(accessToken: string, companyId: string): Promise<LabeledContacts> {
  const labeledContacts: LabeledContacts = {
    shippingContact: null,
    apContact: null,
    itContact: null,
  };

  try {
    // Use V4 associations API to get contacts with labels
    const associationsResponse = await hubspotRequest(
      accessToken,
      `/crm/v4/objects/companies/${companyId}/associations/contacts`
    );

    console.log('Company contact associations:', JSON.stringify(associationsResponse));

    if (!associationsResponse.results?.length) {
      return labeledContacts;
    }

    // Map of label names to our labeled contact keys (case-insensitive)
    const labelMapping: Record<string, keyof LabeledContacts> = {
      'shipping_contact': 'shippingContact',
      'shipping contact': 'shippingContact',
      'shipping': 'shippingContact',
      'ap_contact': 'apContact',
      'ap contact': 'apContact',
      'billing_contact': 'apContact',
      'billing contact': 'apContact',
      'accounts_payable': 'apContact',
      'it_contact': 'itContact',
      'it contact': 'itContact',
      'it': 'itContact',
    };

    // Collect contact IDs by their label
    const contactsToFetch: Map<string, keyof LabeledContacts> = new Map();

    for (const result of associationsResponse.results) {
      const contactId = result.toObjectId;
      const associationTypes = result.associationTypes || [];

      for (const assocType of associationTypes) {
        // Check the label field (for user-defined labels)
        const label = assocType.label?.toLowerCase();
        if (label && labelMapping[label]) {
          contactsToFetch.set(contactId, labelMapping[label]);
          break;
        }
      }
    }

    console.log('Labeled contacts to fetch:', Array.from(contactsToFetch.entries()));

    // Fetch contact details for each labeled contact
    for (const [contactId, labelKey] of contactsToFetch) {
      try {
        const contactResponse = await hubspotRequest(
          accessToken,
          `/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,phone`
        );

        labeledContacts[labelKey] = {
          firstName: contactResponse.properties.firstname || '',
          lastName: contactResponse.properties.lastname || '',
          email: contactResponse.properties.email || '',
          phone: contactResponse.properties.phone || '',
        };

        console.log(`Fetched ${labelKey}:`, labeledContacts[labelKey]);
      } catch (e) {
        console.error(`Failed to fetch contact ${contactId}:`, e);
      }
    }
  } catch (e) {
    console.error('Failed to fetch labeled contacts:', e);
  }

  return labeledContacts;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Accept both GET query params and POST JSON body
    let portalId = url.searchParams.get('portalId');
    let dealId = url.searchParams.get('dealId');

    if ((!portalId || !dealId) && req.method !== 'GET') {
      const body = await req.json().catch(() => ({} as any));
      portalId = portalId || body.portalId || body.portal_id;
      dealId = dealId || body.dealId || body.recordId || body.objectId;
    }

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
          email: ownerResponse.email || null,
          phone: ownerResponse.phone || null,
        };
        console.log('Deal owner fetched:', dealOwner.firstName, dealOwner.lastName, 'email:', dealOwner.email);
      } catch (e) {
        console.error('Failed to fetch deal owner:', e);
      }
    }

    // Fetch associated company with all address fields including customer_number
    let company = null;
    let labeledContacts: LabeledContacts = {
      shippingContact: null,
      apContact: null,
      itContact: null,
    };

    try {
      const companyAssociations = await hubspotRequest(
        accessToken,
        `/crm/v3/objects/deals/${dealId}/associations/companies`
      );
      
      if (companyAssociations.results?.length > 0) {
        const companyId = companyAssociations.results[0].id;
        // Fetch company with all address fields including delivery (Ship To) and AP (Bill To) addresses
        const companyProperties = [
          'name', 'address', 'address2', 'city', 'state', 'zip', 'phone', 'domain', 'customer_number',
          // Ship To (Delivery) Address fields
          'street_address__del_', 'street_address_line_2__del_', 'city__del_', 'state__del_', 'postal_code__del_',
          // Bill To (AP) Address fields
          'street_address___ap_', 'street_address_line_2___ap_', 'city___ap_', 'state___ap_', 'zip_code___ap_'
        ].join(',');
        
        const companyResponse = await hubspotRequest(
          accessToken,
          `/crm/v3/objects/companies/${companyId}?properties=${companyProperties}`
        );
        
        // Debug: Log raw company properties to identify correct AP address field names
        console.log('Raw company properties:', JSON.stringify(companyResponse.properties));
        
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
          customerNumber: companyResponse.properties.customer_number || '',
          // Ship To (Delivery) Address
          deliveryAddress: companyResponse.properties.street_address__del_ || '',
          deliveryAddress2: companyResponse.properties.street_address_line_2__del_ || '',
          deliveryCity: companyResponse.properties.city__del_ || '',
          deliveryState: companyResponse.properties.state__del_ || '',
          deliveryZip: companyResponse.properties.postal_code__del_ || '',
          // Bill To (AP) Address
          apAddress: companyResponse.properties.street_address___ap_ || '',
          apAddress2: companyResponse.properties.street_address_line_2___ap_ || '',
          apCity: companyResponse.properties.city___ap_ || '',
          apState: companyResponse.properties.state___ap_ || '',
          apZip: companyResponse.properties.zip_code___ap_ || '',
        };
        console.log('Company fetched:', company.name, 'customerNumber:', company.customerNumber, 'deliveryAddress:', company.deliveryAddress, 'apAddress:', company.apAddress);

        // Fetch labeled contacts from company
        labeledContacts = await fetchLabeledContacts(accessToken, companyId);
      }
    } catch (e) {
      console.error('Failed to fetch company:', e);
    }

    // Fetch associated contacts (from deal)
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
      labeledContacts,
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
