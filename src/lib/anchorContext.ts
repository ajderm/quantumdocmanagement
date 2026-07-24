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

import { supabase } from "@/integrations/supabase/client";

export type AnchorObjectType = "deals" | "projects";

/** Normalize a raw objectType value from the card URL. Unknown values fall back to deals. */
export function normalizeAnchorObjectType(raw: string | null | undefined): AnchorObjectType {
  const v = (raw || "deals").toLowerCase().trim();
  if (v === "projects" || v === "project" || v === "0-54") return "projects";
  return "deals";
}

/** Read the anchor object type from the current URL (objectType / object_type param). */
export function getAnchorObjectType(): AnchorObjectType {
  if (typeof window === "undefined") return "deals";
  const params = new URLSearchParams(window.location.search);
  return normalizeAnchorObjectType(params.get("objectType") || params.get("object_type"));
}

let installed = false;

/**
 * Patch supabase.functions.invoke so every request body carries the anchor
 * objectType. Explicit objectType values in a call site win over the injected
 * one. FormData bodies are left alone (append objectType at the call site).
 */
export function installAnchorContextInterceptor(): void {
  if (installed) return;
  installed = true;

  const objectType = getAnchorObjectType();
  const originalInvoke = supabase.functions.invoke.bind(supabase.functions);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase.functions as any).invoke = (name: string, options?: any) => {
    const body = options?.body;
    const isPlainObject =
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      !(body instanceof FormData) &&
      !(body instanceof Blob) &&
      !(body instanceof ArrayBuffer);

    if (isPlainObject && body.objectType === undefined) {
      return originalInvoke(name, { ...options, body: { ...body, objectType } });
    }
    return originalInvoke(name, options);
  };
}
