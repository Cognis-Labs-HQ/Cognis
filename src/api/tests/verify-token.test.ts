import test from 'node:test';
import assert from 'node:assert/strict';
import { VerifyTokenService, InMemoryVerifyTokenStore } from '../utils/verify-token.js';

function makeService(now?: () => number) {
  return new VerifyTokenService(new InMemoryVerifyTokenStore(), now);
}

test('issued token verifies successfully and returns the key', () => {
  const svc = makeService();
  const token = svc.issue('alice:alice@example.com');
  assert.equal(typeof token, 'string');
  assert.ok(token.length >= 32);
  const result = svc.verify(token);
  assert.equal(result, 'alice:alice@example.com');
});

test('token is consumed on first use', () => {
  const svc = makeService();
  const token = svc.issue('alice:alice@example.com');
  svc.verify(token);
  assert.equal(svc.verify(token), null);
});

test('unknown token returns null', () => {
  const svc = makeService();
  assert.equal(svc.verify('notavalidtoken'), null);
});

test('expired token returns null and is removed', () => {
  let now = 1000;
  const svc = makeService(() => now);
  const token = svc.issue('alice:alice@example.com', 5000);
  now = 7000;
  assert.equal(svc.verify(token), null);
});

test('issuing a new token for the same key revokes the previous token', () => {
  const svc = makeService();
  const first = svc.issue('alice:alice@example.com');
  const second = svc.issue('alice:alice@example.com');
  assert.notEqual(first, second);
  assert.equal(svc.verify(first), null);
  assert.equal(svc.verify(second), 'alice:alice@example.com');
});

test('hasPending returns true while token is live', () => {
  const svc = makeService();
  svc.issue('alice:alice@example.com');
  assert.equal(svc.hasPending('alice:alice@example.com'), true);
});

test('hasPending returns false after token is consumed', () => {
  const svc = makeService();
  const token = svc.issue('alice:alice@example.com');
  svc.verify(token);
  assert.equal(svc.hasPending('alice:alice@example.com'), false);
});

test('hasPending returns false for expired token', () => {
  let now = 1000;
  const svc = makeService(() => now);
  svc.issue('alice:alice@example.com', 5000);
  now = 7000;
  assert.equal(svc.hasPending('alice:alice@example.com'), false);
});

test('tokens for different keys are independent', () => {
  const svc = makeService();
  const t1 = svc.issue('alice:a@example.com');
  const t2 = svc.issue('bob:b@example.com');
  assert.equal(svc.verify(t1), 'alice:a@example.com');
  assert.equal(svc.verify(t2), 'bob:b@example.com');
});
