/**
 * Audit logging helper for edge functions.
 * 
 * Logs significant actions (saves, deletes, OAuth events, PDF generation)
 * for compliance and debugging. Writes are fire-and-forget to avoid
 * impacting request latency.
 * 
 * Usage:
 *   auditLog(supabase, portalId, 'configuration_saved', 'quote', dealId, { configType: 'quote' });
 */

export function auditLog(
  supabase: any,
  portalId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  userId?: string
): void {
  // Fire and forget — don't block the request
  supabase
    .from('audit_log')
    .insert({
      portal_id: portalId,
      user_id: userId || null,
      action,
      resource_type: resourceType || null,
      resource_id: resourceId || null,
      details: details || null,
    })
    .then(() => {})
    .catch((err: any) => {
      // Audit logging is best-effort — log failure but don't throw
      console.warn('Audit log write failed:', err?.message);
    });
}
