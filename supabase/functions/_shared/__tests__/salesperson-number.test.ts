import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salespersonNumberFrom } from '../salesperson-number.ts';

test('sales_rep_number is authoritative across property sets', () => {
  assert.equal(salespersonNumberFrom(
    { salesperson__: '5112' }, { sales_rep_number: '6862' },
  ), '6862');
});

test('legacy salesperson__ is accepted only as exactly four digits', () => {
  assert.equal(salespersonNumberFrom({ salesperson__: '5112' }), '5112');
  assert.equal(salespersonNumberFrom({ salesperson__: '51' }), null);
  assert.equal(salespersonNumberFrom({ salesperson__: '51-12' }), null);
  assert.equal(salespersonNumberFrom({ salesperson__: 'Andrea' }), null);
});

test('Syncari and missing values do not resolve a salesperson number', () => {
  assert.equal(salespersonNumberFrom({ lead_routing_salesperson____syncari_: '6862' }), null);
  assert.equal(salespersonNumberFrom({}, null, undefined), null);
});