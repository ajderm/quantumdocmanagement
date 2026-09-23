/**
 * The deal's transaction type, as a value HubSpot automation can branch on.
 *
 * Stephen Ross, 15 Sep 2026: the required-document checklist is driven by a
 * HubSpot workflow that creates tasks based on whether the deal is a purchase,
 * a lease or a rental, triggered once the commission document is generated.
 * The app knows this — the commission form captures it — but it never left the
 * app, so the workflow had nothing to branch on.
 *
 * The commission form stores the funder in the same field as the type
 * ("Lease -- Leaf", "Lease -- Canon Financial"), because that is how a rep
 * picks it. A workflow should not have to enumerate every funder, so the
 * leasing company is stripped here and the plain type written to the deal.
 */

export type TransactionType = "Purchase" | "Lease" | "Rental";

/**
 * Normalize the commission form's transaction type to Purchase / Lease /
 * Rental, or null when it is unset or unrecognized.
 *
 * Returning null rather than guessing matters: the workflow branches on this
 * value, and a wrong branch collects the wrong paperwork on a real deal.
 */
export function normalizeTransactionType(value: unknown): TransactionType | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;

  // "Lease -- Leaf", "Lease – Canon Financial", "lease" all mean Lease.
  if (/^lease\b/.test(raw)) return "Lease";
  if (/^rental\b/.test(raw) || raw === "rent") return "Rental";
  if (/^purchase\b/.test(raw)) return "Purchase";

  return null;
}
