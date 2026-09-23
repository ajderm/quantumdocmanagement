import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTransactionType } from '../../src/lib/transactionType.ts';

test('the three values a HubSpot workflow branches on', () => {
  assert.equal(normalizeTransactionType('Purchase'), 'Purchase');
  assert.equal(normalizeTransactionType('Rental'), 'Rental');
  assert.equal(normalizeTransactionType('Lease'), 'Lease');
});

test('the leasing company is stripped, so a workflow need not list every funder', () => {
  // The commission form stores the funder in the same field, because that is
  // how a rep picks it: handleTransactionTypeChange writes "Lease -- <company>".
  assert.equal(normalizeTransactionType('Lease -- Leaf'), 'Lease');
  assert.equal(normalizeTransactionType('Lease -- Canon Financial'), 'Lease');
  assert.equal(normalizeTransactionType('Lease -- Great America'), 'Lease');
  assert.equal(normalizeTransactionType('Lease -- TLI'), 'Lease');
});

test('case and surrounding whitespace do not matter', () => {
  assert.equal(normalizeTransactionType('  purchase '), 'Purchase');
  assert.equal(normalizeTransactionType('LEASE -- LEAF'), 'Lease');
  assert.equal(normalizeTransactionType('Rental  '), 'Rental');
});

test('an unset type is null, never a guessed branch', () => {
  // The workflow collects paperwork off this value. A wrong branch gathers the
  // wrong documents on a real deal, so absence must stay absence.
  assert.equal(normalizeTransactionType(''), null);
  assert.equal(normalizeTransactionType('   '), null);
  assert.equal(normalizeTransactionType(null), null);
  assert.equal(normalizeTransactionType(undefined), null);
});

test('an unrecognized value is null rather than a near-miss match', () => {
  assert.equal(normalizeTransactionType('Service Agreement'), null);
  assert.equal(normalizeTransactionType('Trade-in'), null);
  assert.equal(normalizeTransactionType('Leasehold improvement'), null);
});

test('a word merely starting with a type name does not match', () => {
  // "Leasehold" must not read as Lease; the \b guards that.
  assert.equal(normalizeTransactionType('Leasehold'), null);
  assert.equal(normalizeTransactionType('Rentals-R-Us'), null);
});
