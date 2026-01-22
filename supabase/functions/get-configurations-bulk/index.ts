import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkGetConfigRequest {
  portalId: string;
  dealId: string;
}

// Validate portal ID format (numeric, reasonable length)
function validatePortalId(portalId: string): boolean {
  return /^\d{1,20}$/.test(portalId);
}

// Validate deal ID format (numeric, reasonable length)
function validateDealId(dealId: string): boolean {
  return /^\d{1,20}$/.test(dealId);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portalId, dealId }: BulkGetConfigRequest = await req.json();

    // Validate required fields
    if (!portalId || !dealId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: portalId, dealId' }),
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

    // Fetch all configurations in parallel
    const [
      quoteResult,
      installationResult,
      serviceAgreementResult,
      fmvLeaseResult,
      leaseFundingResult,
      loiResult,
      leaseReturnResult,
      interterritorialResult,
      newCustomerResult,
      relocationResult,
      removalResult,
      customDocResult,
    ] = await Promise.all([
      supabase
        .from('quote_configurations')
        .select('configuration')
        .eq('portal_id', portalId)
        .eq('deal_id', dealId)
        .maybeSingle(),
      supabase
        .from('installation_configurations')
        .select('line_item_id, configuration')
        .eq('portal_id', portalId)
        .eq('deal_id', dealId),
      supabase
        .from('service_agreement_configurations')
        .select('configuration')
        .eq('portal_id', portalId)
        .eq('deal_id', dealId)
        .maybeSingle(),
      supabase
        .from('fmv_lease_configurations')
        .select('configuration')
        .eq('portal_id', portalId)
        .eq('deal_id', dealId)
        .maybeSingle(),
      supabase
        .from('lease_funding_configurations')
        .select('line_item_id, configuration')
        .eq('portal_id', portalId)
        .eq('deal_id', dealId),
      supabase
        .from('loi_configurations')
        .select('configuration')
        .eq('portal_id', portalId)
        .eq('deal_id', dealId)
        .maybeSingle(),
      supabase
        .from('lease_return_configurations')
        .select('configuration')
        .eq('portal_id', portalId)
        .eq('deal_id', dealId)
        .maybeSingle(),
      supabase
        .from('interterritorial_configurations')
        .select('configuration')
        .eq('portal_id', portalId)
        .eq('deal_id', dealId)
        .maybeSingle(),
      supabase
        .from('new_customer_configurations')
        .select('configuration')
        .eq('portal_id', portalId)
        .eq('deal_id', dealId)
        .maybeSingle(),
      supabase
        .from('relocation_configurations')
        .select('configuration')
        .eq('portal_id', portalId)
        .eq('deal_id', dealId)
        .maybeSingle(),
      supabase
        .from('removal_configurations')
        .select('configuration')
        .eq('portal_id', portalId)
        .eq('deal_id', dealId)
        .maybeSingle(),
      supabase
        .from('custom_document_configurations')
        .select('custom_document_id, configuration')
        .eq('portal_id', portalId)
        .eq('deal_id', dealId),
    ]);

    // Build installation configs map
    const installationConfigs: Record<string, unknown> = {};
    if (installationResult.data) {
      installationResult.data.forEach((row: { line_item_id: string; configuration: unknown }) => {
        installationConfigs[row.line_item_id] = row.configuration;
      });
    }

    // Build lease funding configs map
    const leaseFundingConfigs: Record<string, unknown> = {};
    if (leaseFundingResult.data) {
      leaseFundingResult.data.forEach((row: { line_item_id: string; configuration: unknown }) => {
        leaseFundingConfigs[row.line_item_id] = row.configuration;
      });
    }

    // Build custom document configs map
    const customDocConfigs: Record<string, unknown> = {};
    if (customDocResult.data) {
      customDocResult.data.forEach((row: { custom_document_id: string; configuration: unknown }) => {
        customDocConfigs[row.custom_document_id] = row.configuration;
      });
    }

    const response = {
      quote: quoteResult.data?.configuration || null,
      installation: installationConfigs,
      serviceAgreement: serviceAgreementResult.data?.configuration || null,
      fmvLease: fmvLeaseResult.data?.configuration || null,
      leaseFunding: leaseFundingConfigs,
      loi: loiResult.data?.configuration || null,
      leaseReturn: leaseReturnResult.data?.configuration || null,
      interterritorial: interterritorialResult.data?.configuration || null,
      newCustomer: newCustomerResult.data?.configuration || null,
      relocation: relocationResult.data?.configuration || null,
      removal: removalResult.data?.configuration || null,
      customDocuments: customDocConfigs,
    };

    return new Response(
      JSON.stringify({ data: response }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-configurations-bulk:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
