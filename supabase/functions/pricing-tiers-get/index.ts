import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, createErrorResponse, createJsonResponse } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portalId } = await req.json();

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portalId', 400, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch active tiers for this portal
    const { data: tiers, error: tiersError } = await supabase
      .from('pricing_tiers')
      .select('id, name, sort_order')
      .eq('portal_id', portalId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (tiersError) {
      console.error('Error fetching tiers:', tiersError);
      return createErrorResponse('Failed to fetch pricing tiers', 500, corsHeaders);
    }

    if (!tiers || tiers.length === 0) {
      return createJsonResponse({ tiers: [] }, corsHeaders);
    }

    // Fetch prices for all tiers
    const tierIds = tiers.map(t => t.id);
    const { data: prices, error: pricesError } = await supabase
      .from('pricing_tier_prices')
      .select('pricing_tier_id, product_model, rep_cost')
      .in('pricing_tier_id', tierIds);

    if (pricesError) {
      console.error('Error fetching prices:', pricesError);
      return createErrorResponse('Failed to fetch tier prices', 500, corsHeaders);
    }

    // Group prices by tier
    const tiersWithPrices = tiers.map(tier => ({
      id: tier.id,
      name: tier.name,
      sort_order: tier.sort_order,
      prices: (prices || [])
        .filter(p => p.pricing_tier_id === tier.id)
        .map(p => ({ product_model: p.product_model, rep_cost: Number(p.rep_cost) })),
    }));

    return createJsonResponse({ tiers: tiersWithPrices }, corsHeaders);
  } catch (error) {
    console.error('pricing-tiers-get error:', error);
    return createErrorResponse('Internal server error', 500, corsHeaders);
  }
});
