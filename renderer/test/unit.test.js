import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../src/expr.js';
import { applyFormat } from '../src/format.js';
import { resolve, interpolate, allTokensEmpty } from '../src/resolve.js';
import { sanitizeHtml } from '../src/html.js';

const scope = { totals: { subtotal: 1000 }, vars: { taxRate: 0.087 }, lease: { term: null } };
const lookup = (p) => p.split('.').reduce((o, k) => o?.[k], scope);

test('expressions: arithmetic and precedence', () => {
  assert.equal(evaluate('1+2*3', lookup), 7);
  assert.equal(evaluate('(1+2)*3', lookup), 9);
  assert.equal(evaluate('-4+10', lookup), 6);
  assert.equal(evaluate('round(totals.subtotal * vars.taxRate, 2)', lookup), 87);
  assert.equal(evaluate('max(3,7)', lookup), 7);
});

test('expressions: divide by zero yields 0 rather than Infinity', () => {
  assert.equal(evaluate('10/0', lookup), 0);
});

test('expressions: unknown refs resolve to 0, never NaN', () => {
  assert.equal(evaluate('nope.missing + 1', lookup), 1);
});

test('expressions: malformed templates are rejected, not evaluated', () => {
  for (const bad of ['1+', '(1', 'round 2', '1;2', 'a..b', 'process.exit(1)']) {
    assert.throws(() => evaluate(bad, lookup), undefined, `should reject ${bad}`);
  }
});

test('dates do not shift across timezones', () => {
  // A bare calendar date must not be pulled back a day by a negative offset.
  assert.equal(applyFormat('2026-09-30', 'date'), 'September 30, 2026');
  assert.equal(applyFormat('2026-01-01', 'date:short'), '01/01/2026');
  assert.equal(applyFormat('2026-12-31', 'date:medium'), 'Dec 31, 2026');
});

test('rate factors keep their precision', () => {
  assert.equal(applyFormat(0.01974, 'rate'), '0.019740');
});

test('absent values render empty, not zero', () => {
  // "$0.00" for a missing price reads as free on a customer quote.
  for (const f of ['text', 'currency', 'number', 'percent', 'rate', 'date']) {
    for (const v of [null, undefined, '']) {
      assert.equal(applyFormat(v, f), '', `${f} of ${JSON.stringify(v)}`);
    }
  }
});

test('an explicit zero still prints', () => {
  assert.equal(applyFormat(0, 'currency'), '$0.00');
  assert.equal(applyFormat(0, 'number'), '0');
  assert.equal(applyFormat(0, 'percent'), '0.0%');
  assert.equal(applyFormat(0, 'rate'), '0.000000');
});

test('non-numeric input does not become NaN', () => {
  for (const f of ['currency', 'number', 'percent', 'rate']) {
    assert.equal(applyFormat('n/a', f), '');
  }
});

test('missing tokens render as empty, never "undefined"', () => {
  assert.equal(interpolate('{{a.b.c}}', {}), '');
  assert.equal(interpolate('x {{a.b}} y', {}), 'x  y');
});

test('allTokensEmpty catches the dangling-unit case', () => {
  // "{{lease.term}} months" against a null term must count as empty.
  assert.equal(allTokensEmpty('{{lease.term}} months', scope), true);
  assert.equal(allTokensEmpty('{{totals.subtotal}} total', scope), false);
  assert.equal(allTokensEmpty('no tokens here', scope), false);
});

test('sanitizer strips scripts, handlers and attributes', () => {
  assert.equal(sanitizeHtml('<script>bad()</script>ok'), 'ok');
  assert.equal(sanitizeHtml('<p onclick="bad()">x</p>'), '<p>x</p>');
  assert.equal(sanitizeHtml('<a href="//x">y</a>'), 'y');
  assert.equal(sanitizeHtml('<iframe src="//x"></iframe>z'), 'z');
  assert.equal(sanitizeHtml('<p>keep <strong>this</strong></p>'), '<p>keep <strong>this</strong></p>');
});

test('grouped subtotals sum to the block total', () => {
  const t = {
    blocks: [{ type: 'table', bind: 'items', groupBy: 'site', columns: [{ key: 'name', label: 'N' }] }],
  };
  const items = [
    { name: 'a', extended: 100, quantity: 1, site: 'X' },
    { name: 'b', extended: 250, quantity: 2, site: 'X' },
    { name: 'c', extended: 75, quantity: 1, site: 'Y' },
  ];
  const r = resolve(t, { items });
  const block = r.blocks[0];
  const sumOfGroups = block.groups.reduce((s, g) => s + g.subtotal, 0);
  assert.equal(sumOfGroups, 425);
  assert.equal(block.subtotal, 425);
  assert.equal(block.rowCount, 3);
});

test('row limit reports overflow instead of silently truncating', () => {
  const t = { blocks: [{ type: 'table', bind: 'items', maxRows: 2,
    columns: [{ key: 'name', label: 'N' }] }] };
  const items = Array.from({ length: 5 }, (_, i) => ({ name: `i${i}`, extended: 10, quantity: 1 }));
  const r = resolve(t, { items });
  assert.equal(r.blocks[0].overflow, 3);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /beyond the row limit/);
});

test('a computed value resting on absent data does not become zero', () => {
  // "Monthly payment $0.00" on a quote reads as free. An absent rate factor
  // must render blank, while a genuine zero total still prints.
  const t = {
    vars: { taxRate: 0.087 },
    computed: {
      tax: 'round(totals.subtotal * vars.taxRate, 2)',
      grand: 'totals.subtotal + computed.tax',
      monthly: 'round(computed.grand * lease.rate_factor, 2)',
    },
    blocks: [
      { type: 'table', bind: 'items', columns: [{ key: 'name', label: 'N' }] },
      { type: 'summary', rows: [
        { label: 'Subtotal', expr: 'totals.subtotal' },
        { label: 'Total', expr: 'computed.grand' },
        { label: 'Monthly', expr: 'computed.monthly' },
      ] },
    ],
  };
  const items = [{ name: 'a', extended: 1000, quantity: 1 }];

  const withRate = resolve(t, { items, lease: { rate_factor: 0.01974 } });
  const rows = withRate.blocks[1].rows;
  assert.equal(rows[0].value, '$1,000.00');
  assert.equal(rows[1].value, '$1,087.00');
  assert.equal(rows[2].value, '$21.46');

  const noRate = resolve(t, { items, lease: { rate_factor: null } });
  const bare = noRate.blocks[1].rows;
  assert.equal(bare[0].value, '$1,000.00', 'a present total still prints');
  assert.equal(bare[1].value, '$1,087.00', 'and so does anything derived from it');
  assert.equal(bare[2].value, '', 'but the monthly payment is blank, not $0.00');
});

test('a genuine zero still prints, so an empty quote reads honestly', () => {
  const t = {
    computed: { grand: 'totals.subtotal' },
    blocks: [
      { type: 'table', bind: 'items', columns: [{ key: 'name', label: 'N' }] },
      { type: 'summary', rows: [{ label: 'Total', expr: 'computed.grand' }] },
    ],
  };
  assert.equal(resolve(t, { items: [] }).blocks[1].rows[0].value, '$0.00');
});

test('absence propagates transitively through computed values', () => {
  const t = {
    computed: { a: 'lease.rate_factor * 2', b: 'computed.a + 1', c: 'computed.b * 3' },
    blocks: [{ type: 'summary', rows: [{ label: 'C', expr: 'computed.c' }] }],
  };
  assert.equal(resolve(t, { lease: {} }).blocks[0].rows[0].value, '');
  assert.equal(resolve(t, { lease: { rate_factor: 1 } }).blocks[0].rows[0].value, '$9.00');
});
