/**
 * Pure policy helpers for the platform-admin gate.
 *
 * Kept free of Deno APIs so the rules can be unit-tested outside the edge
 * runtime. Nothing here performs I/O or trusts a network value; the callers
 * supply already-fetched data.
 */

export const ENGINES = ['native', 'template'] as const;
export type Engine = (typeof ENGINES)[number];

export function isEngine(value: unknown): value is Engine {
  return typeof value === 'string' && (ENGINES as readonly string[]).includes(value);
}

/** Lowercase and trim. Email comparison is otherwise a source of false negatives. */
export function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/** @param allowlist emails already normalized by the caller */
export function isAllowlisted(email: unknown, allowlist: readonly string[]): boolean {
  const e = normalizeEmail(email);
  if (!e) return false;
  return allowlist.some((a) => normalizeEmail(a) === e);
}

export interface Owner {
  userId?: string | number | null;
  id?: string | number | null;
  email?: string | null;
}

/**
 * Map a HubSpot user id to that user's email using the portal's owner list.
 *
 * HubSpot returns both an owner id and a user id and they are NOT the same
 * number; matching on the wrong one silently resolves to a different person,
 * so both are compared explicitly.
 */
export function emailForHubspotUserId(
  owners: readonly Owner[], hubspotUserId: unknown,
): string | null {
  const want = String(hubspotUserId ?? '').trim();
  if (!want) return null;
  for (const o of owners) {
    const byUserId = o.userId !== null && o.userId !== undefined && String(o.userId) === want;
    const byOwnerId = o.id !== null && o.id !== undefined && String(o.id) === want;
    if (byUserId || byOwnerId) {
      const email = normalizeEmail(o.email);
      return email || null;
    }
  }
  return null;
}

export type Decision =
  | { allowed: true; email: string }
  | { allowed: false; reason: string };

/**
 * The authorization decision for a write.
 *
 * The HubSpot-resolved email is deliberately NOT accepted as proof. It comes
 * from a `userId` supplied in the card's URL, which any portal user can edit,
 * so it may only decide what the UI offers. Authority rests on a Supabase
 * session, whose email the platform itself verified.
 */
export function decideWrite(input: {
  sessionEmail: unknown;       // from a verified Supabase auth session
  allowlist: readonly string[];
}): Decision {
  const email = normalizeEmail(input.sessionEmail);
  if (!email) return { allowed: false, reason: 'no_authenticated_session' };
  if (!isAllowlisted(email, input.allowlist)) {
    return { allowed: false, reason: 'not_a_platform_admin' };
  }
  return { allowed: true, email };
}

/** Whether to show the platform-admin entry point. Presentation only. */
export function decideUiVisibility(input: {
  hubspotEmail: unknown;
  allowlist: readonly string[];
}): boolean {
  return isAllowlisted(input.hubspotEmail, input.allowlist);
}

export function validateDocumentCode(code: unknown): code is string {
  return typeof code === 'string' && /^[a-z][a-z0-9_]{1,48}$/.test(code);
}
