import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHubSpot } from "@/hooks/useHubSpot";

/**
 * Platform-admin state for the current card session.
 *
 * Two separate questions, deliberately not conflated:
 *
 *  - `visible` — should the panel be offered at all? Derived from the HubSpot
 *    user id in the card URL, resolved server-side to a real email. Good enough
 *    to decide what to render, and nothing more: a portal user can edit that
 *    `userId` parameter.
 *
 *  - `authorized` — may this caller actually change a mode? Requires a
 *    Supabase session whose confirmed email is on the allowlist. The server
 *    re-checks this on every write, so a tampered client gains nothing.
 *
 * Sign-in uses an emailed code rather than a magic link on purpose: the app
 * runs inside a HubSpot iframe, where a redirect-based flow and third-party
 * cookies are unreliable. Code entry is plain fetch calls and works in place.
 *
 * An operator's account is created by their first sign-in, so nobody has to
 * provision accounts by hand in a backend the app does not control. The
 * address is checked against the allowlist server-side BEFORE a code is sent,
 * so the prompt cannot be used to create unrelated accounts. Account
 * existence confers nothing either way: authority is the allowlist, re-read on
 * every write.
 */
export interface PlatformAdminState {
  loading: boolean;
  visible: boolean;
  hubspotEmail: string | null;
  signedInAs: string | null;
  authorized: boolean;
  error: string | null;
}

export function usePlatformAdmin() {
  const { portalId, userId } = useHubSpot();
  const [state, setState] = useState<PlatformAdminState>({
    loading: true, visible: false, hubspotEmail: null,
    signedInAs: null, authorized: false, error: null,
  });
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    if (!portalId || !userId) {
      setState((s) => ({ ...s, loading: false, visible: false }));
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("platform-admin-verify", {
        body: { portalId, userId },
      });
      if (error) throw error;
      setState({
        loading: false,
        visible: !!data?.visible,
        hubspotEmail: data?.email ?? null,
        signedInAs: data?.signedInAs ?? null,
        authorized: !!data?.sessionAuthorized,
        error: null,
      });
    } catch (err) {
      // Failing closed is the only safe default here.
      setState({
        loading: false, visible: false, hubspotEmail: null, signedInAs: null,
        authorized: false, error: err instanceof Error ? err.message : "Verification failed",
      });
    }
  }, [portalId, userId]);

  useEffect(() => { check(); }, [check]);

  // Re-check whenever the session changes, so signing in or out updates the
  // panel without a reload.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => { check(); });
    return () => sub.subscription.unsubscribe();
  }, [check]);

  const requestCode = useCallback(async (email: string) => {
    setBusy(true);
    try {
      const address = email.trim().toLowerCase();

      // Ask the server whether this address is an operator before sending
      // anything. Cheaper than a wasted code, and a much clearer failure than
      // "check your email" followed by a sign-in that grants nothing.
      const { data: check, error: checkError } = await supabase.functions.invoke(
        "platform-admin-verify", { body: { action: "check-email", portalId, email: address } },
      );
      if (checkError) throw checkError;
      if (!check?.eligible) {
        return { ok: false as const, message: `${address} is not a platform operator` };
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        // The first sign-in creates the account, so operators do not need to
        // be provisioned by hand. Safe because the address was just checked
        // against the allowlist, and because an account on its own grants
        // nothing -- every write re-checks the allowlist server-side.
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setOtpSent(true);
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, message: err instanceof Error ? err.message : "Could not send code" };
    } finally {
      setBusy(false);
    }
  }, [portalId]);

  const submitCode = useCallback(async (email: string, code: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(), token: code.trim(), type: "email",
      });
      if (error) throw error;
      setOtpSent(false);
      await check();
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, message: err instanceof Error ? err.message : "Invalid code" };
    } finally {
      setBusy(false);
    }
  }, [check]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setOtpSent(false);
    await check();
  }, [check]);

  return { ...state, otpSent, busy, requestCode, submitCode, signOut, refresh: check };
}
