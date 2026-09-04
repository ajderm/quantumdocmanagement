import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, headerKey } from '../../../src/lib/rateSheet/csv.ts';
import { parseFlatCsv } from '../../../src/lib/rateSheet/flat.ts';

test('a quoted comma does not shift the columns', () => {
  // The previous parser used line.split(','), which turns this single company
  // name into two fields and lands text in every later numeric column.
  const rows = parseCsv('a,b,c\n"Cornerstone Bank, N.A.",60,0.01974\n');
  assert.deepEqual(rows[1], ['Cornerstone Bank, N.A.', '60', '0.01974']);
});

test('escaped quotes, CRLF and a BOM are handled', () => {
  const rows = parseCsv('﻿x,y\r\n"say ""hi""",2\r\n');
  assert.deepEqual(rows[0], ['x', 'y']);
  assert.deepEqual(rows[1], ['say "hi"', '2']);
});

test('a trailing newline does not create a phantom row', () => {
  assert.equal(parseCsv('a,b\n1,2\n').length, 2);
  assert.equal(parseCsv('a,b\n1,2').length, 2);
});

test('a quoted newline stays inside its field', () => {
  const rows = parseCsv('a,b\n"line1\nline2",2\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], 'line1\nline2');
});

test('header names normalize to one canonical key', () => {
  assert.equal(headerKey('  Rate Factor '), 'rate_factor');
  assert.equal(headerKey('Term (Months)'), 'term_months');
});

test('column aliases are accepted', () => {
  const res = parseFlatCsv('company,program,term,factor\nCornerstone,Commercial,60,0.01974\n');
  assert.equal(res.factors.length, 1);
  assert.deepEqual(res.factors[0], {
    leasingCompany: 'Cornerstone', program: 'Commercial', promotion: 'default',
    paymentStructure: null, moneyRate: null, minAmount: null, maxAmount: null,
    termMonths: 60, rateFactor: 0.01974,
    // A flat CSV states one rate per row, so the street/bank distinction the
    // partner matrices carry side by side does not arise.
    audience: null,
  });
});

test('currency formatting in the amount bands is tolerated', () => {
  const res = parseFlatCsv(
    'leasing_company,lease_program,min_amount,max_amount,term_months,rate_factor\n' +
    'Cornerstone,Commercial,"$5,000","$25,000",60,0.01974\n');
  assert.equal(res.factors[0].minAmount, 5000);
  assert.equal(res.factors[0].maxAmount, 25000);
});

test('missing required columns are reported by name', () => {
  const res = parseFlatCsv('leasing_company,lease_program\nCornerstone,Commercial\n');
  assert.equal(res.factors.length, 0);
  assert.ok(/term_months/.test(res.warnings[0]), res.warnings[0]);
  assert.ok(/rate_factor/.test(res.warnings[0]), res.warnings[0]);
});

test('unusable rows are skipped and counted, not stored', () => {
  const res = parseFlatCsv(
    'term_months,rate_factor\n' +
    '60,0.01974\n' +
    '60,1.5\n' +      // a factor at/above 1 is a different quantity
    '0,0.02\n' +      // implausible term
    'abc,0.02\n' +
    '60,\n');
  assert.equal(res.factors.length, 1);
  assert.equal(res.skipped, 4);
});

test('a large number of bad rows is summarized rather than listed in full', () => {
  const body = Array.from({ length: 30 }, () => '0,0').join('\n');
  const res = parseFlatCsv(`term_months,rate_factor\n${body}\n`);
  assert.equal(res.factors.length, 0);
  assert.equal(res.skipped, 30);
  assert.ok(res.warnings.length < 10, `expected a summary, got ${res.warnings.length} warnings`);
  assert.ok(res.warnings.some((w) => /further unusable/.test(w)));
});
