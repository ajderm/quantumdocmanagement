/**
 * Reads and writes app_user_roles and access_rules.
 *
 * These two tables were the only ones the browser touched directly, which is
 * why they carried `TO anon USING (true)` policies for SELECT, INSERT and
 * UPDATE. Since get-user-access reads app_user_roles to decide what a user may
 * do, anyone holding the publishable key could write themselves an admin row
 * and the app would honour it. That is privilege escalation, not just
 * disclosure, so the access moves behind this function and the policies go.
 *
 * The dealer account is resolved from portalId here rather than accepted from
 * the caller. That is the substance of the fix: an edge function that trusts a
 * client-supplied dealer_account_id leaves the cross-tenant write open, just
 * one layer further back.
 *
 *   POST { portalId, action: 'list' }
 *   POST { portalId, action: 'set-role', hubspotUserId, role, name?, email? }
 *   POST { portalId, action: 'ensure-roles', users: [{ userId, name, email }] }
 *   POST { portalId, action: 'set-access-rule', rule: {...} }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  validatePortalId, getCorsHeaders, createErrorResponse, createJsonResponse,
} from '../_shared/validation.ts';

const corsHeaders = getCorsHeaders();

// Mirrors get-user-access's hierarchy. An unknown value must never be stored,
// or the access check silently treats it as the lowest role.
const ROLES = ['admin', 'manager', 'user', 'viewer'] as const;
const isRole = (v: unknown): v is typeof ROLES[number] =>
  typeof v === 'string' && (ROLES as readonly string[]).includes(v);

const str = (v: unknown, max = 320): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, max) : null;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { portalId, action } = body;

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portal ID format', 400, corsHeaders);
    }

    // Derived, never accepted. This is what stops one portal writing another's
    // roles even through this function.
    const { data: dealer } = await supabase
      .from('dealer_accounts').select('id').eq('hubspot_portal_id', portalId).maybeSingle();
    if (!dealer) return createErrorResponse('Dealer account not found', 404, corsHeaders);
    const dealerAccountId = dealer.id;

    if (action === 'list') {
      const [roles, rules] = await Promise.all([
        supabase.from('app_user_roles').select('*')
          .eq('dealer_account_id', dealerAccountId).order('hubspot_user_name'),
        supabase.from('access_rules').select('*').eq('dealer_account_id', dealerAccountId),
      ]);
      if (roles.error) throw roles.error;
      if (rules.error) throw rules.error;
      return createJsonResponse({ roles: roles.data ?? [], rules: rules.data ?? [] }, corsHeaders);
    }

    if (action === 'set-role') {
      const hubspotUserId = str(body.hubspotUserId, 32);
      if (!hubspotUserId || !/^\d{1,20}$/.test(hubspotUserId)) {
        return createErrorResponse('Invalid HubSpot user ID', 400, corsHeaders);
      }
      if (!isRole(body.role)) {
        return createErrorResponse(`role must be one of: ${ROLES.join(', ')}`, 400, corsHeaders);
      }
      const { error } = await supabase.from('app_user_roles').upsert({
        dealer_account_id: dealerAccountId,
        hubspot_user_id: hubspotUserId,
        hubspot_user_name: str(body.name, 200),
        hubspot_user_email: str(body.email),
        role: body.role,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'dealer_account_id,hubspot_user_id' });
      if (error) throw error;
      return createJsonResponse({ ok: true }, corsHeaders);
    }

    if (action === 'ensure-roles') {
      // Used by the "sync from HubSpot" button: creates a default row for any
      // user that has none, and must never downgrade an existing role.
      const users = Array.isArray(body.users) ? body.users.slice(0, 500) : [];
      const ids = users
        .map((u: { userId?: unknown }) => str(u?.userId, 32))
        .filter((id: string | null): id is string => Boolean(id) && /^\d{1,20}$/.test(id!));

      const { data: existing, error: exErr } = await supabase
        .from('app_user_roles').select('hubspot_user_id')
        .eq('dealer_account_id', dealerAccountId);
      if (exErr) throw exErr;
      const have = new Set((existing ?? []).map((r) => String(r.hubspot_user_id)));

      const rows = users
        .filter((u: { userId?: unknown }) => {
          const id = str(u?.userId, 32);
          return id && ids.includes(id) && !have.has(id);
        })
        .map((u: { userId?: unknown; name?: unknown; email?: unknown }) => ({
          dealer_account_id: dealerAccountId,
          hubspot_user_id: str(u.userId, 32),
          hubspot_user_name: str(u.name, 200),
          hubspot_user_email: str(u.email),
          role: 'user',
          updated_at: new Date().toISOString(),
        }));

      if (rows.length) {
        const { error } = await supabase.from('app_user_roles')
          .upsert(rows, { onConflict: 'dealer_account_id,hubspot_user_id' });
        if (error) throw error;
      }
      return createJsonResponse({ ok: true, created: rows.length, seen: ids.length }, corsHeaders);
    }

    if (action === 'set-access-rule') {
      const rule = body.rule ?? {};
      const pipelineId = str(rule.pipeline_id, 64);
      const cutoffStage = str(rule.cutoff_stage, 128);
      if (!pipelineId) return createErrorResponse('Invalid pipeline ID', 400, corsHeaders);
      if (!cutoffStage) return createErrorResponse('Invalid cutoff stage', 400, corsHeaders);
      if (!isRole(rule.pre_cutoff_min_role) || !isRole(rule.post_cutoff_min_role)) {
        return createErrorResponse(
          `Minimum roles must each be one of: ${ROLES.join(', ')}`, 400, corsHeaders);
      }
      const { error } = await supabase.from('access_rules').upsert({
        dealer_account_id: dealerAccountId,
        pipeline_id: pipelineId,
        pipeline_label: str(rule.pipeline_label, 200),
        cutoff_stage: cutoffStage,
        cutoff_stage_label: str(rule.cutoff_stage_label, 200),
        pre_cutoff_min_role: rule.pre_cutoff_min_role,
        post_cutoff_min_role: rule.post_cutoff_min_role,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'dealer_account_id,pipeline_id' });
      if (error) throw error;
      return createJsonResponse({ ok: true }, corsHeaders);
    }

    return createErrorResponse(`Unknown action "${action}"`, 400, corsHeaders);
  } catch (err) {
    console.error('user-roles failed', err);
    return createErrorResponse('Request failed', 500, corsHeaders);
  }
});
