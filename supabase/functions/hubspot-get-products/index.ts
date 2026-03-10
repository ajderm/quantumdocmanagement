import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decryptToken } from '../_shared/crypto.ts';
import { validatePortalId, createErrorResponse, createJsonResponse } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Normalization map for common hs_product_type variants
const TYPE_ALIASES: Record<string, string> = {
  'hw': 'Hardware',
  'hardware': 'Hardware',
  'acc': 'Accessory',
  'accessory': 'Accessory',
  'accessories': 'Accessory',
  'service': 'Service',
  'svc': 'Service',
  'software': 'Software',
  'sw': 'Software',
};

function normalizeProductType(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (TYPE_ALIASES[lower]) return TYPE_ALIASES[lower];
  // Title-case: first letter uppercase, rest lowercase
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

async function getValidAccessToken(supabase: any, portalId: string): Promise<string> {
  const { data, error } = await supabase
    .from('hubspot_tokens')
    .select('*')
    .eq('portal_id', portalId)
    .single();

  if (error || !data) throw new Error('No token found for portal');

  const accessToken = await decryptToken(data.access_token);
  const refreshToken = await decryptToken(data.refresh_token);

  const expiresAt = new Date(data.expires_at);
  const now = new Date();
  if (expiresAt.getTime() - 5 * 60 * 1000 < now.getTime()) {
    const clientId = Deno.env.get('HUBSPOT_CLIENT_ID')!;
    const clientSecret = Deno.env.get('HUBSPOT_CLIENT_SECRET')!;

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) throw new Error('Failed to refresh token');
    const tokenData = await response.json();

    const { encryptToken } = await import('../_shared/crypto.ts');
    const encAccessToken = await encryptToken(tokenData.access_token);
    const encRefreshToken = await encryptToken(tokenData.refresh_token);
    const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    await supabase.from('hubspot_tokens').update({
      access_token: encAccessToken,
      refresh_token: encRefreshToken,
      expires_at: newExpiresAt,
    }).eq('portal_id', portalId);

    return tokenData.access_token;
  }

  return accessToken;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portalId, search, productType, dealerFilter, after } = await req.json();

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portalId', 400, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const accessToken = await getValidAccessToken(supabase, portalId);

    // Don't filter by productType at HubSpot level — we normalize + override after fetch
    const searchBody: any = {
      filterGroups: [],
      properties: [
        'name', 'hs_sku', 'description', 'price',
        'hs_cost_of_goods_sold', 'unit_cost', 'hs_product_type',
        'hs_images', 'hs_recurring_billing_period', 'dealer',
      ],
      limit: 100,
      sorts: [{ propertyName: 'name', direction: 'ASCENDING' }],
    };

    if (search) {
      searchBody.query = search;
    }

    if (after) {
      searchBody.after = after;
    }

    // Fetch products from HubSpot
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/products/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HubSpot products search error:', response.status, errorText);
      return createErrorResponse('Failed to fetch products from HubSpot', 500, corsHeaders);
    }

    const data = await response.json();

    // Fetch portal-level product type overrides
    const { data: overrides } = await supabase
      .from('product_type_overrides')
      .select('hs_product_id, product_type')
      .eq('portal_id', portalId);

    const overrideMap = new Map<string, string>();
    if (overrides) {
      for (const o of overrides) {
        overrideMap.set(o.hs_product_id, o.product_type);
      }
    }

    // Map + normalize + apply overrides
    let products = (data.results || []).map((p: any) => {
      const override = overrideMap.get(p.id);
      const normalizedType = normalizeProductType(p.properties.hs_product_type);
      const effectiveType = override || normalizedType;

      return {
        id: p.id,
        name: p.properties.name || '',
        sku: p.properties.hs_sku || '',
        description: p.properties.description || '',
        price: parseFloat(p.properties.price) || 0,
        cost: parseFloat(p.properties.unit_cost) || parseFloat(p.properties.hs_cost_of_goods_sold) || 0,
        productType: effectiveType,
        originalType: normalizedType,
        hasOverride: !!override,
        dealer: p.properties.dealer || '',
      };
    });

    // Collect distinct dealer values BEFORE filtering (so dropdown shows all options)
    const dealerValues = [...new Set(products.map((p: any) => p.dealer).filter(Boolean))].sort();

    // Apply productType filter AFTER normalization + overrides
    if (productType) {
      products = products.filter((p: any) => p.productType === productType);
    }

    // Apply dealer/pricing source filter
    if (dealerFilter) {
      products = products.filter((p: any) => p.dealer === dealerFilter);
    }

    return createJsonResponse({
      products,
      hasMore: !!data.paging?.next,
      after: data.paging?.next?.after || null,
      total: data.total || products.length,
      dealerValues,
    }, corsHeaders);
  } catch (error) {
    console.error('hubspot-get-products error:', error);
    return createErrorResponse('Internal server error', 500, corsHeaders);
  }
});
