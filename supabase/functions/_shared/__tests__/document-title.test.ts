import { test } from 'node:test';
import assert from 'node:assert/strict';
import { printedTitle, retitleBlocks } from '../document-title.ts';

test('a rename is read from the payload and trimmed', () => {
  assert.equal(printedTitle({ document: { title: '  Lease Agreement ' } }), 'Lease Agreement');
});

test('anything but a non-blank string means "no rename"', () => {
  // Blank must not blank the heading: a stray space in the settings field
  // would otherwise publish a document with no title at all.
  assert.equal(printedTitle({ document: { title: '   ' } }), null);
  assert.equal(printedTitle({ document: { title: '' } }), null);
  assert.equal(printedTitle({ document: { title: 42 } }), null);
  assert.equal(printedTitle({ document: {} }), null);
  assert.equal(printedTitle({}), null);
  assert.equal(printedTitle(null), null);
  assert.equal(printedTitle(undefined), null);
});

test('only the docTitle block is retitled', () => {
  const blocks = [
    { type: 'docTitle', title: 'Equipment Lease Quotation', meta: [{ label: 'Date' }] },
    { type: 'fieldGrid', title: 'Lessee Information' },
    { type: 'table', title: 'Equipment Information' },
  ];
  const out = retitleBlocks(blocks, 'Lease Agreement') as Array<Record<string, unknown>>;
  assert.equal(out[0].title, 'Lease Agreement');
  // The rest of the docTitle block survives -- retitling is not rebuilding.
  assert.deepEqual(out[0].meta, [{ label: 'Date' }]);
  assert.equal(out[1].title, 'Lessee Information');
  assert.equal(out[2].title, 'Equipment Information');
});

test('no rename leaves the template exactly as published', () => {
  const blocks = [{ type: 'docTitle', title: 'Equipment Lease Quotation' }];
  assert.equal(retitleBlocks(blocks, null), blocks);
});

test('a template without blocks passes through rather than throwing', () => {
  assert.equal(retitleBlocks(undefined, 'Lease Agreement'), undefined);
  assert.equal(retitleBlocks(null, 'Lease Agreement'), null);
});
