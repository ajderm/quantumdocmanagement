import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const body = await req.json().catch(() => ({} as any));
    const portalId: string | null = body.portalId || body.portal_id || null;
    const accountData = body.accountData;

    console.log('Saving dealer account for portal:', portalId);

    if (!portalId) {
      return new Response(JSON.stringify({ error: 'Portal ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!accountData?.company_name?.trim()) {
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
      company_name: accountData.company_name,
      address_line1: accountData.address_line1 || null,
      address_line2: accountData.address_line2 || null,
      city: accountData.city || null,
      state: accountData.state || null,
      zip_code: accountData.zip_code || null,
      phone: accountData.phone || null,
      website: accountData.website || null,
      email: accountData.email || null,
      terms_and_conditions: accountData.terms_and_conditions || null,
      logo_url: accountData.logo_url || null,
      updated_at: new Date().toISOString(),
    };

    let result;
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
