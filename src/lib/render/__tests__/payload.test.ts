import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quoteRenderPayload, joinAddress, lineDescription, money } from '../payload.ts';

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
