/**
 * Branch office (dealer_locations) editing for the Settings screen.
 *
 * `dealer_locations` is RLS-enabled with no policies -- service role only --
 * so the app cannot read or write it through the Supabase client. Reads come
 * back with the rest of Settings via `dealer-account-get`; writes come here.
 *
 * The two database guard rails are enforced here as well, with messages a
 * person can act on: exactly one main office per dealer, and no rep prefix
 * claimed by two branches. The prefix is not the location code -- Grand
 * Island is location 6 with prefix 17 -- so nothing here derives one from
 * the other.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, createErrorResponse } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationInput {
  code?: unknown;
  name?: unknown;
  street?: unknown;
  city?: unknown;
  state?: unknown;
  zip?: unknown;
  phone?: unknown;
  rep_prefixes?: unknown;
  is_main?: unknown;
}

const text = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const portalId = (body.portalId || body.portal_id) as string | null;
    const locations = body.locations as LocationInput[] | undefined;

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portal ID format', 400, corsHeaders);
    }
    if (!Array.isArray(locations)) {
      return createErrorResponse('locations must be an array', 400, corsHeaders);
    }

    // Normalise before validating so a trailing space cannot create a
    // "duplicate" the person cannot see on screen.
    const rows = locations.map((l) => ({
      code: text(l.code) ?? '',
      name: text(l.name) ?? '',
      street: text(l.street),
      city: text(l.city),
      state: text(l.state),
      zip: text(l.zip),
      phone: text(l.phone),
      rep_prefixes: Array.isArray(l.rep_prefixes)
        ? Array.from(new Set(
            l.rep_prefixes.map((p) => String(p).replace(/\D/g, '')).filter(Boolean),
          ))
        : [],
      is_main: l.is_main === true,
    }));

    for (const row of rows) {
      if (!row.code) return json({ error: 'Every branch needs a location code' }, 400);
      if (!row.name) return json({ error: `Branch ${row.code} needs a name` }, 400);
    }

    const codes = rows.map((r) => r.code);
    const duplicateCode = codes.find((c, i) => codes.indexOf(c) !== i);
    if (duplicateCode) {
      return json({ error: `Location code ${duplicateCode} is used twice` }, 400);
    }

    const mains = rows.filter((r) => r.is_main);
    if (rows.length > 0 && mains.length !== 1) {
      return json({
        error: mains.length === 0
          ? 'One branch must be marked as the main office'
          : 'Only one branch can be the main office',
      }, 400);
    }

    const seen = new Map<string, string>();
    for (const row of rows) {
      for (const prefix of row.rep_prefixes) {
        const owner = seen.get(prefix);
        if (owner) {
          return json({
            error: `Rep prefix ${prefix} is claimed by both branch ${owner} and branch ${row.code}`,
          }, 400);
        }
        seen.set(prefix, row.code);
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: token } = await supabase
      .from('hubspot_tokens')
      .select('portal_id')
      .eq('portal_id', portalId)
      .maybeSingle();
    if (!token) return json({ error: 'Portal not connected' }, 403);

    const { data: dealer } = await supabase
      .from('dealer_accounts')
      .select('id')
      .eq('hubspot_portal_id', portalId)
      .maybeSingle();
    if (!dealer?.id) return json({ error: 'Dealer account not found' }, 404);

    // Tenant scoped on every statement: this function must never touch
    // another portal's branches.
    if (codes.length > 0) {
      const { error: deleteError } = await supabase
        .from('dealer_locations')
        .delete()
        .eq('dealer_account_id', dealer.id)
        .not('code', 'in', `(${codes.map((c) => `"${c}"`).join(',')})`);
      if (deleteError) throw deleteError;

      const { error: upsertError } = await supabase
        .from('dealer_locations')
        .upsert(
          rows.map((r) => ({ ...r, dealer_account_id: dealer.id })),
          { onConflict: 'dealer_account_id,code' },
        );
      if (upsertError) throw upsertError;
    } else {
      const { error: deleteAllError } = await supabase
        .from('dealer_locations')
        .delete()
        .eq('dealer_account_id', dealer.id);
      if (deleteAllError) throw deleteAllError;
    }

    const { data: saved } = await supabase
      .from('dealer_locations')
      .select('code, name, street, city, state, zip, phone, rep_prefixes, is_main')
      .eq('dealer_account_id', dealer.id)
      .order('code');

    return json({ success: true, dealerLocations: saved ?? [] });
  } catch (error: unknown) {
    console.error('Error saving dealer locations:', error);
    return json({ error: 'Failed to save branch locations' }, 500);
  }
});
