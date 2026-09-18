/**
 * Payload mappers for the documents other than the quote.
 *
 * Each form writes its own shape, but the renderer's templates all read the
 * one contract described by `RenderPayload`. Rather than five copies of the
 * same address joining and money rounding, the shared parts are built once
 * here and each mapper fills only what its form actually has.
 *
 * Absent stays absent. An unset number must print blank, not $0.00 — on a
 * lease a zero reads as free — so every optional figure keeps the `> 0` guard
 * `quoteRenderPayload` already uses.
 */

import {
  classifyLine, companyCrmFields, contactCrmFields, dealerBlock, lineDescription, money, num,
  repCodeField, taxRateFraction, termsHtml,
  type CrmExtras, type QuoteFormLike, type RenderBranch, type RenderPayload, type RenderLineItem,
} from "./payload.ts";

export interface DocRenderContext {
  dealerInfo?: {
    companyName?: string; address?: string; phone?: string; website?: string;
  };
  /** The resolved (or rep-overridden) selling branch; null leaves chrome as-is. */
  branch?: RenderBranch | null;
  deal?: { dealname?: string; closedate?: string } | null;
  /** Quote number, where the document carries one. */
  quoteNumber?: string | null;
  /** The portal's own name for this document. */
  documentTitle?: string | null;
  /** Sales tax rate as a fraction (0.055) or a percent (5.5); null when unset. */
  taxRate?: unknown;
  /** The dealer's configured terms for this document, as plain text. */
  termsText?: string | null;
  repName?: string | null;
  repPhone?: string | null;
  repEmail?: string | null;
  shipToContact?: string | null;
  /** Injected so a document's date is deterministic. */
  today: string;
  /** Values read straight off the CRM records. */
  crm?: CrmExtras;
  /**
   * QuoteIQ's writeback on the deal: `lease_provider`, `lease_term_months`,
   * `lease_type`, `lease_payment`. Read the same way the quote reads them, so
   * a document that shows lease terms shows the quoted ones. Absent stays
   * absent: an unwritten payment renders blank, never $0.00.
   */
  quoteiq?: {
    provider?: unknown; payment?: unknown; termMonths?: unknown; type?: unknown;
  } | null;
  /** The deal's line items, in the shape the quote form holds them. */
  lineItems?: QuoteFormLike["lineItems"];
}

/** The lease block as QuoteIQ wrote it on the deal. */
function leaseFromDeal(ctx: DocRenderContext): RenderPayload["lease"] {
  const q = ctx.quoteiq ?? {};
  const term = num(q.termMonths);
  const payment = num(q.payment);
  return {
    partner: clean(q.provider),
    term: term !== null && term > 0 ? Math.round(term) : null,
    rate_factor: null,
    payment: payment !== null && payment > 0 ? money(payment) : null,
    type: clean(q.type),
  };
}

/** The deal's line items, given the quote's own visibility and tax rules. */
function dealLines(ctx: DocRenderContext) {
  return classified((ctx.lineItems ?? [])
    .filter((item) => Number(item.quantity) > 0)
    .map((item) => {
      const quantity = Number(item.quantity) || 0;
      const unit = money(item.price ?? 0);
      return {
        source: { model: item.model, description: item.description },
        line: {
          name: lineDescription(item),
          type: clean(item.productType),
          quantity,
          unit,
          extended: money(unit * quantity),
          serial: clean(item.serial),
          meter: clean(item.meterReading),
          site: clean(item.location),
        } satisfies RenderLineItem,
      };
    }));
}

const clean = (s: unknown): string | null => {
  const v = (s ?? "").toString().trim();
  return v === "" ? null : v;
};

/** Join the parts of an address, dropping the blanks rather than leaving gaps. */
const joinParts = (...parts: unknown[]): string =>
  parts.map((p) => (p ?? "").toString().trim()).filter(Boolean).join(", ");

/**
 * "Lincoln, NE" -> { city, state }.
 *
 * Several forms capture city and state in one field. Splitting keeps the
 * template's separate slots filled instead of dumping both into the city.
 */
function splitCityState(value: unknown): { city: string | null; state: string | null } {
  const raw = (value ?? "").toString().trim();
  if (!raw) return { city: null, state: null };
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { city: parts[0], state: parts.slice(1).join(", ") };
  return { city: raw, state: null };
}

interface AddressParts {
  street?: unknown; city?: unknown; state?: unknown; zip?: unknown;
}

const addressBlock = (a: AddressParts) => ({
  street: clean(a.street),
  city: clean(a.city),
  state: clean(a.state),
  zip: clean(a.zip),
  county: null as string | null,
});

/** The parts every document shares, built once. */
function shared(ctx: DocRenderContext) {
  return {
    contact: { ship_to: clean(ctx.shipToContact), ...contactCrmFields(ctx.crm) },
    document: { title: clean(ctx.documentTitle) },
    deal: {
      name: clean(ctx.deal?.dealname),
      quote_number: clean(ctx.quoteNumber),
      close_date: ctx.deal?.closedate ? String(ctx.deal.closedate).slice(0, 10) : null,
    },
    rep: {
      name: clean(ctx.repName),
      phone: clean(ctx.repPhone),
      email: clean(ctx.repEmail),
      code: repCodeField(ctx.crm),
    },
    dealer: dealerBlock(ctx),
    terms: { html: termsHtml(ctx.termsText) },
    today: ctx.today,
  };
}

/** Totals from the listed lines. Non-taxable stays null when there are none. */
function amountsFrom(lines: RenderLineItem[]): RenderPayload["amounts"] {
  const taxable = lines.reduce((sum, l) => money(sum + l.extended), 0);
  return { taxable, non_taxable: null, total: taxable };
}

/** The text `classifyLine` reads, for a line already mapped to render shape. */
type ClassifiableSource = { model?: string; description?: string; name?: string };

/**
 * Apply the quote's own visibility rules to any document's lines.
 *
 * Same treatment `quoteRenderPayload` gives every line: chart/zone lines are
 * neither listed nor counted, buyout/rollover/knockout lines are counted but
 * never listed, everything else is listed and taxable. A BUYOUT row on a
 * signed lease is a customer-visible error, so no builder may skip this.
 */
function classified(
  entries: { source: ClassifiableSource; line: RenderLineItem }[],
): { lines: RenderLineItem[]; taxable: number; nonTaxable: number | null } {
  const lines: RenderLineItem[] = [];
  let taxable = 0;
  let nonTaxable = 0;
  for (const { source, line } of entries) {
    const kind = classifyLine(source);
    if (kind === "suppressed") continue;
    if (kind === "nonTaxable") {
      nonTaxable = money(nonTaxable + line.extended);
      continue;
    }
    taxable = money(taxable + line.extended);
    lines.push(line);
  }
  return { lines, taxable, nonTaxable: nonTaxable > 0 ? nonTaxable : null };
}

/* ------------------------------------------------------------------ */
/* New customer application                                            */
/* ------------------------------------------------------------------ */

export interface NewCustomerLike {
  companyName?: string; tradeName?: string;
  hqAddress?: string; hqAddress2?: string; hqCity?: string; hqState?: string;
  hqZip?: string; hqPhone?: string;
  billingAddress?: string; billingAddress2?: string; billingCity?: string;
  billingState?: string; billingZip?: string;
  principalName?: string; principalPhone?: string; principalEmail?: string;
}

export function newCustomerRenderPayload(
  form: NewCustomerLike, ctx: DocRenderContext,
): RenderPayload {
  const hqStreet = joinParts(form.hqAddress, form.hqAddress2);
  const billingStreet = joinParts(form.billingAddress, form.billingAddress2);
  const split = dealLines(ctx);
  return {
    ...shared(ctx),
    // Chrome follows the selling branch. The fixed credit-department return
    // address lives as literal Eakes template copy and remains independent.
    dealer: dealerBlock(ctx),
    company: {
      name: clean(form.companyName) ?? "Customer",
      address: joinParts(hqStreet, form.hqCity,
        [clean(form.hqState), clean(form.hqZip)].filter(Boolean).join(" ")),
      phone: clean(form.hqPhone),
      ...addressBlock({
        street: hqStreet, city: form.hqCity, state: form.hqState, zip: form.hqZip,
      }),
      ...companyCrmFields(ctx.crm),
    },
    // Billing office where one is captured, else the headquarters address.
    location: addressBlock({
      street: billingStreet || hqStreet,
      city: clean(form.billingCity) ?? form.hqCity,
      state: clean(form.billingState) ?? form.hqState,
      zip: clean(form.billingZip) ?? form.hqZip,
    }),
    contact: {
      ship_to: clean(ctx.shipToContact) ?? clean(form.principalName),
      ...contactCrmFields(ctx.crm),
    },
    // The customer summary absorbed the lease funding document, so it carries
    // the quoted lease and the equipment behind it.
    lease: leaseFromDeal(ctx),
    amounts: {
      taxable: split.taxable,
      non_taxable: split.nonTaxable,
      total: money(split.taxable + (split.nonTaxable ?? 0)),
    },
    line_items: split.lines,
  };
}

/* ------------------------------------------------------------------ */
/* Letter of intent                                                    */
/* ------------------------------------------------------------------ */

export interface LoiLike {
  customerCompanyName?: string; businessName?: string;
  customerAddress?: string; customerCityState?: string; customerZip?: string;
  customerContact?: string; customerPhone?: string; customerEmail?: string;
  leaseVendor?: string;
  equipment?: { model?: string; serial?: string }[];
}

export function loiRenderPayload(form: LoiLike, ctx: DocRenderContext): RenderPayload {
  const { city, state } = splitCityState(form.customerCityState);
  // The equipment list arrives flattened from the deal's line items, which can
  // repeat the same model/serial pair when a hardware unit's accessories are
  // expanded more than once. A letter of intent identifies equipment, so the
  // same identity twice is noise, not two machines.
  const seen = new Set<string>();
  const entries = (form.equipment ?? [])
    .filter((e) => clean(e.model) || clean(e.serial))
    .filter((e) => {
      const key = `${(e.model ?? "").trim().toLowerCase()}|${(e.serial ?? "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((e) => ({
      source: { model: e.model },
      line: {
        name: clean(e.model) ?? "Equipment",
        type: null,
        quantity: 1,
        unit: 0,
        extended: 0,
        serial: clean(e.serial),
        meter: null,
        site: null,
      } satisfies RenderLineItem,
    }));
  const lines = classified(entries).lines;
  return {
    ...shared(ctx),
    company: {
      name: clean(form.businessName) ?? clean(form.customerCompanyName) ?? "Customer",
      address: joinParts(form.customerAddress, form.customerCityState, form.customerZip),
      phone: clean(form.customerPhone),
      ...addressBlock({ street: form.customerAddress, city, state, zip: form.customerZip }),
      ...companyCrmFields(ctx.crm),
    },
    contact: {
      ship_to: clean(form.customerContact) ?? clean(ctx.shipToContact),
      ...contactCrmFields(ctx.crm),
    },
    location: addressBlock({ street: form.customerAddress, city, state, zip: form.customerZip }),
    lease: {
      partner: clean(form.leaseVendor),
      term: null, rate_factor: null, payment: null, type: null,
    },
    // A letter of intent prices nothing; the equipment is listed to identify it.
    amounts: { taxable: 0, non_taxable: null, total: 0 },
    line_items: lines,
  };
}

/* ------------------------------------------------------------------ */
/* Installation report                                                 */
/* ------------------------------------------------------------------ */

export interface InstallationLike {
  shipToCompany?: string; shipToAddress?: string; shipToCity?: string;
  shipToState?: string; shipToZip?: string; shipToAttn?: string; shipToPhone?: string;
  billToCompany?: string; billToAddress?: string; billToCity?: string;
  billToState?: string; billToZip?: string;
  installedQty?: number; installedModel?: string; installedDescription?: string;
  installedSerial?: string;
  meterBlack?: string; meterColor?: string; meterTotal?: string;
  salesRep?: string;
  linkedAccessories?: {
    model?: string; description?: string; quantity?: number; productType?: string;
  }[];
}

export function installationRenderPayload(
  form: InstallationLike, ctx: DocRenderContext,
): RenderPayload {
  const describe = (model?: string, description?: string) => {
    const m = clean(model); const d = clean(description);
    if (m && d && m !== d) return `${m} — ${d}`;
    return m ?? d ?? "Item";
  };
  const entries: { source: ClassifiableSource; line: RenderLineItem }[] = [];
  if (clean(form.installedModel) || clean(form.installedDescription)) {
    entries.push({
      source: { model: form.installedModel, description: form.installedDescription },
      line: {
        name: describe(form.installedModel, form.installedDescription),
        type: "Hardware",
        quantity: Number(form.installedQty) > 0 ? Number(form.installedQty) : 1,
        unit: 0,
        extended: 0,
        serial: clean(form.installedSerial),
        meter: clean(form.meterTotal) ?? clean(form.meterBlack),
        site: null,
      },
    });
  }
  for (const a of form.linkedAccessories ?? []) {
    if (!clean(a.model) && !clean(a.description)) continue;
    entries.push({
      source: { model: a.model, description: a.description },
      line: {
        name: describe(a.model, a.description),
        type: clean(a.productType),
        quantity: Number(a.quantity) > 0 ? Number(a.quantity) : 1,
        unit: 0,
        extended: 0,
        serial: null,
        meter: null,
        site: null,
      },
    });
  }
  const lines = classified(entries).lines;
  return {
    ...shared(ctx),
    company: {
      name: clean(form.shipToCompany) ?? clean(form.billToCompany) ?? "Customer",
      address: joinParts(form.shipToAddress, form.shipToCity,
        [clean(form.shipToState), clean(form.shipToZip)].filter(Boolean).join(" ")),
      phone: clean(form.shipToPhone),
      ...addressBlock({
        street: form.shipToAddress, city: form.shipToCity,
        state: form.shipToState, zip: form.shipToZip,
      }),
      ...companyCrmFields(ctx.crm),
    },
    contact: {
      ship_to: clean(form.shipToAttn) ?? clean(ctx.shipToContact),
      ...contactCrmFields(ctx.crm),
    },
    location: addressBlock({
      street: form.shipToAddress, city: form.shipToCity,
      state: form.shipToState, zip: form.shipToZip,
    }),
    rep: {
      name: clean(form.salesRep) ?? clean(ctx.repName),
      phone: clean(ctx.repPhone),
      email: clean(ctx.repEmail),
      code: repCodeField(ctx.crm),
    },
    lease: { partner: null, term: null, rate_factor: null, payment: null, type: null },
    // An installation report records what was delivered, not what it cost.
    amounts: { taxable: 0, non_taxable: null, total: 0 },
    line_items: lines,
  };
}

/* ------------------------------------------------------------------ */
/* FMV lease agreement                                                 */
/* ------------------------------------------------------------------ */

export interface FmvLeaseLike {
  companyLegalName?: string; phone?: string;
  billingAddress?: string; billingCity?: string; billingState?: string; billingZip?: string;
  equipmentAddress?: string; equipmentCity?: string; equipmentState?: string; equipmentZip?: string;
  termInMonths?: string; paymentAmount?: string; paymentFrequency?: string;
  equipmentItems?: {
    quantity?: number; makeModelDescription?: string; serialNumber?: string; idNumber?: string; location?: string;
  }[];
}

export function fmvLeaseRenderPayload(
  form: FmvLeaseLike, ctx: DocRenderContext,
): RenderPayload {
  const lines = classified((form.equipmentItems ?? [])
    .filter((e) => clean(e.makeModelDescription) || clean(e.serialNumber))
    .map((e) => ({
      source: { description: e.makeModelDescription },
      line: {
        name: clean(e.makeModelDescription) ?? "Equipment",
        type: null,
        quantity: Number(e.quantity) > 0 ? Number(e.quantity) : 1,
        unit: 0,
        extended: 0,
        serial: clean(e.serialNumber),
        meter: null,
        site: clean(e.location),
      } satisfies RenderLineItem,
    }))).lines;
  const term = num(form.termInMonths);
  const payment = num(form.paymentAmount);
  return {
    ...shared(ctx),
    company: {
      name: clean(form.companyLegalName) ?? "Customer",
      address: joinParts(form.billingAddress, form.billingCity,
        [clean(form.billingState), clean(form.billingZip)].filter(Boolean).join(" ")),
      phone: clean(form.phone),
      ...addressBlock({
        street: form.billingAddress, city: form.billingCity,
        state: form.billingState, zip: form.billingZip,
      }),
      ...companyCrmFields(ctx.crm),
    },
    // Where the equipment goes; falls back to the billing address when unset.
    location: addressBlock({
      street: clean(form.equipmentAddress) ?? form.billingAddress,
      city: clean(form.equipmentCity) ?? form.billingCity,
      state: clean(form.equipmentState) ?? form.billingState,
      zip: clean(form.equipmentZip) ?? form.billingZip,
    }),
    lease: {
      partner: null,
      term: term !== null && term > 0 ? Math.round(term) : null,
      rate_factor: null,
      payment: payment !== null && payment > 0 ? money(payment) : null,
      type: clean(form.paymentFrequency) ?? "FMV",
    },
    amounts: { taxable: 0, non_taxable: null, total: 0 },
    line_items: lines,
  };
}

/* ------------------------------------------------------------------ */
/* Lease funding document                                              */
/* ------------------------------------------------------------------ */

export interface LeaseFundingLike {
  customerName?: string; locationBranch?: string; salesRepresentative?: string;
  equipmentMakeModel?: string; idNumber?: string; serialNumber?: string;
  leaseVendor?: string; leaseType?: string; termLength?: string;
  monthlyPayment?: string; rate?: string; invoiceFundingAmount?: string;
}

export function leaseFundingRenderPayload(
  form: LeaseFundingLike, ctx: DocRenderContext,
): RenderPayload {
  const funding = num(form.invoiceFundingAmount);
  const amount = funding !== null && funding > 0 ? money(funding) : 0;
  const split = classified(clean(form.equipmentMakeModel)
    ? [{
      source: { model: form.equipmentMakeModel },
      line: {
        name: clean(form.equipmentMakeModel) ?? "Equipment",
        type: null,
        quantity: 1,
        unit: amount,
        extended: amount,
        serial: clean(form.serialNumber),
        meter: null,
        site: clean(form.idNumber) ?? clean(form.locationBranch),
      } satisfies RenderLineItem,
    }]
    : []);
  const lines = split.lines;
  const term = num(form.termLength);
  const payment = num(form.monthlyPayment);
  const rate = num(form.rate);
  return {
    ...shared(ctx),
    company: {
      name: clean(form.customerName) ?? "Customer",
      address: "",
      phone: null,
      street: null, city: null, state: null, zip: null, county: null,
      ...companyCrmFields(ctx.crm),
    },
    location: { street: null, city: null, state: null, zip: null, county: null },
    rep: {
      name: clean(form.salesRepresentative) ?? clean(ctx.repName),
      phone: clean(ctx.repPhone),
      email: clean(ctx.repEmail),
      code: repCodeField(ctx.crm),
    },
    lease: {
      partner: clean(form.leaseVendor),
      term: term !== null && term > 0 ? Math.round(term) : null,
      rate_factor: rate !== null && rate > 0 ? rate : null,
      payment: payment !== null && payment > 0 ? money(payment) : null,
      type: clean(form.leaseType),
    },
    amounts: amount > 0
      ? { taxable: split.taxable, non_taxable: split.nonTaxable, total: amount }
      : amountsFrom(lines),
    line_items: lines,
  };
}

/* ------------------------------------------------------------------ */
/* Service agreement                                                   */
/* ------------------------------------------------------------------ */

export interface ServiceAgreementRateLike {
  includesBW?: unknown; includesColor?: unknown;
  overagesBW?: unknown; overagesColor?: unknown; baseRate?: unknown;
}

export interface ServiceAgreementLike {
  customerNumber?: string; customerNumberOverride?: string;
  shipToCompany?: string; shipToAddress?: string; shipToCity?: string;
  shipToState?: string; shipToZip?: string; shipToAttn?: string;
  billToCompany?: string; billToAddress?: string; billToCity?: string;
  billToState?: string; billToZip?: string; billToAttn?: string;
  contractLengthMonths?: string;
  billingPeriod?: string;
  serials?: Record<string, string>;
  locations?: Record<string, string>;
  rates?: Record<string, ServiceAgreementRateLike>;
}

/** Rates the quote carried, used where the agreement has none of its own. */
export interface ServiceQuoteRates {
  includedBWCopies?: unknown; includedColorCopies?: unknown;
  overageBWRate?: unknown; overageColorRate?: unknown; serviceBaseRate?: unknown;
}

const BILLING_LABEL: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly", annual: "Annual",
};

/** Positive numbers only: an unset rate must stay absent, never zero. */
const positive = (value: unknown): number | null => {
  const v = num(value);
  return v !== null && v > 0 ? v : null;
};

/**
 * The service agreement, as the template prints it.
 *
 * Equipment comes from the deal's own lines rather than from the hardware
 * filter the native preview used: that filter dropped the accessories, so an
 * Arbor Day agreement listed the engine and omitted the tray, the drawer and
 * the fax kit while the lease — fed from these same lines — listed all four.
 *
 * Serial and Location are the ones typed on this agreement, falling back to
 * the quote's serial and to the deal's equipment location.
 */
export function serviceAgreementRenderPayload(
  form: ServiceAgreementLike,
  ctx: DocRenderContext,
  options?: { quoteRates?: ServiceQuoteRates | null; equipmentLocationDefault?: string | null },
): RenderPayload {
  const serials = form.serials ?? {};
  const locations = form.locations ?? {};
  const fallbackSite = clean(options?.equipmentLocationDefault);

  const split = classified((ctx.lineItems ?? [])
    .filter((item) => Number(item.quantity) > 0)
    .map((item) => {
      const quantity = Number(item.quantity) || 0;
      const unit = money(item.price ?? 0);
      const id = String((item as { id?: unknown }).id ?? "");
      return {
        source: { model: item.model, description: item.description },
        line: {
          name: lineDescription(item),
          type: clean(item.productType),
          quantity,
          unit,
          extended: money(unit * quantity),
          serial: clean(serials[id]) ?? clean(item.serial),
          meter: clean(item.meterReading),
          site: clean(locations[id]) ?? clean(item.location) ?? fallbackSite,
        } satisfies RenderLineItem,
      };
    }));

  // The per-line rates the rep entered, rolled up to the single set of figures
  // the agreement's face carries. Volumes add up across the covered machines;
  // a rate per copy does not, so the first one entered stands.
  const rateRows = Object.values(form.rates ?? {});
  const q = options?.quoteRates ?? {};
  const sum = (pick: (r: ServiceAgreementRateLike) => unknown, fallback: unknown) => {
    const values = rateRows.map(pick).map(positive).filter((v): v is number => v !== null);
    if (values.length) return money(values.reduce((a, b) => a + b, 0));
    return positive(fallback);
  };
  const first = (pick: (r: ServiceAgreementRateLike) => unknown, fallback: unknown) => {
    for (const row of rateRows) {
      const v = positive(pick(row));
      if (v !== null) return v;
    }
    return positive(fallback);
  };

  const term = num(form.contractLengthMonths) ?? leaseFromDeal(ctx).term;
  const billing = (form.billingPeriod ?? "").toLowerCase();

  return {
    ...shared(ctx),
    company: {
      name: clean(form.billToCompany) ?? clean(form.shipToCompany) ?? "Customer",
      address: joinParts(form.billToAddress, form.billToCity,
        [clean(form.billToState), clean(form.billToZip)].filter(Boolean).join(" ")),
      phone: null,
      ...addressBlock({
        street: form.billToAddress, city: form.billToCity,
        state: form.billToState, zip: form.billToZip,
      }),
      ...companyCrmFields(ctx.crm),
      // The rep may correct the account number on the agreement itself.
      account_number: clean(form.customerNumberOverride)
        ?? clean(form.customerNumber)
        ?? companyCrmFields(ctx.crm).account_number,
    },
    contact: {
      ...shared(ctx).contact,
      ship_to: clean(form.shipToAttn) ?? clean(ctx.shipToContact),
    },
    // Where the equipment sits; falls back to the billing address when unset.
    location: addressBlock({
      street: clean(form.shipToAddress) ?? form.billToAddress,
      city: clean(form.shipToCity) ?? form.billToCity,
      state: clean(form.shipToState) ?? form.billToState,
      zip: clean(form.shipToZip) ?? form.billToZip,
    }),
    lease: {
      ...leaseFromDeal(ctx),
      term: term !== null && term > 0 ? Math.round(term) : null,
    },
    service: {
      billing_period: BILLING_LABEL[billing] ?? clean(form.billingPeriod),
      included_bw: sum((r) => r.includesBW, q.includedBWCopies),
      included_color: sum((r) => r.includesColor, q.includedColorCopies),
      overage_bw: first((r) => r.overagesBW, q.overageBWRate),
      overage_color: first((r) => r.overagesColor, q.overageColorRate),
      base_rate: sum((r) => r.baseRate, q.serviceBaseRate),
    },
    amounts: { taxable: split.taxable, non_taxable: split.nonTaxable, total: split.taxable },
    line_items: split.lines,
  };
}
