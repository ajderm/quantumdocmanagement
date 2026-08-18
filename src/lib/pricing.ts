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

// ---------------------------------------------------------------------------
// Lease rate factor ↔ monthly payment (Addendum A1).
//
// A lease payment is the amount financed × a rate factor. The rate is directly
// editable by any user on both the quote and the commission document, and the
// two values must stay in agreement: edit the rate → derive the payment; edit
// the payment → derive the rate. These are the single source of that
// derivation so the quote form, quote preview/PDF and commission worksheet can
// never disagree about the same lease.
// ---------------------------------------------------------------------------

/**
 * Monthly payment from an amount financed and a rate factor, rounded to cents.
 * Returns 0 for a non-positive base or rate (an unpriced/unselected lease).
 */
export function paymentFromRate(baseAmount: number, rateFactor: number): number {
  if (!(baseAmount > 0) || !(rateFactor > 0)) return 0;
  return Math.round(baseAmount * rateFactor * 100) / 100;
}

/**
 * Rate factor implied by a hand-entered monthly payment against the amount
 * financed, rounded to 6 decimals (rate factors are small, e.g. 0.0219).
 * Returns 0 when the base is non-positive (rate undefined) or the payment is
 * non-positive.
 */
export function rateFromPayment(baseAmount: number, payment: number): number {
  if (!(baseAmount > 0) || !(payment > 0)) return 0;
  return Math.round((payment / baseAmount) * 1e6) / 1e6;
}
