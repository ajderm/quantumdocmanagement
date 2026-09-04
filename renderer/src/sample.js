// The canonical sample document: a realistic equipment quotation with
// deterministic data.
//
// This is production code, not test material -- the deployed smoke endpoint
// renders it to prove Chromium is working in whatever runtime it landed in.
// The test corpus builds its cases on the same definitions, so what is
// verified in CI is what a live smoke check renders.
//
// Deterministic on purpose: no randomness, so the same input renders the same
// bytes today and in six months.

const MACHINES = [
  ['Canon imageRUNNER ADVANCE DX C3835i', 'MFP', 6480],
  ['Konica Minolta bizhub C360i', 'MFP', 5240],
  ['Ricoh IM C3000', 'MFP', 5890],
  ['Xerox AltaLink C8145', 'MFP', 9120],
  ['HP Color LaserJet E78330dn', 'MFP', 4760],
  ['Sharp BP-70C31', 'MFP', 7310],
];
const PARTS = [
  ['Inner Finisher-L1 (staple)', 'Accessory', 940],
  ['Cassette Feeding Unit AK1', 'Accessory', 615],
  ['Super G3 FAX Board', 'Accessory', 480],
  ['Paper Deck Unit UO1', 'Accessory', 1290],
  ['Staple Cartridge (3-pack)', 'Supply', 86],
  ['Card Reader / Badge Auth Kit', 'Accessory', 530],
  ['Copy Tray / Job Separator', 'Accessory', 215],
  ['Waste Toner Container', 'Supply', 48],
];
const SITES = ['Corporate — 4th Floor', 'Mill Creek Warehouse', 'Northgate Clinic',
               'Eastside Annex', 'Riverbend Depot', 'South Campus'];

/**
 * @param {number} n
 * @param {{sites?:number, longDescriptionAt?:number, longDescriptionRepeat?:number}} [o]
 *   longDescriptionRepeat controls how tall the oversized row is. A Letter page
 *   fits roughly 3,000 characters in this column width, so a value of 15 puts a
 *   single row well past a full page — the case the layout engine cannot
 *   satisfy with break-inside:avoid and must handle some other way.
 */
export function lineItems(n, o = {}) {
  const sites = o.sites ?? 3;
  const out = [];
  for (let i = 0; i < n; i++) {
    const isMachine = i % 4 === 0;
    const src = isMachine ? MACHINES[(i / 4 | 0) % MACHINES.length] : PARTS[i % PARTS.length];
    const quantity = isMachine ? 1 + (i % 2) : 1 + (i % 3);
    let name = src[0];
    if (o.longDescriptionAt === i) {
      name = src[0] + ' — ' + ('configured with hole-punch unit, saddle-stitch finisher, ' +
        'two 550-sheet cassettes, high-capacity 2000-sheet tandem tray, fax expansion, ' +
        'badge authentication reader, secure-release print firmware, IPsec network stack, ' +
        'and on-site orientation for up to twelve named operators at this location ')
        .repeat(o.longDescriptionRepeat ?? 15);
    }
    out.push({
      name, type: src[1], quantity, unit: src[2], extended: quantity * src[2],
      serial: `SN${String(480000 + i * 137).padStart(8, '0')}`,
      site: sites > 0 ? SITES[(i / Math.max(1, Math.ceil(n / sites)) | 0) % sites] : SITES[0],
    });
  }
  return out;
}

export function deal(overrides = {}) {
  return {
    company: {
      name: 'Bellevue Dental Partners',
      address: '1420 148th Ave NE, Bellevue, WA 98007',
      phone: '(425) 555-0410',
    },
    contact: { ship_to: 'Dana Okonjo', ap: 'Rae Lindqvist' },
    deal: { name: 'Fleet Refresh — 2026', quote_number: 'Q-20416', close_date: '2026-09-30' },
    rep: { name: 'Marko Ajder', phone: '(425) 555-0182', email: 'mivanovic@example.com' },
    lease: { partner: 'GreatAmerica', term: 60, rate_factor: 0.01974 },
    dealer: {
      company: 'Quantum Office Systems',
      address: '3300 Maple Valley Rd, Suite 210 · Renton, WA 98058',
      phone: '(425) 555-0100',
      website: 'quantumoffice.example',
    },
    today: '2026-09-03',
    ...overrides,
  };
}

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
