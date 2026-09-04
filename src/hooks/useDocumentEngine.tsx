import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Engine = "native" | "template";

/**
 * Which engine serves each document type in this portal.
 *
 * The single point at which the app asks that question, so when the
 * template-driven generator is wired in there is exactly one branch to add
 * rather than a condition scattered through DocumentHub.
 *
 * A document type with no stored row resolves to `native`, so an unreachable
 * endpoint or an unconfigured portal keeps serving the existing generator
 * rather than falling into a half-built path.
 */
export function useDocumentEngine(portalId: string | null) {
  const [modes, setModes] = useState<Record<string, Engine>>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!portalId) { setLoaded(true); return; }
    try {
      const { data, error } = await supabase.functions.invoke("document-engine-mode", {
        body: { action: "list", portalId },
      });
      if (error) throw error;
      const next: Record<string, Engine> = {};
      for (const [code, row] of Object.entries(data?.modes ?? {})) {
        const engine = (row as { engine?: string })?.engine;
        if (engine === "template") next[code] = "template";
      }
      setModes(next);
    } catch (err) {
      console.warn("Engine modes unavailable; defaulting to native", err);
      setModes({});
    } finally {
      setLoaded(true);
    }
  }, [portalId]);

  useEffect(() => { load(); }, [load]);

  const engineFor = useCallback(
    (documentCode: string): Engine => modes[documentCode] ?? "native",
    [modes],
  );

  return { engineFor, modes, loaded, refresh: load };
}
