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
  unit: number;
  extended: number;
  serial: string | null;
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
  lease: { partner: string | null; term: number | null; rate_factor: number | null };
  dealer: {
    company: string | null; address: string | null;
    phone: string | null; website: string | null;
  };
  today: string;
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
    productType?: string; serial?: string;
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
  /** The portal's own name for this document. Absent leaves the template's. */
  documentTitle?: string | null;
  /** Injected so a document's date is deterministic in tests. */
  today: string;
}

export function quoteRenderPayload(form: QuoteFormLike, ctx: RenderContext): RenderPayload {
  const term = Array.isArray(form.selectedTerms) && form.selectedTerms.length
    ? Number(form.selectedTerms[0])
    : null;

  const line_items: RenderLineItem[] = (form.lineItems ?? [])
    // A zero-quantity line is a placeholder the rep has not filled in; it must
    // not print as a $0.00 row on a customer-facing document.
    .filter((item) => Number(item.quantity) > 0)
    .map((item) => {
      const quantity = Number(item.quantity) || 0;
      const unit = money(item.price ?? 0);
      return {
        name: lineDescription(item),
        type: (item.productType ?? '').trim() || null,
        quantity,
        unit,
        extended: money(unit * quantity),
        serial: (item.serial ?? '').trim() || null,
        site: null,
      };
    });

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
    },
    dealer: {
      company: ctx.dealerInfo?.companyName?.trim() || null,
      address: ctx.dealerInfo?.address?.trim() || null,
      phone: ctx.dealerInfo?.phone?.trim() || null,
      website: ctx.dealerInfo?.website?.trim() || null,
    },
    today: ctx.today,
    line_items,
  };
}
