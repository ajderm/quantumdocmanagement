// Which CRM object the app is mounted on, as a value.
//
// Split out of anchorContext.ts so it can be unit-tested on bare node: that
// module installs the invoke interceptor and therefore imports the Supabase
// client, which a test runner without the bundler's path aliases cannot
// resolve. This half has no imports at all.

export type AnchorObjectType = "deals" | "projects" | "tickets";

/**
 * Normalize a raw objectType value from the card URL.
 *
 * Numeric HubSpot type ids are accepted alongside names because a card URL can
 * carry either, and portals do not agree on the Projects id -- 0-54 in some,
 * 0-970 in Eakes'. Anything unrecognised falls back to deals, which is the
 * historical behaviour; a wrong fallback is quiet, so add ids rather than rely
 * on it.
 */
export function normalizeAnchorObjectType(raw: string | null | undefined): AnchorObjectType {
  const v = (raw || "deals").toLowerCase().trim();
  if (v === "projects" || v === "project" || v === "0-54" || v === "0-970") return "projects";
  if (v === "tickets" || v === "ticket" || v === "0-5") return "tickets";
  return "deals";
}
