/**
 * Equipment lease quotation shaped after Eakes' own paperwork.
 *
 * Section names and order are taken from the Lease Agreement they sent
 * (Lease_Agreement(Customer_signs).pdf, 4pp):
 *
 *   Contract Date
 *   LESSEE INFORMATION      full legal name, billing address, city/county/state/zip
 *   EQUIPMENT LOCATION      with the "shall not be removed" note verbatim
 *   EQUIPMENT INFORMATION   the line-item table
 *   TERM & PAYMENT INFORMATION
 *   CUSTOMER SIGNATURE      title, date, for, salesperson
 *
 * Terms and conditions are NOT authored here. Earlier versions carried four
 * paragraphs of plausible-sounding prose written by this file's author, on a
 * document a customer signs; they now come from the dealer's own configured
 * terms and the section disappears when they have entered none. Their real
 * terms live in the copier lease tool spreadsheet Mike described (7/31).
 *
 * Sales tax likewise comes from the dealer's settings rather than the 8.7%
 * this file used to assume.
 *
 * Every token here resolves from src/lib/render/payload.ts. Fields the quote
 * form does not capture (county) come through null and drop out rather than
 * printing an empty box.
 */



export function eakesLeaseTemplate(over = {}) {
  return {
    id: 'tmpl_eakes_lease_v1',
    name: 'Equipment Lease Quotation (Eakes)',
    page: {
      size: 'letter', orientation: 'portrait',
      margins: { top: 1.15, right: 0.6, bottom: 0.6, left: 0.6 },
    },
    chrome: {
      companyName: '{{dealer.company}}',
      lines: ['{{dealer.address}}', '{{dealer.phone}} · {{dealer.website}}'],
      right: ['QUOTATION {{deal.quote_number}}', 'Contract date {{today | date:medium}}'],
      footerNote: '{{dealer.company}} · {{company.name}} · Quote {{deal.quote_number}}',
    },
    styles: { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 9 },
    computed: {
      // The dealer's configured rate, not a number chosen here. Unset means no
      // tax line at all: this document is customer-facing, and an invented
      // rate on it is worse than an omission the reader can see.
      tax: 'round(totals.subtotal * dealer.tax_rate, 2)',
      // The total survives an absent tax rate by falling back to the bare
      // subtotal, rather than vanishing with the line it was built from.
      grand: 'firstNonZero(totals.subtotal + computed.tax, totals.subtotal)',
      // QuoteIQ's payment wins over a payment derived here.
      //
      // The funder's figure is what the customer was quoted; deriving one from
      // a rate factor is a reconstruction that can disagree with it, and the
      // customer signs this page, not our arithmetic. The rate-factor form
      // stays as the fallback for a deal QuoteIQ has not written to, and drops
      // out entirely when there is no factor either.
      monthly: 'firstNonZero(lease.payment, round(computed.grand * lease.rate_factor, 2))',
    },
    blocks: [
      { type: 'docTitle', title: 'Equipment Lease Quotation', meta: [
        { label: 'Contract date', value: '{{today | date}}' },
        { label: 'Quote', value: '{{deal.quote_number}}' },
        { label: 'Valid through', value: '{{deal.close_date | date}}' },
      ] },

      { type: 'fieldGrid', title: 'Lessee Information', columns: 2, hideEmpty: true, fields: [
        { label: 'Full legal name', value: '{{company.name}}', full: true },
        { label: 'Billing address', value: '{{company.street}}', full: true },
        { label: 'City', value: '{{company.city}}' },
        { label: 'County', value: '{{company.county}}' },
        { label: 'State', value: '{{company.state}}' },
        { label: 'Zip', value: '{{company.zip}}' },
        { label: 'Phone', value: '{{company.phone}}' },
        { label: 'Project', value: '{{deal.name}}' },
      ] },

      { type: 'fieldGrid', title: 'Equipment Location', columns: 2, hideEmpty: true, fields: [
        { label: 'Street address', value: '{{location.street}}', full: true },
        { label: 'City', value: '{{location.city}}' },
        { label: 'County', value: '{{location.county}}' },
        { label: 'State', value: '{{location.state}}' },
        { label: 'Zip', value: '{{location.zip}}' },
        { label: 'Site contact', value: '{{contact.ship_to}}' },
      ] },

      { type: 'richText', keepTogether: true, html:
        '<p><em>Equipment shall not be removed from this location without written consent of ' +
        'Lessor.</em></p>' },

      { type: 'table', title: 'Equipment Information', bind: 'line_items',
        amountKey: 'extended', qtyKey: 'quantity', maxRows: 100,
        emptyText: 'No equipment has been added to this quotation.',
        columns: [
          { key: 'name', label: 'Description', width: '44%' },
          { key: 'type', label: 'Type', width: '13%' },
          { key: 'quantity', label: 'Qty', width: '8%', align: 'right' },
          { key: 'unit', label: 'Unit', width: '16%', align: 'right', format: 'currency' },
          { key: 'extended', label: 'Extended', width: '19%', align: 'right', format: 'currency' },
        ] },

      { type: 'fieldGrid', title: 'Term & Payment Information', columns: 2, hideEmpty: true, fields: [
        { label: 'Lessor', value: '{{lease.partner}}' },
        { label: 'Lease type', value: '{{lease.type}}' },
        { label: 'Term', value: '{{lease.term}} months' },
        { label: 'Monthly payment', value: '{{lease.payment | currency}}' },
        { label: 'Rate factor', value: '{{lease.rate_factor | rate}}' },
        { label: 'Salesperson', value: '{{rep.name}}' },
      ] },

      { type: 'summary', hideEmpty: true, rows: [
        { label: 'Equipment subtotal', expr: 'totals.subtotal' },
        { label: 'Estimated tax ({{dealer.tax_rate | percent}})', expr: 'computed.tax' },
        { label: 'Total financed', expr: 'computed.grand', bold: true, rule: true },
        { label: 'Monthly payment · {{lease.term}} mo', expr: 'computed.monthly' },
      ] },

      // The dealer's own terms, from their document settings. Omitted entirely
      // when they have entered none -- this template does not author legal
      // prose on their behalf.
      { type: 'richText', title: 'Terms & Conditions', html: '{{terms.html}}', hideEmpty: true },

      { type: 'signature', title: 'Customer Signature', signers: [
        { label: '{{company.name}}', sublabel: 'Authorized signature · Title · Date' },
        { label: 'For {{dealer.company}}', sublabel: 'Salesperson {{rep.name}}' },
      ] },
    ],
    ...over,
  };
}
