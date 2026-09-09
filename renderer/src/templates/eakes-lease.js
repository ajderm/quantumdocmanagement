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
      // Their arithmetic, not ours. Verified to the cent against the signed
      // Cornerstone Bank agreement (4/24/2026) and the Hometown worksheet:
      //
      //   Equipment Total 4,391.84 x rate 0.019980 = 87.75  base monthly
      //   87.75 x 7% tax                           =  6.14  monthly sales tax
      //                                              93.89  total monthly
      //
      // Two earlier mistakes are corrected here. Tax was applied to the
      // equipment subtotal, where their form applies it to the monthly
      // payment; and the payment was derived from a tax-inclusive grand total,
      // where theirs comes from the equipment total alone.
      monthly: 'firstNonZero(lease.payment, round(amounts.taxable * lease.rate_factor, 2))',
      payment_tax: 'round(computed.monthly * dealer.tax_rate, 2)',
      // Falls back to the untaxed payment rather than vanishing with the tax
      // line it is built from, which is what an unset tax rate would
      // otherwise do to the total.
      total_monthly: 'firstNonZero(computed.monthly + computed.payment_tax, computed.monthly)',
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

      // Exhibit A's own columns, and deliberately no pricing: Andrea, 8/31,
      // "Exhibit A lists the items but carries no prices." Their signed
      // Exhibit A reads Make & Model / Description, Serial, Initial Meter
      // Reading, Location -- the Amount column exists only on the internal
      // CLT input sheet, never on the page a customer sees.
      { type: 'table', title: 'Equipment Information', bind: 'line_items',
        columns: [
          { key: 'quantity', label: 'Qty', width: '8%', align: 'right' },
          { key: 'name', label: 'Make & Model / Description', width: '46%' },
          { key: 'serial', label: 'Serial Number', width: '18%' },
          { key: 'meter', label: 'Initial Meter', width: '13%', align: 'right' },
          { key: 'site', label: 'Location', width: '15%' },
        ] },

      { type: 'fieldGrid', title: 'Term & Payment Information', columns: 2, hideEmpty: true, fields: [
        { label: 'Lessor', value: '{{lease.partner}}' },
        { label: 'Lease type', value: '{{lease.type}}' },
        { label: 'Term', value: '{{lease.term}} months' },
        // Payment moved to the summary below, where their form puts it. The
        // rate factor is not here at all: their signed page 1 does not show
        // one, and it belongs on the Hometown worksheet, not in front of a
        // customer.
        { label: 'Salesperson', value: '{{rep.name}}' },
      ] },

      // Taxable and non-taxable are both stated, because the bank reconciles
      // them: "the paperwork we show the bank should have a taxable total and
      // non-taxable total" (Mike, 8/31). The non-taxable row disappears when
      // there is nothing in it.
      // Their Term & Payment block, in their order and their words. No
      // equipment total: their signed page 1 carries none, and Eakes do not
      // put itemised pricing in front of a customer.
      { type: 'summary', hideEmpty: true, rows: [
        { label: 'Monthly payment', expr: 'computed.monthly' },
        { label: 'Sales tax ({{dealer.tax_rate | percent}})', expr: 'computed.payment_tax' },
        { label: 'Total monthly payment', expr: 'computed.total_monthly', bold: true, rule: true },
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
