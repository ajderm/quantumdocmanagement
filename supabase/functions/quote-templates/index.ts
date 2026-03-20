import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, createErrorResponse, createJsonResponse } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fields to strip from templates (customer-specific, not reusable)
const CUSTOMER_FIELDS = [
  'quoteNumber', 'quoteDate', 'companyName', 'address', 'address2',
  'city', 'state', 'zip', 'phone', 'preparedBy', 'preparedByEmail',
  'preparedByPhone', 'rfpNumber', 'contractNumber',
];

function stripCustomerFields(config: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...config };
  for (const field of CUSTOMER_FIELDS) {
    delete cleaned[field];
  }
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, portalId, templateId, name, description, configuration, shared, userId, userName } = body;

    if (!portalId || !action) {
      return createErrorResponse('Missing required fields: portalId, action', 400, corsHeaders);
    }

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portalId format', 400, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify portal
    const { data: token } = await supabase
      .from('hubspot_tokens')
      .select('portal_id')
      .eq('portal_id', portalId)
      .maybeSingle();

    if (!token) {
      return createErrorResponse('Portal not authenticated', 403, corsHeaders);
    }

    switch (action) {
      case 'save_template': {
        if (!name || !configuration) {
          return createErrorResponse('Missing name or configuration', 400, corsHeaders);
        }

        const cleanedConfig = stripCustomerFields(configuration);

        const { data: saved, error: saveError } = await supabase
          .from('quote_templates')
          .insert({
            portal_id: portalId,
            name,
            description: description || '',
            configuration: cleanedConfig,
            shared: shared || false,
            created_by: userId || null,
            created_by_name: userName || null,
          })
          .select()
          .single();

        if (saveError) {
          console.error('Save template error:', saveError);
          return createErrorResponse('Failed to save template', 500, corsHeaders);
        }

        return createJsonResponse({ success: true, template: saved }, corsHeaders);
      }

      case 'list_templates': {
        // Return all shared templates + personal templates for this user
        let query = supabase
          .from('quote_templates')
          .select('id, name, description, shared, created_by, created_by_name, created_at, updated_at')
          .eq('portal_id', portalId)
          .order('name');

        const { data: templates, error: listError } = await query;

        if (listError) {
          console.error('List templates error:', listError);
          return createErrorResponse('Failed to list templates', 500, corsHeaders);
        }

        // Filter: shared templates + user's own personal templates
        const filtered = (templates || []).filter(t =>
          t.shared || t.created_by === userId
        );

        return createJsonResponse({ templates: filtered }, corsHeaders);
      }

      case 'load_template': {
        if (!templateId) {
          return createErrorResponse('Missing templateId', 400, corsHeaders);
        }

        const { data: template, error: loadError } = await supabase
          .from('quote_templates')
          .select('*')
          .eq('id', templateId)
          .eq('portal_id', portalId)
          .single();

        if (loadError || !template) {
          return createErrorResponse('Template not found', 404, corsHeaders);
        }

        return createJsonResponse({ template, configuration: template.configuration }, corsHeaders);
      }

      case 'delete_template': {
        if (!templateId) {
          return createErrorResponse('Missing templateId', 400, corsHeaders);
        }

        const { error: deleteError } = await supabase
          .from('quote_templates')
          .delete()
          .eq('id', templateId)
          .eq('portal_id', portalId);

        if (deleteError) {
          console.error('Delete template error:', deleteError);
          return createErrorResponse('Failed to delete template', 500, corsHeaders);
        }

        return createJsonResponse({ success: true }, corsHeaders);
      }

      default:
        return createErrorResponse(`Unknown action: ${action}`, 400, corsHeaders);
    }
  } catch (error: unknown) {
    console.error('Quote templates error:', error instanceof Error ? error.message : 'Unknown error');
    return createErrorResponse(
      error instanceof Error ? error.message : 'An error occurred',
      500,
      corsHeaders
    );
  }
});
