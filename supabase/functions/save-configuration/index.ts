import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SaveConfigRequest {
  portalId: string;
  dealId: string;
  configType: 'quote' | 'installation' | 'service_agreement' | 'fmv_lease' | 'lease_funding' | 'lease_return' | 'interterritorial' | 'new_customer' | 'relocation' | 'removal';
  lineItemId?: string;
  configuration: Record<string, unknown>;
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
    const { portalId, dealId, configType, lineItemId, configuration }: SaveConfigRequest = await req.json();

    // Validate required fields
    if (!portalId || !dealId || !configType || !configuration) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: portalId, dealId, configType, configuration' }),
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

    // Validate configuration is an object
    if (typeof configuration !== 'object' || configuration === null) {
      return new Response(
        JSON.stringify({ error: 'Configuration must be an object' }),
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

    // Build save data
    const tableName = tableMap[configType];
    const dataToSave: Record<string, unknown> = {
      portal_id: portalId,
      deal_id: dealId,
      configuration,
      updated_at: new Date().toISOString(),
    };

    // For line-item-based configs, include line_item_id
    if ((configType === 'installation' || configType === 'lease_funding') && lineItemId) {
      dataToSave.line_item_id = lineItemId;
    }

    // Determine conflict columns based on config type
    let onConflict: string;
    if (configType === 'installation' || configType === 'lease_funding') {
      onConflict = 'portal_id,deal_id,line_item_id';
    } else {
      onConflict = 'portal_id,deal_id';
    }

    const { error: saveError } = await supabase
      .from(tableName)
      .upsert(dataToSave, { onConflict });

    if (saveError) {
      console.error('Save error:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Saved ${configType} configuration for portal ${portalId}, deal ${dealId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in save-configuration:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
