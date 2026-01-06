import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encryptToken, decryptToken } from '../_shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshAccessToken(supabase: any, portalId: string, refreshToken: string): Promise<string> {
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

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const tokens = await response.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Encrypt new tokens before storing
  console.log('Encrypting refreshed tokens...');
  const encryptedAccessToken = await encryptToken(tokens.access_token);
  const encryptedRefreshToken = await encryptToken(tokens.refresh_token);

  await supabase
    .from('hubspot_tokens')
    .update({
      access_token: '', // Clear plaintext
      refresh_token: '', // Clear plaintext
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      tokens_encrypted: true,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('portal_id', portalId);

  console.log('Token refreshed and encrypted successfully');
  return tokens.access_token;
}

async function getValidAccessToken(supabase: any, portalId: string): Promise<string> {
  const { data: tokenData, error } = await supabase
    .from('hubspot_tokens')
    .select('*')
    .eq('portal_id', portalId)
    .single();

  if (error || !tokenData) {
    throw new Error('No HubSpot token found for portal');
  }

  console.log('Token found, encrypted:', tokenData.tokens_encrypted);

  // Decrypt tokens if they are encrypted
  let accessToken: string;
  let refreshToken: string;

  if (tokenData.tokens_encrypted) {
    console.log('Decrypting tokens...');
    accessToken = await decryptToken(tokenData.access_token_encrypted);
    refreshToken = await decryptToken(tokenData.refresh_token_encrypted);
    console.log('Tokens decrypted successfully');
  } else {
    // Legacy plaintext tokens (during migration period)
    console.log('Using legacy plaintext tokens');
    accessToken = tokenData.access_token;
    refreshToken = tokenData.refresh_token;
  }

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();

  // Refresh if expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return await refreshAccessToken(supabase, portalId, refreshToken);
  }

  return accessToken;
}

Deno.serve(async (req) => {
  console.log('hubspot-attach-file: Received request', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('hubspot-attach-file: Handling OPTIONS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('hubspot-attach-file: Parsing request body...');
    const body = await req.json();
    const { portalId, dealId, fileName, fileBase64 } = body;

    console.log('hubspot-attach-file: Request data:', { 
      portalId, 
      dealId, 
      fileName, 
      fileBase64Length: fileBase64?.length || 0 
    });

    if (!portalId || !dealId || !fileName || !fileBase64) {
      console.error('hubspot-attach-file: Missing required fields');
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accessToken = await getValidAccessToken(supabase, portalId);

    // Convert base64 to binary
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload file to HubSpot
    const formData = new FormData();
    formData.append('file', new Blob([bytes], { type: 'application/pdf' }), fileName);
    formData.append('options', JSON.stringify({
      access: 'PRIVATE',
      ttl: 'P3M', // 3 months
      overwrite: false,
      duplicateValidationStrategy: 'NONE',
      duplicateValidationScope: 'ENTIRE_PORTAL'
    }));
    formData.append('folderPath', '/quotes');

    console.log('Uploading file to HubSpot Files API...');
    
    const uploadResponse = await fetch('https://api.hubapi.com/files/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('HubSpot file upload error:', errorText);
      throw new Error(`Failed to upload file to HubSpot: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('File uploaded successfully:', uploadResult.id);

    // Create a note with the file attachment on the deal
    const notePayload = {
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: `Quote document generated: ${fileName}`,
        hs_attachment_ids: uploadResult.id,
      },
      associations: [
        {
          to: { id: dealId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }] // Note to Deal
        }
      ]
    };

    console.log('Creating note with attachment on deal...');

    const noteResponse = await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notePayload),
    });

    if (!noteResponse.ok) {
      const errorText = await noteResponse.text();
      console.error('HubSpot note creation error:', errorText);
      throw new Error(`Failed to create note in HubSpot: ${errorText}`);
    }

    const noteResult = await noteResponse.json();
    console.log('Note created successfully:', noteResult.id);

    return new Response(JSON.stringify({ 
      success: true, 
      fileId: uploadResult.id,
      noteId: noteResult.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error attaching file to HubSpot:', error);
    const message = error instanceof Error ? error.message : 'Failed to attach file';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
