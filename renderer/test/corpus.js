// The adversarial corpus.
//
// Real documents are all happy path, so they make a poor test suite. These
// cases exist to break the layout engine: empty tables, a row taller than a
// page, counts that land exactly on a page boundary, blocks that would orphan.

import { lineItems, deal } from './fixtures.js';

const TERMS = `<p>Pricing is valid through the date shown above and is contingent on credit
approval by <strong>GreatAmerica</strong>. Equipment remains the property of the lessor for the
duration of the lease term. Installation includes network configuration, driver deployment to
workstations identified at survey, and end-user orientation at each location listed.</p>
<p>Meter-based overage is billed quarterly in arrears. Removal of existing equipment is quoted
separately and is not included in the totals above. Sales tax is estimated and will be assessed
at the rate in effect on the invoice date.</p>`;

/** The reference quote template — the shape a dealer admin would build. */
export function quoteTemplate(over = {}) {
  return {
    id: 'tmpl_quote_v1',
    name: 'Equipment Quotation',
    page: { size: 'letter', orientation: 'portrait',
            margins: { top: 0.95, right: 0.6, bottom: 0.6, left: 0.6 } },
    chrome: {
      companyName: '{{dealer.company}}',
      lines: ['{{dealer.address}}', '{{dealer.phone}} · {{dealer.website}}'],
      right: ['QUOTATION {{deal.quote_number}}', '{{today | date:medium}}', '{{company.name}}'],
      footerNote: '{{dealer.company}} · Quote {{deal.quote_number}}',
    },
    vars: { taxRate: 0.087 },
    computed: {
      tax: 'round(totals.subtotal * vars.taxRate, 2)',
      grand: 'totals.subtotal + computed.tax',
      monthly: 'round(computed.grand * lease.rate_factor, 2)',
    },
    blocks: [
      { type: 'docTitle', title: 'Equipment Quotation', meta: [
        { label: 'Quote', value: '{{deal.quote_number}}' },
        { label: 'Date', value: '{{today | date}}' },
        { label: 'Valid through', value: '{{deal.close_date | date}}' },
        { label: 'Rep', value: '{{rep.name}}' },
      ] },
      { type: 'fieldGrid', title: 'Customer', columns: 2, hideEmpty: true, fields: [
        { label: 'Customer', value: '{{company.name}}' },
        { label: 'Project', value: '{{deal.name}}' },
        { label: 'Address', value: '{{company.address}}' },
        { label: 'Ship to', value: '{{contact.ship_to}}' },
        { label: 'Lease partner', value: '{{lease.partner}}' },
        { label: 'Term', value: '{{lease.term}} months' },
        { label: 'Rate factor', value: '{{lease.rate_factor | rate}}' },
        { label: 'Contact', value: '{{rep.phone}}' },
      ] },
      { type: 'table', title: 'Equipment & Accessories', bind: 'line_items',
        amountKey: 'extended', qtyKey: 'quantity',
        emptyText: 'No equipment has been added to this quote.',
        columns: [
          { key: 'name', label: 'Description', width: '44%' },
          { key: 'type', label: 'Type', width: '13%' },
          { key: 'quantity', label: 'Qty', width: '8%', align: 'right' },
          { key: 'unit', label: 'Unit', width: '16%', align: 'right', format: 'currency' },
          { key: 'extended', label: 'Extended', width: '19%', align: 'right', format: 'currency' },
        ] },
      { type: 'summary', rows: [
        { label: 'Equipment subtotal', expr: 'totals.subtotal' },
        { label: 'Estimated tax ({{vars.taxRate | percent}})', expr: 'computed.tax' },
        { label: 'Total financed', expr: 'computed.grand', bold: true, rule: true },
        { label: 'Monthly payment · {{lease.term}} mo × {{lease.rate_factor | rate}}',
          expr: 'computed.monthly' },
      ] },
      { type: 'richText', title: 'Terms & Conditions', html: TERMS },
      { type: 'signature', title: 'Acceptance', signers: [
        { label: '{{company.name}}', sublabel: 'authorized signature & date' },
        { label: '{{dealer.company}}', sublabel: '{{rep.name}}' },
      ] },
    ],
    ...over,
  };
}

function withTable(patch) {
  const t = quoteTemplate();
  const i = t.blocks.findIndex((b) => b.type === 'table');
  t.blocks[i] = { ...t.blocks[i], ...patch };
  return t;
}

/**
 * Each case: { id, why, template, data, expect }
 * `expect` is asserted by the suite; `null` means "record the value, don't gate".
 */
export const CORPUS = [
  { id: 'empty', why: 'Zero rows — the header and the totals must still render',
    template: quoteTemplate(), data: { ...deal(), line_items: [] },
    expect: { minPages: 1, maxPages: 2, mustContain: ['No equipment has been added'] } },

  { id: 'single-row', why: 'One row — no spurious second page',
    template: quoteTemplate(), data: { ...deal(), line_items: lineItems(1, { sites: 0 }) },
    expect: { minPages: 1, maxPages: 1 } },

  { id: 'nine-rows', why: 'A typical small quote',
    template: quoteTemplate(), data: { ...deal(), line_items: lineItems(9, { sites: 0 }) },
    expect: { minPages: 1, maxPages: 2 } },

  { id: 'boundary-sweep', why: 'Counts around the page-1 capacity edge; the risk is an '
      + 'off-by-one that drops or duplicates a row', sweep: [22, 23, 24, 25, 26],
    // A serial column makes every row uniquely identifiable in the extracted
    // text, so the suite can prove none were dropped or printed twice.
    template: withTable({ columns: [
      { key: 'serial', label: 'Serial', width: '20%' },
      { key: 'name', label: 'Description', width: '37%' },
      { key: 'quantity', label: 'Qty', width: '8%', align: 'right' },
      { key: 'unit', label: 'Unit', width: '16%', align: 'right', format: 'currency' },
      { key: 'extended', label: 'Extended', width: '19%', align: 'right', format: 'currency' },
    ] }),
    data: (n) => ({ ...deal(), line_items: lineItems(n, { sites: 0 }) }),
    expect: { rowsPreserved: true } },

  { id: 'row-taller-than-page', why: 'A single row whose description exceeds a full page — '
      + 'break-inside:avoid cannot be honoured, so the engine must split it rather than lose it',
    template: quoteTemplate(),
    data: { ...deal(), line_items: lineItems(3, { sites: 0, longDescriptionAt: 1,
      longDescriptionRepeat: 15 }) },
    expect: { minPages: 2, maxPages: 6,
      // the tail of the oversized description must survive the split
      mustContain: ['twelve named operators at this location'] } },

  { id: 'forty-rows', why: 'The count that breaks a coordinate-overlay template',
    template: quoteTemplate(), data: { ...deal(), line_items: lineItems(40, { sites: 0 }) },
    expect: { minPages: 2, maxPages: 4, headerRepeatsEveryTablePage: true } },

  { id: 'hundred-rows', why: 'The stated supported ceiling',
    template: quoteTemplate(), data: { ...deal(), line_items: lineItems(100, { sites: 0 }) },
    expect: { minPages: 3, maxPages: 7, headerRepeatsEveryTablePage: true } },

  { id: 'two-fifty-rows', why: 'Headroom well past the ceiling — must not fall over',
    template: quoteTemplate(), data: { ...deal(), line_items: lineItems(250, { sites: 0 }) },
    expect: { minPages: 5, maxPages: 16 } },

  { id: 'grouped-six-sites', why: 'Six groups of one row each — many group headers, few rows',
    template: withTable({ groupBy: 'site', subtotalPerGroup: true }),
    data: { ...deal(), line_items: lineItems(6, { sites: 6 }) },
    expect: { minPages: 1, maxPages: 3 } },

  { id: 'grouped-one-site-heavy', why: 'One group of 60 — the group header must repeat context '
      + 'across pages via the table header',
    template: withTable({ groupBy: 'site', subtotalPerGroup: true }),
    data: { ...deal(), line_items: lineItems(60, { sites: 1 }) },
    expect: { minPages: 2, maxPages: 6, headerRepeatsEveryTablePage: true } },

  { id: 'grouped-forty-three-sites', why: 'Grouping plus subtotals plus a page-spanning table',
    template: withTable({ groupBy: 'site', subtotalPerGroup: true }),
    data: { ...deal(), line_items: lineItems(43, { sites: 3 }) },
    expect: { minPages: 2, maxPages: 5, headerRepeatsEveryTablePage: true } },

  { id: 'null-tokens', why: 'Missing data must collapse cleanly, not print "undefined"',
    template: quoteTemplate(),
    data: { ...deal({ contact: {}, lease: { partner: null, term: null, rate_factor: null } }),
            line_items: lineItems(5, { sites: 0 }) },
    // "Term months" is the dangling-unit case: a label whose only token is
    // null must drop entirely, not print its literal suffix on its own.
    expect: { mustNotContain: ['undefined', 'null', 'NaN', '{{', 'Term months'] } },

  { id: 'long-company-name', why: 'A 90-character customer name must wrap, not overflow the page',
    template: quoteTemplate(),
    data: { ...deal({ company: {
        name: 'Northwestern Regional Dental & Orthodontic Associates of Greater Puget Sound, PLLC',
        address: '1420 148th Ave NE, Suite 3200, Bellevue, Washington 98007-4412' } }),
      line_items: lineItems(12, { sites: 0 }) },
    expect: { noHorizontalOverflow: true } },

  { id: 'row-limit-overflow', why: 'Beyond the row limit the document must say so rather than '
      + 'silently drop line items',
    template: withTable({ maxRows: 20 }),
    data: { ...deal(), line_items: lineItems(35, { sites: 0 }) },
    expect: { mustContain: ['additional line item'], warnings: 1 } },

  { id: 'legal-landscape', why: 'Page size and orientation are template properties',
    template: quoteTemplate({ page: { size: 'legal', orientation: 'landscape',
      margins: { top: 0.95, right: 0.6, bottom: 0.6, left: 0.6 } } }),
    data: { ...deal(), line_items: lineItems(30, { sites: 0 }) },
    expect: { landscape: true } },

  { id: 'hostile-terms', why: 'A terms library entry containing markup must be neutralised',
    template: quoteTemplate({ blocks: quoteTemplate().blocks.map((b) => b.type === 'richText'
      ? { ...b, html: '<p>Standard terms.</p><script>fetch("//x")</script>'
          + '<p onclick="steal()">Clickable</p><iframe src="//evil"></iframe>' } : b) }),
    data: { ...deal(), line_items: lineItems(4, { sites: 0 }) },
    expect: { mustNotContain: ['fetch(', 'steal()', 'evil'] } },
];
