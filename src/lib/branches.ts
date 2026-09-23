/**
 * Branch (dealer location) resolution.
 *
 * Eakes want documents to show the selling branch's address rather than
 * corporate. The deal carries a salesperson number; each branch claims one or
 * more *rep prefixes*.
 *
 * The prefix is NOT the location code. Grand Island is location `6` and its
 * reps start `17`. Matching therefore reads `rep_prefixes` and never does
 * arithmetic on the code. Do not "simplify" that back.
 *
 * Multi-tenant: a portal with no locations resolves to `null`, which leaves
 * the existing `dealer_accounts` address in place. That branch is explicit
 * below — the other portals have no rows and must see no difference.
 */

export interface DealerLocation {
  code: string;
  name: string;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  rep_prefixes?: string[] | null;
  is_main?: boolean | null;
}

/** Digits only: a salesperson number may arrive spaced, dashed or padded. */
function digits(value: string | null | undefined): string {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

/**
 * The branch a salesperson number belongs to.
 *
 * Longest prefix first, so a one-character prefix can never shadow a
 * two-character one if a dealer ever adds one. No number, or no match, falls
 * back to the main office; no locations at all returns null.
 */
export function resolveBranch(
  salespersonNumber: string | null | undefined,
  locations: DealerLocation[] | null | undefined,
): DealerLocation | null {
  // Explicit: a portal with no branches keeps the dealer account address.
  if (!locations || locations.length === 0) return null;

  const number = digits(salespersonNumber);
  if (number) {
    const candidates: { prefix: string; location: DealerLocation }[] = [];
    for (const location of locations) {
      for (const raw of location.rep_prefixes ?? []) {
        const prefix = digits(raw);
        if (prefix) candidates.push({ prefix, location });
      }
    }
    candidates.sort((a, b) => b.prefix.length - a.prefix.length);
    const hit = candidates.find((c) => number.startsWith(c.prefix));
    if (hit) return hit.location;
  }

  return locations.find((l) => l.is_main) ?? null;
}

/** A branch's printed address, joined the way the dealer account address is. */
export function branchAddress(location: DealerLocation | null | undefined): string | null {
  if (!location) return null;
  const cityLine = [
    [location.city, location.state].filter(Boolean).join(", "),
    location.zip,
  ].filter(Boolean).join(" ").trim();
  const address = [location.street, cityLine].filter((p) => p && String(p).trim()).join(", ");
  return address.trim() || null;
}

/** The render-payload view of a branch: only what the chrome prints. */
export function branchForPayload(location: DealerLocation | null | undefined) {
  if (!location) return null;
  return {
    name: location.name || null,
    address: branchAddress(location),
    phone: location.phone?.trim() || null,
  };
}
