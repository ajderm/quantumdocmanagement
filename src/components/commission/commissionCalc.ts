// Single source of truth for the commission math.
//
// Extracted verbatim from CommissionForm's inline computation so the Commission
// page and the Quote-page summary strip can never drift. Both surfaces call
// computeCommissionTotals() on the same commissionFormData.

import type { CommissionFormData } from "./CommissionForm";

/**
 * Lease buyout / trade-in cost implied by a quote configuration. This is the
 * dealer's cost to pay off the customer's existing lease, and it must land in
 * the commission's Total Cost (Stephen Ross, 26 Aug 2026: "the doc app is not
 * including the lease buyout costs into the TOTAL COST but it should").
 *
 * Mirrors the quote's own "Total Buyout" field so the two always show the same
 * number:
 *   1. A hand-entered Total Buyout override wins (the rep typed the total
 *      directly because they don't have the individual figures).
 *   2. Otherwise the calculated total: remaining payments + early termination +
 *      return shipping.
 *   3. Legacy fallback: older quotes that stored the buyout as a financed amount.
 * Accepts loosely-typed quote form data (values may be numbers or strings).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buyoutFromQuoteConfig(quote: any): number {
  if (!quote) return 0;
  const num = (v: unknown) => parseFloat(String(v ?? "")) || 0;

  // 1. Manual Total Buyout override — the authoritative total the rep sees.
  if (quote.totalBuyoutManuallySet) {
    const override = parseFloat(String(quote.totalBuyoutOverride ?? ""));
    if (Number.isFinite(override)) return override;
  }

  // 2. Calculated from the individual buyout fields.
  const computed =
    num(quote.paymentAmount) * num(quote.paymentsRemaining) +
    num(quote.earlyTerminationFee) +
    num(quote.returnShipping);
  if (computed > 0) return computed;

  // 3. Legacy: buyout stored as a financed amount on older quotes.
  return num(quote.buyoutFinancingAmount);
}

export interface CommissionTotals {
  totalBilled: number;
  totalRepCost: number;
  buyoutInMargin: boolean;
  additionalCosts: number;
  totalRepCostWithCosts: number;
  leaseEquipRev: number;
  netEquipRev: number;
  /** Profit / adjusted gross profit (net revenue minus all rep costs). */
  equipmentAGP: number;
  perItemCommission: number;
  allSamePercent: boolean;
  baseCommission: number;
  splitMultiplier: number;
  totalCommission: number;
  marginBeforeBuyout: number;
  buyoutExceedsMargin: boolean;
  isNegativeCommission: boolean;
}

export function computeCommissionTotals(formData: CommissionFormData): CommissionTotals {
  const totalBilled = formData.lineItems.reduce((sum, item) => sum + item.billed * item.quantity, 0);
  const totalRepCost = formData.lineItems.reduce((sum, item) => sum + item.repCost * item.quantity, 0);

  // Buyout handling: 'margin' subtracts the buyout from margin (reduces commission);
  // 'customer' treats it as a customer-facing line item (pass-through, does not reduce margin).
  const buyoutInMargin = formData.buyoutHandling !== "customer";

  const additionalCosts =
    (buyoutInMargin ? formData.buyoutTradeUp : 0) +
    formData.shippingCosts +
    formData.setupCost +
    formData.deliveryCost +
    formData.connectivity +
    formData.leadFee +
    (formData.equipmentRemoval || 0) +
    formData.otherSalesFees;

  const totalRepCostWithCosts = totalRepCost + additionalCosts;

  // Lease calculations -- promoDiscounts is now a text note, not subtracted
  const leaseEquipRev = formData.approvalAmount || totalBilled;
  const netEquipRev = leaseEquipRev;
  const equipmentAGP = netEquipRev - totalRepCostWithCosts;

  // Per-item commission: each item's profit * its commission %
  const perItemCommission = formData.lineItems.reduce((sum, item) => {
    const itemProfit = (item.billed - item.repCost) * item.quantity;
    const itemCommPct = item.commissionPercent !== undefined ? item.commissionPercent : formData.commissionPercentage;
    return sum + itemProfit * (itemCommPct / 100);
  }, 0);

  // If all items use the same commission %, fall back to the flat calculation for backward compat
  const allSamePercent = formData.lineItems.every(
    (item) => item.commissionPercent === undefined || item.commissionPercent === formData.commissionPercentage,
  );
  const baseCommission = allSamePercent
    ? equipmentAGP * (formData.commissionPercentage / 100)
    : perItemCommission - additionalCosts * (formData.commissionPercentage / 100);

  // Commission with split
  const splitMultiplier = formData.splitPercentage > 0 ? formData.splitPercentage / 100 : 1;
  const totalCommission = baseCommission * splitMultiplier;

  // Negative-commission / buyout-exceeds-margin warning
  const marginBeforeBuyout = netEquipRev - (totalRepCostWithCosts - (buyoutInMargin ? formData.buyoutTradeUp : 0));
  const buyoutExceedsMargin =
    buyoutInMargin && formData.buyoutTradeUp > 0 && formData.buyoutTradeUp > marginBeforeBuyout;
  const isNegativeCommission = totalCommission < 0 || equipmentAGP < 0;

  return {
    totalBilled,
    totalRepCost,
    buyoutInMargin,
    additionalCosts,
    totalRepCostWithCosts,
    leaseEquipRev,
    netEquipRev,
    equipmentAGP,
    perItemCommission,
    allSamePercent,
    baseCommission,
    splitMultiplier,
    totalCommission,
    marginBeforeBuyout,
    buyoutExceedsMargin,
    isNegativeCommission,
  };
}

/**
 * Map the quote form's line items into commission line items (billed = price,
 * repCost = cost). Mirrors CommissionForm's own quote->commission sync so the
 * quote-page summary and the Commission tab agree on the same figures.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapQuoteLineItemsToCommission(quoteLineItems: any[]): CommissionFormData["lineItems"] {
  return (quoteLineItems || []).map((item: any) => ({
    id: item.id || `li-${item.model || item.description || "item"}`,
    quantity: item.quantity || 1,
    description: `${item.quantity || 1} - ${item.description || item.model || ""}`,
    billed: item.price || 0,
    repCost: item.cost || 0,
    condition: item.condition || "New",
    dealerSource: item.dealerSource || "",
    specialPricing: "",
    machineType: item.machineType || "Color",
  }));
}
