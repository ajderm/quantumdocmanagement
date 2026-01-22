import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, createErrorResponse } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { portalId, action, document, documentId } = body;

    console.log('Custom document operation:', action, 'for portal:', portalId);

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portal ID format', 400, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify portal is connected and get dealer account
    const { data: dealerAccount } = await supabase
      .from('dealer_accounts')
      .select('id')
      .eq('hubspot_portal_id', portalId)
      .maybeSingle();

    if (!dealerAccount) {
      return new Response(JSON.stringify({ error: 'Dealer account not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dealerAccountId = dealerAccount.id;

    switch (action) {
      case 'create': {
        // Check limit of 10 custom documents
        const { count } = await supabase
          .from('custom_documents')
          .select('id', { count: 'exact', head: true })
          .eq('dealer_account_id', dealerAccountId);

        if (count && count >= 10) {
          return new Response(JSON.stringify({ error: 'Maximum of 10 custom documents allowed' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate unique code
        const code = `custom_doc_${Date.now()}`;

        const { data, error } = await supabase
          .from('custom_documents')
          .insert({
            dealer_account_id: dealerAccountId,
            code,
            name: document.name,
            icon: document.icon || 'FileText',
            description: document.description || null,
            schema: document.schema || { sections: [] },
            terms_and_conditions: document.terms_and_conditions || null,
            is_active: document.is_active ?? true,
            sort_order: document.sort_order ?? 100,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, document: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        if (!documentId) {
          return createErrorResponse('Document ID required for update', 400, corsHeaders);
        }

        const { data, error } = await supabase
          .from('custom_documents')
          .update({
            name: document.name,
            icon: document.icon,
            description: document.description,
            schema: document.schema,
            terms_and_conditions: document.terms_and_conditions,
            is_active: document.is_active,
            sort_order: document.sort_order,
          })
          .eq('id', documentId)
          .eq('dealer_account_id', dealerAccountId)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, document: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        if (!documentId) {
          return createErrorResponse('Document ID required for delete', 400, corsHeaders);
        }

        const { error } = await supabase
          .from('custom_documents')
          .delete()
          .eq('id', documentId)
          .eq('dealer_account_id', dealerAccountId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list': {
        const { data, error } = await supabase
          .from('custom_documents')
          .select('*')
          .eq('dealer_account_id', dealerAccountId)
          .order('sort_order', { ascending: true });

        if (error) throw error;

        return new Response(JSON.stringify({ documents: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return createErrorResponse('Invalid action', 400, corsHeaders);
    }
  } catch (error: unknown) {
    console.error('Error in custom-document-save:', error);
    const message = error instanceof Error ? error.message : 'Operation failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
