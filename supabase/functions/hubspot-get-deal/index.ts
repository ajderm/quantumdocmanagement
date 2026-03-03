import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { encryptToken, decryptToken } from '../_shared/crypto.ts';

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
  properties?: Record<string, any>;
}

interface LabeledContacts {
  shippingContact: LabeledContact | null;
  apContact: LabeledContact | null;
  itContact: LabeledContact | null;
}

// Company contacts keyed by association label
type CompanyContacts = Record<string, LabeledContact>;

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

  // Store ciphertext directly in the canonical columns
  await supabase
    .from('hubspot_tokens')
    .update({
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: expiresAt,
    })
    .eq('portal_id', portalId);

  console.log('Token refreshed and encrypted successfully');
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

  // Tokens are stored encrypted-at-rest (ciphertext in access_token/refresh_token)
  console.log('Decrypting tokens...');
  const accessToken = await decryptToken(data.access_token);
  const refreshToken = await decryptToken(data.refresh_token);
  console.log('Tokens decrypted successfully');

  const token: HubSpotToken = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: data.expires_at,
    portal_id: data.portal_id,
  };

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(token.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - bufferMs < now.getTime()) {
    console.log('Token expired or expiring soon, refreshing...');
    return await refreshAccessToken(supabase, token, portalId);
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
// Now accepts an optional list of additional labels to fetch beyond the hardcoded ones
async function fetchLabeledContacts(
  accessToken: string, 
  companyId: string,
  additionalLabels: string[] = []
): Promise<{ labeledContacts: LabeledContacts; companyContacts: CompanyContacts }> {
  const labeledContacts: LabeledContacts = {
    shippingContact: null,
    apContact: null,
    itContact: null,
  };
  const companyContacts: CompanyContacts = {};

  try {
    // Use V4 associations API to get contacts with labels
    const associationsResponse = await hubspotRequest(
      accessToken,
      `/crm/v4/objects/companies/${companyId}/associations/contacts`
    );

    console.log('Company contact associations:', JSON.stringify(associationsResponse));

    if (!associationsResponse.results?.length) {
      return { labeledContacts, companyContacts };
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

    // Normalize additional labels for matching
    const additionalLabelsLower = additionalLabels.map(l => l.toLowerCase());

    // Collect contact IDs by their label
    const contactsToFetch: Map<string, { legacyKey?: keyof LabeledContacts; dynamicLabel?: string }> = new Map();

    for (const result of associationsResponse.results) {
      const contactId = result.toObjectId;
      const associationTypes = result.associationTypes || [];

      for (const assocType of associationTypes) {
        // Check the label field (for user-defined labels)
        const label = assocType.label?.toLowerCase();
        if (!label) continue;

        // Check legacy hardcoded mapping
        if (labelMapping[label]) {
          contactsToFetch.set(contactId, { 
            ...contactsToFetch.get(contactId),
            legacyKey: labelMapping[label] 
          });
        }
        
        // Check dynamic labels from field mappings
        if (additionalLabelsLower.includes(label)) {
          contactsToFetch.set(contactId, {
            ...contactsToFetch.get(contactId),
            dynamicLabel: assocType.label // preserve original case
          });
        }
      }
    }

    console.log('Labeled contacts to fetch:', Array.from(contactsToFetch.entries()));

    // Fetch contact details for each labeled contact
    for (const [contactId, { legacyKey, dynamicLabel }] of contactsToFetch) {
      try {
        const contactResponse = await hubspotRequest(
          accessToken,
          `/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,phone`
        );

        const contactData: LabeledContact = {
          firstName: contactResponse.properties.firstname || '',
          lastName: contactResponse.properties.lastname || '',
          email: contactResponse.properties.email || '',
          phone: contactResponse.properties.phone || '',
          properties: contactResponse.properties,
        };

        // Populate legacy labeled contacts
        if (legacyKey) {
          labeledContacts[legacyKey] = contactData;
          console.log(`Fetched ${legacyKey}:`, contactData);
        }

        // Populate dynamic company contacts by label
        if (dynamicLabel) {
          companyContacts[dynamicLabel] = contactData;
          console.log(`Fetched company contact '${dynamicLabel}':`, contactData);
        }
      } catch (e) {
        console.error(`Failed to fetch contact ${contactId}:`, e);
      }
    }
  } catch (e) {
    console.error('Failed to fetch labeled contacts:', e);
  }

  return { labeledContacts, companyContacts };
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

    // Load field mappings from database
    let fieldMappings: Record<string, any[]> = { global: [] };
    const { data: dealerAccount } = await supabase
      .from('dealer_accounts')
      .select('id')
      .eq('hubspot_portal_id', portalId)
      .maybeSingle();

    if (dealerAccount) {
      const { data: mappingsData } = await supabase
        .from('hubspot_field_mappings')
        .select('*')
        .eq('dealer_account_id', dealerAccount.id);
      
      if (mappingsData) {
        for (const m of mappingsData) {
          const key = m.document_type || 'global';
          if (!fieldMappings[key]) fieldMappings[key] = [];
          fieldMappings[key].push(m);
        }
      }
    }

    // Build dynamic property lists from mappings
    const companyPropsNeeded = new Set(['name', 'address', 'address2', 'city', 'state', 'zip', 'phone', 'domain', 'customer_number',
      'street_address__del_', 'street_address_line_2__del_', 'city__del_', 'state__del_', 'postal_code__del_', 'zip__del_', 'zip_code__del_',
      'street_address__ap_', 'street_address_line_2__ap_', 'city__ap_', 'state__ap_', 'zip_code__ap_']);
    const contactPropsNeeded = new Set(['firstname', 'lastname', 'email', 'phone', 'jobtitle']);
    const dealPropsNeeded = new Set(['dealname', 'amount', 'dealstage', 'closedate', 'hubspot_owner_id', 'hs_object_id']);
    const lineItemPropsNeeded = new Set(['name', 'description', 'quantity', 'price', 'hs_sku', 'hs_product_type', 'hs_recurring_billing_period', 'hs_cost_of_goods_sold', 'unit_cost', 'condition', 'hs_product_condition', 'dealer', 'manufacturer', 'vendor', 'hs_line_item_dealer', 'color_mono', 'machine_type']);

    // Add properties from field mappings
    for (const mappings of Object.values(fieldMappings)) {
      for (const mapping of mappings) {
        switch (mapping.hubspot_object) {
          case 'company':
            companyPropsNeeded.add(mapping.hubspot_property);
            break;
          case 'contact':
            contactPropsNeeded.add(mapping.hubspot_property);
            break;
          case 'deal':
            dealPropsNeeded.add(mapping.hubspot_property);
            break;
          case 'line_item':
            lineItemPropsNeeded.add(mapping.hubspot_property);
            break;
        }
      }
    }

    console.log('Dynamic properties - deal:', Array.from(dealPropsNeeded).length, 'company:', Array.from(companyPropsNeeded).length);

    // Fetch deal with dynamic properties
    const dealPropsString = Array.from(dealPropsNeeded).join(',');
    const dealResponse = await hubspotRequest(
      accessToken,
      `/crm/v3/objects/deals/${dealId}?properties=${dealPropsString}`
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
    let companyContacts: CompanyContacts = {};

    // Collect company-contact association labels needed from field mappings
    const companyContactLabels: Set<string> = new Set();
    for (const mappings of Object.values(fieldMappings)) {
      for (const mapping of mappings) {
        if (mapping.hubspot_object === 'contact' && 
            mapping.association_path === 'company_contact' && 
            mapping.association_label) {
          companyContactLabels.add(mapping.association_label);
        }
      }
    }
    console.log('Company contact labels to fetch:', Array.from(companyContactLabels));

    try {
      const companyAssociations = await hubspotRequest(
        accessToken,
        `/crm/v3/objects/deals/${dealId}/associations/companies`
      );
      
      if (companyAssociations.results?.length > 0) {
        const companyId = companyAssociations.results[0].id;
        // Fetch company with all address fields including delivery (Ship To) and AP (Bill To) addresses
        // Use dynamic company properties list
        const companyPropsString = Array.from(companyPropsNeeded).join(',');
        
        const companyResponse = await hubspotRequest(
          accessToken,
          `/crm/v3/objects/companies/${companyId}?properties=${companyPropsString}`
        );
        
        // Debug: Log raw company properties to identify correct AP address field names
        console.log('Raw company properties:', JSON.stringify(companyResponse.properties));
        
        // Helper to validate if a value looks like a valid ZIP code (not a 2-letter state)
        const isValidZip = (val: string | null | undefined): boolean => {
          if (!val) return false;
          const trimmed = val.trim();
          // ZIP codes contain digits and are not just 2 letters (state abbreviation)
          if (/^\d{5}(-\d{4})?$/.test(trimmed)) return true; // US ZIP
          if (/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(trimmed)) return true; // Canadian postal
          // Reject if it's exactly 2 letters (state abbreviation)
          if (/^[A-Za-z]{2}$/.test(trimmed)) return false;
          // Accept if it contains any digits
          return /\d/.test(trimmed);
        };

        // Get the best delivery ZIP value (try multiple fields, validate each)
        const rawDeliveryZips = [
          companyResponse.properties.zip__del_,
          companyResponse.properties.zip_code__del_,
          companyResponse.properties.postal_code__del_,
        ];
        const deliveryZip = rawDeliveryZips.find(isValidZip) || '';
        
        console.log('Delivery ZIP candidates:', rawDeliveryZips, 'Selected:', deliveryZip);

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
          deliveryZip: deliveryZip,
          // Bill To (AP) Address (2 underscores)
          apAddress: companyResponse.properties.street_address__ap_ || '',
          apAddress2: companyResponse.properties.street_address_line_2__ap_ || '',
          apCity: companyResponse.properties.city__ap_ || '',
          apState: companyResponse.properties.state__ap_ || '',
          apZip: companyResponse.properties.zip_code__ap_ || '',
        };
        console.log('Company fetched:', company.name, 'customerNumber:', company.customerNumber, 'deliveryAddress:', company.deliveryAddress, 'apAddress:', company.apAddress);

        // Fetch labeled contacts from company (pass additional labels from field mappings)
        const contactsResult = await fetchLabeledContacts(accessToken, companyId, Array.from(companyContactLabels));
        labeledContacts = contactsResult.labeledContacts;
        companyContacts = contactsResult.companyContacts;
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
        // Use dynamic contact properties list
        const contactPropsString = Array.from(contactPropsNeeded).join(',');
        const contactPromises = contactAssociations.results.slice(0, 5).map(async (assoc: any) => {
          const contactResponse = await hubspotRequest(
            accessToken,
            `/crm/v3/objects/contacts/${assoc.id}?properties=${contactPropsString}`
          );
          return {
            contactId: contactResponse.id,
            firstName: contactResponse.properties.firstname,
            lastName: contactResponse.properties.lastname,
            email: contactResponse.properties.email,
            phone: contactResponse.properties.phone,
            title: contactResponse.properties.jobtitle,
            properties: contactResponse.properties, // Include raw properties
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
        // Use dynamic line item properties list
        const lineItemPropsString = Array.from(lineItemPropsNeeded).join(',');
        const lineItemPromises = lineItemAssociations.results.map(async (assoc: any) => {
          const lineItemResponse = await hubspotRequest(
            accessToken,
            `/crm/v3/objects/line_items/${assoc.id}?properties=${lineItemPropsString}`
          );
          return {
            id: lineItemResponse.id,
            name: lineItemResponse.properties.name,
            model: lineItemResponse.properties.hs_sku || lineItemResponse.properties.name,
            description: lineItemResponse.properties.description,
            quantity: parseFloat(lineItemResponse.properties.quantity) || 1,
            price: parseFloat(lineItemResponse.properties.price) || 0,
            sku: lineItemResponse.properties.hs_sku,
            category: lineItemResponse.properties.hs_product_type,
            condition: lineItemResponse.properties.condition || lineItemResponse.properties.hs_product_condition || '',
            dealer: lineItemResponse.properties.dealer || lineItemResponse.properties.manufacturer || lineItemResponse.properties.vendor || lineItemResponse.properties.hs_line_item_dealer || '',
            machineType: lineItemResponse.properties.color_mono || lineItemResponse.properties.machine_type || 'Color',
            cost: parseFloat(lineItemResponse.properties.hs_cost_of_goods_sold) || 0,
            properties: lineItemResponse.properties, // Include raw properties
          };
        });
        lineItems = await Promise.all(lineItemPromises);
        console.log('Line items fetched:', lineItems.length);
      }
    } catch (e) {
      console.error('Failed to fetch line items:', e);
    }

    // Build raw properties object for custom field resolution
    const rawProperties = {
      company: company ? { ...company, ...(dealResponse?.properties || {}) } : {},
      deal: dealResponse?.properties || {},
      owner: dealOwner || {},
    };

    const responseData = {
      deal,
      dealOwner,
      company,
      contacts,
      lineItems,
      labeledContacts,
      companyContacts, // Add company contacts keyed by association label
      // Include raw properties for custom document field resolution
      properties: rawProperties,
      fieldMappings,
    };

    console.log('Returning data successfully, companyContacts labels:', Object.keys(companyContacts));

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
