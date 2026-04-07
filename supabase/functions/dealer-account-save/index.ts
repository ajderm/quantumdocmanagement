import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, createErrorResponse } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const portalId = (body.portalId || body.portal_id) as string | null;
    const accountData = body.accountData as Record<string, unknown> | undefined;
    const documentTerms = body.documentTerms as Record<string, string> | undefined;
    const dealerSettings = body.dealerSettings as Record<string, unknown> | undefined;
    const commissionUsers = body.commissionUsers as Array<{ hubspot_user_name: string; hubspot_user_id?: string; commission_percentage: number; phone?: string }> | undefined;

    console.log('Saving dealer account for portal:', portalId);

    // Validate portal ID format
    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portal ID format', 400, corsHeaders);
    }

    if (!accountData || typeof accountData !== 'object') {
      return createErrorResponse('Account data is required', 400, corsHeaders);
    }

    const companyName = accountData.company_name as string | undefined;
    if (!companyName?.trim()) {
      return new Response(JSON.stringify({ error: 'Company name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Basic guard: portal must have completed OAuth (token exists)
    const { data: token } = await supabase
      .from('hubspot_tokens')
      .select('portal_id')
      .eq('portal_id', portalId)
      .maybeSingle();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Portal not connected' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if account exists
    const { data: existing, error: fetchError } = await supabase
      .from('dealer_accounts')
      .select('id')
      .eq('hubspot_portal_id', portalId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching dealer account:', fetchError);
      throw fetchError;
    }

    const dataToSave = {
      hubspot_portal_id: portalId,
      company_name: companyName,
      address_line1: (accountData.address_line1 as string) || null,
      address_line2: (accountData.address_line2 as string) || null,
      city: (accountData.city as string) || null,
      state: (accountData.state as string) || null,
      zip_code: (accountData.zip_code as string) || null,
      phone: (accountData.phone as string) || null,
      website: (accountData.website as string) || null,
      email: (accountData.email as string) || null,
      terms_and_conditions: (accountData.terms_and_conditions as string) || null,
      logo_url: (accountData.logo_url as string) || null,
      updated_at: new Date().toISOString(),
    };

    let result: { id: string };
    if (existing) {
      console.log('Updating existing dealer account:', existing.id);
      const { data, error } = await supabase
        .from('dealer_accounts')
        .update(dataToSave)
        .eq('id', existing.id)
        .select('id')
        .single();

      if (error) throw error;
      result = data;
    } else {
      console.log('Creating new dealer account for portal:', portalId);
      const { data, error } = await supabase
        .from('dealer_accounts')
        .insert(dataToSave)
        .select('id')
        .single();

      if (error) throw error;
      result = data;
    }

    // Save document-specific terms if provided
    if (documentTerms && result?.id) {
      console.log('Saving document terms for account:', result.id);
      
      for (const [docType, terms] of Object.entries(documentTerms)) {
        if (terms !== undefined) {
          const { error: upsertError } = await supabase
            .from('document_terms')
            .upsert({
              dealer_account_id: result.id,
              document_type: docType,
              terms_and_conditions: terms || null,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'dealer_account_id,document_type',
            });

          if (upsertError) {
            console.error('Error saving document terms for', docType, ':', upsertError);
          }
        }
      }
    }

    // Save dealer settings if provided
    if (dealerSettings && result?.id) {
      console.log('Saving dealer settings for account:', result.id);
      
      for (const [settingKey, settingValue] of Object.entries(dealerSettings)) {
        if (settingValue !== undefined) {
          const { error: upsertError } = await supabase
            .from('dealer_settings')
            .upsert({
              dealer_account_id: result.id,
              setting_key: settingKey,
              setting_value: settingValue,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'dealer_account_id,setting_key',
            });

          if (upsertError) {
            console.error('Error saving dealer setting', settingKey, ':', upsertError);
          }
        }
      }
    }

    // Save commission user settings if provided
    if (commissionUsers && result?.id) {
      console.log('Saving commission user settings for account:', result.id);
      
      // Delete existing entries and re-insert
      const { error: deleteError } = await supabase
        .from('commission_user_settings')
        .delete()
        .eq('dealer_account_id', result.id);

      if (deleteError) {
        console.error('Error deleting old commission users:', deleteError);
      }

      if (commissionUsers.length > 0) {
        const rows = commissionUsers.map(u => ({
          dealer_account_id: result.id,
          hubspot_user_name: u.hubspot_user_name,
          hubspot_user_id: u.hubspot_user_id || null,
          commission_percentage: u.commission_percentage ?? 40,
          phone: u.phone || '',
        }));

        const { error: insertError } = await supabase
          .from('commission_user_settings')
          .insert(rows);

        if (insertError) {
          console.error('Error inserting commission users:', insertError);
        }
      }
    }

    console.log('Dealer account saved successfully:', result.id);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error saving dealer account:', error);
    const message = error instanceof Error ? error.message : 'Failed to save settings';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
