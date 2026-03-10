import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decryptToken } from '../_shared/crypto.ts';
import { validatePortalId, validateDealId, createErrorResponse, createJsonResponse } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

async function hubspotRequest(accessToken: string, endpoint: string, method = 'GET', body?: any) {
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`https://api.hubapi.com${endpoint}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`HubSpot API error (${method} ${endpoint}):`, response.status, errorText);
    throw new Error(`HubSpot API error: ${response.status}`);
  }

  // Some DELETE endpoints return 204 No Content
  if (response.status === 204) return null;
  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portalId, dealId, lineItems } = await req.json();

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portalId', 400, corsHeaders);
    }
    if (!validateDealId(dealId)) {
      return createErrorResponse('Invalid dealId', 400, corsHeaders);
    }
    if (!Array.isArray(lineItems)) {
      return createErrorResponse('lineItems must be an array', 400, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const accessToken = await getValidAccessToken(supabase, portalId);

    // Step 1: Get existing line item associations for this deal
    console.log('Fetching existing line items for deal:', dealId);
    let existingLineItemIds: string[] = [];
    try {
      const associations = await hubspotRequest(
        accessToken,
        `/crm/v3/objects/deals/${dealId}/associations/line_items`
      );
      existingLineItemIds = (associations?.results || []).map((r: any) => r.id || r.toObjectId);
      console.log('Found existing line items:', existingLineItemIds.length);
    } catch (e) {
      console.log('No existing line items or error fetching:', e);
    }

    // Step 2: Delete existing line items (batch archive)
    if (existingLineItemIds.length > 0) {
      console.log('Archiving', existingLineItemIds.length, 'existing line items');
      // HubSpot batch archive accepts max 100 at a time
      const batches = [];
      for (let i = 0; i < existingLineItemIds.length; i += 100) {
        batches.push(existingLineItemIds.slice(i, i + 100));
      }

      for (const batch of batches) {
        await hubspotRequest(accessToken, '/crm/v3/objects/line_items/batch/archive', 'POST', {
          inputs: batch.map(id => ({ id })),
        });
      }
      console.log('Archived existing line items');
    }

    // Step 3: Create new line items from quote configuration
    if (lineItems.length > 0) {
      console.log('Creating', lineItems.length, 'new line items');
      
      const inputs = lineItems.map((item: any) => {
        const properties: Record<string, any> = {
          name: item.description || item.model || 'Line Item',
          quantity: String(item.quantity || 1),
          price: String(item.price || 0),
          hs_sku: item.model || '',
          hs_cost_of_goods_sold: String(item.cost || 0),
        };

        // If we have a HubSpot product ID, link to it
        if (item.hs_product_id) {
          properties.hs_product_id = item.hs_product_id;
        }

        // Sync dealer/pricing source
        if (item.dealer) {
          properties.dealer = item.dealer;
        }

        // Sync product type
        if (item.productType) {
          properties.hs_product_type = item.productType;
        }

        // Sync MSRP as unit_cost if available
        if (item.msrp) {
          properties.unit_cost = String(item.msrp);
        }

        return { properties };
      });

      // Batch create (max 100 per batch)
      const createBatches = [];
      for (let i = 0; i < inputs.length; i += 100) {
        createBatches.push(inputs.slice(i, i + 100));
      }

      for (const batch of createBatches) {
        const createResult = await hubspotRequest(
          accessToken,
          '/crm/v3/objects/line_items/batch/create',
          'POST',
          { inputs: batch }
        );

        // Step 4: Associate new line items with the deal
        if (createResult?.results) {
          for (const created of createResult.results) {
            await hubspotRequest(
              accessToken,
              `/crm/v3/objects/line_items/${created.id}/associations/deals/${dealId}/20`,
              'PUT'
            );
          }
        }
      }

      console.log('Created and associated new line items');
    }

    return createJsonResponse({
      success: true,
      deletedCount: existingLineItemIds.length,
      createdCount: lineItems.length,
    }, corsHeaders);
  } catch (error) {
    console.error('hubspot-sync-line-items error:', error);
    return createErrorResponse('Internal server error', 500, corsHeaders);
  }
});
