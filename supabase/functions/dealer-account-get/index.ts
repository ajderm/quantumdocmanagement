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
    const url = new URL(req.url);

    let portalId = url.searchParams.get('portalId');
    if (!portalId) {
      const body = await req.json().catch(() => ({} as any));
      portalId = body.portalId || body.portal_id;
    }

    console.log('Fetching dealer account for portal:', portalId);

    if (!portalId) {
      return new Response(JSON.stringify({ error: 'Portal ID is required' }), {
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

    const { data, error } = await supabase
      .from('dealer_accounts')
      .select('*')
      .eq('hubspot_portal_id', portalId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching dealer account:', error);
      throw error;
    }

    // Fetch document-specific terms if dealer account exists
    let documentTerms: Record<string, string> = {};
    if (data?.id) {
      const { data: termsData, error: termsError } = await supabase
        .from('document_terms')
        .select('document_type, terms_and_conditions')
        .eq('dealer_account_id', data.id);

      if (!termsError && termsData) {
        documentTerms = termsData.reduce((acc, item) => {
          acc[item.document_type] = item.terms_and_conditions || '';
          return acc;
        }, {} as Record<string, string>);
      }
    }

    console.log('Dealer account found:', data ? data.id : 'none');

    return new Response(JSON.stringify({ dealer: data, documentTerms }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error fetching dealer account:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch settings';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
