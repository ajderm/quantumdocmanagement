// Single source of truth for line-item price ↔ markup math.
//
// The "Your Price" a customer sees is derived from rep cost and markup. This
// logic previously lived inline in several places (updateLineItem, pricing-tier
// apply, add-from-library), which is how the Quote page, Commission page,
// preview and PDF could end up disagreeing about the same number. All callers
// should use these helpers so the derivation exists in exactly one place.

/** Sell price ("Your Price") from rep cost and markup %, rounded to cents. */
export function priceFromCostMarkup(cost: number, markupPercent: number): number {
  return Math.round((cost || 0) * (1 + (markupPercent || 0) / 100) * 100) / 100;
}

/**
 * Markup % implied by a hand-entered sell price against rep cost, rounded to
 * two decimals. Returns 0 when cost is 0 (undefined markup) or when the price is
 * at/below cost. This powers the "type a price, see the markup it yields"
 * behavior reps had in Compass.
 */
export function markupFromCostPrice(cost: number, price: number): number {
  if (!cost || cost <= 0) return 0;
  const calc = Math.round(((price || 0) / cost - 1) * 10000) / 100;
  return calc > 0 ? calc : 0;
}
