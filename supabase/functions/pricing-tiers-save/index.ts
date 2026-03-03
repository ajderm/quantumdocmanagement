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
    const { portalId, tiers } = await req.json();

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portalId', 400, corsHeaders);
    }

    if (!Array.isArray(tiers)) {
      return createErrorResponse('tiers must be an array', 400, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get existing tiers for this portal
    const { data: existingTiers } = await supabase
      .from('pricing_tiers')
      .select('id, name')
      .eq('portal_id', portalId);

    const existingMap = new Map((existingTiers || []).map(t => [t.name, t.id]));
    const incomingNames = new Set(tiers.map((t: any) => t.name));

    // Deactivate tiers not in incoming list
    const toDeactivate = (existingTiers || []).filter(t => !incomingNames.has(t.name));
    if (toDeactivate.length > 0) {
      await supabase
        .from('pricing_tiers')
        .update({ is_active: false })
        .in('id', toDeactivate.map(t => t.id));
    }

    // Upsert each tier and its prices
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const name = (tier.name || '').trim();
      if (!name) continue;

      let tierId: string;

      if (existingMap.has(name)) {
        tierId = existingMap.get(name)!;
        await supabase
          .from('pricing_tiers')
          .update({ sort_order: i, is_active: true })
          .eq('id', tierId);
      } else {
        const { data: newTier, error: insertError } = await supabase
          .from('pricing_tiers')
          .insert({ portal_id: portalId, name, sort_order: i, is_active: true })
          .select('id')
          .single();

        if (insertError || !newTier) {
          console.error('Error inserting tier:', insertError);
          continue;
        }
        tierId = newTier.id;
      }

      // Replace all prices for this tier
      await supabase
        .from('pricing_tier_prices')
        .delete()
        .eq('pricing_tier_id', tierId);

      const prices = (tier.prices || [])
        .filter((p: any) => p.product_model && p.rep_cost !== undefined)
        .map((p: any) => ({
          pricing_tier_id: tierId,
          product_model: p.product_model.trim(),
          rep_cost: Number(p.rep_cost),
        }));

      if (prices.length > 0) {
        const { error: pricesError } = await supabase
          .from('pricing_tier_prices')
          .insert(prices);

        if (pricesError) {
          console.error('Error inserting prices for tier', name, pricesError);
        }
      }
    }

    return createJsonResponse({ success: true }, corsHeaders);
  } catch (error) {
    console.error('pricing-tiers-save error:', error);
    return createErrorResponse('Internal server error', 500, corsHeaders);
  }
});
