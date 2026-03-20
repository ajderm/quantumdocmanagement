import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, createErrorResponse, createJsonResponse } from '../_shared/validation.ts';
import { getValidAccessToken } from '../_shared/hubspot-token.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { portalId, name, sku, description, price, unitCost, productType, dealer } = body;

    if (!portalId || !name) {
      return createErrorResponse('Missing required fields: portalId, name', 400, corsHeaders);
    }

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portalId format', 400, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const accessToken = await getValidAccessToken(supabase, portalId);

    // Create product in HubSpot
    const properties: Record<string, string> = {
      name: name,
    };
    if (sku) properties.hs_sku = sku;
    if (description) properties.description = description;
    if (price !== undefined && price !== null) properties.price = String(price);
    if (unitCost !== undefined && unitCost !== null) properties.hs_cost_of_goods_sold = String(unitCost);
    if (productType) properties.hs_product_type = productType;
    if (dealer) properties.dealer = dealer;

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HubSpot create product error:', response.status, errorText);
      return createErrorResponse(`Failed to create product in HubSpot: ${response.status}`, 500, corsHeaders);
    }

    const product = await response.json();
    console.log('Product created in HubSpot:', product.id);

    return createJsonResponse({
      success: true,
      productId: product.id,
      product: {
        id: product.id,
        name: product.properties.name,
        sku: product.properties.hs_sku,
        price: parseFloat(product.properties.price || '0'),
        cost: parseFloat(product.properties.hs_cost_of_goods_sold || '0'),
      }
    }, corsHeaders);
  } catch (error: unknown) {
    console.error('Create product error:', error instanceof Error ? error.message : 'Unknown error');
    return createErrorResponse(
      error instanceof Error ? error.message : 'An error occurred',
      500,
      corsHeaders
    );
  }
});
