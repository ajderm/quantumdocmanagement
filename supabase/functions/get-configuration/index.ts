import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetConfigRequest {
  portalId: string;
  dealId: string;
  configType: 'quote' | 'installation' | 'service_agreement' | 'fmv_lease' | 'lease_funding' | 'lease_return' | 'interterritorial' | 'new_customer' | 'relocation' | 'removal';
  lineItemId?: string;
}

// Validate portal ID format (numeric, reasonable length)
function validatePortalId(portalId: string): boolean {
  return /^\d{1,20}$/.test(portalId);
}

// Validate deal ID format (numeric, reasonable length)
function validateDealId(dealId: string): boolean {
  return /^\d{1,20}$/.test(dealId);
}

const tableMap: Record<string, string> = {
  'quote': 'quote_configurations',
  'installation': 'installation_configurations',
  'service_agreement': 'service_agreement_configurations',
  'fmv_lease': 'fmv_lease_configurations',
  'lease_funding': 'lease_funding_configurations',
  'lease_return': 'lease_return_configurations',
  'interterritorial': 'interterritorial_configurations',
  'new_customer': 'new_customer_configurations',
  'relocation': 'relocation_configurations',
  'removal': 'removal_configurations',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portalId, dealId, configType, lineItemId }: GetConfigRequest = await req.json();

    // Validate required fields
    if (!portalId || !dealId || !configType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: portalId, dealId, configType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate format
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

    // Validate config type
    if (!tableMap[configType]) {
      return new Response(
        JSON.stringify({ error: 'Invalid configuration type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify portal authentication - ensure the portal has a valid HubSpot token
    const { data: token, error: tokenError } = await supabase
      .from('hubspot_tokens')
      .select('portal_id')
      .eq('portal_id', portalId)
      .maybeSingle();

    if (tokenError) {
      console.error('Token verification error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify portal authentication' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Portal not authenticated. Please complete HubSpot OAuth first.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for configuration
    const tableName = tableMap[configType];
    let query = supabase
      .from(tableName)
      .select('configuration')
      .eq('portal_id', portalId)
      .eq('deal_id', dealId);

    // For line-item-based configs (installation, lease_funding), filter by line_item_id
    if (lineItemId && (configType === 'installation' || configType === 'lease_funding')) {
      query = query.eq('line_item_id', lineItemId);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Query error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: data?.configuration || null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-configuration:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
