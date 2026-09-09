/**
 * Maps quote form state onto the data shape the renderer's template expects.
 *
 * This is the seam between the two engines. Both are fed from the same form
 * state, so a template-rendered quote and a natively-rendered one must agree
 * about every number — which is why the arithmetic lives here, once, rather
 * than being repeated at the call site.
 *
 * Dependency-free so it can be unit-tested on bare node.
 */

export interface RenderLineItem {
  name: string;
  type: string | null;
  quantity: number;
  /**
   * Unit and extended price.
   *
   * Carried because the quote and the internal CLT sheet both price the line,
   * and because the taxable total is derived from `extended`. Eakes' signed
   * Exhibit A does NOT print either -- Andrea, 8/31: "Exhibit A lists the items
   * but carries no prices" -- so a customer-facing template must not bind a
   * column to them.
   */
  unit: number;
  extended: number;
  serial: string | null;
  /** Initial meter reading, an Exhibit A column on their own paperwork. */
  meter: string | null;
  site: string | null;
}

export interface RenderPayload {
  company: {
    name: string; address: string; phone: string | null;
    // Eakes' own paperwork lays the address out as labelled parts
    // (Billing Address / City / County / State / Zip), so the components are
    // carried alongside the joined form rather than only the joined form.
    street: string | null; city: string | null; state: string | null;
    zip: string | null; county: string | null;
  };
  contact: { ship_to: string | null };
  /**
   * What this portal calls the document.
   *
   * A dealer's word for a document is not ours -- Eakes calls the equipment
   * quotation a Lease Agreement -- so the printed heading follows the portal's
   * label rather than being frozen into the template.
   */
  document: { title: string | null };
  /** Where the equipment goes. Defaults to the billing address when unset. */
  location: {
    street: string | null; city: string | null; state: string | null;
    zip: string | null; county: string | null;
  };
  deal: { name: string | null; quote_number: string | null; close_date: string | null };
  rep: { name: string | null; phone: string | null; email: string | null };
  /**
   * Lease terms as the funder quoted them, not as this app derives them.
   *
   * QuoteIQ writes the payment and term back to the deal, and Jason has asked
   * three times (7/31 twice, 8/31) for those to be what the paperwork prints.
   * They are authoritative: `payment` is a number a customer has been shown,
   * where a payment computed here from a rate factor is a reconstruction that
   * can silently disagree with it. `rate_factor` stays for the fallback and
   * because their own Term & Payment section prints it.
   */
  lease: {
    partner: string | null; term: number | null; rate_factor: number | null;
    payment: number | null; type: string | null;
  };
  dealer: {
    company: string | null; address: string | null;
    phone: string | null; website: string | null;
    /**
     * Sales tax rate as a fraction, e.g. 0.055 -- or null when unset.
     *
     * Null must stay null. The template previously carried a hardcoded 0.087,
     * which put an "Estimated tax (8.7%)" line on a customer-facing document
     * at a rate nobody had chosen. Absent means the tax line and its share of
     * the total disappear, which is honest; a guess is not.
     */
    tax_rate: number | null;
  };
  /**
   * The dealer's own terms and conditions for this document, as HTML.
   *
   * Sourced from their configured document terms rather than written here.
   * Null when they have not entered any, which omits the section: a heading
   * over invented prose on a document a customer signs is worse than no
   * heading at all.
   */
  terms: { html: string | null };
  today: string;
  /**
   * Money by tax treatment.
   *
   * Mike Nierman, 2026-08-31: "the paperwork we show the bank should have a
   * taxable total and non-taxable total. Because the bank double-checks that
   * property when they are processing." So the split is carried explicitly
   * rather than left for the reader to infer from a single subtotal.
   *
   * `taxable` is the listed equipment; `non_taxable` the rollovers and buyouts
   * that are counted but never listed; `total` is everything financed.
   * non_taxable is null rather than 0 when there are none, so its row
   * disappears instead of printing an empty $0.00 claim on paperwork the bank
   * reconciles.
   */
  amounts: {
    taxable: number;
    non_taxable: number | null;
    total: number;
  };
  /** Only the lines a customer should see. */
  line_items: RenderLineItem[];
}

/**
 * Round to cents. Money must never carry binary-float residue into a document.
 *
 * Takes unknown rather than number because form state genuinely arrives with
 * strings and blanks in numeric fields, and the coercion is the point.
 */
export function money(n: unknown): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * A number, or null when there isn't one.
 *
 * `money` coerces anything unusable to 0, which is right for a line total and
 * wrong for a figure that may simply be absent: HubSpot returns empty strings
 * for unset numeric properties, and `Number('') === 0` would turn "QuoteIQ has
 * not written a payment" into "the payment is zero". Absent must stay absent
 * so the document falls back rather than printing $0.00.
 */
export function num(n: unknown): number | null {
  if (n === null || n === undefined) return null;
  if (typeof n === 'string' && n.trim() === '') return null;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

/**
 * A tax rate as a fraction, however it was entered.
 *
 * Admins type "5.5" as readily as "0.055", and the difference is a hundredfold
 * error on a customer's total, so anything above 1 is read as a percent. A
 * rate at or above 100% is refused rather than printed: it is certainly a typo
 * and no tax line is better than an absurd one.
 */
export function taxRateFraction(input: unknown): number | null {
  const v = num(typeof input === 'string' ? input.replace(/[%\s]/g, '') : input);
  if (v === null || v < 0) return null;
  const fraction = v > 1 ? v / 100 : v;
  if (fraction === 0 || fraction >= 1) return null;
  // Rates are quoted to the thousandth of a percent at most.
  return Math.round(fraction * 1e6) / 1e6;
}

/**
 * Plain-text terms as paragraphs, or null when there are none.
 *
 * Blank-line separated blocks become paragraphs and single newlines are kept
 * as line breaks, which is how the text was laid out where it was typed. The
 * text is escaped: it comes from a settings field, and the renderer's HTML
 * layer must never be handed markup it did not build.
 */
export function termsHtml(text: string | null | undefined): string | null {
  const raw = (text ?? '').trim();
  if (raw === '') return null;
  const esc = (s: string) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return raw
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter((para) => para !== '')
    .map((para) => `<p>${esc(para).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

/**
 * What a deal line is, for the purposes of a customer-facing document.
 *
 *   nonTaxable - a rollover, buyout or knockout. NOT listed, but counted in
 *                the total. Mike Nierman, 2026-08-31: "Buyout. Never customer
 *                facing"; and 37:34, "we wouldn't see the buyout, but it would
 *                be included." Andrea, 46:33: "those are considered
 *                non-taxable items, because they've already been taxed
 *                previously."
 *   suppressed - internal accounting lines (Chart 0/Zone 3). Neither listed
 *                nor counted. Mike, 34:49: "we never want to see anything that
 *                contains chart... never wanna [see it] customer-facing."
 *   equipment  - everything else. Listed, and taxable.
 *
 * Equipment is the DEFAULT, and only a positive match hides a line. An earlier
 * version of this used SKU absence as the primary rule, on the basis that
 * every hidden line on the deal inspected had no `hs_sku` -- which is true,
 * and still the wrong rule: a rep adding a line by hand produces no SKU
 * either, so it silently dropped real equipment off the document. Hiding real
 * equipment is invisible and unrecoverable; showing a line that should have
 * been hidden is neither. The failure modes are not symmetric, so the default
 * goes to showing.
 */
export type LineClass = 'equipment' | 'nonTaxable' | 'suppressed';

const SUPPRESSED_NAME = /\b(chart|zone)\b/i;
const NON_TAXABLE_NAME = /\b(buy\s?-?\s?out|buyout|roll\s?-?\s?over|rollover|knock\s?-?\s?out|knockout)\b/i;

/**
 * Classify one line by what it is called.
 *
 * "Never customer facing" was stated unconditionally, so the name decides
 * regardless of whether the line also carries a SKU.
 */
export function classifyLine(
  item: { model?: string; description?: string; name?: string },
): LineClass {
  const text = `${item.model ?? ''} ${item.description ?? ''} ${item.name ?? ''}`;
  if (SUPPRESSED_NAME.test(text)) return 'suppressed';
  if (NON_TAXABLE_NAME.test(text)) return 'nonTaxable';
  return 'equipment';
}

/** Join address parts, dropping the blanks rather than leaving ", ," gaps. */
export function joinAddress(parts: {
  address?: string; address2?: string; city?: string; state?: string; zip?: string;
}): string {
  const street = [parts.address, parts.address2].map((s) => (s ?? '').trim()).filter(Boolean).join(', ');
  const city = (parts.city ?? '').trim();
  const stateZip = [(parts.state ?? '').trim(), (parts.zip ?? '').trim()].filter(Boolean).join(' ');
  const locality = [city, stateZip].filter(Boolean).join(', ');
  return [street, locality].filter(Boolean).join(', ');
}

/**
 * A line's visible description.
 *
 * Model and description are separate fields and either can be empty; joining
 * them unconditionally produces a dangling separator, which is the same class
 * of defect as the "Term months" dangling unit.
 */
export function lineDescription(item: { model?: string; description?: string }): string {
  const model = (item.model ?? '').trim();
  const description = (item.description ?? '').trim();
  if (model && description && description !== model) return `${model} — ${description}`;
  return model || description || 'Item';
}

export interface QuoteFormLike {
  quoteNumber?: string;
  companyName?: string;
  address?: string; address2?: string; city?: string; state?: string; zip?: string;
  phone?: string;
  preparedBy?: string; preparedByPhone?: string; preparedByEmail?: string;
  selectedTerms?: number[];
  lineItems?: {
    model?: string; description?: string; quantity?: number; price?: number;
    productType?: string; serial?: string; sku?: string | null;
    meterReading?: string | number;
  }[];
}

export interface RenderContext {
  dealerInfo?: {
    companyName?: string; address?: string; phone?: string; website?: string;
  };
  deal?: { dealname?: string; closedate?: string } | null;
  shipToContact?: string | null;
  leasingPartnerName?: string | null;
  /** Resolved for the selected term by the form, which owns rate-sheet lookup. */
  rateFactor?: number | null;
  /**
   * QuoteIQ's writeback on the deal: `lease_payment`, `lease_term_months`,
   * `lease_type`. Absent fields fall back to the form's own selection, so a
   * deal QuoteIQ has not touched still produces a document.
   */
  quoteiq?: {
    payment?: unknown; termMonths?: unknown; type?: unknown;
  } | null;
  /** The portal's own name for this document. Absent leaves the template's. */
  documentTitle?: string | null;
  /** Sales tax rate as a fraction (0.055) or a percent (5.5); null when unset. */
  taxRate?: unknown;
  /** The dealer's configured terms for this document, as plain text. */
  termsText?: string | null;
  /** Injected so a document's date is deterministic in tests. */
  today: string;
}

export function quoteRenderPayload(form: QuoteFormLike, ctx: RenderContext): RenderPayload {
  const formTerm = Array.isArray(form.selectedTerms) && form.selectedTerms.length
    ? Number(form.selectedTerms[0])
    : null;
  // QuoteIQ wins where it has spoken. Its term is what the customer was
  // quoted; the rep's selection is a default for deals it has not reached.
  const quotedTerm = num(ctx.quoteiq?.termMonths);
  const term = quotedTerm !== null && quotedTerm > 0 ? Math.round(quotedTerm) : formTerm;
  const quotedPayment = num(ctx.quoteiq?.payment);
  const leaseType = typeof ctx.quoteiq?.type === 'string' ? ctx.quoteiq.type.trim() : '';

  // A zero-quantity line is a placeholder the rep has not filled in; it must
  // not print as a $0.00 row on a customer-facing document.
  const priced = (form.lineItems ?? []).filter((item) => Number(item.quantity) > 0);

  const toRenderLine = (item: NonNullable<QuoteFormLike['lineItems']>[number]): RenderLineItem => {
    const quantity = Number(item.quantity) || 0;
    const unit = money(item.price ?? 0);
    return {
      name: lineDescription(item),
      type: (item.productType ?? '').trim() || null,
      quantity,
      unit,
      extended: money(unit * quantity),
      serial: (item.serial ?? '').trim() || null,
      meter: (item.meterReading ?? '').toString().trim() || null,
      site: null,
    };
  };

  // Split by tax treatment before anything is listed or totalled, so a buyout
  // can be counted without ever being shown.
  const buckets = { equipment: 0, nonTaxable: 0, suppressed: 0 };
  const listed: RenderLineItem[] = [];
  for (const item of priced) {
    const line = toRenderLine(item);
    const kind = classifyLine(item);
    buckets[kind] = money(buckets[kind] + line.extended);
    if (kind === 'equipment') listed.push(line);
  }
  const line_items = listed;
  const total = money(buckets.equipment + buckets.nonTaxable);

  return {
    company: {
      name: (form.companyName ?? '').trim() || 'Customer',
      address: joinAddress(form),
      phone: (form.phone ?? '').trim() || null,
      street: [form.address, form.address2].map((x) => (x ?? '').trim())
        .filter(Boolean).join(', ') || null,
      city: (form.city ?? '').trim() || null,
      state: (form.state ?? '').trim() || null,
      zip: (form.zip ?? '').trim() || null,
      // Not captured by the quote form today. Carried so the template can
      // reference it, and it simply drops until the field exists.
      county: null,
    },
    contact: { ship_to: ctx.shipToContact?.trim() || null },
    document: { title: ctx.documentTitle?.trim() || null },
    location: {
      street: [form.address, form.address2].map((x) => (x ?? '').trim())
        .filter(Boolean).join(', ') || null,
      city: (form.city ?? '').trim() || null,
      state: (form.state ?? '').trim() || null,
      zip: (form.zip ?? '').trim() || null,
      county: null,
    },
    deal: {
      name: ctx.deal?.dealname?.trim() || null,
      quote_number: (form.quoteNumber ?? '').trim() || null,
      // Passed straight through as a calendar date; the renderer's formatter
      // is the only thing that turns it into prose, and it does so without
      // going via Date so it cannot shift a day.
      close_date: ctx.deal?.closedate ? String(ctx.deal.closedate).slice(0, 10) : null,
    },
    rep: {
      name: (form.preparedBy ?? '').trim() || null,
      phone: (form.preparedByPhone ?? '').trim() || null,
      email: (form.preparedByEmail ?? '').trim() || null,
    },
    lease: {
      partner: ctx.leasingPartnerName?.trim() || null,
      term,
      rate_factor: Number.isFinite(Number(ctx.rateFactor)) && Number(ctx.rateFactor) > 0
        ? Number(ctx.rateFactor) : null,
      // Rounded to cents: it prints as money, and a writeback carrying float
      // residue must not put "$241.98999" on a signature page.
      payment: quotedPayment !== null && quotedPayment > 0 ? money(quotedPayment) : null,
      type: leaseType || null,
    },
    dealer: {
      company: ctx.dealerInfo?.companyName?.trim() || null,
      address: ctx.dealerInfo?.address?.trim() || null,
      phone: ctx.dealerInfo?.phone?.trim() || null,
      website: ctx.dealerInfo?.website?.trim() || null,
      tax_rate: taxRateFraction(ctx.taxRate),
    },
    terms: { html: termsHtml(ctx.termsText) },
    today: ctx.today,
    amounts: {
      taxable: buckets.equipment,
      // Null when there are none, so the row disappears rather than asserting
      // a $0.00 non-taxable total the bank would have to interpret.
      non_taxable: buckets.nonTaxable > 0 ? buckets.nonTaxable : null,
      total,
    },
    line_items,
  };
}

/**
 * Do the deal's line items add up to the deal amount?
 *
 * Returns a message when they do not, else null. Andrea's complaint is that
 * she cannot verify the numbers, and QuoteIQ has been writing duplicated line
 * item sets -- on the Arbor Day deal, twice the amount the deal itself
 * carries. Deduplicating here would hide an upstream bug Jason owns and would
 * break genuine multi-machine deals, so the disagreement is reported instead:
 * a flagged wrong total is recoverable, a silent one is not.
 *
 * Suppressed lines are excluded from the comparison, matching what the
 * document counts.
 */
export function reconcileLineItems(
  items: NonNullable<QuoteFormLike['lineItems']> | undefined,
  dealAmount: unknown,
): string | null {
  const expected = num(dealAmount);
  if (expected === null || expected <= 0) return null;
  let counted = 0;
  let contributing = 0;
  for (const item of items ?? []) {
    if (Number(item.quantity) <= 0) continue;
    if (classifyLine(item) === 'suppressed') continue;
    contributing++;
    counted = money(counted + money(item.price ?? 0) * (Number(item.quantity) || 0));
  }
  // Nothing to reconcile against. A deal whose line items have not loaded yet,
  // or has none, is not a deal whose total disagrees -- and claiming otherwise
  // would fire this warning on every empty quote.
  if (contributing === 0) return null;
  // A cent of rounding drift is not a discrepancy worth reporting.
  if (Math.abs(counted - expected) < 0.02) return null;
  const fmt = (n: number) => `$${n.toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
  const doubled = Math.abs(counted - expected * 2) < 0.02;
  return `Line items total ${fmt(counted)} but the deal amount is ${fmt(expected)}.`
    + (doubled ? ' The line items appear to be duplicated -- QuoteIQ has done this before.' : '')
    + ' Verify before sending.';
}
