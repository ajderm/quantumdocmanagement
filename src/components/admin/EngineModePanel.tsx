import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, ShieldCheck, LogOut, KeyRound, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

interface ModeRow {
  engine: "native" | "template";
  updatedBy?: string | null;
  updatedAt?: string | null;
}

/**
 * Switches a document type between the native generator and the
 * template-driven engine, for this portal.
 *
 * The controls are disabled until the operator holds a Supabase session on the
 * allowlist. That is not only presentation: the write endpoint re-checks the
 * session on every call, so a tampered client changes nothing.
 */
export function EngineModePanel({
  portalId,
  documentTypes,
  admin,
}: {
  portalId: string;
  documentTypes: { code: string; name: string }[];
  /** Owned by the parent so the verification call is not duplicated. */
  admin: ReturnType<typeof usePlatformAdmin>;
}) {
  const [modes, setModes] = useState<Record<string, ModeRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("document-engine-mode", {
        body: { action: "list", portalId },
      });
      if (error) throw error;
      setModes((data?.modes ?? {}) as Record<string, ModeRow>);
    } catch (err) {
      console.error("Failed to load engine modes", err);
      toast.error("Could not load engine modes");
    } finally {
      setLoading(false);
    }
  }, [portalId]);

  useEffect(() => { load(); }, [load]);

  const setEngine = async (documentCode: string, next: "native" | "template") => {
    setSaving(documentCode);
    const previous = modes[documentCode]?.engine ?? "native";
    // Optimistic, then reconciled against what the server actually stored.
    setModes((m) => ({ ...m, [documentCode]: { ...m[documentCode], engine: next } }));
    try {
      const { data, error } = await supabase.functions.invoke("document-engine-mode", {
        body: { action: "set", portalId, documentCode, engine: next },
      });
      if (error) throw error;
      setModes((m) => ({
        ...m,
        [documentCode]: {
          engine: data.engine, updatedBy: data.updatedBy, updatedAt: new Date().toISOString(),
        },
      }));
      toast.success(`${documentCode} now uses the ${data.engine} engine`);
    } catch (err) {
      setModes((m) => ({ ...m, [documentCode]: { ...m[documentCode], engine: previous } }));
      const message = err instanceof Error ? err.message : "Change refused";
      toast.error(message.includes("permitted") ? "Not permitted to change engine modes" : message);
    } finally {
      setSaving(null);
    }
  };

  if (admin.loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Checking access…
    </div>;
  }

  // Nothing is rendered for anyone else, including the fact that it exists.
  if (!admin.visible) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-qbs-navy" /> Document engine
        </CardTitle>
        <CardDescription>
          Choose which generator serves each document type in this portal. Native is the
          existing built-in layout; template uses the uploaded template and token layout.
          A mode can be switched back at any time.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ---- authentication ------------------------------------------- */}
        {admin.authorized ? (
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
            <p className="text-sm">
              Signed in as <span className="font-medium">{admin.signedInAs}</span>
            </p>
            <Button variant="ghost" size="sm" onClick={admin.signOut}>
              <LogOut className="h-4 w-4 mr-1.5" /> Sign out
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-muted/40 p-3 space-y-3">
            <div className="flex items-start gap-2">
              <KeyRound className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Changing an engine needs a signed-in operator. We email a six-digit code —
                being a HubSpot admin in this portal is not sufficient on its own.
              </p>
            </div>
            {!admin.otpSent ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[220px]">
                  <Label htmlFor="pa-email" className="text-xs">Operator email</Label>
                  <Input
                    id="pa-email" type="email" autoComplete="email"
                    placeholder={admin.hubspotEmail ?? "you@thequantumleap.business"}
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button
                  disabled={admin.busy || !email.trim()}
                  onClick={async () => {
                    const r = await admin.requestCode(email);
                    if (r.ok) toast.success("Code sent — check your email");
                    else toast.error(r.message);
                  }}
                >
                  {admin.busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Send code
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-[160px]">
                  <Label htmlFor="pa-code" className="text-xs">Six-digit code</Label>
                  <Input
                    id="pa-code" inputMode="numeric" autoComplete="one-time-code"
                    maxLength={6} placeholder="123456"
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <Button
                  disabled={admin.busy || code.length < 6}
                  onClick={async () => {
                    const r = await admin.submitCode(email, code);
                    if (r.ok) { setCode(""); toast.success("Signed in"); }
                    else toast.error(r.message);
                  }}
                >
                  {admin.busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Verify
                </Button>
                <Button variant="ghost" onClick={() => { setCode(""); admin.signOut(); }}>
                  Use a different address
                </Button>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* ---- the toggles ---------------------------------------------- */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading modes…
          </div>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {documentTypes.map((doc) => {
              const row = modes[doc.code];
              const engine = row?.engine ?? "native";
              const isTemplate = engine === "template";
              return (
                <div key={doc.code} className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{doc.code}</span>
                      {row?.updatedBy && <> · last changed by {row.updatedBy}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`text-xs ${isTemplate ? "text-muted-foreground" : "font-medium"}`}>
                      Native
                    </span>
                    <Switch
                      checked={isTemplate}
                      disabled={!admin.authorized || saving === doc.code}
                      onCheckedChange={(v) => setEngine(doc.code, v ? "template" : "native")}
                      aria-label={`Engine for ${doc.name}`}
                    />
                    <span className={`text-xs ${isTemplate ? "font-medium" : "text-muted-foreground"}`}>
                      Template
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!admin.authorized && (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
            Toggles are read-only until you sign in above.
          </p>
        )}

        {/* Stating this plainly beats a toggle that appears to do nothing. */}
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
          Template mode is recorded and audited now, but the template engine is not yet
          wired into document generation — every document still renders through the native
          layout until it is. Switching a type early is safe and changes nothing today.
        </p>
      </CardContent>
    </Card>
  );
}
