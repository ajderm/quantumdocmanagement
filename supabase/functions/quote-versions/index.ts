import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, createErrorResponse, createJsonResponse } from '../_shared/validation.ts';
import { auditLog } from '../_shared/audit-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate a unique quote number: QT-{dealId}-{version padded to 3 digits}
 * e.g., QT-316332586743-001, QT-316332586743-002
 */
function generateQuoteNumber(dealId: string, versionNumber: number): string {
  return `QT-${dealId}-${String(versionNumber).padStart(3, '0')}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, portalId, dealId, configuration, versionId, label, userId } = body;

    if (!portalId || !dealId || !action) {
      return createErrorResponse('Missing required fields: portalId, dealId, action', 400, corsHeaders);
    }

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portalId format', 400, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify portal has a valid token
    const { data: token } = await supabase
      .from('hubspot_tokens')
      .select('portal_id')
      .eq('portal_id', portalId)
      .maybeSingle();

    if (!token) {
      return createErrorResponse('Portal not authenticated', 403, corsHeaders);
    }

    switch (action) {
      case 'save_version': {
        if (!configuration) {
          return createErrorResponse('Missing configuration for save_version', 400, corsHeaders);
        }

        // Get next version number for this deal
        const { data: latestVersion } = await supabase
          .from('quote_versions')
          .select('version_number')
          .eq('portal_id', portalId)
          .eq('deal_id', dealId)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextVersion = (latestVersion?.version_number || 0) + 1;
        const quoteNumber = generateQuoteNumber(dealId, nextVersion);

        // Save the version
        const { data: savedVersion, error: saveError } = await supabase
          .from('quote_versions')
          .insert({
            portal_id: portalId,
            deal_id: dealId,
            version_number: nextVersion,
            quote_number: quoteNumber,
            label: label || `Quote v${nextVersion}`,
            configuration,
            created_by: userId || null,
          })
          .select()
          .single();

        if (saveError) {
          console.error('Save version error:', saveError);
          return createErrorResponse('Failed to save quote version', 500, corsHeaders);
        }

        // Update quote_configurations with current version reference
        await supabase
          .from('quote_configurations')
          .update({
            current_quote_number: quoteNumber,
            current_version_id: savedVersion.id,
            updated_at: new Date().toISOString(),
          })
          .eq('portal_id', portalId)
          .eq('deal_id', dealId);

        auditLog(supabase, portalId, 'quote_version_saved', 'quote', dealId, {
          versionNumber: nextVersion,
          quoteNumber,
          label: label || `Quote v${nextVersion}`,
        }, userId);

        return createJsonResponse({
          success: true,
          version: savedVersion,
          quoteNumber,
          versionNumber: nextVersion,
        }, corsHeaders);
      }

      case 'list_versions': {
        const { data: versions, error: listError } = await supabase
          .from('quote_versions')
          .select('id, version_number, quote_number, label, created_by, created_at')
          .eq('portal_id', portalId)
          .eq('deal_id', dealId)
          .order('version_number', { ascending: false });

        if (listError) {
          console.error('List versions error:', listError);
          return createErrorResponse('Failed to list versions', 500, corsHeaders);
        }

        // Also get the current active version
        const { data: currentConfig } = await supabase
          .from('quote_configurations')
          .select('current_quote_number, current_version_id')
          .eq('portal_id', portalId)
          .eq('deal_id', dealId)
          .maybeSingle();

        return createJsonResponse({
          versions: versions || [],
          currentQuoteNumber: currentConfig?.current_quote_number || null,
          currentVersionId: currentConfig?.current_version_id || null,
        }, corsHeaders);
      }

      case 'load_version': {
        if (!versionId) {
          return createErrorResponse('Missing versionId for load_version', 400, corsHeaders);
        }

        const { data: version, error: loadError } = await supabase
          .from('quote_versions')
          .select('*')
          .eq('id', versionId)
          .eq('portal_id', portalId)
          .eq('deal_id', dealId)
          .single();

        if (loadError || !version) {
          return createErrorResponse('Version not found', 404, corsHeaders);
        }

        return createJsonResponse({
          version,
          configuration: version.configuration,
        }, corsHeaders);
      }

      case 'restore_version': {
        if (!versionId) {
          return createErrorResponse('Missing versionId for restore_version', 400, corsHeaders);
        }

        // Load the version to restore
        const { data: version, error: loadError } = await supabase
          .from('quote_versions')
          .select('*')
          .eq('id', versionId)
          .eq('portal_id', portalId)
          .eq('deal_id', dealId)
          .single();

        if (loadError || !version) {
          return createErrorResponse('Version not found', 404, corsHeaders);
        }

        // Update the working configuration
        await supabase
          .from('quote_configurations')
          .update({
            configuration: version.configuration,
            current_quote_number: version.quote_number,
            current_version_id: version.id,
            updated_at: new Date().toISOString(),
          })
          .eq('portal_id', portalId)
          .eq('deal_id', dealId);

        auditLog(supabase, portalId, 'quote_version_restored', 'quote', dealId, {
          restoredVersionId: versionId,
          quoteNumber: version.quote_number,
          versionNumber: version.version_number,
        }, userId);

        return createJsonResponse({
          success: true,
          configuration: version.configuration,
          quoteNumber: version.quote_number,
          versionNumber: version.version_number,
        }, corsHeaders);
      }

      default:
        return createErrorResponse(`Unknown action: ${action}`, 400, corsHeaders);
    }
  } catch (error: unknown) {
    console.error('Quote versions error:', error instanceof Error ? error.message : 'Unknown error');
    return createErrorResponse(
      error instanceof Error ? error.message : 'An error occurred',
      500,
      corsHeaders
    );
  }
});
