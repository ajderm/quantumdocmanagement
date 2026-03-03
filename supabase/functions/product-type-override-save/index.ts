import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { validatePortalId, createErrorResponse, createJsonResponse } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_TYPES = ['Hardware', 'Accessory', 'Service', 'Software'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portalId, hsProductId, productType } = await req.json();

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portalId', 400, corsHeaders);
    }

    if (!hsProductId || typeof hsProductId !== 'string') {
      return createErrorResponse('Invalid hsProductId', 400, corsHeaders);
    }

    if (!VALID_TYPES.includes(productType)) {
      return createErrorResponse(`Invalid productType. Must be one of: ${VALID_TYPES.join(', ')}`, 400, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase
      .from('product_type_overrides')
      .upsert(
        {
          portal_id: portalId,
          hs_product_id: hsProductId,
          product_type: productType,
        },
        { onConflict: 'portal_id,hs_product_id' }
      );

    if (error) {
      console.error('Failed to save product type override:', error);
      return createErrorResponse('Failed to save override', 500, corsHeaders);
    }

    return createJsonResponse({ success: true }, corsHeaders);
  } catch (error) {
    console.error('product-type-override-save error:', error);
    return createErrorResponse('Internal server error', 500, corsHeaders);
  }
});
