import test from 'node:test';
import assert from 'node:assert/strict';
import { issueAccessToken, verifyAccessToken } from '../src/auth/access-tokens.js';
import { requireAuth } from '../src/auth/guard.js';

test('access tokens issue and verify', () => {
  const token = issueAccessToken('u1', 'admin', 60);
  const claims = verifyAccessToken(token);
  assert.equal(claims?.sub, 'u1');
});

test('guard enforces role scopes', () => {
  const token = issueAccessToken('u1', 'user', 60);
  let status = 0;
  const claims = requireAuth({ headers: { authorization: `Bearer ${token}` } } as any, { writeHead(code: number){status=code;}, end(){} } as any, 'admin');
  assert.equal(claims, null);
  assert.equal(status, 403);
});
