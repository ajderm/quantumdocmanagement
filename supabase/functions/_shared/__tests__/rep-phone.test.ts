import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRepPhone } from '../rep-phone.ts';

test('a rep added from the HubSpot owners list matches on id', () => {
  const rows = [{ hubspot_user_id: '52613719', hubspot_user_name: 'Stephen Ross', phone: '806-392-1286' }];
  assert.equal(resolveRepPhone(rows, { id: '52613719', firstName: 'Stephen', lastName: 'Ross' }), '806-392-1286');
});

test('a rep typed in by hand still matches, on name', () => {
  // AdminSettings adds manually-entered users with hubspot_user_id: "".
  // Matching on the id alone is why these reps silently had no phone on their
  // documents while owners-list reps did.
  const rows = [{ hubspot_user_id: '', hubspot_user_name: 'Stephen Ross', phone: '806-392-1286' }];
  assert.equal(resolveRepPhone(rows, { id: '52613719', firstName: 'Stephen', lastName: 'Ross' }), '806-392-1286');
});

test('the name match tolerates case and spacing', () => {
  const rows = [{ hubspot_user_id: null, hubspot_user_name: '  stephen   ROSS ', phone: '555-0100' }];
  assert.equal(resolveRepPhone(rows, { id: '1', firstName: 'Stephen', lastName: 'Ross' }), '555-0100');
});

test('the id wins over a different rep with a colliding name', () => {
  const rows = [
    { hubspot_user_id: '999', hubspot_user_name: 'Stephen Ross', phone: '555-WRONG' },
    { hubspot_user_id: '52613719', hubspot_user_name: 'Stephen Ross', phone: '555-RIGHT' },
  ];
  assert.equal(resolveRepPhone(rows, { id: '52613719', firstName: 'Stephen', lastName: 'Ross' }), '555-RIGHT');
});

test('a numeric owner id matches a string-typed settings id', () => {
  const rows = [{ hubspot_user_id: 52613719, hubspot_user_name: 'Stephen Ross', phone: '555-0101' }];
  assert.equal(resolveRepPhone(rows, { id: 52613719, firstName: 'Stephen', lastName: 'Ross' }), '555-0101');
});

test('userId is preferred over id when HubSpot sends both', () => {
  const rows = [{ hubspot_user_id: '77', hubspot_user_name: 'Other Person', phone: '555-0102' }];
  assert.equal(resolveRepPhone(rows, { id: '52613719', userId: '77', firstName: 'Stephen', lastName: 'Ross' }), '555-0102');
});

test('a blank phone is absent, not an empty string', () => {
  // A rep row with no phone must not print an empty value as though it were one.
  assert.equal(resolveRepPhone([{ hubspot_user_id: '1', hubspot_user_name: 'A B', phone: '   ' }], { id: '1', firstName: 'A', lastName: 'B' }), null);
  assert.equal(resolveRepPhone([{ hubspot_user_id: '1', hubspot_user_name: 'A B', phone: null }], { id: '1', firstName: 'A', lastName: 'B' }), null);
});

test('an id row with no phone falls through to a name row that has one', () => {
  const rows = [
    { hubspot_user_id: '52613719', hubspot_user_name: 'Stephen Ross', phone: '' },
    { hubspot_user_id: '', hubspot_user_name: 'Stephen Ross', phone: '806-392-1286' },
  ];
  assert.equal(resolveRepPhone(rows, { id: '52613719', firstName: 'Stephen', lastName: 'Ross' }), '806-392-1286');
});

test('an unknown rep gets nothing rather than someone else’s number', () => {
  const rows = [{ hubspot_user_id: '1', hubspot_user_name: 'Someone Else', phone: '555-0199' }];
  assert.equal(resolveRepPhone(rows, { id: '2', firstName: 'New', lastName: 'Hire' }), null);
});

test('empty inputs are safe', () => {
  assert.equal(resolveRepPhone([], { id: '1', firstName: 'A', lastName: 'B' }), null);
  assert.equal(resolveRepPhone(null, { id: '1' }), null);
  assert.equal(resolveRepPhone(undefined, { id: '1' }), null);
  assert.equal(resolveRepPhone([{ hubspot_user_id: '1', phone: '555' }], null), null);
  assert.equal(resolveRepPhone([{ hubspot_user_id: '1', phone: '555' }], undefined), null);
});

test('an owner with no id and no name matches nothing', () => {
  const rows = [{ hubspot_user_id: '1', hubspot_user_name: 'Stephen Ross', phone: '555-0100' }];
  assert.equal(resolveRepPhone(rows, { id: null, firstName: null, lastName: null }), null);
  assert.equal(resolveRepPhone(rows, {}), null);
});
