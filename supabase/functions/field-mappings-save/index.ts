import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, createErrorResponse } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FieldMapping {
  field_key: string;
  hubspot_object: string;
  hubspot_property: string;
  association_label?: string;
  association_path?: string; // 'company_contact' = contact via company association
  document_type?: string; // null for global
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { portalId, action, mappings, documentType } = body;

    console.log('Field mapping operation:', action, 'for portal:', portalId);

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portal ID format', 400, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get dealer account
    const { data: dealerAccount } = await supabase
      .from('dealer_accounts')
      .select('id')
      .eq('hubspot_portal_id', portalId)
      .maybeSingle();

    if (!dealerAccount) {
      return new Response(JSON.stringify({ error: 'Dealer account not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dealerAccountId = dealerAccount.id;

    switch (action) {
      case 'save': {
        if (!Array.isArray(mappings)) {
          return createErrorResponse('Mappings array required', 400, corsHeaders);
        }

        // Delete existing mappings for this scope (global or specific document type)
        const deleteQuery = supabase
          .from('hubspot_field_mappings')
          .delete()
          .eq('dealer_account_id', dealerAccountId);

        if (documentType) {
          deleteQuery.eq('document_type', documentType);
        } else {
          deleteQuery.is('document_type', null);
        }

        await deleteQuery;

        // Insert new mappings
        if (mappings.length > 0) {
          const mappingsToInsert = mappings.map((m: FieldMapping) => ({
            dealer_account_id: dealerAccountId,
            document_type: documentType || null,
            field_key: m.field_key,
            hubspot_object: m.hubspot_object,
            hubspot_property: m.hubspot_property,
            association_label: m.association_label || null,
            association_path: m.association_path || null,
          }));

          const { error } = await supabase
            .from('hubspot_field_mappings')
            .insert(mappingsToInsert);

          if (error) throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get': {
        // Get all mappings for the dealer account
        const { data, error } = await supabase
          .from('hubspot_field_mappings')
          .select('*')
          .eq('dealer_account_id', dealerAccountId)
          .order('field_key');

        if (error) throw error;

        // Group by document type (null = global)
        const grouped: Record<string, FieldMapping[]> = { global: [] };
        for (const mapping of data || []) {
          const key = mapping.document_type || 'global';
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push({
            field_key: mapping.field_key,
            hubspot_object: mapping.hubspot_object,
            hubspot_property: mapping.hubspot_property,
            association_label: mapping.association_label,
            association_path: mapping.association_path,
          });
        }

        return new Response(JSON.stringify({ mappings: grouped }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return createErrorResponse('Invalid action', 400, corsHeaders);
    }
  } catch (error: unknown) {
    console.error('Error in field-mappings-save:', error);
    const message = error instanceof Error ? error.message : 'Operation failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
