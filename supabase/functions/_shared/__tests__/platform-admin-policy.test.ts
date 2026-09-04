import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmail, isAllowlisted, emailForHubspotUserId, decideWrite,
  decideUiVisibility, isEngine, validateDocumentCode,
} from '../platform-admin-policy.ts';

const ALLOW = ['marko@thequantumleap.business', 'shawn@thequantumleap.business'];

test('email comparison ignores case and surrounding space', () => {
  assert.equal(normalizeEmail('  MARKO@TheQuantumLeap.Business '), 'marko@thequantumleap.business');
  assert.ok(isAllowlisted('Marko@TheQuantumLeap.Business', ALLOW));
  assert.ok(isAllowlisted(' shawn@thequantumleap.business', ALLOW));
});

test('non-allowlisted and malformed identities are refused', () => {
  for (const bad of [
    'someone@eakes.com', '', null, undefined, 0, {}, [],
    'marko@thequantumleap.business.evil.com',   // suffix attack
    'evil.com?marko@thequantumleap.business',
    'marko@thequantumleap.businessX',
  ]) {
    assert.equal(isAllowlisted(bad as unknown, ALLOW), false, `should refuse ${JSON.stringify(bad)}`);
  }
});

test('HubSpot user id maps to an email via either id field', () => {
  const owners = [
    { id: '111', userId: '999', email: 'Rep@eakes.com' },
    { id: '222', userId: '888', email: 'marko@thequantumleap.business' },
  ];
  assert.equal(emailForHubspotUserId(owners, '888'), 'marko@thequantumleap.business');
  assert.equal(emailForHubspotUserId(owners, 222), 'marko@thequantumleap.business');
  assert.equal(emailForHubspotUserId(owners, '999'), 'rep@eakes.com');
});

test('an unmatched or empty user id resolves to nobody', () => {
  const owners = [{ id: '1', userId: '2', email: 'a@b.com' }];
  for (const v of ['', null, undefined, '3', 'abc']) {
    assert.equal(emailForHubspotUserId(owners, v), null, `should not resolve ${JSON.stringify(v)}`);
  }
});

test('an owner with no email resolves to nobody rather than an empty match', () => {
  const owners = [{ id: '1', userId: '2', email: null }, { id: '3', userId: '4', email: '' }];
  assert.equal(emailForHubspotUserId(owners, '2'), null);
  assert.equal(emailForHubspotUserId(owners, '4'), null);
  // and an empty resolution must never satisfy the allowlist
  assert.equal(isAllowlisted(emailForHubspotUserId(owners, '2'), ALLOW), false);
});

test('writes require a verified session, not a HubSpot-resolved email', () => {
  // The forgeable path must not grant a write on its own.
  assert.deepEqual(decideWrite({ sessionEmail: null, allowlist: ALLOW }),
    { allowed: false, reason: 'no_authenticated_session' });
  assert.deepEqual(decideWrite({ sessionEmail: 'someone@eakes.com', allowlist: ALLOW }),
    { allowed: false, reason: 'not_a_platform_admin' });
  assert.deepEqual(decideWrite({ sessionEmail: 'Marko@thequantumleap.business', allowlist: ALLOW }),
    { allowed: true, email: 'marko@thequantumleap.business' });
});

test('an empty allowlist grants nobody anything', () => {
  assert.equal(decideWrite({ sessionEmail: 'marko@thequantumleap.business', allowlist: [] }).allowed,
    false);
  assert.equal(decideUiVisibility({ hubspotEmail: 'marko@thequantumleap.business', allowlist: [] }),
    false);
});

test('UI visibility is separate from authority', () => {
  // Visibility may follow the HubSpot identity; permission may not.
  assert.equal(decideUiVisibility({ hubspotEmail: 'marko@thequantumleap.business', allowlist: ALLOW }),
    true);
  assert.equal(decideUiVisibility({ hubspotEmail: 'rep@eakes.com', allowlist: ALLOW }), false);
});

test('engine values are constrained', () => {
  assert.ok(isEngine('native'));
  assert.ok(isEngine('template'));
  for (const bad of ['NATIVE', 'other', '', null, 1, undefined]) {
    assert.equal(isEngine(bad), false);
  }
});

test('document codes are constrained to a safe shape', () => {
  for (const ok of ['quote', 'service_agreement', 'fmv_lease', 'a1']) {
    assert.ok(validateDocumentCode(ok), `${ok} should be valid`);
  }
  for (const bad of ['', 'A', 'Quote', '1quote', 'quote-1', 'quote; drop table', 'q'.repeat(50),
                     null, undefined, 7]) {
    assert.equal(validateDocumentCode(bad as unknown), false, `${JSON.stringify(bad)} should be invalid`);
  }
});
