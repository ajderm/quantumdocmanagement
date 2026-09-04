import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Landing screen for a Supabase email link opened outside HubSpot.
 *
 * Operator sign-in is meant to use an eight-digit code entered inside the app.
 * If the Auth email template still sends a link, clicking it opens the app at
 * its own root with auth parameters but no HubSpot context — which otherwise
 * hits the "No record loaded" guard and reads like a broken app.
 *
 * A link cannot really substitute for the code here: it opens a top-level tab,
 * whose storage the browser keeps separate from the app's storage inside
 * HubSpot's iframe, so the session usually does not carry across. This screen
 * therefore completes the sign-in, then says plainly to use the code instead.
 */
export function isAuthCallbackUrl(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return Boolean(
    q.get("token_hash") || q.get("error_description") ||
    h.get("access_token") || h.get("error_description") ||
    (q.get("type") && (q.get("type") === "magiclink" || q.get("type") === "email")),
  );
}

export function AuthCallbackNotice() {
  const [state, setState] = useState<{ status: "working" | "ok" | "failed"; detail: string }>({
    status: "working", detail: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = new URLSearchParams(window.location.search);
      const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const providerError = q.get("error_description") ?? h.get("error_description");
      if (providerError) {
        if (!cancelled) setState({ status: "failed", detail: providerError });
        return;
      }

      const tokenHash = q.get("token_hash");
      const type = (q.get("type") ?? "magiclink") as "magiclink" | "email";
      try {
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        }
        // A hash-fragment link is consumed by the client automatically
        // (detectSessionInUrl), so by here a session should exist either way.
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        setState(data?.user?.email
          ? { status: "ok", detail: data.user.email }
          : { status: "failed", detail: "The link did not produce a session. It may have expired or already been used." });
      } catch (err) {
        if (!cancelled) {
          setState({ status: "failed", detail: err instanceof Error ? err.message : "Sign-in failed" });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-lg">
        <CardContent className="pt-6 space-y-3">
          {state.status === "working" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Completing sign-in…
            </p>
          )}

          {state.status === "ok" && (
            <>
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Signed in as {state.detail}
              </p>
              <p className="text-sm text-muted-foreground">
                This tab is signed in, but browsers keep it separate from the app running
                inside HubSpot, so the session usually will not carry across.
              </p>
              <p className="text-sm text-muted-foreground">
                Go back to HubSpot, reopen the app's settings, and check whether the
                Document Engine panel shows you as signed in. If it does not, use the
                <strong> eight-digit code</strong> instead of the link — the panel accepts a code
                typed directly into it, which stays in the right browsing context.
              </p>
            </>
          )}

          {state.status === "failed" && (
            <>
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-5 w-5 text-amber-600" /> Could not complete sign-in
              </p>
              <p className="text-sm text-muted-foreground">{state.detail}</p>
              <p className="text-sm text-muted-foreground">
                Sign in from inside HubSpot instead: open the app's settings, go to
                Document Engine, and enter the <strong>eight-digit code</strong> from the email.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
