import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, createErrorResponse, createJsonResponse } from '../_shared/validation.ts';
import { getValidAccessToken } from '../_shared/hubspot-token.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Equipment property names we want to fetch
const EQUIPMENT_PROPERTIES = [
  'equipment_number', 'make', 'model', 'type', 'serial',
  'active', 'install_date', 'lease_number', 'contract_number', 'location',
  'hs_object_id',
];

/**
 * Auto-discover the Equipment custom object ID by querying the HubSpot schema API.
 * Returns the objectTypeId (e.g., "2-175428522") or null if not found.
 */
async function discoverEquipmentObjectId(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.hubapi.com/crm/v3/schemas', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      console.error('Schema API error:', response.status);
      return null;
    }
    const data = await response.json();
    const schemas = data.results || [];
    
    // Look for an object with label or name containing "equipment" (case-insensitive)
    const equipmentSchema = schemas.find((s: any) => {
      const label = (s.labels?.singular || '').toLowerCase();
      const pluralLabel = (s.labels?.plural || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      return label === 'equipment' || pluralLabel === 'equipment' || name === 'equipment'
        || label.includes('equipment') || name.includes('equipment');
    });

    if (equipmentSchema) {
      console.log(`Discovered Equipment object: ${equipmentSchema.objectTypeId} (${equipmentSchema.labels?.singular})`);
      return equipmentSchema.objectTypeId;
    }

    console.log('No Equipment custom object found in portal');
    return null;
  } catch (err) {
    console.error('Failed to discover equipment object:', err);
    return null;
  }
}

/**
 * Get (or discover and cache) the equipment object ID for a portal.
 */
async function getEquipmentObjectId(
  supabase: any,
  portalId: string,
  accessToken: string
): Promise<string | null> {
  // Check if we already have a cached object ID in dealer_settings
  const { data: settings } = await supabase
    .from('dealer_settings')
    .select('equipment_object_id')
    .eq('portal_id', portalId)
    .single();

  if (settings?.equipment_object_id) {
    // Return cached value (could be "none" meaning no equipment object exists)
    return settings.equipment_object_id === 'none' ? null : settings.equipment_object_id;
  }

  // Discover from HubSpot schema API
  const objectId = await discoverEquipmentObjectId(accessToken);

  // Cache the result (store "none" if not found so we don't re-discover every time)
  await supabase
    .from('dealer_settings')
    .update({ equipment_object_id: objectId || 'none' })
    .eq('portal_id', portalId);

  return objectId;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, portalId, companyId } = body;

    if (!portalId || !action) {
      return createErrorResponse('Missing portalId or action', 400, corsHeaders);
    }
    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portalId', 400, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const accessToken = await getValidAccessToken(supabase, portalId);

    switch (action) {
      // Check if equipment object exists for this portal
      case 'check': {
        const objectId = await getEquipmentObjectId(supabase, portalId, accessToken);
        return createJsonResponse({
          available: !!objectId,
          objectTypeId: objectId,
        }, corsHeaders);
      }

      // Fetch equipment associated to a company
      case 'get_company_equipment': {
        if (!companyId) {
          return createErrorResponse('Missing companyId', 400, corsHeaders);
        }

        const objectId = await getEquipmentObjectId(supabase, portalId, accessToken);
        if (!objectId) {
          return createJsonResponse({ available: false, equipment: [] }, corsHeaders);
        }

        // Get equipment records associated to this company
        // Step 1: Get associations from company to equipment
        const assocResponse = await fetch(
          `https://api.hubapi.com/crm/v4/objects/companies/${companyId}/associations/${objectId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!assocResponse.ok) {
          const errText = await assocResponse.text();
          console.error('Association fetch error:', assocResponse.status, errText);
          return createJsonResponse({ available: true, equipment: [] }, corsHeaders);
        }

        const assocData = await assocResponse.json();
        const equipmentIds = (assocData.results || []).map((r: any) => r.toObjectId);

        if (equipmentIds.length === 0) {
          return createJsonResponse({ available: true, equipment: [] }, corsHeaders);
        }

        // Step 2: Batch read equipment records
        const batchResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/${objectId}/batch/read`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: equipmentIds.map((id: string) => ({ id })),
              properties: EQUIPMENT_PROPERTIES,
            }),
          }
        );

        if (!batchResponse.ok) {
          const errText = await batchResponse.text();
          console.error('Batch read error:', batchResponse.status, errText);
          return createJsonResponse({ available: true, equipment: [] }, corsHeaders);
        }

        const batchData = await batchResponse.json();
        const equipment = (batchData.results || []).map((record: any) => ({
          id: record.id,
          equipmentNumber: record.properties.equipment_number || '',
          make: record.properties.make || '',
          model: record.properties.model || '',
          type: record.properties.type || '',
          serial: record.properties.serial || '',
          active: record.properties.active || '',
          installDate: record.properties.install_date || '',
          leaseNumber: record.properties.lease_number || '',
          contractNumber: record.properties.contract_number || '',
          location: record.properties.location || '',
        }));

        // Filter to active equipment by default
        const activeEquipment = equipment.filter(
          (e: any) => !e.active || e.active.toLowerCase() === 'yes' || e.active === 'true'
        );

        return createJsonResponse({
          available: true,
          equipment: activeEquipment,
          allEquipment: equipment,
        }, corsHeaders);
      }

      // Re-discover the equipment object (force refresh)
      case 'rediscover': {
        // Clear cached value
        await supabase
          .from('dealer_settings')
          .update({ equipment_object_id: null })
          .eq('portal_id', portalId);

        const objectId = await discoverEquipmentObjectId(accessToken);

        // Re-cache
        await supabase
          .from('dealer_settings')
          .update({ equipment_object_id: objectId || 'none' })
          .eq('portal_id', portalId);

        return createJsonResponse({
          available: !!objectId,
          objectTypeId: objectId,
        }, corsHeaders);
      }

      default:
        return createErrorResponse(`Unknown action: ${action}`, 400, corsHeaders);
    }
  } catch (error: unknown) {
    console.error('Equipment error:', error instanceof Error ? error.message : 'Unknown');
    return createErrorResponse(
      error instanceof Error ? error.message : 'An error occurred',
      500,
      corsHeaders
    );
  }
});
