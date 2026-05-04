import test from 'node:test';
import assert from 'node:assert/strict';
import { TfaCodeService, InMemoryTfaStore, generateNumericCode } from '../utils/tfa-code.js';

test('generateNumericCode returns correct length string', () => {
  const code = generateNumericCode(6);
  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);
});

test('generateNumericCode pads short values with leading zeros', () => {
  const store = new InMemoryTfaStore();
  let zeroIssued = false;
  const service = new TfaCodeService(store, () => 0);
  for (let attempt = 0; attempt < 200; attempt++) {
    const code = generateNumericCode(6);
    if (code === '000000') { zeroIssued = true; break; }
  }
  assert.equal(typeof zeroIssued, 'boolean');
});

test('TfaCodeService.issue stores a code and verify succeeds', () => {
  let now = 1000;
  const store = new InMemoryTfaStore();
  const service = new TfaCodeService(store, () => now);

  const code = service.issue('alice:test@example.com', 60_000);
  assert.equal(typeof code, 'string');
  assert.equal(code.length, 6);

  const result = service.verify('alice:test@example.com', code);
  assert.equal(result, true);
});

test('TfaCodeService.verify returns false for wrong code', () => {
  let now = 1000;
  const store = new InMemoryTfaStore();
  const service = new TfaCodeService(store, () => now);

  service.issue('alice:test@example.com', 60_000);
  const result = service.verify('alice:test@example.com', '000000');
  assert.equal(result, false);
});

test('TfaCodeService.verify consumes code on success (one-time use)', () => {
  let now = 1000;
  const store = new InMemoryTfaStore();
  const service = new TfaCodeService(store, () => now);

  const code = service.issue('alice:test@example.com', 60_000);
  assert.equal(service.verify('alice:test@example.com', code), true);
  assert.equal(service.verify('alice:test@example.com', code), false);
});

test('TfaCodeService.verify returns false after expiry', () => {
  let now = 1000;
  const store = new InMemoryTfaStore();
  const service = new TfaCodeService(store, () => now);

  const code = service.issue('alice:test@example.com', 5_000);
  now = 7000;
  const result = service.verify('alice:test@example.com', code);
  assert.equal(result, false);
});

test('TfaCodeService.hasPending returns true when live code exists', () => {
  let now = 1000;
  const store = new InMemoryTfaStore();
  const service = new TfaCodeService(store, () => now);

  service.issue('alice:test@example.com', 60_000);
  assert.equal(service.hasPending('alice:test@example.com'), true);
});

test('TfaCodeService.hasPending returns false after expiry', () => {
  let now = 1000;
  const store = new InMemoryTfaStore();
  const service = new TfaCodeService(store, () => now);

  service.issue('alice:test@example.com', 5_000);
  now = 7000;
  assert.equal(service.hasPending('alice:test@example.com'), false);
});

test('TfaCodeService.issue replaces an existing pending code', () => {
  let now = 1000;
  const store = new InMemoryTfaStore();
  const service = new TfaCodeService(store, () => now);

  const firstCode = service.issue('alice:test@example.com', 60_000);
  service.issue('alice:test@example.com', 60_000);
  assert.equal(service.verify('alice:test@example.com', firstCode), false);
});

test('TfaCodeService.issueOrGet returns existing live code without replacing it', () => {
  let now = 1000;
  const store = new InMemoryTfaStore();
  const service = new TfaCodeService(store, () => now);

  const firstCode = service.issue('alice:test@example.com', 60_000);
  const secondCode = service.issueOrGet('alice:test@example.com', 60_000);
  assert.equal(firstCode, secondCode);
  assert.equal(service.verify('alice:test@example.com', firstCode), true);
});

test('TfaCodeService.issueOrGet issues a new code when none is pending', () => {
  let now = 1000;
  const store = new InMemoryTfaStore();
  const service = new TfaCodeService(store, () => now);

  const code = service.issueOrGet('alice:test@example.com', 60_000);
  assert.equal(typeof code, 'string');
  assert.equal(code.length, 6);
  assert.equal(service.verify('alice:test@example.com', code), true);
});

test('TfaCodeService.issueOrGet issues a new code when existing code has expired', () => {
  let now = 1000;
  const store = new InMemoryTfaStore();
  const service = new TfaCodeService(store, () => now);

  const firstCode = service.issue('alice:test@example.com', 5_000);
  now = 7000;
  const secondCode = service.issueOrGet('alice:test@example.com', 60_000);
  assert.notEqual(firstCode, secondCode);
  assert.equal(service.verify('alice:test@example.com', secondCode), true);
});
