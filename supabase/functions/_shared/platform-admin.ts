/**
 * Edge-runtime glue for the platform-admin gate. The rules themselves live in
 * platform-admin-policy.ts, which is Deno-free so it can be unit-tested.
 */

import { getValidAccessToken } from './hubspot-token.ts';
import {
  emailForHubspotUserId, normalizeEmail, type Owner,
} from './platform-admin-policy.ts';

/** The allowlist is data, not code, so it can change without a redeploy. */
export async function loadAllowlist(supabase: any): Promise<string[]> {
  const { data, error } = await supabase.from('platform_admins').select('email');
  if (error) throw new Error(`Cannot load platform_admins: ${error.message}`);
  return (data ?? []).map((r: { email: string }) => normalizeEmail(r.email)).filter(Boolean);
}

/**
 * Resolve the HubSpot user's real email using the portal's own OAuth token.
 *
 * This is server-side on purpose: the client may not assert who it is. It is
 * still only as trustworthy as the `userId` it was given, which is why callers
 * must treat the result as presentation input, never as authorization.
 */
export async function resolveHubspotEmail(
  supabase: any, portalId: string, hubspotUserId: string,
): Promise<string | null> {
  let token: string;
  try {
    token = await getValidAccessToken(supabase, portalId);
  } catch {
    return null; // portal not connected — nothing to resolve
  }

  const owners: Owner[] = [];
  let after: string | undefined;
  // Owner lists are paginated; a platform admin sitting on page two would
  // otherwise silently fail to resolve.
  for (let page = 0; page < 10; page++) {
    const url = new URL('https://api.hubapi.com/crm/v3/owners');
    url.searchParams.set('limit', '100');
    if (after) url.searchParams.set('after', after);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      console.error('owners lookup failed', res.status, await res.text());
      return null;
    }
    const body = await res.json();
    owners.push(...(body.results ?? []));
    after = body.paging?.next?.after;
    if (!after) break;
  }

  return emailForHubspotUserId(owners, hubspotUserId);
}

/**
 * The email of the caller's verified Supabase session, or null.
 *
 * The function is deployed with verify_jwt = true, so the platform has already
 * rejected a forged token before this runs. An anon-key request is a valid JWT
 * with no user attached, which is exactly how a rep's read is distinguished
 * from an operator's write.
 */
export async function sessionEmail(supabase: any, authHeader: string | null): Promise<string | null> {
  const jwt = (authHeader ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return null;
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data?.user?.email) return null;
  // Only a confirmed address counts: an unconfirmed one proves no mailbox control.
  if (!data.user.email_confirmed_at && !data.user.confirmed_at) return null;
  return normalizeEmail(data.user.email);
}

export async function audit(supabase: any, row: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('platform_admin_audit').insert(row);
  // An audit failure must be visible but must not mask the original outcome.
  if (error) console.error('audit insert failed', error.message, row);
}
