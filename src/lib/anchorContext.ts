// Anchor record context: which CRM object the app is mounted on.
//
// The app is embedded as an iframe card on a HubSpot record. Historically that
// record was always a deal; it can now also be a native HubSpot Project. The
// card URL carries `objectType` (defaulting to deals), and every edge function
// keys reads/writes off (portalId, objectType, recordId) — so the anchor type
// must travel with every request.
//
// Rather than editing all ~70 `supabase.functions.invoke` call sites, the app
// installs a small interceptor at bootstrap that injects `objectType` into
// every plain-object invoke body that doesn't already set one. Edge functions
// that don't care about it ignore the extra field.
//
// A ticket anchor is a third case, and deliberately not a third identity: a
// ticket resolves to the project that contains it and then behaves exactly as
// a project anchor does, sharing its saved configurations, document queue and
// attachments. Andrea Villela, 2026-08-31: "you don't have access to the
// document queue... So I have to go back to the project, go into the quantum
// document app, and then consistently going back and forth." Keying a ticket's
// documents to the ticket would rebuild that wall one level down.

import { supabase } from "@/integrations/supabase/client";
import { normalizeAnchorObjectType, type AnchorObjectType } from "./anchorObjectType.ts";

export type { AnchorObjectType } from './anchorObjectType.ts';
export { normalizeAnchorObjectType } from './anchorObjectType.ts';

/** Read the anchor object type from the current URL (objectType / object_type param). */
export function getAnchorObjectType(): AnchorObjectType {
  if (typeof window === "undefined") return "deals";
  const params = new URLSearchParams(window.location.search);
  return normalizeAnchorObjectType(params.get("objectType") || params.get("object_type"));
}

/** The raw record id the card URL carries (on a ticket anchor this is the TICKET id). */
export function getUrlRecordId(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("dealId") || params.get("recordId") || params.get("objectId");
}

// The anchor as resolved server-side by hubspot-get-deal. On a ticket anchor
// both the type and the record id differ from the URL: the ticket resolves to
// its parent project (or, failing that, its associated deal), and persistence
// must key to that record — not the ticket.
let resolvedAnchor: { objectType: AnchorObjectType; recordId: string } | null = null;

export function setResolvedAnchor(objectType: AnchorObjectType, recordId: string): void {
  resolvedAnchor = { objectType, recordId: String(recordId) };
}

export function getResolvedAnchor(): { objectType: AnchorObjectType; recordId: string } | null {
  return resolvedAnchor;
}

/** Resolved anchor type when known, otherwise the URL value. */
export function getEffectiveAnchorObjectType(): AnchorObjectType {
  return resolvedAnchor?.objectType ?? getAnchorObjectType();
}

/**
 * Map a record id to the resolved anchor id, but only when it is the raw id
 * from the card URL. Call sites that deliberately pass a different id (line
 * items pass associatedDealId) are left alone.
 */
export function resolveAnchorRecordId(id: string | null | undefined): string | null | undefined {
  if (!resolvedAnchor || id == null) return id;
  const rawUrlId = getUrlRecordId();
  return rawUrlId && String(id) === String(rawUrlId) ? resolvedAnchor.recordId : id;
}

/**
 * Patch FunctionsClient.invoke so every request body carries the anchor
 * objectType. Explicit objectType values at a call site win over the injected
 * one. FormData bodies are left alone (append objectType at the call site).
 *
 * IMPORTANT: `supabase.functions` is a getter that returns a NEW FunctionsClient
 * on every access, so patching the instance method (`supabase.functions.invoke = …`)
 * is a no-op — the patched object is discarded immediately and the next call gets
 * a fresh, unpatched instance. We therefore patch the shared prototype, which
 * every instance the getter returns delegates to. objectType is read at call time
 * so it always reflects the current URL regardless of bootstrap ordering.
 */
export function installAnchorContextInterceptor(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const functionsProto = Object.getPrototypeOf(supabase.functions) as any;
  if (!functionsProto || typeof functionsProto.invoke !== "function") return;
  if (functionsProto.__anchorContextPatched) return;
  functionsProto.__anchorContextPatched = true;

  const originalInvoke = functionsProto.invoke;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  functionsProto.invoke = function (name: string, options?: any) {
    const body = options?.body;
    const isPlainObject =
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      !(body instanceof FormData) &&
      !(body instanceof Blob) &&
      !(body instanceof ArrayBuffer);

    if (!isPlainObject) return originalInvoke.call(this, name, options);

    // hubspot-get-deal performs the resolution itself, so it must keep the raw
    // ticket id and the URL objectType.
    const isResolver = name === "hubspot-get-deal";

    const patched: Record<string, unknown> = { ...body };
    let changed = false;

    if (body.objectType === undefined) {
      patched.objectType = isResolver ? getAnchorObjectType() : getEffectiveAnchorObjectType();
      changed = true;
    }

    if (!isResolver && body.dealId !== undefined) {
      const mapped = resolveAnchorRecordId(String(body.dealId));
      if (mapped !== undefined && mapped !== null && String(mapped) !== String(body.dealId)) {
        patched.dealId = mapped;
        changed = true;
      }
    }

    if (!changed) return originalInvoke.call(this, name, options);
    return originalInvoke.call(this, name, { ...options, body: patched });
  };
}

