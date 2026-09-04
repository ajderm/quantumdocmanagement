import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRateMatrix, parseEffectiveRange } from '../../../src/lib/rateSheet/matrix.ts';
import type { RateSheetTab } from '../../../src/lib/rateSheet/types.ts';

/**
 * Synthetic fixture reproducing the real layout with invented numbers.
 *
 * The shape is what matters and the shape is copied exactly: a title, an
 * effective range, a payment-structure line, an optional promotion line, a MON
 * row of money rates, then (term, factor) pairs across six columns. Real
 * dealer rate cards are commercially sensitive, so no customer pricing is
 * committed here.
 */
function tab(name: string, extraHeader: string[], monRates: number[], ladders: number[][][]): RateSheetTab {
  const width = monRates.length * 2;
  const monRow: unknown[] = [];
  for (const r of monRates) monRow.push('MON', r);
  const rows: unknown[][] = [
    ['SYNTHETIC LEASE RATES', ...Array(width - 1).fill('')],
    ['June 1, 2026 - November 30, 2026', ...Array(width - 1).fill('')],
    ...extraHeader.map((h) => [h, ...Array(width - 1).fill('')]),
    monRow,
  ];
  const depth = Math.max(...ladders.map((l) => l.length));
  for (let i = 0; i < depth; i++) {
    const row: unknown[] = [];
    for (const ladder of ladders) {
      const cell = ladder[i];
      if (cell) row.push(cell[0], cell[1]); else row.push('', '');
    }
    rows.push(row);
  }
  return { name, rows };
}

/** Two money-rate tiers x three term bands, as the real sheets are built. */
function standardTab(name: string, extraHeader: string[] = []): RateSheetTab {
  const band = (start: number, base: number) =>
    Array.from({ length: 3 }, (_, i) => [start - i, +(base + i * 0.0003).toFixed(5)] as number[]);
  return tab(name, extraHeader,
    [0.07875, 0.07875, 0.07875, 0.06875, 0.06875, 0.06875],
    [band(60, 0.02022), band(40, 0.02851), band(20, 0.05352),
     band(60, 0.01974), band(40, 0.02805), band(20, 0.05306)]);
}

test('dates parse as calendar dates and do not shift', () => {
  assert.deepEqual(parseEffectiveRange('June 1, 2026 - November 30, 2026'),
    { from: '2026-06-01', to: '2026-11-30' });
  assert.deepEqual(parseEffectiveRange('6/1/2026 - 11/30/2026'),
    { from: '2026-06-01', to: '2026-11-30' });
  assert.deepEqual(parseEffectiveRange('June 1, 2026 to November 30, 2026'),
    { from: '2026-06-01', to: '2026-11-30' });
});

test('a date range is not torn apart at the commas inside its own dates', () => {
  // "June 1, 2026" contains separators of its own; splitting naively yields "1".
  const r = parseEffectiveRange('June 1, 2026 - November 30, 2026');
  assert.equal(r.from, '2026-06-01');
  assert.notEqual(r.to, null);
});

test('a line with no date yields nothing rather than a wrong date', () => {
  assert.deepEqual(parseEffectiveRange('ZERO PAYMENTS UPFRONT'), { from: null, to: null });
});

test('every (money rate, term) pair in the matrix is extracted', () => {
  const res = parseRateMatrix([standardTab('0 Pymt')]);
  // 6 column pairs x 3 rows = 18 cells, but pairs share money rates, so the
  // distinct keys are 2 money rates x 9 terms.
  assert.equal(res.factors.length, 18);
  assert.equal(res.skipped, 0);
  assert.equal(res.program, 'SYNTHETIC LEASE RATES');
  assert.equal(res.effectiveFrom, '2026-06-01');
  assert.equal(res.effectiveTo, '2026-11-30');
  const rates = [...new Set(res.factors.map((f) => f.moneyRate))].sort();
  assert.deepEqual(rates, [0.06875, 0.07875]);
  const terms = [...new Set(res.factors.map((f) => f.termMonths))].sort((a, b) => a - b);
  assert.deepEqual(terms, [18, 19, 20, 38, 39, 40, 58, 59, 60]);
});

test('the MON row is located rather than assumed, so an extra header line is fine', () => {
  // The real workbook has a promotion line on one tab and not the other, which
  // shifts the MON row down by one.
  const a = parseRateMatrix([standardTab('0 Pymt')]);
  const b = parseRateMatrix([standardTab('Net New', ['ZERO PAYMENTS UPFRONT', 'NET NEW PROMOTION'])]);
  assert.equal(a.factors.length, b.factors.length);
  assert.equal(b.factors[0].moneyRate, 0.07875);
});

test('each worksheet becomes its own promotion', () => {
  const res = parseRateMatrix([
    standardTab('0 Pymt'),
    standardTab('Net New 0 pmts', ['ZERO PAYMENTS UPFRONT', 'NET NEW PROMOTION']),
  ]);
  assert.equal(res.factors.length, 36);
  assert.deepEqual([...new Set(res.factors.map((f) => f.promotion))], ['0 Pymt', 'Net New 0 pmts']);
});

test('the payment-structure line is captured and kept off the date field', () => {
  const res = parseRateMatrix([standardTab('Net New', ['ZERO PAYMENTS UPFRONT'])]);
  assert.equal(res.factors[0].paymentStructure, 'ZERO PAYMENTS UPFRONT');
  assert.equal(res.effectiveFrom, '2026-06-01');
});

test('a value at or above 1 is not stored as a rate factor', () => {
  // A total or a percentage drifting into the factor column must be rejected,
  // not persisted as a payment-per-dollar.
  const t = standardTab('0 Pymt');
  t.rows.push([60, 1.0, 40, 12, 20, 0.5, 60, -0.02, 40, 0, 20, 'n/a']);
  const res = parseRateMatrix([t]);
  const bad = res.factors.filter((f) => f.rateFactor >= 1 || f.rateFactor <= 0);
  assert.deepEqual(bad, []);
  // 0.5 at term 20 is the only plausible one in that row.
  assert.ok(res.skipped >= 5, `expected rejections, skipped=${res.skipped}`);
});

test('an implausible term is rejected', () => {
  const t = standardTab('0 Pymt');
  t.rows.push([0, 0.02, 999, 0.02, 12.5, 0.02, '', '', '', '', '', '']);
  const res = parseRateMatrix([t]);
  assert.equal(res.factors.some((f) => f.termMonths === 0 || f.termMonths === 999), false);
});

test('a duplicated term at one money rate is reported, not silently doubled', () => {
  const t = standardTab('0 Pymt');
  t.rows.push([60, 0.09999, '', '', '', '', '', '', '', '', '', '']);
  const res = parseRateMatrix([t]);
  const sixties = res.factors.filter((f) => f.termMonths === 60 && f.moneyRate === 0.07875);
  assert.equal(sixties.length, 1, 'the first factor wins');
  assert.equal(sixties[0].rateFactor, 0.02022);
  assert.ok(res.warnings.some((w) => /appears twice/.test(w)), res.warnings.join('; '));
});

test('a tab with no MON row is skipped with an explanation', () => {
  const res = parseRateMatrix([{ name: 'Instructions', rows: [['How to use this sheet'], ['Call your rep']] }]);
  assert.equal(res.factors.length, 0);
  assert.ok(res.warnings.some((w) => /no MON row/.test(w)), res.warnings.join('; '));
});

test('an empty workbook is reported rather than throwing', () => {
  const res = parseRateMatrix([]);
  assert.equal(res.factors.length, 0);
  assert.ok(res.warnings.length > 0);
});

test('a missing effective range is warned about, not invented', () => {
  const t = standardTab('0 Pymt');
  t.rows[1] = ['', '', '', '', '', '', '', '', '', '', '', ''];
  const res = parseRateMatrix([t]);
  assert.equal(res.effectiveFrom, null);
  assert.ok(res.warnings.some((w) => /effective date range/.test(w)));
});

test('a prose footnote below the ladder is captured, not counted as lost data', () => {
  // Real sheets end with a line like this; it states the lease type and buyout.
  const note = 'These are FMV leases with a $1.00 BuyBack of the lease rights at the end of the Term.';
  const t = standardTab('0 Pymt');
  t.rows.push([note, '', '', '', '', '', '', '', '', '', '', '']);
  const res = parseRateMatrix([t]);
  assert.deepEqual(res.notes, [note]);
  assert.equal(res.skipped, 0, 'a footnote is not skipped data');
  assert.equal(res.factors.length, 18);
});

test('a footnote is not double-counted across tabs', () => {
  const note = 'These are FMV leases with a $1.00 BuyBack at the end of the Term.';
  const a = standardTab('0 Pymt');
  const b = standardTab('Net New', ['NET NEW PROMOTION']);
  a.rows.push([note, '', '', '', '', '', '', '', '', '', '', '']);
  b.rows.push([note, '', '', '', '', '', '', '', '', '', '', '']);
  assert.deepEqual(parseRateMatrix([a, b]).notes, [note]);
});

test('a malformed data row is still reported as skipped, not excused as a note', () => {
  const t = standardTab('0 Pymt');
  // Two filled cells, so it is a data row that failed — not prose.
  t.rows.push([60, 'not a number', '', '', '', '', '', '', '', '', '', '']);
  const res = parseRateMatrix([t]);
  assert.equal(res.skipped, 1);
  assert.deepEqual(res.notes, []);
});
