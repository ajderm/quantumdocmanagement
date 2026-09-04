/**
 * Decides whether to OFFER the platform-admin panel to the current card user.
 *
 * Presentation only. It resolves the HubSpot user id from the card URL to a
 * real email via the portal's OAuth token, which is trustworthy about the
 * mapping but not about the id — a portal user can edit `userId` in the iframe
 * URL. Authority therefore lives in document-engine-mode, behind a Supabase
 * session. Nothing this function returns grants anything.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, getCorsHeaders, createErrorResponse, createJsonResponse } from '../_shared/validation.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import { loadAllowlist, resolveHubspotEmail, sessionEmail } from '../_shared/platform-admin.ts';
import { explainVisibility, decideWrite, isAllowlisted, normalizeEmail } from '../_shared/platform-admin-policy.ts';

const corsHeaders = getCorsHeaders();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const portalId = body.portalId;

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portal ID format', 400, corsHeaders);
    }

    // ---- eligibility pre-check --------------------------------------------
    // Answers one question: is this address an operator? The panel asks before
    // requesting a sign-in code, so a mistyped or non-operator address gets a
    // clear answer instead of a code that would never grant anything. It is
    // rate limited because it is unauthenticated and reveals a boolean.
    if (body.action === 'check-email') {
      const limited = await checkRateLimit(supabase, String(portalId), 'platform-admin-verify', 20, corsHeaders);
      if (limited) return limited;
      const candidate = normalizeEmail(body.email);
      if (!candidate || candidate.length > 320) {
        return createErrorResponse('Invalid email', 400, corsHeaders);
      }
      const list = await loadAllowlist(supabase);
      return createJsonResponse({ eligible: isAllowlisted(candidate, list) }, 200, corsHeaders);
    }

    const allowlist = await loadAllowlist(supabase);
    const hubspotUserId = String(body.userId ?? '').trim();

    // A settings surface opened without a userId is a real case (HubSpot does
    // not pass one everywhere), so report it rather than 400-ing: the caller
    // can still get in via an authenticated session.
    let email: string | null = null;
    let resolveReason: 'missing_user_id' | 'no_portal_token' | 'owners_api_failed'
      | 'owner_not_found' | 'owner_has_no_email' | null = null;
    let ownerCount = 0;

    if (!/^\d{1,20}$/.test(hubspotUserId)) {
      resolveReason = 'missing_user_id';
    } else {
      const resolved = await resolveHubspotEmail(supabase, portalId, hubspotUserId);
      email = resolved.email;
      resolveReason = resolved.reason;
      ownerCount = resolved.ownerCount;
    }

    const { visible, reason } = explainVisibility({
      hubspotEmail: email, resolveReason, allowlist,
    });

    // Also report whether the caller's Supabase session (if any) would be
    // permitted to write, so the panel can show accurate controls instead of
    // offering a toggle that the write path will refuse. getUser validates the
    // token against the auth server even though this function does not
    // require a JWT.
    const signedInAs = await sessionEmail(supabase, req.headers.get('authorization'));
    const sessionAuthorized = decideWrite({ sessionEmail: signedInAs, allowlist }).allowed;

    // The resolved email is echoed only when it is one of ours, so this
    // endpoint cannot be used to enumerate a portal's user directory.
    return createJsonResponse({
      visible,
      reason,
      email: visible ? email : null,
      signedInAs: sessionAuthorized ? signedInAs : null,
      sessionAuthorized,
      // Diagnostics that reveal nothing a portal user cannot already see, but
      // separate "not deployed / no token / not an owner" from "wrong address".
      diagnostics: {
        receivedUserId: hubspotUserId || null,
        ownersScanned: ownerCount,
        allowlistSize: allowlist.length,
      },
    }, 200, corsHeaders);
  } catch (err) {
    console.error('platform-admin-verify failed', err);
    return createErrorResponse('Verification failed', 500, corsHeaders);
  }
});
