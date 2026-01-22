import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, createErrorResponse } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    let portalId: string | null = url.searchParams.get('portalId');
    if (!portalId) {
      const body = await req.json().catch(() => ({} as Record<string, unknown>));
      portalId = (body.portalId || body.portal_id) as string | null;
    }

    console.log('Fetching dealer account for portal:', portalId);

    // Validate portal ID format
    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portal ID format', 400, corsHeaders);
    }

    // Use service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Basic guard: portal must have completed OAuth (token exists)
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

    const { data, error } = await supabase
      .from('dealer_accounts')
      .select('*')
      .eq('hubspot_portal_id', portalId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching dealer account:', error);
      throw error;
    }

    // Fetch document-specific terms if dealer account exists
    let documentTerms: Record<string, string> = {};
    let dealerSettings: Record<string, unknown> = {};
    let customDocuments: unknown[] = [];
    let fieldMappings: Record<string, unknown[]> = { global: [] };
    
    if (data?.id) {
      // Fetch document terms
      const { data: termsData, error: termsError } = await supabase
        .from('document_terms')
        .select('document_type, terms_and_conditions')
        .eq('dealer_account_id', data.id);

      if (!termsError && termsData) {
        documentTerms = termsData.reduce((acc, item) => {
          acc[item.document_type] = item.terms_and_conditions || '';
          return acc;
        }, {} as Record<string, string>);
      }

      // Fetch dealer settings (meter_methods, cca_value)
      const { data: settingsData, error: settingsError } = await supabase
        .from('dealer_settings')
        .select('setting_key, setting_value')
        .eq('dealer_account_id', data.id);

      if (!settingsError && settingsData) {
        settingsData.forEach(item => {
          dealerSettings[item.setting_key] = item.setting_value;
        });
      }

      // Fetch custom documents
      const { data: customDocsData, error: customDocsError } = await supabase
        .from('custom_documents')
        .select('*')
        .eq('dealer_account_id', data.id)
        .order('sort_order', { ascending: true });

      if (!customDocsError && customDocsData) {
        customDocuments = customDocsData;
      }

      // Fetch field mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('hubspot_field_mappings')
        .select('*')
        .eq('dealer_account_id', data.id)
        .order('field_key');

      if (!mappingsError && mappingsData) {
        fieldMappings = { global: [] };
        for (const mapping of mappingsData) {
          const key = mapping.document_type || 'global';
          if (!fieldMappings[key]) fieldMappings[key] = [];
          fieldMappings[key].push({
            field_key: mapping.field_key,
            hubspot_object: mapping.hubspot_object,
            hubspot_property: mapping.hubspot_property,
            association_label: mapping.association_label,
          });
        }
      }
    }

    console.log('Dealer account found:', data ? data.id : 'none');

    return new Response(JSON.stringify({ 
      dealer: data, 
      documentTerms, 
      dealerSettings,
      customDocuments,
      fieldMappings,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error fetching dealer account:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch settings';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
