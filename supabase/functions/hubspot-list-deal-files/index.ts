import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { validatePortalId, validateDealId, normalizeAnchorObjectType, createErrorResponse, createJsonResponse } from '../_shared/validation.ts';
import { getValidAccessToken } from '../_shared/hubspot-token.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// List file attachments already on a HubSpot record (deal or project), so the
// document-packet builder can pull previously generated in-app documents without
// re-uploading from the device. Files are discovered via the notes the app
// creates when it attaches a generated PDF (hs_attachment_ids). Scoping is
// enforced server-side by the portal's own token + the anchor record id — the
// client never supplies file identity beyond the record it is already on.

async function hsGet(accessToken: string, endpoint: string) {
  const resp = await fetch(`https://api.hubapi.com${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`HubSpot ${endpoint} -> ${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { portalId, dealId } = body;

    const objectType = normalizeAnchorObjectType(body.objectType);
    if (!objectType) return createErrorResponse('Unsupported objectType', 400, corsHeaders);
    if (!validatePortalId(portalId)) return createErrorResponse('Invalid portalId', 400, corsHeaders);
    if (!validateDealId(dealId)) return createErrorResponse('Invalid dealId', 400, corsHeaders);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const accessToken = await getValidAccessToken(supabase, portalId);

    // 1) Notes associated with the anchor record
    let noteAssoc: any;
    try {
      noteAssoc = await hsGet(accessToken, `/crm/v4/objects/${objectType}/${dealId}/associations/notes`);
    } catch (e) {
      console.error('Failed to list note associations:', e);
      return createJsonResponse({ files: [] }, corsHeaders);
    }

    const noteIds: string[] = (noteAssoc.results || [])
      .map((r: any) => String(r.toObjectId))
      .slice(0, 100); // safety cap

    // 2) Collect attachment file ids from those notes
    const fileIds = new Set<string>();
    for (const noteId of noteIds) {
      try {
        const note = await hsGet(accessToken, `/crm/v3/objects/notes/${noteId}?properties=hs_attachment_ids`);
        const ids = String(note.properties?.hs_attachment_ids || '')
          .split(';').join(',')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
        ids.forEach((id: string) => fileIds.add(id));
      } catch (e) {
        console.error('Failed to read note', noteId, e);
      }
    }

    // 3) Resolve file metadata (name, type, date) for each attachment
    const files = [];
    for (const fileId of [...fileIds].slice(0, 200)) {
      try {
        const meta = await hsGet(accessToken, `/files/v3/files/${fileId}?properties=name,extension,type,createdAt,size`);
        // Only surface PDFs — the packet compiler is PDF-oriented
        const ext = (meta.extension || '').toLowerCase();
        if (ext && ext !== 'pdf') continue;
        files.push({
          fileId: String(meta.id),
          name: meta.name ? `${meta.name}${ext ? '.' + ext : ''}` : `Document ${fileId}`,
          createdAt: meta.createdAt || null,
          size: meta.size || null,
        });
      } catch (e) {
        console.error('Failed to read file meta', fileId, e);
      }
    }

    // Newest first
    files.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    console.log(`Listed ${files.length} deal file(s) for ${objectType} ${dealId}`);
    return createJsonResponse({ files }, corsHeaders);
  } catch (error) {
    console.error('hubspot-list-deal-files error:', error);
    return createErrorResponse('Internal server error', 500, corsHeaders);
  }
});
