import { test } from 'node:test';
import assert from 'node:assert/strict';
import { branchAddress, branchForPayload, resolveBranch } from '../../src/lib/branches.ts';

const eakes = [
  { code: '6', name: 'Grand Island', street: '617 W 3rd St', city: 'Grand Island', state: 'NE', zip: '68801', phone: '308-382-8026', rep_prefixes: ['17'], is_main: true },
  { code: '51', name: 'Lincoln', street: '110 N 35th St', city: 'Lincoln', state: 'NE', zip: '68503', phone: '402-466-8600', rep_prefixes: ['51'], is_main: false },
  { code: '35', name: 'Omaha', street: '11108 Q St', city: 'Omaha', state: 'NE', zip: '68137', phone: '402-333-3232', rep_prefixes: ['35'], is_main: false },
  { code: '1', name: 'Central Warehouse', city: 'Grand Island', state: 'NE', zip: '68803', rep_prefixes: [], is_main: false },
];

test('matches on rep prefix, never on the location code', () => {
  // Grand Island is location 6 with prefix 17: arithmetic on the code fails here.
  assert.equal(resolveBranch('1704', eakes)?.code, '6');
  assert.equal(resolveBranch('5112', eakes)?.code, '51');
});

test('longest prefix wins', () => {
  const locations = [
    { code: 'a', name: 'A', rep_prefixes: ['1'], is_main: true },
    { code: 'b', name: 'B', rep_prefixes: ['17'], is_main: false },
  ];
  assert.equal(resolveBranch('1712', locations)?.code, 'b');
  assert.equal(resolveBranch('1234', locations)?.code, 'a');
});

test('no number, or no match, falls back to the main office', () => {
  assert.equal(resolveBranch(null, eakes)?.code, '6');
  assert.equal(resolveBranch('', eakes)?.code, '6');
  assert.equal(resolveBranch('9999', eakes)?.code, '6');
});

test('a portal with no branches resolves to null', () => {
  assert.equal(resolveBranch('5112', []), null);
  assert.equal(resolveBranch('5112', undefined), null);
});

test('non-digits in the number are ignored', () => {
  assert.equal(resolveBranch(' 51-12 ', eakes)?.code, '51');
});

test('address joins street, city, state and zip', () => {
  assert.equal(branchAddress(eakes[2]), '11108 Q St, Omaha, NE 68137');
  assert.equal(branchAddress(eakes[3]), 'Grand Island, NE 68803');
  assert.equal(branchAddress(null), null);
});

test('payload view carries name, address and phone only', () => {
  assert.deepEqual(branchForPayload(eakes[1]), {
    name: 'Lincoln', address: '110 N 35th St, Lincoln, NE 68503', phone: '402-466-8600',
  });
  assert.equal(branchForPayload(null), null);
});
