import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encryptToken } from '../_shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * One-time migration function to encrypt existing plaintext HubSpot tokens
 * This function should be called once after deploying the encryption updates
 * 
 * SECURITY: This function uses service role key and should only be called by admins
 */
Deno.serve(async (req) => {
  console.log('migrate-hubspot-tokens: Received request', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Migration has been finalized: tokens are now stored as ciphertext in
    // hubspot_tokens.access_token and hubspot_tokens.refresh_token.
    // Keep this function as a safe no-op so existing operational runbooks don't break.

    const result = {
      success: true,
      message: 'Token encryption is already finalized (no migration required).',
      migrated: 0,
      total: 0,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Migration error:', error);
    const message = error instanceof Error ? error.message : 'Migration failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
