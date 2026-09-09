import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnchorObjectType } from '../../../../src/lib/anchorObjectType.ts';

test('a ticket card reaches the ticket branch', () => {
  assert.equal(normalizeAnchorObjectType('tickets'), 'tickets');
  assert.equal(normalizeAnchorObjectType('ticket'), 'tickets');
  assert.equal(normalizeAnchorObjectType('0-5'), 'tickets');
  assert.equal(normalizeAnchorObjectType('TICKETS'), 'tickets');
});

test("Eakes' project object id is recognised, not silently read as a deal", () => {
  // Portals do not agree on the Projects type id: 0-54 in some, 0-970 in
  // Eakes'. An unrecognised value falls back to deals without complaint, so
  // the app would have hydrated the wrong record and shown an empty document.
  assert.equal(normalizeAnchorObjectType('0-970'), 'projects');
  assert.equal(normalizeAnchorObjectType('0-54'), 'projects');
  assert.equal(normalizeAnchorObjectType('projects'), 'projects');
});

test('the fallback stays deals, as it always has', () => {
  assert.equal(normalizeAnchorObjectType(undefined), 'deals');
  assert.equal(normalizeAnchorObjectType(null), 'deals');
  assert.equal(normalizeAnchorObjectType(''), 'deals');
  assert.equal(normalizeAnchorObjectType('  '), 'deals');
  assert.equal(normalizeAnchorObjectType('companies'), 'deals');
  assert.equal(normalizeAnchorObjectType('0-1'), 'deals');
});
