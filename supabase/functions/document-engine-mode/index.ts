/**
 * Reads and writes which engine serves each document type for a dealer.
 *
 *   POST { action: 'list', portalId }                     -> open to the card
 *   POST { action: 'set', portalId, documentCode, engine } -> platform admins only
 *
 * Deployed with verify_jwt = true. That makes the platform reject a forged
 * token before this code runs, and lets an anon-key read be told apart from an
 * operator's authenticated write: both are valid JWTs, only one carries a user.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, getCorsHeaders, createErrorResponse, createJsonResponse } from '../_shared/validation.ts';
import { loadAllowlist, sessionEmail, audit } from '../_shared/platform-admin.ts';
import { decideWrite, isEngine, validateDocumentCode } from '../_shared/platform-admin-policy.ts';

const corsHeaders = getCorsHeaders();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const userAgent = req.headers.get('user-agent')?.slice(0, 400) ?? null;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action === 'set' ? 'set' : 'list';
    const portalId = body.portalId;

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portal ID format', 400, corsHeaders);
    }

    const { data: dealer } = await supabase
      .from('dealer_accounts').select('id').eq('hubspot_portal_id', portalId).maybeSingle();

    if (!dealer) {
      // An unknown portal has no modes; every document type falls back to native.
      return action === 'list'
        ? createJsonResponse({ modes: {} }, corsHeaders)
        : createErrorResponse('Dealer account not found', 404, corsHeaders);
    }

    if (action === 'list') {
      const { data, error } = await supabase
        .from('document_engine_modes')
        .select('document_code, engine, updated_by, updated_at')
        .eq('dealer_account_id', dealer.id);
      if (error) throw error;
      const modes: Record<string, unknown> = {};
      for (const row of data ?? []) {
        modes[row.document_code] = {
          engine: row.engine, updatedBy: row.updated_by, updatedAt: row.updated_at,
        };
      }
      return createJsonResponse({ modes }, corsHeaders);
    }

    // ---- write path -------------------------------------------------------
    const documentCode = body.documentCode;
    const engine = body.engine;

    if (!validateDocumentCode(documentCode)) {
      return createErrorResponse('Invalid document code', 400, corsHeaders);
    }
    if (!isEngine(engine)) {
      return createErrorResponse("engine must be 'native' or 'template'", 400, corsHeaders);
    }

    const allowlist = await loadAllowlist(supabase);
    const email = await sessionEmail(supabase, req.headers.get('authorization'));
    const decision = decideWrite({ sessionEmail: email, allowlist });

    if (!decision.allowed) {
      // Refusals are recorded: a cross-tenant capability needs its near misses
      // on the record, not just its successes.
      await audit(supabase, {
        actor_email: email, action: 'set_engine', outcome: 'denied',
        portal_id: String(portalId), dealer_account_id: dealer.id,
        document_code: documentCode, to_value: engine,
        auth_method: 'supabase_session', reason: decision.reason, user_agent: userAgent,
      });
      const status = decision.reason === 'no_authenticated_session' ? 401 : 403;
      return createErrorResponse('Not permitted to change engine modes', status, corsHeaders);
    }

    const { data: before } = await supabase
      .from('document_engine_modes').select('engine')
      .eq('dealer_account_id', dealer.id).eq('document_code', documentCode).maybeSingle();

    const { error: upsertError } = await supabase.from('document_engine_modes').upsert({
      dealer_account_id: dealer.id, document_code: documentCode, engine,
      updated_by: decision.email, updated_at: new Date().toISOString(),
    }, { onConflict: 'dealer_account_id,document_code' });
    if (upsertError) throw upsertError;

    await audit(supabase, {
      actor_email: decision.email, action: 'set_engine', outcome: 'allowed',
      portal_id: String(portalId), dealer_account_id: dealer.id,
      document_code: documentCode, from_value: before?.engine ?? 'native', to_value: engine,
      auth_method: 'supabase_session', user_agent: userAgent,
    });

    return createJsonResponse({
      ok: true, documentCode, engine,
      previous: before?.engine ?? 'native', updatedBy: decision.email,
    }, corsHeaders);
  } catch (err) {
    console.error('document-engine-mode failed', err);
    return createErrorResponse('Request failed', 500, corsHeaders);
  }
});
