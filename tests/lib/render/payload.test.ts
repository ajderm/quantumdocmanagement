import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  quoteRenderPayload, joinAddress, lineDescription, money, num, taxRateFraction, termsHtml,
  classifyLine, reconcileLineItems,
} from '../../../src/lib/render/payload.ts';

const ctx = {
  dealerInfo: { companyName: 'Quantum Office Systems', address: '3300 Maple Valley Rd', phone: '(425) 555-0100', website: 'quantumoffice.example' },
  deal: { dealname: 'Fleet Refresh', closedate: '2026-09-30T00:00:00.000Z' },
  shipToContact: 'Dana Okonjo',
  leasingPartnerName: 'Cornerstone Bank',
  rateFactor: 0.01974,
  today: '2026-09-04',
};

test('money rounds to cents without float residue', () => {
  assert.equal(money(0.1 + 0.2), 0.3);
  assert.equal(money(1234.005), 1234.01);
  assert.equal(money('nope'), 0);
  assert.equal(money(null), 0);
  assert.equal(money(undefined), 0);
  assert.equal(money(''), 0);
});

test('extended is quantity times unit, rounded once', () => {
  const p = quoteRenderPayload({ lineItems: [{ model: 'A', quantity: 3, price: 19.99 }] }, ctx);
  assert.equal(p.line_items[0].unit, 19.99);
  assert.equal(p.line_items[0].extended, 59.97);
});

test('a zero-quantity placeholder line does not reach the document', () => {
  // Otherwise it prints as a $0.00 row on something a customer reads.
  const p = quoteRenderPayload({ lineItems: [
    { model: 'Real', quantity: 1, price: 100 },
    { model: 'Placeholder', quantity: 0, price: 0 },
  ] }, ctx);
  assert.equal(p.line_items.length, 1);
  assert.equal(p.line_items[0].name, 'Real');
});

test('address parts join without dangling separators', () => {
  assert.equal(joinAddress({ address: '1 Main St', city: 'Bellevue', state: 'WA', zip: '98007' }),
    '1 Main St, Bellevue, WA 98007');
  assert.equal(joinAddress({ address: '1 Main St', address2: 'Suite 200', city: 'Bellevue' }),
    '1 Main St, Suite 200, Bellevue');
  assert.equal(joinAddress({ city: 'Bellevue', state: 'WA' }), 'Bellevue, WA');
  assert.equal(joinAddress({}), '');
  assert.equal(joinAddress({ address: '  ', city: '' }), '');
});

test('a description with only one of model/description has no dangling dash', () => {
  assert.equal(lineDescription({ model: 'C3835i', description: 'Colour MFP' }), 'C3835i — Colour MFP');
  assert.equal(lineDescription({ model: 'C3835i' }), 'C3835i');
  assert.equal(lineDescription({ description: 'Colour MFP' }), 'Colour MFP');
  assert.equal(lineDescription({ model: 'Same', description: 'Same' }), 'Same');
  assert.equal(lineDescription({}), 'Item');
});

test('a close date is passed through as a calendar date, not an instant', () => {
  // Slicing before the renderer means no timezone can move it a day.
  const p = quoteRenderPayload({}, ctx);
  assert.equal(p.deal.close_date, '2026-09-30');
});

test('an absent rate factor is null rather than zero', () => {
  for (const bad of [null, undefined, 0, -1, 'abc']) {
    const p = quoteRenderPayload({}, { ...ctx, rateFactor: bad as number });
    assert.equal(p.lease.rate_factor, null, `rateFactor ${JSON.stringify(bad)}`);
  }
  assert.equal(quoteRenderPayload({}, ctx).lease.rate_factor, 0.01974);
});

test('the first selected term becomes the lease term', () => {
  assert.equal(quoteRenderPayload({ selectedTerms: [60, 48] }, ctx).lease.term, 60);
  assert.equal(quoteRenderPayload({ selectedTerms: [] }, ctx).lease.term, null);
  assert.equal(quoteRenderPayload({}, ctx).lease.term, null);
});

test('empty strings become null so hideEmpty can drop the field', () => {
  const p = quoteRenderPayload({ preparedBy: '  ', phone: '' }, { ...ctx, shipToContact: '  ' });
  assert.equal(p.rep.name, null);
  assert.equal(p.company.phone, null);
  assert.equal(p.contact.ship_to, null);
});

test('a missing company name falls back rather than rendering blank', () => {
  assert.equal(quoteRenderPayload({}, ctx).company.name, 'Customer');
});

test('the payload shape matches what the seeded template references', () => {
  const p = quoteRenderPayload({ quoteNumber: 'Q-1', lineItems: [{ model: 'A', quantity: 1, price: 10 }] }, ctx);
  // Every token path the reference template uses must resolve.
  const paths = ['company.name', 'company.address', 'contact.ship_to', 'deal.name',
    'deal.quote_number', 'deal.close_date', 'rep.name', 'rep.phone', 'lease.partner',
    'lease.term', 'lease.rate_factor', 'dealer.company', 'dealer.address', 'dealer.phone',
    'dealer.website', 'today'];
  for (const path of paths) {
    const value = path.split('.').reduce((o: unknown, k) => (o as Record<string, unknown>)?.[k], p);
    assert.notEqual(value, undefined, `${path} is missing from the payload`);
  }
  assert.ok(Array.isArray(p.line_items));
});

test('address components are carried separately, as their paperwork lays them out', () => {
  const p = quoteRenderPayload({
    address: '2901 Cuming St', address2: 'Suite 4',
    city: 'Grand Island', state: 'NE', zip: '68801',
  }, ctx);
  assert.equal(p.company.street, '2901 Cuming St, Suite 4');
  assert.equal(p.company.city, 'Grand Island');
  assert.equal(p.company.state, 'NE');
  assert.equal(p.company.zip, '68801');
  // Still available joined, for templates that want one line.
  assert.equal(p.company.address, '2901 Cuming St, Suite 4, Grand Island, NE 68801');
});

test('a field the form does not capture is null, so the template drops it', () => {
  // County appears on their paperwork but the quote form has no such field.
  // Null means the label disappears rather than printing an empty box.
  assert.equal(quoteRenderPayload({}, ctx).company.county, null);
});

test('equipment location defaults to the billing address', () => {
  const p = quoteRenderPayload({ address: '1 Main', city: 'Omaha', state: 'NE', zip: '68102' }, ctx);
  assert.equal(p.location.street, '1 Main');
  assert.equal(p.location.city, 'Omaha');
});

test('a portal rename reaches the document as its printed title', () => {
  const p = quoteRenderPayload({}, { ...ctx, documentTitle: 'Lease Agreement' });
  assert.equal(p.document.title, 'Lease Agreement');
});

test('no rename leaves the title null, so the template keeps its own', () => {
  // Null is the signal to leave the heading alone. An empty string would blank
  // it, printing a document with no title at all.
  assert.equal(quoteRenderPayload({}, ctx).document.title, null);
  assert.equal(quoteRenderPayload({}, { ...ctx, documentTitle: '   ' }).document.title, null);
});

test("QuoteIQ's term and payment win over the form's own selection", () => {
  const p = quoteRenderPayload({ selectedTerms: [36] }, {
    ...ctx,
    quoteiq: { payment: 241.99, termMonths: 60, type: 'Commercial FMV' },
  });
  assert.equal(p.lease.term, 60, 'the term the customer was quoted, not the rep default');
  assert.equal(p.lease.payment, 241.99);
  assert.equal(p.lease.type, 'Commercial FMV');
});

test('a deal QuoteIQ has not written falls back to the form', () => {
  const p = quoteRenderPayload({ selectedTerms: [36] }, { ...ctx, quoteiq: null });
  assert.equal(p.lease.term, 36);
  assert.equal(p.lease.payment, null, 'null, not 0 -- the document must fall back, not print $0.00');
  assert.equal(p.lease.type, null);
});

test('an unset HubSpot number reads as absent, not as zero', () => {
  // HubSpot returns '' for numeric properties that were never set, and
  // Number('') is 0 -- which would print a $0.00 monthly payment on a lease.
  const p = quoteRenderPayload({ selectedTerms: [48] }, {
    ...ctx,
    quoteiq: { payment: '', termMonths: '', type: '   ' },
  });
  assert.equal(p.lease.payment, null);
  assert.equal(p.lease.term, 48, 'and the form still supplies the term');
  assert.equal(p.lease.type, null);
});

test('a payment carrying float residue is rounded before it reaches a signature page', () => {
  const p = quoteRenderPayload({}, { ...ctx, quoteiq: { payment: 241.98999999 } });
  assert.equal(p.lease.payment, 241.99);
});

test('num keeps absent absent where money would coerce it to zero', () => {
  assert.equal(num(''), null);
  assert.equal(num('   '), null);
  assert.equal(num(null), null);
  assert.equal(num(undefined), null);
  assert.equal(num('nope'), null);
  assert.equal(num(0), 0, 'an explicit zero is a real number and survives');
  assert.equal(num('241.99'), 241.99);
  assert.equal(money(''), 0, 'money still coerces, which is right for a line total');
});

test('a tax rate is read as a percent or a fraction, and nonsense is refused', () => {
  // "5.5" and "0.055" are both what an admin means; the difference is a
  // hundredfold error on a customer's total.
  assert.equal(taxRateFraction('5.5'), 0.055);
  assert.equal(taxRateFraction(5.5), 0.055);
  assert.equal(taxRateFraction('0.055'), 0.055);
  assert.equal(taxRateFraction('5.5%'), 0.055);
  assert.equal(taxRateFraction(' 7 '), 0.07);
  // Absent stays absent, so the document omits the tax line entirely.
  assert.equal(taxRateFraction(''), null);
  assert.equal(taxRateFraction(null), null);
  assert.equal(taxRateFraction(undefined), null);
  assert.equal(taxRateFraction('abc'), null);
  assert.equal(taxRateFraction(0), null, 'zero tax is no tax line');
  assert.equal(taxRateFraction(-5), null);
  // Certainly a typo, and an absurd tax line is worse than none.
  assert.equal(taxRateFraction(150), null);
  assert.equal(taxRateFraction(1), null);
});

test('configured terms become paragraphs, and absent terms omit the section', () => {
  assert.equal(termsHtml(null), null);
  assert.equal(termsHtml(''), null);
  assert.equal(termsHtml('   \n  \n '), null);
  assert.equal(termsHtml('One clause.'), '<p>One clause.</p>');
  assert.equal(
    termsHtml('First clause.\n\nSecond clause.'),
    '<p>First clause.</p><p>Second clause.</p>',
    'a blank line starts a new paragraph',
  );
  assert.equal(
    termsHtml('Line one\nline two'),
    '<p>Line one<br />line two</p>',
    'a single newline is kept as a break, as it was typed',
  );
});

test('terms from a settings field are escaped, never treated as markup', () => {
  // The renderer's HTML layer must only ever receive markup it built.
  assert.equal(
    termsHtml('Rate <script>alert(1)</script> & more'),
    '<p>Rate &lt;script&gt;alert(1)&lt;/script&gt; &amp; more</p>',
  );
});

test('the payload carries the tax rate and terms it was given, or null', () => {
  const withBoth = quoteRenderPayload({}, {
    ...ctx, taxRate: '5.5', termsText: 'Eakes retains title.',
  });
  assert.equal(withBoth.dealer.tax_rate, 0.055);
  assert.equal(withBoth.terms.html, '<p>Eakes retains title.</p>');

  const withNeither = quoteRenderPayload({}, ctx);
  assert.equal(withNeither.dealer.tax_rate, null, 'no invented 8.7%');
  assert.equal(withNeither.terms.html, null, 'and no invented prose');
});

// The real Arbor Day deal shape: four SKU'd equipment lines, a buyout and a
// chart line, both with no SKU. Amounts are the actual ones.
const ARBOR_DAY = [
  { sku: 'BP-71C31', model: 'BP-71C31', description: 'Sharp BP-71C31', quantity: 1, price: 7664.57 },
  { sku: 'BP-DE14', model: 'BP-DE14', description: 'Sharp Stand/3 x 550-sheet Paper Drawers', quantity: 1, price: 1358.50 },
  { sku: 'BP-FX11', model: 'BP-FX11', description: 'Sharp Fax Expansion Kit', quantity: 1, price: 1004.40 },
  { sku: 'BP-TU11', model: 'BP-TU11', description: 'Sharp Center Exit Tray', quantity: 1, price: 84.04 },
  { sku: null, model: 'Chart 0/Zone 3', description: 'Chart 0/Zone 3', quantity: 1, price: 0 },
  { sku: null, model: 'BUYOUT', description: 'BUYOUT', quantity: 1, price: 2000 },
];

test('a buyout and a chart line are classified apart, not lumped together', () => {
  // Both have no SKU, but they are not the same thing: one is counted in the
  // total and hidden, the other is excluded from both.
  assert.equal(classifyLine({ model: 'BUYOUT' }), 'nonTaxable');
  assert.equal(classifyLine({ model: 'Chart 0/Zone 3' }), 'suppressed');
  assert.equal(classifyLine({ model: 'BP-71C31' }), 'equipment');
  // Variants Eakes actually say.
  assert.equal(classifyLine({ description: 'Rollover from prior lease' }), 'nonTaxable');
  assert.equal(classifyLine({ description: 'Knock-out' }), 'nonTaxable');
  assert.equal(classifyLine({ description: 'Buy Out of existing' }), 'nonTaxable');
  // Stated unconditionally ("Buyout. Never customer facing"), so the name rule
  // wins even where the line also carries a SKU.
  assert.equal(classifyLine({ sku: 'MISC-1', model: 'BUYOUT' } as never), 'nonTaxable');
});

test('a line with no SKU is still shown -- hiding real equipment is the worse failure', () => {
  // Every line a rep adds by hand has no SKU. An earlier rule hid those, which
  // silently dropped equipment off customer paperwork; showing a line that
  // should have been hidden is visible and correctable, so the default shows.
  assert.equal(classifyLine({ model: 'Adjustment' }), 'equipment');
  assert.equal(classifyLine({ model: '' }), 'equipment');
  const p = quoteRenderPayload({ lineItems: [{ model: 'Hand-typed unit', quantity: 1, price: 500 }] }, ctx);
  assert.equal(p.line_items.length, 1);
  assert.equal(p.amounts.taxable, 500);
  assert.equal(p.amounts.total, 500);
});

test('the customer sees equipment only, but the total still counts the buyout', () => {
  const p = quoteRenderPayload({ lineItems: ARBOR_DAY }, ctx);

  assert.equal(p.line_items.length, 4, 'the buyout and chart line are not listed');
  assert.ok(!p.line_items.some((l) => /BUYOUT|Chart|Zone/i.test(l.name)));

  assert.equal(p.amounts.taxable, 10111.51, 'equipment is the taxable portion');
  assert.equal(p.amounts.non_taxable, 2000, 'the buyout is counted, though never shown');
  // Mike: "we wouldn't see the buyout, but it would be included."
  assert.equal(p.amounts.total, 12111.51, 'and the total reconciles to the deal amount');
});

test('an empty non-taxable total is null, so its row disappears', () => {
  // A $0.00 non-taxable line on paperwork the bank reconciles is a claim, not
  // an absence. Only equipment here.
  const p = quoteRenderPayload({ lineItems: ARBOR_DAY.slice(0, 4) }, ctx);
  assert.equal(p.amounts.non_taxable, null);
  assert.equal(p.amounts.total, 10111.51);
});

test('an unrecognised line joins the equipment it resembles', () => {
  const p = quoteRenderPayload({
    lineItems: [...ARBOR_DAY, { sku: null, model: 'Freight adjustment', quantity: 1, price: 150 }],
  }, ctx);
  assert.equal(p.line_items.length, 5, 'it is shown');
  assert.equal(p.amounts.taxable, 10261.51);
  assert.equal(p.amounts.total, 12261.51);
});

test('a suppressed line never reaches the total even when it carries money', () => {
  // Chart 0/Zone 3 is 0.00 on the deal inspected, which is the only reason
  // lumping it with the buyout would not yet have shown up as a wrong total.
  const p = quoteRenderPayload({
    lineItems: [ARBOR_DAY[0], { sku: null, model: 'Chart 0/Zone 3', quantity: 1, price: 500 }],
  }, ctx);
  assert.equal(p.amounts.total, 7664.57);
  assert.equal(p.amounts.non_taxable, null);
});

test('duplicated line items are reported against the deal amount, not deduplicated', () => {
  // QuoteIQ wrote the Arbor Day set twice. Deduplicating here would hide a bug
  // Jason owns and would break genuine multi-machine deals.
  const doubled = [...ARBOR_DAY, ...ARBOR_DAY];
  const msg = reconcileLineItems(doubled, 12111.51);
  assert.ok(msg, 'the disagreement is reported');
  assert.match(msg!, /24,223\.02/, 'with what the lines actually total');
  assert.match(msg!, /12,111\.51/, 'and what the deal says');
  assert.match(msg!, /duplicated/, 'and names the likely cause');

  // Still doubled in the payload -- reporting is not correcting.
  const p = quoteRenderPayload({ lineItems: doubled }, ctx);
  assert.equal(p.amounts.total, 24223.02);
  assert.equal(p.line_items.length, 8);
});

test('reconciliation stays quiet when there is nothing to say', () => {
  assert.equal(reconcileLineItems(ARBOR_DAY, 12111.51), null, 'a match is silent');
  assert.equal(reconcileLineItems(ARBOR_DAY, null), null, 'no deal amount, no claim');
  assert.equal(reconcileLineItems(ARBOR_DAY, 0), null);
  assert.equal(reconcileLineItems(undefined, 12111.51), null);
  // A cent of rounding drift is not a discrepancy worth interrupting for.
  assert.equal(reconcileLineItems(ARBOR_DAY, 12111.5), null);
  // A real gap is.
  assert.match(reconcileLineItems(ARBOR_DAY, 9000)!, /Verify before sending/);
});

test('a zero-quantity placeholder affects neither the list nor the totals', () => {
  const p = quoteRenderPayload({
    lineItems: [...ARBOR_DAY, { sku: 'BP-XX', model: 'BP-XX', quantity: 0, price: 999 }],
  }, ctx);
  assert.equal(p.line_items.length, 4);
  assert.equal(p.amounts.total, 12111.51);
});
