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

    // Fetch all tokens that haven't been encrypted yet
    const { data: tokens, error: fetchError } = await supabase
      .from('hubspot_tokens')
      .select('*')
      .or('tokens_encrypted.is.null,tokens_encrypted.eq.false');

    if (fetchError) {
      console.error('Error fetching tokens:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch tokens' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!tokens || tokens.length === 0) {
      console.log('No unencrypted tokens found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No tokens to migrate',
        migrated: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${tokens.length} tokens to migrate`);

    let migratedCount = 0;
    const errors: string[] = [];

    for (const token of tokens) {
      try {
        // Skip if no plaintext tokens exist
        if (!token.access_token || !token.refresh_token) {
          console.log(`Skipping portal ${token.portal_id}: No plaintext tokens`);
          continue;
        }

        console.log(`Migrating tokens for portal ${token.portal_id}...`);

        // Encrypt the plaintext tokens
        const encryptedAccessToken = await encryptToken(token.access_token);
        const encryptedRefreshToken = await encryptToken(token.refresh_token);

        // Update the record with encrypted tokens
        const { error: updateError } = await supabase
          .from('hubspot_tokens')
          .update({
            access_token_encrypted: encryptedAccessToken,
            refresh_token_encrypted: encryptedRefreshToken,
            tokens_encrypted: true,
            access_token: '', // Clear plaintext
            refresh_token: '', // Clear plaintext
            updated_at: new Date().toISOString(),
          })
          .eq('portal_id', token.portal_id);

        if (updateError) {
          console.error(`Failed to update portal ${token.portal_id}:`, updateError);
          errors.push(`Portal ${token.portal_id}: ${updateError.message}`);
        } else {
          console.log(`Successfully migrated portal ${token.portal_id}`);
          migratedCount++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error migrating portal ${token.portal_id}:`, message);
        errors.push(`Portal ${token.portal_id}: ${message}`);
      }
    }

    const result = {
      success: errors.length === 0,
      message: `Migrated ${migratedCount} of ${tokens.length} tokens`,
      migrated: migratedCount,
      total: tokens.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Migration complete:', result);

    return new Response(JSON.stringify(result), {
      status: errors.length === 0 ? 200 : 207, // 207 Multi-Status if some failed
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
